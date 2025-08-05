// code/tests/framework/test-case-generator.ts (Oracle Return Type Updated)

import type { QuadFloat, TestTier, OperationType } from '../LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

export interface TestCase {
    name: string;
    tier: TestTier;
    input: QuadFloat | QuadFloat[];
    operationType: OperationType;
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

// ▼▼▼ 修正箇所: Oracleからの戻り値の型を `Decimal | Decimal[]` に対応させる ▼▼▼
export function generateExpected(oracleFn: (inputs: Decimal[]) => Decimal | Decimal[], inputs: QuadFloat[]): QuadFloat {
    const decimalInputs = inputs.map(qf => new Decimal(qf[0]).plus(qf[1]).plus(qf[2]).plus(qf[3]));
    const idealResult = oracleFn(decimalInputs);

    let finalQf: QuadFloat = [0, 0, 0, 0];

    if (Array.isArray(idealResult)) {
        // [和, 誤差] のような配列が返された場合
        const components = idealResult.map(d => d.toNumber());
        for(let i = 0; i < components.length; i++) {
            finalQf[i] = components[i];
        }
    } else {
        // 単一のDecimalが返された場合
        finalQf = decimalToQf(idealResult);
    }
    
    return simulateGpuBehavior(finalQf);
}
// ▲▲▲ 修正箇所 ▲▲▲


const WGSL_F32_MAX = 3.4028234e38;

const TIER1_VALUES = {
    integers: [-1024, -1, 0, 1, 42],
    fractions: [0.5, -0.25, 1.5, -2.75],
};

const TIER2_VALUES = {
    common: [0.1, -0.3],
    scientific: [Math.PI, Math.E, Math.sqrt(2)],
};

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
        input: createQuadFloat(tier === 2 ? fround(value) : value),
        operationType: opType
    });

    if (operationType === 'unary') {
        Object.entries(TIER1_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier1_${name}`, v, 1))));
        Object.entries(TIER2_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier2_${name}`, v, 2))));
        Object.entries(TIER3_VALUES).forEach(([name, values]) => values.forEach(v => testCases.push(createCase(`tier3_${name}`, v, 3))));
    } else {
        const allValues = [
            ...TIER1_VALUES.integers, ...TIER1_VALUES.fractions,
            ...TIER2_VALUES.common, ...TIER2_VALUES.scientific,
            ...TIER3_VALUES.special, ...TIER3_VALUES.extremes
        ];
        
        for (let i = 0; i < allValues.length; i++) {
            for (let j = 0; j < allValues.length; j++) { // quick_two_sumの前提(|a|>=|b|)をテストケース側で満たすため、j=iからj<lengthに変更
                const v1_raw = allValues[i];
                const v2_raw = allValues[j];

                if (v1_raw === undefined || v2_raw === undefined) {
                    continue;
                }
                
                // quick_two_sum の前提 |a| >= |b| を満たすように入力値を並べ替える
                const [v1, v2] = Math.abs(v1_raw) >= Math.abs(v2_raw) ? [v1_raw, v2_raw] : [v2_raw, v1_raw];


                const getTier = (val: number): TestTier => {
                    if (TIER3_VALUES.special.includes(val) || TIER3_VALUES.extremes.includes(val)) return 3;
                    if (TIER2_VALUES.common.includes(val) || TIER2_VALUES.scientific.includes(val)) return 2;
                    return 1;
                };
                
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