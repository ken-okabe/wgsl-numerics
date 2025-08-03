// all-kernels.wgsl
// --- Type Definitions ---
struct QuadFloat {
    val: vec4<f32>,
};

// --- qp_negate ---
@group(0) @binding(0) var<storage, read> qp_negate_input: QuadFloat;
@group(0) @binding(1) var<storage, read_write> qp_negate_output: QuadFloat;

@compute @workgroup_size(1)
fn qp_negate_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) {
        return;
    }
    qp_negate_output.val = -qp_negate_input.val;
}
// すべてのAPIカーネルを1ファイルに統合

// --- qp_mul ---
@compute @workgroup_size(8)
fn qp_mul_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_mul (Red stub)
}

// --- qp_log ---
@compute @workgroup_size(8)
fn qp_log_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_log (Red stub)
}

// --- qp_exp ---
@compute @workgroup_size(8)
fn qp_exp_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_exp (Red stub)
}

// --- qp_floor ---
@compute @workgroup_size(8)
fn qp_floor_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_floor (Red stub)
}

// --- qp_ceil ---
@compute @workgroup_size(8)
fn qp_ceil_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_ceil (Red stub)
}

// --- qp_round ---
@compute @workgroup_size(8)
fn qp_round_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_round (Red stub)
}

// --- qp_sqrt ---
@compute @workgroup_size(8)
fn qp_sqrt_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_sqrt (Red stub)
}

// --- qp_sin ---
@compute @workgroup_size(8)
fn qp_sin_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_sin (Red stub)
}

// --- qp_negate ---
@compute @workgroup_size(8)
fn qp_negate_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_negate (Red stub)
}

// --- qp_sub ---
@compute @workgroup_size(8)
fn qp_sub_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_sub (Red stub)
}

// --- qp_gte ---
@compute @workgroup_size(8)
fn qp_gte_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // TODO: implement qp_gte (Red stub)
}