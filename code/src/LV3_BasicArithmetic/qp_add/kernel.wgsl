// WGSL doesn't have a preprocessor or import system.
// The test framework MUST concatenate the source code of dependencies
// (e.g., quick_two_sum) before this kernel code.

// Dependency function signatures that the framework is expected to provide:
// fn quick_two_sum(a: f32, b: f32) -> vec2<f32>;
// fn two_sum(a: f32, b: f32) -> vec2<f32>;

@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;

// Red実装: 常に失敗する (変更なし)
@compute @workgroup_size(1)
fn main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    generic_output = vec4<f32>(999.0, 999.0, 999.0, 999.0);
}

// Green実装: 実際に依存関数を呼び出すように変更
@compute @workgroup_size(1)
fn main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }

    // 入力から2つのQuadFloat(a, b)を読み込む
    let a = vec4<f32>(generic_input[0], generic_input[1], generic_input[2], generic_input[3]);
    let b = vec4<f32>(generic_input[4], generic_input[5], generic_input[6], generic_input[7]);

    // ▼▼▼【ここが重要】▼▼▼
    // 依存モジュールである `quick_two_sum` を呼び出す。
    // 現状のテストフレームワークでは、この関数の定義が結合されないため、
    // WGSLのコンパイルエラーが発生し、テストは必ず失敗する。
    var s, t: vec2<f32>;
    s = quick_two_sum(a.x, b.x);
    t = quick_two_sum(a.y, b.y);

    // (以下は加算アルゴリズムのプレースホルダー)
    // 今はテストを失敗させることが目的なので、完全な実装は不要。
    let result = vec4<f32>(s.x, s.y, t.x, t.y);

    generic_output = result;
}