@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn qp_debug_is_nan_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output.x = 999.0;
}

// ▼▼▼ 関数名を変更 ▼▼▼
@compute @workgroup_size(1)
fn qp_debug_is_nan_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = generic_input[0];
    let bits = bitcast<u32>(a);
    if ((bits & 0x7f800000u) == 0x7f800000u && (bits & 0x007fffffu) != 0u) {
        generic_output.x = 1.0;
    } else {
        generic_output.x = 0.0;
    }
}