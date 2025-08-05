@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

fn quick_two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let e = b - (s - a);
    return vec2<f32>(s, e);
}

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn quick_two_sum_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn quick_two_sum_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = generic_input[0];
    let b = generic_input[4];
    let result = quick_two_sum(a, b);
    generic_output = vec4<f32>(result.x, result.y, 0.0, 0.0);
}