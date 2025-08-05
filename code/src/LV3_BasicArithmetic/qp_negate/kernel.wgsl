// グローバルバッファインターフェース (オリジナルを完全に模倣)
@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// Red実装
@compute @workgroup_size(1)
fn main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

// Green実装
@compute @workgroup_size(1)
fn main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_val = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output = -input_val;
}