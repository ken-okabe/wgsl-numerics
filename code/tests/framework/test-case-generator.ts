import type { QuadFloat, TestTier } from '../LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// TestCaseのインターフェースをこのファイル内で定義
interface TestCase {
    name: string;
    tier: TestTier;
    input: QuadFloat | QuadFloat[];
}

Decimal.set({ precision: 50 });

function decimalToQf(dec: Decimal): QuadFloat {
    if (dec.isNaN()) {
        return [NaN, 0, 0, 0];
    }
    if (!dec.isFinite()) {
        return dec.isPositive() ? [Infinity, 0, 0, 0] : [-Infinity, 0, 0, 0];
    }

    const f32 = (n: Decimal): number => n.toDP(7, Decimal.ROUND_HALF_EVEN).toNumber();

    const x0 = new Decimal(f32(dec));
    const e0 = dec.minus(x0);

    const x1 = new Decimal(f32(e0));
    const e1 = e0.minus(x1);

    const x2 = new Decimal(f32(e1));
    const e2 = e1.minus(x2);

    const x3 = new Decimal(f32(e2));

    return [
        x0.toNumber(),
        x1.toNumber(),
        x2.toNumber(),
        x3.toNumber()
    ];
}

function simulateGpuBehavior(qf: QuadFloat): QuadFloat {
    const f32 = (n: number): number => new Float32Array([n])[0]!;
    const gpuQf: QuadFloat = [ f32(qf[0]), f32(qf[1]), f32(qf[2]), f32(qf[3]) ];

    if (gpuQf.every(v => Object.is(v, -0) || v === 0)) {
        gpuQf.fill(0);
    }
    return gpuQf;
}

export function generateExpected(oracleFn: (inputs: QuadFloat[]) => QuadFloat | Decimal, inputs: QuadFloat[]): QuadFloat {
    const idealResult = oracleFn(inputs);
    const idealQf = idealResult instanceof Decimal ? decimalToQf(idealResult) : idealResult;
    return simulateGpuBehavior(idealQf);
}

const TIER1_INPUTS: Record<string, QuadFloat> = {
    positive: [1.5, 1e-8, 0, 0],
    negative: [-10.25, -1e-9, 0, 0],
    integer: [42, 0, 0, 0],
};

const TIER2_INPUTS: Record<string, QuadFloat> = {
    pi_approx: [3.14159, 0, 0, 0],
    e_approx: [2.71828, 0, 0, 0],
};

const TIER3_INPUTS: Record<string, QuadFloat> = {
    zero: [0, 0, 0, 0],
    neg_zero: [-0.0, 0, 0, 0],
    nan: [NaN, 0, 0, 0],
    infinity: [Infinity, 0, 0, 0],
    neg_infinity: [-Infinity, 0, 0, 0],
};

function generateBinaryInputs(inputs1: Record<string, QuadFloat>, inputs2: Record<string, QuadFloat>): Record<string, QuadFloat[]> {
    const combinations: Record<string, QuadFloat[]> = {};
    for (const [name1, input1] of Object.entries(inputs1)) {
        for (const [name2, input2] of Object.entries(inputs2)) {
            if (name1 > name2) continue;
            combinations[`${name1}_and_${name2}`] = [input1, input2];
        }
    }
    return combinations;
}

export function generateTestCases(operationType: 'unary' | 'binary'): TestCase[] {
    const testCases: TestCase[] = [];

    if (operationType === 'unary') {
        const allUnaryInputs = { ...TIER1_INPUTS, ...TIER2_INPUTS, ...TIER3_INPUTS };
        for (const [name, input] of Object.entries(allUnaryInputs)) {
            const tierValue = Object.keys(TIER3_INPUTS).includes(name) ? 3 : (Object.keys(TIER2_INPUTS).includes(name) ? 2 : 1);
            testCases.push({
                name: `tier${tierValue}_${name}`,
                tier: tierValue as TestTier, // 👈 型アサーションを使用
                input: input,
            });
        }
    } else { // binary
        const allInputs = { ...TIER1_INPUTS, ...TIER2_INPUTS, ...TIER3_INPUTS };
        const combinations = generateBinaryInputs(allInputs, allInputs);
        for (const [name, input] of Object.entries(combinations)) {
             const tierValue = (name.includes('zero') || name.includes('nan') || name.includes('infinity')) ? 3 : (name.includes('pi') || name.includes('e') ? 2 : 1);
            testCases.push({ 
                name: `tier${tierValue}_${name}`, 
                tier: tierValue as TestTier, // 👈 型アサーションを使用
                input: input 
            });
        }
    }

    return testCases;
}