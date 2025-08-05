@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// Red実装: 常に999.0を返し、期待値(0.0 or 1.0)と一致せず必ず失敗する
@compute @workgroup_size(1)
fn main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output.x = 999.0;
}

// Green実装: WGSL仕様に基づくビット演算でのNaN判定
@compute @workgroup_size(1)
fn main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let a = generic_input[0];
    let bits = bitcast<u32>(a);
    // 指数部が全て1 (0x7f800000) で、仮数部が非ゼロの場合にNaN
    if ((bits & 0x7f800000u) == 0x7f800000u && (bits & 0x007fffffu) != 0u) {
        generic_output.x = 1.0; // true
    } else {
        generic_output.x = 0.0; // false
    }
}