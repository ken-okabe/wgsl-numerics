// code/kernels.wgsl

// --- グローバルバッファインターフェース ---
@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// --- 定数 ---
const F32_MAX = 3.4028234e+38;

// --- ヘルパー関数: 誤差なし変換(EFT) ---

// aとbの和と丸め誤差を計算する (Donald Knuth)
// |a| >= |b| でなければならない
fn quick_two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let e = b - (s - a);
    return vec2<f32>(s, e);
}

// aとbの和と丸め誤差を計算する (Møller-Knuth)
fn two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let v = s - a;
    let e = (a - (s - v)) + (b - v);
    return vec2<f32>(s, e);
}

// aとbの積と丸め誤差を計算する
fn two_prod(a: f32, b: f32) -> vec2<f32> {
    let p = a * b;
    let e = fma(a, b, -p);
    return vec2<f32>(p, e);
}

// --- インライン化された高精度演算ヘルパー ---

// qp_addのインライン版
fn qp_add_inline(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
    var s: vec2<f32>;
    var e: vec2<f32>;
    var r: vec4<f32>;

    s = two_sum(a.x, b.x);
    e = two_sum(a.y, b.y);
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
    
    return r;
}

// qp_subのインライン版
fn qp_sub_inline(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
    return qp_add_inline(a, -b);
}

// QuadFloatが負の値か判定する
fn qp_is_negative(a: vec4<f32>) -> bool {
    return a.x < 0.0;
}

// QuadFloatがゼロか判定する
fn qp_is_zero(a: vec4<f32>) -> bool {
    return a.x == 0.0;
}


// --- qp_from_f32 (完成版) ---
@compute @workgroup_size(1)
fn qp_from_f32_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_from_f32_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(generic_input[0], 0.0, 0.0, 0.0);
}


// --- qp_negate (完成版) ---
@compute @workgroup_size(1)
fn qp_negate_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_negate_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_val = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output = -input_val;
}


// --- qp_add (完成版) ---
@compute @workgroup_size(1)
fn qp_add_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_add_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);
    generic_output = qp_add_inline(a, b);
}

// --- qp_sub (完成版) ---
@compute @workgroup_size(1)
fn qp_sub_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_sub_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);
    generic_output = qp_sub_inline(a, b);
}

// --- qp_mul (完成版) ---
@compute @workgroup_size(1)
fn qp_mul_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

fn qp_mul_inline(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
    var p: vec2<f32>;
    var h: vec2<f32>;
    var t: vec2<f32>;
    var s: vec2<f32>;
    var e: vec2<f32>;
    p = two_prod(a.x, b.x);
    var r: vec4<f32> = vec4<f32>(p.x, p.y, 0.0, 0.0);
    p = two_prod(a.x, b.y);
    t = two_prod(a.y, b.x);
    s = two_sum(p.x, t.x);
    e = two_sum(p.y, t.y);
    h = two_sum(r.y, s.x);
    var c0: f32 = h.x;
    var c1: f32 = h.y + s.y;
    c1 = c1 + e.x;
    var c2: f32 = e.y;
    p = two_prod(a.x, b.z);
    t = two_prod(a.y, b.y);
    var t2_prod = two_prod(a.z, b.x);
    s = two_sum(p.x, t.x);
    s = two_sum(s.x, t2_prod.x);
    e = two_sum(p.y, t.y);
    e = two_sum(e.x, t2_prod.y);
    e.y = e.y + e.x;
    e.x = s.y;
    h = two_sum(c0, s.x);
    r.y = h.x;
    h = two_sum(c1, h.y);
    h = two_sum(h.x, e.x);
    c0 = h.x;
    c1 = h.y + e.y;
    p = two_prod(a.x, b.w);
    t = two_prod(a.y, b.z);
    t2_prod = two_prod(a.z, b.y);
    var t3 = two_prod(a.w, b.x);
    s = two_sum(p.x, t.x);
    s = two_sum(s.x, t2_prod.x);
    s = two_sum(s.x, t3.x);
    e = two_sum(p.y, t.y);
    e = two_sum(e.x, t2_prod.y);
    e = two_sum(e.x, t3.y);
    e.y = e.y + e.x;
    e.x = s.y;
    h = two_sum(c0, s.x);
    r.z = h.x;
    h = two_sum(c1, h.y);
    h = two_sum(h.x, e.x);
    r.w = h.x + h.y + e.y;
    s = quick_two_sum(r.z, r.w);
    r.z = s.x; r.w = s.y;
    s = quick_two_sum(r.y, r.z);
    r.y = s.x; r.z = s.y;
    s = quick_two_sum(r.x, r.y);
    r.x = s.x; r.y = s.y;
    return r;
}

@compute @workgroup_size(1)
fn qp_mul_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);
    generic_output = qp_mul_inline(a, b);
}


// --- qp_div (完成版) ---
@compute @workgroup_size(1)
fn qp_div_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_div_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }

    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);

    if (b.x == 0.0 && b.y == 0.0) {
        var zero: f32 = 0.0;
        let nan = zero / zero;
        generic_output = vec4<f32>(nan, nan, nan, nan);
        return;
    }

    var x = vec4<f32>(1.0 / b.x, 0.0, 0.0, 0.0);
    let two = vec4<f32>(2.0, 0.0, 0.0, 0.0);
    
    var tmp = qp_sub_inline(two, qp_mul_inline(b, x));
    x = qp_mul_inline(x, tmp);

    tmp = qp_sub_inline(two, qp_mul_inline(b, x));
    x = qp_mul_inline(x, tmp);
    
    tmp = qp_sub_inline(two, qp_mul_inline(b, x));
    x = qp_mul_inline(x, tmp);

    generic_output = qp_mul_inline(a, x);
}

// --- qp_abs (完成版) ---
@compute @workgroup_size(1)
fn qp_abs_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(-999.0, -999.0, -999.0, -999.0);
}

@compute @workgroup_size(1)
fn qp_abs_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    if (a.x < 0.0) {
        generic_output = -a;
    } else {
        generic_output = a;
    }
}

// --- qp_sign (完成版) ---
@compute @workgroup_size(1)
fn qp_sign_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_sign_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    
    // ▼▼▼ 修正箇所: NaNの判定をビット演算で行う ▼▼▼
    let bits = bitcast<u32>(a.x);
    // 指数部がすべて1 (0x7f800000) で、仮数部が非ゼロの場合にNaN
    if ((bits & 0x7f800000u) == 0x7f800000u && (bits & 0x007fffffu) != 0u) {
        generic_output = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        return;
    }
    // ▲▲▲ 修正箇所 ▲▲▲

    if (qp_is_zero(a)) {
        generic_output = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    } else if (qp_is_negative(a)) {
        generic_output = vec4<f32>(-1.0, 0.0, 0.0, 0.0);
    } else {
        generic_output = vec4<f32>(1.0, 0.0, 0.0, 0.0);
    }
}

// --- qp_floor (完成版) ---
@compute @workgroup_size(1)
fn qp_floor_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_floor_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);

    let f = vec4<f32>(floor(a.x), 0.0, 0.0, 0.0);
    let r = qp_sub_inline(a, f);

    if (qp_is_negative(r)) {
        let one = vec4<f32>(1.0, 0.0, 0.0, 0.0);
        generic_output = qp_sub_inline(f, one);
    } else {
        generic_output = f;
    }
}

// --- qp_ceil (完成版) ---
@compute @workgroup_size(1)
fn qp_ceil_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_ceil_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);

    let c = vec4<f32>(ceil(a.x), 0.0, 0.0, 0.0);
    let r = qp_sub_inline(c, a);

    if (qp_is_negative(r)) {
        let one = vec4<f32>(1.0, 0.0, 0.0, 0.0);
        generic_output = qp_add_inline(c, one);
    } else {
        generic_output = c;
    }
}

// --- qp_round (完成版) ---
@compute @workgroup_size(1)
fn qp_round_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

@compute @workgroup_size(1)
fn qp_round_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    
    // ▼▼▼ 修正箇所: NaNとInfinityの判定をビット演算で行う ▼▼▼
    let bits = bitcast<u32>(a.x);
    // 指数部がすべて1かチェック (NaNまたはInfinity)
    if ((bits & 0x7f800000u) == 0x7f800000u) {
        generic_output = a;
        return;
    }
    // ▲▲▲ 修正箇所 ▲▲▲

    let half = vec4<f32>(0.5, 0.0, 0.0, 0.0);

    if (qp_is_negative(a)) {
        let temp = qp_sub_inline(a, half);
        let c = vec4<f32>(ceil(temp.x), 0.0, 0.0, 0.0);
        let r = qp_sub_inline(c, temp);
        if (qp_is_negative(r)) {
            let one = vec4<f32>(1.0, 0.0, 0.0, 0.0);
            generic_output = qp_add_inline(c, one);
        } else {
            generic_output = c;
        }
    } else {
        let temp = qp_add_inline(a, half);
        let f = vec4<f32>(floor(temp.x), 0.0, 0.0, 0.0);
        let r = qp_sub_inline(temp, f);
        if (qp_is_negative(r)) {
            let one = vec4<f32>(1.0, 0.0, 0.0, 0.0);
            generic_output = qp_sub_inline(f, one);
        } else {
            generic_output = f;
        }
    }
}
