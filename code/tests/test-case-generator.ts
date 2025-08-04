// tests/test-case-generator.ts

import { createQuadFloat, type QuadFloat, type TestTier } from './assert';

export interface TestCase {
    name: string;
    tier: TestTier;
    input: number | number[];
    expected: QuadFloat;
}

const WGSL_F32_MAX = 3.4028234e38;

function computeExpected(input: number[], operation: string): QuadFloat {
    switch (operation) {
        case 'from_f32': {
            const val = input[0];
            if (val === undefined) {
                throw new Error("Invalid input for 'from_f32': input array cannot be empty.");
            }
            // ▼▼▼ 修正箇所: -0 の期待値をGPUの挙動に合わせる ▼▼▼
            if (Object.is(val, -0)) {
                return createQuadFloat(0);
            }
            // ▲▲▲ 修正箇所 ▲▲▲
            return createQuadFloat(val);
        }
        case 'negate':
            const negated = input.slice(0, 4).map(v => {
                if (Number.isNaN(v)) return NaN;
                if (v === Infinity) return -Infinity;
                if (v === -Infinity) return Infinity;
                // ▼▼▼ 修正箇所: ゼロの符号反転の期待値をGPUの挙動に合わせる ▼▼▼
                if (Object.is(v, -0)) return 0;
                if (v === 0) return 0;
                // ▲▲▲ 修正箇所 ▲▲▲
                return -v;
            });
            return createQuadFloat(negated);
        case 'add': {
            const a = input.slice(0, 4) as QuadFloat;
            const b = input.slice(4, 8) as QuadFloat;
            const s = a[0] + b[0];
            const e = b[0] - (s - a[0]);
            const result = createQuadFloat([s, e, 0, 0]);
            const finalS = result[0] + result[1];
            const finalE = result[1] - (finalS - result[0]);
            return [finalS, finalE, 0, 0];
        }
        default:
            throw new Error(`Unknown operation for expectation: ${operation}`);
    }
}

function fround(v: number): number {
    const f32 = new Float32Array(1);
    f32[0] = v;
    return f32[0];
}

function computeExpectedF32(input: number[], operation: string): QuadFloat {
    const f32Input = input.map(fround);
    return computeExpected(f32Input, operation);
}

function generateSingleInputCases(values: (number|{name:string, value:number})[], tier: TestTier, operation: string, isF32: boolean): TestCase[] {
    const cases: TestCase[] = [];
    for (const item of values) {
        const val = typeof item === 'number' ? item : item.value;
        const name = typeof item === 'number' ? `${val}` : item.name;
        
        // QuadFloatに変換する前の、生の入力値を保持
        const rawInput = val;
        
        // computeExpectedにはQuadFloat形式で渡す
        const qfInput = createQuadFloat(val);

        cases.push({
            name: `${operation}_tier${tier}_${isF32 ? 'practical' : 'exact'}_${name}`,
            tier: tier,
            input: rawInput, // runKernelInBrowser には生の値を渡す
            expected: isF32 ? computeExpectedF32(qfInput, operation) : computeExpected(qfInput, operation)
        });
    }
    return cases;
}

export function generateTier1Cases(operation: string): TestCase[] {
    let cases: TestCase[] = [];
    if (operation !== 'add') {
        const values = [-1024, -1, 0, 1, 42, 0.5, -0.25];
        cases = cases.concat(generateSingleInputCases(values, 1, operation, false));
    }
    if (operation === 'add') {
        const a = createQuadFloat(1.5);
        const b = createQuadFloat(0.25);
        cases.push({
            name: `add_tier1_exact_1.5_0.25`,
            tier: 1,
            input: [...a, ...b],
            expected: computeExpected([...a, ...b], operation)
        });
    }
    return cases;
}

export function generateTier2Cases(operation: string): TestCase[] {
    let cases: TestCase[] = [];
    if (operation !== 'add') {
        const values = [0.1, 0.3, 3.14159, -2.71828];
        cases = cases.concat(generateSingleInputCases(values, 2, operation, true));
    }
    if (operation === 'add') {
        const a = createQuadFloat(1.0);
        const b = createQuadFloat(0.1);
        cases.push({
            name: `add_tier2_practical_1.0_0.1`,
            tier: 2,
            input: [...a, ...b],
            expected: computeExpectedF32([...a, ...b], operation)
        });
    }
    return cases;
}

export function generateTier3Cases(operation: string): TestCase[] {
    let cases: TestCase[] = [];
    if (operation !== 'add') {
        const values = [
            { name: 'NaN', value: NaN },
            { name: 'Infinity', value: Infinity },
            { name: '-Infinity', value: -Infinity },
            { name: 'MaxFinite', value: WGSL_F32_MAX },
            { name: 'Zero', value: 0 },
            { name: '-Zero', value: -0 }
        ];
        cases = cases.concat(generateSingleInputCases(values, 3, operation, false).map(c => ({...c, name: c.name.replace('_exact_', '_stress_')})));
    }
    return cases;
}