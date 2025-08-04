// code/kernels.wgsl

// --- グローバルバッファインターフェース ---
@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// --- ヘルパー関数 ---
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


// --- qp_from_f32 ---
@compute @workgroup_size(1)
fn qp_from_f32_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(generic_input[0], 1.0, 2.0, 3.0);
}

@compute @workgroup_size(1)
fn qp_from_f32_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(generic_input[0], 0.0, 0.0, 0.0);
}


// --- qp_negate ---
@compute @workgroup_size(1)
fn qp_negate_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    // ▼▼▼ 修正箇所: NaNや-0でも確実に失敗するように、固定の不正値を返す ▼▼▼
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
    // ▲▲▲ 修正箇所 ▲▲▲
}

@compute @workgroup_size(1)
fn qp_negate_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_val = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output = -input_val;
}


// --- qp_add ---
@compute @workgroup_size(1)
fn qp_add_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
}

@compute @workgroup_size(1)
fn qp_add_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }

    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);

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
    
    generic_output = r;
}