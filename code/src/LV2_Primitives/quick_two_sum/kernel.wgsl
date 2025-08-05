// Placeholder for the 'quick_two_sum' kernel.
// This function is a dependency for qp_add.
// |a| >= |b| が保証される場合の高速なtwo_sum。
//
// fn quick_two_sum(a: f32, b: f32) -> vec2<f32> {
//     let s = a + b;
//     let e = b - (s - a);
//     return vec2<f32>(s, e);
// }

// main_red と main_green はテストフレームワークのために必要
@compute @workgroup_size(1)
fn main_red(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    // This will be implemented later.
}

@compute @workgroup_size(1)
fn main_green(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x > 0u) { return; }
    // This will be implemented later.
}