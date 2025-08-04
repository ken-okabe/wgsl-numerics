// kernels.wgsl
// すべてのAPIカーネルを1ファイルに統合

// --- 型定義 ---
struct QuadFloat {
    val: vec4<f32>,
};

// --- 汎用入出力バッファ ---
// 全てのテストでこのバッファを共有する
@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: QuadFloat;


// --- qp_from_f32 ---
// Red実装: バッファを使いつつ、意図的に間違った結果を返す
@compute @workgroup_size(1)
fn qp_from_f32_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    // generic_input[0]を使いはするが、他の要素を不正な値にしてアサーションを失敗させる
    generic_output.val = vec4<f32>(generic_input[0], 1.0, 2.0, 3.0);
}

// Green実装: 正しいロジック
@compute @workgroup_size(1)
fn qp_from_f32_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output.val = vec4<f32>(generic_input[0], 0.0, 0.0, 0.0);
}


// --- qp_negate ---
// Red実装: バッファを使いつつ、意図的に間違った結果を返す (入力値をそのままコピー)
@compute @workgroup_size(1)
fn qp_negate_main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_vec = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output.val = input_vec; // 符号反転しないのでテストは失敗する
}

// Green実装: 正しいロジック
@compute @workgroup_size(1)
fn qp_negate_main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    let input_vec = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    generic_output.val = -input_vec;
}


// --- 未実装のカーネルスタブ ---

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