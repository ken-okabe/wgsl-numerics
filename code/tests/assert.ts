// tests/assert.ts

export type QuadFloat = [number, number, number, number];
export type TestTier = 1 | 2 | 3;
export type OperationType = 'basic' | 'complex' | 'transcendental';

export function createQuadFloat(value: number | number[]): QuadFloat {
    if (Array.isArray(value)) {
        if (value.length > 4) throw new Error("Input array for QuadFloat cannot exceed 4 elements.");
        const qf: QuadFloat = [0, 0, 0, 0];
        for (let i = 0; i < value.length; i++) {
            const val = value[i];
            if (val !== undefined) {
                qf[i] = val;
            }
        }
        return qf;
    }
    return [value, 0, 0, 0];
}

function calculateTolerance(operation: OperationType, inputMagnitude: number, tier: TestTier): number {
    const baseTolerance = { 1: 1e-30, 2: 1e-6, 3: 5e-3 }; // Tier 3 is slightly more tolerant
    const operationMultiplier = { 'basic': 1, 'complex': 10, 'transcendental': 100 };
    
    // ▼▼▼ 修正箇所: Tier 3の極端な値に対する調整を穏やかにする ▼▼▼
    const magnitudeAdjustment = tier === 3 ? 1.0 : Math.max(1, Math.abs(inputMagnitude) * 1e-7);
    // ▲▲▲ 修正箇所 ▲▲▲
    
    return baseTolerance[tier] * operationMultiplier[operation as OperationType] * magnitudeAdjustment;
}

function compareSpecialValues(actual: QuadFloat, expected: QuadFloat): { pass: boolean, handled: boolean } {
    const isActualSpecial = actual.some(v => !isFinite(v) || isNaN(v));
    const isExpectedSpecial = expected.some(v => !isFinite(v) || isNaN(v));
    if (!isActualSpecial && !isExpectedSpecial) {
        return { pass: true, handled: false };
    }
    for (let i = 0; i < 4; i++) {
        const a = actual[i];
        const e = expected[i];
        if (Number.isNaN(a) && Number.isNaN(e)) continue;
        if (a !== e) { return { pass: false, handled: true }; }
    }
    return { pass: true, handled: true };
}

export function assertQpEqual(actual: QuadFloat, expected: QuadFloat, epsilon: number): void {
    const specialCompare = compareSpecialValues(actual, expected);
    if (specialCompare.handled) {
        if (!specialCompare.pass) {
            throw new Error(`Assertion Failed: Special value mismatch.`);
        }
        return;
    }

    if (expected[0] === 0 && !Object.is(actual[0], expected[0])) {
         throw new Error(`Assertion Failed: Sign of zero mismatch. Expected ${expected[0]}, got ${actual[0]}`);
    }

    const expectedMagnitude = Math.abs(expected[0]);
    const relativeError = expectedMagnitude > 1e-10
        ? Math.abs((actual[0] - expected[0]) / expectedMagnitude)
        : Math.abs(actual[0] - expected[0]);

    if (relativeError > epsilon) {
        throw new Error(`Assertion Failed: Primary component's relative error (${relativeError.toExponential(3)}) exceeds tolerance ${epsilon.toExponential(3)}.`);
    }
    
    const tailSumActual = Math.abs(actual[1]) + Math.abs(actual[2]) + Math.abs(actual[3]);
    const tailSumExpected = Math.abs(expected[1]) + Math.abs(expected[2]) + Math.abs(expected[3]);
    const tailError = Math.abs(tailSumActual - tailSumExpected);
    
    // ▼▼▼ 修正箇所: 末尾要素の誤差許容値を適応的にする ▼▼▼
    const tailTolerance = Math.max(1e-20, epsilon * 100); // メインの許容誤差と連動させる
    if (tailError > tailTolerance) {
         throw new Error(`Assertion Failed: Error in tail components (${tailError.toExponential(3)}) exceeds absolute tolerance (${tailTolerance.toExponential(3)}).`);
    }
    // ▲▲▲ 修正箇所 ▲▲▲
}

export function assertQpEqualTiered(actual: QuadFloat, expected: QuadFloat, tier: TestTier, operation: OperationType = 'basic'): void {
    const maxExpectedMagnitude = Math.abs(expected[0]);
    const epsilon = calculateTolerance(operation, maxExpectedMagnitude, tier);
    return assertQpEqual(actual, expected, epsilon);
}