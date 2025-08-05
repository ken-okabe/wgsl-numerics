// code/tests/LV0_Axiom/assert.ts (Reintegrated and Tier-Adaptive)

export type QuadFloat = [number, number, number, number];
export type TestTier = 1 | 2 | 3;
// ▼▼▼ 再統合: 演算の種類を定義する型 ▼▼▼
export type OperationType = 'basic' | 'complex' | 'transcendental';
// ▲▲▲ 再統合 ▲▲▲

const SCALE = 10n ** 35n;

function qpToBigInt(a: QuadFloat): bigint {
    let total = 0n;
    try {
        if (!isFinite(a[0])) {
            if (isNaN(a[0])) return -1n;
            if (a[0] === Infinity) return -2n;
            if (a[0] === -Infinity) return -3n;
        }
        total += BigInt(Math.trunc(a[0])) * SCALE;
        total += BigInt(Math.round((a[0] - Math.trunc(a[0])) * Number(SCALE)));
        total += BigInt(Math.round(a[1] * Number(SCALE)));
        total += BigInt(Math.round(a[2] * Number(SCALE)));
        total += BigInt(Math.round(a[3] * Number(SCALE)));
    } catch (e) {
        return -4n;
    }
    return total;
}

/**
 * [UNCHANGED] The core BigInt-based equality assertion.
 * Can be called directly for a fixed tolerance, or used by assertQpEqualTiered.
 */
export function assertQpEqual(actual: QuadFloat, expected: QuadFloat, epsilon: number = 1e-30, verbose: boolean = false): void {
    const actualBigInt = qpToBigInt(actual);
    const expectedBigInt = qpToBigInt(expected);

    if (verbose) {
        console.log(`[Assert] Comparing values:`);
        console.log(`  - Epsilon       : ${epsilon}`);
        console.log(`  - Actual        : [${actual.join(', ')}]`);
        console.log(`  - Expected      : [${expected.join(', ')}]`);
        console.log(`  - Actual (BigInt) : ${actualBigInt.toString()}`);
        console.log(`  - Expected (BigInt): ${expectedBigInt.toString()}`);
    }

    if (actualBigInt <= -1n || expectedBigInt <= -1n) {
        if (actualBigInt === expectedBigInt) {
            if (verbose) console.log(`[Assert] PASSED (Non-finite values match).`);
            return;
        }
    }

    const diff = actualBigInt > expectedBigInt ? actualBigInt - expectedBigInt : expectedBigInt - actualBigInt;
    const toleranceBigInt = BigInt(Math.round(epsilon * Number(SCALE)));
    const expectedMagnitude = expectedBigInt > 0n ? expectedBigInt : -expectedBigInt;
    
    if (verbose) console.log(`  - Difference (BigInt): ${diff.toString()}`);

    if (expectedMagnitude === 0n) {
        if (verbose) console.log(`  - Tolerance for Zero (BigInt): ${toleranceBigInt.toString()}`);
        if (diff > toleranceBigInt) {
             throw new Error(`Assertion Failed (absolute tolerance for zero): Diff > Epsilon`);
        }
        if (verbose) console.log(`[Assert] PASSED (Within absolute tolerance for zero).`);
        return;
    }

    const relativeTolerance = (expectedMagnitude * toleranceBigInt) / SCALE;
    if (verbose) console.log(`  - Relative Tolerance (BigInt): ${relativeTolerance.toString()}`);

    if (diff > relativeTolerance) {
        throw new Error(
            `Assertion Failed: QuadFloat values are not equal within tolerance ${epsilon}.\n` +
            `  Expected: [${expected.join(', ')}]\n` +
            `  Actual:   [${actual.join(', ')}]`
        );
    }
    if (verbose) console.log(`[Assert] PASSED (Within relative tolerance).`);
}


// ▼▼▼ 再統合: code-bakから持ってきた適応的許容誤差の計算ロジック ▼▼▼
/**
 * Calculates an appropriate tolerance based on the test tier, operation type, and input magnitude.
 * This logic is reintegrated from the code-bak version.
 */
function calculateTolerance(operation: OperationType, inputMagnitude: number, tier: TestTier): number {
    const baseTolerance = { 1: 1e-30, 2: 1e-25, 3: 1e-20 };
    const operationMultiplier = { 'basic': 1, 'complex': 10, 'transcendental': 100 };
    
    // Tier 3の極端な値に対する調整を穏やかにする
    const magnitudeAdjustment = tier === 3 ? 1.0 : Math.max(1, Math.abs(inputMagnitude) * 1e-15);
    
    return baseTolerance[tier] * operationMultiplier[operation] * magnitudeAdjustment;
}
// ▲▲▲ 再統合 ▲▲▲


// ▼▼▼ 再統合: 適応的許容誤差を使用する高レベルなアサーション関数 ▼▼▼
/**
 * Asserts that two QuadFloat numbers are equal using a tiered, adaptive tolerance.
 * This is the recommended assertion function for most tests.
 */
export function assertQpEqualTiered(
    actual: QuadFloat, 
    expected: QuadFloat, 
    tier: TestTier, 
    operation: OperationType = 'basic',
    verbose: boolean = false
): void {
    const maxExpectedMagnitude = Math.abs(expected[0]);
    const epsilon = calculateTolerance(operation, maxExpectedMagnitude, tier);
    
    // 内部でBigIntベースのassertQpEqualを呼び出す
    return assertQpEqual(actual, expected, epsilon, verbose);
}
// ▲▲▲ 再統合 ▲▲▲