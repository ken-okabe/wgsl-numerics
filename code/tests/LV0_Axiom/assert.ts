// code/tests/LV0_Axiom/assert.ts (Reintegrated and Refined)

export type QuadFloat = [number, number, number, number];
export type TestTier = 1 | 2 | 3;


// 小数点以下の精度を35桁まで保持するスケーリングファクター
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
        return -4n; // Represents an unknown non-finite
    }
    return total;
}

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
        // エラーメッセージはスタックトレースから追えるように、実際の値と期待値を含める
        throw new Error(
            `Assertion Failed: QuadFloat values are not equal within tolerance ${epsilon}.\n` +
            `  Expected: [${expected.join(', ')}]\n` +
            `  Actual:   [${actual.join(', ')}]`
        );
    }
    if (verbose) console.log(`[Assert] PASSED (Within relative tolerance).`);
}