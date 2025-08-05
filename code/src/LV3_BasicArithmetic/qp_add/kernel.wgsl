@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn qp_add_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn qp_add_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);
    
    var s, t: vec2<f32>;
    s = quick_two_sum(a.x, b.x);
    t = quick_two_sum(a.y, b.y);
    let result = vec4<f32>(s.x, s.y, t.x, t.y);

    generic_output = result;
}