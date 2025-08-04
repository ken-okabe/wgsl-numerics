// kernels.wgsl
// すべてのAPIカーネルを1ファイルに統合（特殊値処理を改善）

// --- 型定義 ---
struct QuadFloat {
    val: vec4<f32>,
};

// --- 汎用入出力バッファ ---
@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: QuadFloat;

// --- ヘルパー関数: 特殊値判定 ---
fn is_nan_f32(x: f32) -> bool {
    return x != x;
}

fn is_inf_f32(x: f32) -> bool {
    // WGSLで安全に表現できる最大値を使用
    let max_finite = 3.4028234e38;
    return abs(x) >= max_finite;
}

fn is_finite_f32(x: f32) -> bool {
    return !is_nan_f32(x) && !is_inf_f32(x);
}

// --- qp_from_f32 ---
@compute @workgroup_size(1)
fn qp_from_f32_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output.val = vec4<f32>(generic_input[0], 1.0, 2.0, 3.0);
}

@compute @workgroup_size(1)
fn qp_from_f32_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output.val = vec4<f32>(generic_input[0], 0.0, 0.0, 0.0);
}

// --- qp_negate （特殊値処理を改善）---
@compute @workgroup_size(1)
fn qp_negate_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_vec = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output.val = input_vec;
}

@compute @workgroup_size(1)
fn qp_negate_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_vec = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    
    // 各成分の特殊値処理を行う
    var result: vec4<f32>;
    
    for (var i = 0; i < 4; i++) {
        let val = input_vec[i];
        
        if (is_nan_f32(val)) {
            // NaNはNaNのまま保持
            result[i] = val;
        } else if (val == 3.4028235e38) { // Infinity
            // Infinityは-Infinityに
            result[i] = -3.4028235e38;
        } else if (val == -3.4028235e38) { // -Infinity  
            // -InfinityはInfinityに
            result[i] = 3.4028235e38;
        } else {
            // 通常の符号反転
            result[i] = -val;
        }
    }
    
    generic_output.val = result;
}

// --- qp_add ---

@compute @workgroup_size(1)
fn qp_add_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let val_a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output.val = val_a;
}

// ヘルパー関数: 誤差なし変換(EFT)
fn quick_two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let e = b - (s - a);
    return vec2<f32>(s, e);
}

fn two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let v = s - a;
    let e = (a - (s - v)) + (b - v);
    return vec2<f32>(s, e);
}

// Green実装 (特殊値処理とバグ修正版)
@compute @workgroup_size(1)
fn qp_add_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }

    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);

    // 特殊値のチェック
    var has_special = false;
    for (var i = 0; i < 4; i++) {
        if (!is_finite_f32(a[i]) || !is_finite_f32(b[i])) {
            has_special = true;
            break;
        }
    }
    
    // 特殊値がある場合は簡単な加算で済ませる
    if (has_special) {
        generic_output.val = a + b;
        return;
    }

    // 通常の高精度加算
    var s: vec2<f32>;
    var e: vec2<f32>;
    
    s = two_sum(a.x, b.x);
    e = two_sum(a.y, b.y);
    
    var r: vec4<f32>;
    r.x = s.x;
    s = two_sum(s.y, e.x);
    r.y = s.x;
    s = two_sum(s.y, e.y);
    r.z = s.x;
    r.w = s.y;
    
    e = two_sum(a.z, b.z);
    s = two_sum(r.y, e.x);
    r.y = s.x;
    s = two_sum(r.z, s.y);
    r.z = s.x;
    r.w = r.w + s.y + e.y;

    e = two_sum(a.w, b.w);
    s = two_sum(r.z, e.x);
    r.z = s.x;
    r.w = r.w + s.y + e.y;

    var t0: f32;
    var t1: f32;
    var t2: f32;

    s = quick_two_sum(r.z, r.w); t0 = s.x; t1 = s.y;
    s = quick_two_sum(r.y, t0); t0 = s.x; t2 = s.y;
    s = quick_two_sum(r.x, t0); r.x = s.x; r.y = s.y;
    r.z = t2 + t1;

    s = quick_two_sum(r.z, r.w); r.z = s.x; r.w = s.y;
    s = quick_two_sum(r.y, r.z); r.y = s.x; r.z = s.y;
    s = quick_two_sum(r.x, r.y); r.x = s.x; r.y = s.y;

    generic_output.val = r;
}

// --- 未実装のカーネルスタブ ---
// (stubs for qp_mul, qp_log, etc.)