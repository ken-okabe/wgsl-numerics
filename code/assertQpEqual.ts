// assertQpEqual.ts (Final Corrected Version using BigInt)

export type QuadFloat = [number, number, number, number];

// 小数点以下の精度を35桁まで保持するスケーリングファクター
const SCALE = 10n ** 35n;

/**
 * Converts a QuadFloat to a scaled BigInt to preserve precision.
 */
function qpToBigInt(a: QuadFloat): bigint {
    let total = 0n;
    try {
        // BigInt() can fail on non-finite numbers
        total += BigInt(Math.trunc(a[0])) * SCALE;
        total += BigInt(Math.round((a[0] - Math.trunc(a[0])) * Number(SCALE)));
        total += BigInt(Math.round(a[1] * Number(SCALE)));
        total += BigInt(Math.round(a[2] * Number(SCALE)));
        total += BigInt(Math.round(a[3] * Number(SCALE)));
    } catch (e) {
        // Handle NaN/Infinity by returning a unique BigInt value for each case
        if (isNaN(a[0])) return -1n;
        if (a[0] === Infinity) return -2n;
        if (a[0] === -Infinity) return -3n;
    }
    return total;
}

/**
 * Asserts that two QuadFloat numbers are equal within a relative tolerance.
 * This version uses BigInt to avoid precision loss during comparison.
 */
export function assertQpEqual(actual: QuadFloat, expected: QuadFloat, epsilon: number = 1e-30): void {
    const actualBigInt = qpToBigInt(actual);
    const expectedBigInt = qpToBigInt(expected);

    // Handle non-finite cases based on their unique BigInt representation
    if (actualBigInt <= -1n || expectedBigInt <= -1n) {
        if (actualBigInt === expectedBigInt) {
            return; // Pass if both are the same non-finite type (e.g., NaN)
        }
    }

    const diff = actualBigInt > expectedBigInt ? actualBigInt - expectedBigInt : expectedBigInt - actualBigInt;

    // The tolerance also needs to be scaled
    const toleranceBigInt = BigInt(Math.round(epsilon * Number(SCALE)));
    
    // For relative error, we use the magnitude of the expected value
    const expectedMagnitude = expectedBigInt > 0n ? expectedBigInt : -expectedBigInt;
    const relativeTolerance = (expectedMagnitude * toleranceBigInt) / SCALE;

    if (diff > relativeTolerance) {
        throw new Error(
            `Assertion Failed: QuadFloat values are not equal within tolerance ${epsilon}.\n` +
            `  Expected: [${expected.join(', ')}]\n` +
            `  Actual:   [${actual.join(', ')}]\n` +
            `  (Difference in BigInt representation exceeds tolerance)`
        );
    }
}