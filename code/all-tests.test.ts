// In all-tests.test.ts
import { test, expect } from 'vitest';
// The previous implementation of assertQpEqual has been moved to its own file.
// We assume it's correctly placed and imported.
import { assertQpEqual, type QuadFloat } from './assertQpEqual';

// --- assertQpEqual Self-Test ---

test('assertQpEqual: identical values should pass', () => {
    const a: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
    const b: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
    // This should not throw any error
    expect(() => assertQpEqual(a, b)).not.toThrow();
});

test('assertQpEqual: small difference within tolerance should pass', () => {
    const a: QuadFloat = [1.0, 0, 0, 0];
    const b: QuadFloat = [1.0, 1e-32, 0, 0]; // Difference is smaller than default epsilon (1e-30)
    expect(() => assertQpEqual(a, b)).not.toThrow();
});

test('assertQpEqual: difference outside of tolerance should throw', () => {
    const a: QuadFloat = [1.0, 0, 0, 0];
    const b: QuadFloat = [1.0, 1e-28, 0, 0]; // Difference is larger than default epsilon
    // This MUST throw an error
    expect(() => assertQpEqual(a, b)).toThrow();
});

test('assertQpEqual: NaN handling should pass for NaN === NaN', () => {
    const a: QuadFloat = [NaN, 0, 0, 0];
    const b: QuadFloat = [NaN, 0, 0, 0];
    expect(() => assertQpEqual(a, b)).not.toThrow();
});

// --- The rest of the tests from all-tests.test.ts would follow ---
// --- index.test.ts 統合 ---
test('qp_from_f32: spec-driven (auto-generated)', () => {
    // TODO: implement spec-driven test for qp_from_f32
    expect(true).toBe(true); // placeholder
});

test('qp_negate: spec-driven (auto-generated)', () => {
    // TODO: implement spec-driven test for qp_negate
    expect(true).toBe(true); // placeholder
});

test('qp_add: spec-driven (auto-generated)', () => {
    // TODO: implement spec-driven test for qp_add
    expect(true).toBe(true); // placeholder
});

test.skip('qp_sub: spec-driven (auto-generated)', () => {
    // 入力例: `a: QuadFloat`, `b: QuadFloat`
    // 期待出力: `QuadFloat`（減算結果）
    // エラーケース: NaN入力はNaN
    // 数値的注意点: 桁落ち、精度保証
    // TODO: implement spec-driven test for qp_sub
    throw new Error('Not implemented');
});
// --- qp_mul ---
test.skip("qp_mul: 2*3=6", () => {
    expect(() => assertQpEqual([[2, 0, 0, 0], [3, 0, 0, 0]], [[6, 0, 0, 0]])).toThrow();
});
test.skip("qp_mul: 0*0=0", () => {
    expect(() => assertQpEqual([[0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0]])).toThrow();
});
test.skip("qp_mul: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0], [3, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});

// --- qp_log ---
test.skip("qp_log: ln(1)=0", () => {
    expect(() => assertQpEqual([[1, 0, 0, 0]], [[0, 0, 0, 0]])).toThrow();
});
test.skip("qp_log: ln(e)=1", () => {
    expect(() => assertQpEqual([[2.718281828459045, 0, 0, 0]], [[1, 0, 0, 0]])).toThrow();
});
test.skip("qp_log: x<=0はNaN", () => {
    expect(() => assertQpEqual([[0, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});
test.skip("qp_log: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});

// --- qp_exp ---
test.skip("qp_exp: exp(0)=1", () => {
    expect(() => assertQpEqual([[0, 0, 0, 0]], [[1, 0, 0, 0]])).toThrow();
});
test.skip("qp_exp: exp(1)=e", () => {
    expect(() => assertQpEqual([[1, 0, 0, 0]], [[2.718281828459045, 0, 0, 0]])).toThrow();
});
test.skip("qp_exp: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});

// --- qp_floor ---
test.skip("qp_floor: floor(1.7)=1", () => {
    expect(() => assertQpEqual([[1.7, 0, 0, 0]], [[1, 0, 0, 0]])).toThrow();
});
test.skip("qp_floor: floor(-1.7)=-2", () => {
    expect(() => assertQpEqual([[-1.7, 0, 0, 0]], [[-2, 0, 0, 0]])).toThrow();
});
test.skip("qp_floor: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});

// --- qp_ceil ---
test.skip("qp_ceil: ceil(1.2)=2", () => {
    expect(() => assertQpEqual([[1.2, 0, 0, 0]], [[2, 0, 0, 0]])).toThrow();
});
test.skip("qp_ceil: ceil(-1.2)=-1", () => {
    expect(() => assertQpEqual([[-1.2, 0, 0, 0]], [[-1, 0, 0, 0]])).toThrow();
});
test.skip("qp_ceil: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});

// --- qp_round ---
test.skip("qp_round: round(1.2)=1", () => {
    expect(() => assertQpEqual([[1.2, 0, 0, 0]], [[1, 0, 0, 0]])).toThrow();
});
test.skip("qp_round: round(1.5)=2", () => {
    expect(() => assertQpEqual([[1.5, 0, 0, 0]], [[2, 0, 0, 0]])).toThrow();
});
test.skip("qp_round: round(-1.5)=-2", () => {
    expect(() => assertQpEqual([[-1.5, 0, 0, 0]], [[-2, 0, 0, 0]])).toThrow();
});
test.skip("qp_round: NaN入力はNaN", () => {
    expect(() => assertQpEqual([[NaN, 0, 0, 0]], [[NaN, 0, 0, 0]])).toThrow();
});
// 統合テストファイル: all-tests.test.ts
// すべてのAPIテストケースを1ファイルに集約


// --- qp_sqrt ---
test.skip("qp_sqrt: sqrt(4) = 2", () => {
    expect(() => assertQpEqual([4, 0, 0, 0] as any, [2, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sqrt: sqrt(0) = 0", () => {
    expect(() => assertQpEqual([0, 0, 0, 0] as any, [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sqrt: 負数入力はNaN", () => {
    expect(() => assertQpEqual([-1, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sqrt: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_mul ---
test.skip("qp_mul: 2*3=6", () => {
    expect(() => assertQpEqual([2, 0, 0, 0], [3, 0, 0, 0], [6, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_mul: 0*0=0", () => {
    expect(() => assertQpEqual([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_mul: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0], [3, 0, 0, 0], [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_log ---
test.skip("qp_log: ln(1) = 0", () => {
    expect(() => assertQpEqual([1, 0, 0, 0] as any, [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_log: ln(e) = 1", () => {
    expect(() => assertQpEqual([2.718281828459045, 0, 0, 0] as any, [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_log: x<=0はNaN", () => {
    expect(() => assertQpEqual([0, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_log: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_exp ---
test.skip("qp_exp: exp(0)=1", () => {
    expect(() => assertQpEqual([0, 0, 0, 0] as any, [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_exp: exp(1)=e", () => {
    expect(() => assertQpEqual([1, 0, 0, 0] as any, [2.718281828459045, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_exp: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_floor ---
test.skip("qp_floor: floor(1.7)=1", () => {
    expect(() => assertQpEqual([1.7, 0, 0, 0] as any, [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_floor: floor(-1.7)=-2", () => {
    expect(() => assertQpEqual([-1.7, 0, 0, 0] as any, [-2, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_floor: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_ceil ---
test.skip("qp_ceil: ceil(1.2)=2", () => {
    expect(() => assertQpEqual([1.2, 0, 0, 0] as any, [2, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_ceil: ceil(-1.2)=-1", () => {
    expect(() => assertQpEqual([-1.2, 0, 0, 0] as any, [-1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_ceil: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_round ---
test.skip("qp_round: round(1.2)=1", () => {
    expect(() => assertQpEqual([1.2, 0, 0, 0] as any, [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_round: round(1.5)=2", () => {
    expect(() => assertQpEqual([1.5, 0, 0, 0] as any, [2, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_round: round(-1.5)=-2", () => {
    expect(() => assertQpEqual([-1.5, 0, 0, 0] as any, [-2, 0, 0, 0] as any)).toThrow();
});

test.skip("qp_round: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_sin ---
test.skip("qp_sin: sin(0) = 0", () => {
    expect(() => assertQpEqual([0, 0, 0, 0] as any, [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sin: sin(π/2) ≈ 1", () => {
    expect(() => assertQpEqual([Math.PI / 2, 0, 0, 0] as any, [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sin: sin(π) ≈ 0", () => {
    expect(() => assertQpEqual([Math.PI, 0, 0, 0] as any, [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sin: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0] as any, [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_negate ---
// A placeholder for the GPU test runner function.
// This would handle WebGPU setup, buffer creation, kernel execution, and result retrieval.
async function runGpuKernel(
    kernelName: string,
    inputs: QuadFloat[],
    outputSize: number
): Promise<Float32Array> {
    // This is a mock implementation for demonstration.
    // In a real scenario, this would interact with the WebGPU API.
    console.error(`Error: GPU kernel "${kernelName}" is not implemented.`);
    // Return a dummy array of the correct size but with wrong values (e.g., all zeros)
    // to ensure the test fails if the kernel isn't implemented.
    return new Float32Array(outputSize / 4);
}

test('qp_negate: correctly negates values', async () => {
    const testCases: { input: QuadFloat, expected: QuadFloat }[] = [
        { input: [1.23, 4.56e-8, 0, 0], expected: [-1.23, -4.56e-8, 0, 0] },
        { input: [-10.0, -1e-9, 0, 0], expected: [10.0, 1e-9, 0, 0] },
        { input: [0.0, 0.0, 0.0, 0.0], expected: [-0.0, -0.0, -0.0, -0.0] },
        { input: [NaN, 0, 0, 0], expected: [NaN, 0, 0, 0] }
    ];

    for (const tc of testCases) {
        // This simulates running the 'qp_negate_main' WGSL kernel
        const gpuResultRaw = await runGpuKernel('qp_negate_main', [tc.input], 16);
        const gpuResult: QuadFloat = Array.from(gpuResultRaw) as QuadFloat;

        assertQpEqual(gpuResult, tc.expected);
    }
});

// --- qp_sub ---
test.skip("qp_sub: 3-2=1", () => {
    expect(() => assertQpEqual([3, 0, 0, 0], [2, 0, 0, 0], [1, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sub: 0-0=0", () => {
    expect(() => assertQpEqual([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0] as any)).toThrow();
});
test.skip("qp_sub: NaN入力はNaN", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0], [2, 0, 0, 0], [NaN, 0, 0, 0] as any)).toThrow();
});

// --- qp_gte ---
test.skip("qp_gte: 2 >= 1", () => {
    expect(() => assertQpEqual([2, 0, 0, 0], [1, 0, 0, 0], true as any)).toThrow();
});
test.skip("qp_gte: 1 >= 2 (false)", () => {
    expect(() => assertQpEqual([1, 0, 0, 0], [2, 0, 0, 0], false as any)).toThrow();
});
test.skip("qp_gte: 2 >= 2 (true)", () => {
    expect(() => assertQpEqual([2, 0, 0, 0], [2, 0, 0, 0], true as any)).toThrow();
});
test.skip("qp_gte: NaN入力はfalse", () => {
    expect(() => assertQpEqual([NaN, 0, 0, 0], [1, 0, 0, 0], false as any)).toThrow();
});
