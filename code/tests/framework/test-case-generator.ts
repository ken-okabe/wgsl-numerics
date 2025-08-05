// code/tests/framework/test-case-generator.ts (Type Error Corrected)

import type { QuadFloat, TestTier, OperationType } from '../LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

export interface TestCase {
    name: string;
    tier: TestTier;
    input: QuadFloat | QuadFloat[];
    operationType: OperationType; // どの許容誤差を使うかのヒント
}

Decimal.set({ precision: 50 });

function fround(v: number): number {
    const f32 = new Float32Array(1);
    f32[0] = v;
    return f32[0];
}

function decimalToQf(dec: Decimal): QuadFloat {
    if (dec.isNaN()) return [NaN, 0, 0, 0];
    if (!dec.isFinite()) return dec.isPositive() ? [Infinity, 0, 0, 0] : [-Infinity, 0, 0, 0];
    const f32 = (n: Decimal): number => n.toDP(7, Decimal.ROUND_HALF_EVEN).toNumber();
    const x0 = new Decimal(f32(dec));
    const e0 = dec.minus(x0);
    const x1 = new Decimal(f32(e0));
    const e1 = e0.minus(x1);
    const x2 = new Decimal(f32(e1));
    const e2 = e1.minus(x2);
    const x3 = new Decimal(f32(e2));
    return [x0.toNumber(), x1.toNumber(), x2.toNumber(), x3.toNumber()];
}

function simulateGpuBehavior(qf: QuadFloat): QuadFloat {
    const gpuQf: QuadFloat = [ fround(qf[0]), fround(qf[1]), fround(qf[2]), fround(qf[3]) ];
    if (gpuQf.every(v => Object.is(v, -0) || v === 0)) {
        gpuQf.fill(0);
    }
    return gpuQf;
}

export function generateExpected(oracleFn: (inputs: Decimal[]) => Decimal, inputs: QuadFloat[]): QuadFloat {
    const decimalInputs = inputs.map(qf => new Decimal(qf[0]).plus(qf[1]).plus(qf[2]).plus(qf[3]));
    const idealResult = oracleFn(decimalInputs);
    const idealQf = decimalToQf(idealResult);
    return simulateGpuBehavior(idealQf);
}

const WGSL_F32_MAX = 3.4028234e38;

// Tier 1: f32で正確に表現可能な値
const TIER1_VALUES = {
    integers: [-1024, -1, 0, 1, 42],
    fractions: [0.5, -0.25, 1.5, -2.75],
};

// Tier 2: 実用的だがf32で不正確な値
const TIER2_VALUES = {
    common: [0.1, -0.3],
    scientific: [Math.PI, Math.E, Math.sqrt(2)],
};

// Tier 3: 極値・特殊値
const TIER3_VALUES = {
    special: [NaN, Infinity, -Infinity, 0, -0.0],
    extremes: [WGSL_F32_MAX, -WGSL_F32_MAX, Number.MIN_VALUE],
};

function createQuadFloat(value: number): QuadFloat {
    if (Object.is(value, -0)) return [-0.0, 0, 0, 0];
    return [value, 0, 0, 0];
}

export function generateTestCases(operationType: 'unary' | 'binary', opType: OperationType = 'basic'): TestCase[] {
    const testCases: TestCase[] = [];
    
    const createCase = (name: string, value: number, tier: TestTier): TestCase => ({
        name: `${name}_${value.toString().replace('.', '_').replace('-', 'm')}`,
        tier,
        input: createQuadFloat(tier === 2 ? fround(value) : value), // Tier 2はf32精度に丸める
        operationType: opType
    });

    if (operationType === 'unary') {
        Object.entries(TIER1_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier1_${name}`, v, 1))));
        Object.entries(TIER2_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier2_${name}`, v, 2))));
        Object.entries(TIER3_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier3_${name}`, v, 3))));
    } else { // binary
        const allValues = [
            ...TIER1_VALUES.integers, ...TIER1_VALUES.fractions,
            ...TIER2_VALUES.common, ...TIER2_VALUES.scientific,
            ...TIER3_VALUES.special, ...TIER3_VALUES.extremes
        ];
        
        for (let i = 0; i < allValues.length; i++) {
            for (let j = i; j < allValues.length; j++) {
                const v1 = allValues[i];
                const v2 = allValues[j];

                // ▼▼▼ 修正箇所: v1とv2がundefinedでないことを保証する ▼▼▼
                if (v1 === undefined || v2 === undefined) {
                    continue; // 万が一起こった場合はこの組み合わせをスキップ
                }
                // ▲▲▲ 修正箇所 ▲▲▲

                const getTier = (val: number): TestTier => {
                    if (TIER3_VALUES.special.includes(val) || TIER3_VALUES.extremes.includes(val)) return 3;
                    if (TIER2_VALUES.common.includes(val) || TIER2_VALUES.scientific.includes(val)) return 2;
                    return 1;
                };
                
                // 上のチェックにより、ここでのv1, v2は `number` 型であることが保証される
                const tier = Math.max(getTier(v1), getTier(v2)) as TestTier;
                
                testCases.push({
                    name: `tier${tier}_${v1}_and_${v2}`.replace(/\./g, '_').replace(/-/g, 'm'),
                    tier,
                    input: [
                        createQuadFloat(tier === 2 ? fround(v1) : v1),
                        createQuadFloat(tier === 2 ? fround(v2) : v2)
                    ],
                    operationType: opType
                });
            }
        }
    }
    
    return testCases;
}