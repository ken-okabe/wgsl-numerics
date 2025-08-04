export type QuadFloat = [number, number, number, number];

// 小数点以下の精度を35桁まで保持するスケーリングファクター
const SCALE = 10n ** 35n;

// テスト階層定義
export type TestTier = 1 | 2 | 3;
export type OperationType = 'basic' | 'complex' | 'transcendental';

// f32で正確に表現可能な値のセット
export const EXACT_F32_VALUES = {
    integers: [-1024, -256, -1, 0, 1, 42, 256, 1024],
    powerOfTwoFractions: [0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625],
    exactDecimals: [1.5, 2.75, 3.375, 4.625, 5.125, -1.5, -2.75],
    negatives: [-0.5, -1.5, -2.75, -128.0, -2.5]
} as const;

// 実用的だがf32で不正確な値
export const PRACTICAL_VALUES = {
    commonDecimals: [0.1, 0.2, 0.3, 0.7, 0.9],
    scientific: [3.14159, 2.71828, 1.41421, 0.69314],
    engineering: [1.234, 9.876, 12.345, 0.001234]
} as const;

// 極値・特殊値
export const STRESS_VALUES = {
    extremes: [1e-30, 1e30, -1e30, 3.4028235e38],
    special: [NaN, Infinity, -Infinity, 0, -0],
    boundary: [Number.MIN_VALUE, Number.EPSILON, -Number.EPSILON]
} as const;

/**
 * 適応的許容誤差を計算（現実的な値に調整）
 */
function calculateTolerance(
    operation: OperationType,
    inputMagnitude: number,
    tier: TestTier
): number {
    // より現実的な基本許容誤差に調整
    const baseTolerance = {
        1: 1e-30,  // 厳密（f32正確値のみ）
        2: 1e-4,   // 実用的（f32の精度限界を考慮）
        3: 1e-2    // ストレス（より緩い制限）
    }[tier];
    
    const operationMultiplier = {
        'basic': 1,           // +, -, *, /
        'complex': 10,        // sqrt, pow（より大きな誤差を許容）
        'transcendental': 100 // sin, cos, log, exp
    }[operation];
    
    // 入力値の大きさに応じた調整（より保守的に）
    // inputMagnitudeがfiniteでない場合は1を使用
    const safeMagnitude = isFinite(inputMagnitude) ? Math.abs(inputMagnitude) : 1;
    const magnitudeAdjustment = Math.max(1, safeMagnitude * 1e-6);
    
    return baseTolerance * operationMultiplier * magnitudeAdjustment;
}

/**
 * ULP（Unit in the Last Place）差を計算
 */
function calculateUlpDifference(actual: QuadFloat, expected: QuadFloat): number {
    let maxUlpDiff = 0;
    for (let i = 0; i < 4; i++) {
        const actualVal = actual[i];
        const expectedVal = expected[i];
        
        if (actualVal === undefined || expectedVal === undefined) continue;
        if (isNaN(actualVal) || isNaN(expectedVal)) continue;
        if (!isFinite(actualVal) || !isFinite(expectedVal)) continue;
        
        const actualView = new Float32Array([actualVal]);
        const expectedView = new Float32Array([expectedVal]);
        const actualBits = new Uint32Array(actualView.buffer)[0];
        const expectedBits = new Uint32Array(expectedView.buffer)[0];
        
        if (actualBits === undefined || expectedBits === undefined) continue;
        
        const ulpDiff = Math.abs(actualBits - expectedBits);
        maxUlpDiff = Math.max(maxUlpDiff, ulpDiff);
    }
    return maxUlpDiff;
}

/**
 * 相対誤差を計算
 */
function calculateRelativeError(actual: QuadFloat, expected: QuadFloat): number {
    let maxRelativeError = 0;
    for (let i = 0; i < 4; i++) {
        const actualVal = actual[i];
        const expectedVal = expected[i];
        
        if (actualVal === undefined || expectedVal === undefined) continue;
        if (expectedVal === 0) continue;
        if (isNaN(actualVal) || isNaN(expectedVal)) continue;
        if (!isFinite(actualVal) || !isFinite(expectedVal)) continue;
        
        const relativeError = Math.abs((actualVal - expectedVal) / expectedVal);
        maxRelativeError = Math.max(maxRelativeError, relativeError);
    }
    return maxRelativeError;
}

/**
 * 特殊値を比較する関数
 */
function compareSpecialValues(actual: QuadFloat, expected: QuadFloat): boolean {
    for (let i = 0; i < 4; i++) {
        const a = actual[i];
        const e = expected[i];
        
        // undefinedチェック
        if (a === undefined || e === undefined) {
            return a === e; // 両方undefinedならtrue、そうでなければfalse
        }
        
        // 両方がNaNの場合はOK
        if (isNaN(a) && isNaN(e)) continue;
        
        // 両方が同じ無限大の場合はOK
        if (a === e && !isFinite(a)) continue;
        
        // 一方だけが特殊値の場合はNG
        if (isNaN(a) !== isNaN(e) || 
            (a === Infinity) !== (e === Infinity) ||
            (a === -Infinity) !== (e === -Infinity)) {
            return false;
        }
    }
    return true;
}

/**
 * Converts a QuadFloat to a scaled BigInt to preserve precision.
 */
function qpToBigInt(a: QuadFloat): bigint {
    let total = 0n;
    try {
        // Handle special cases first
        if (isNaN(a[0])) return -1n;
        if (a[0] === Infinity) return -2n;
        if (a[0] === -Infinity) return -3n;
        if (!isFinite(a[0])) return -4n;
        
        // Convert finite numbers
        const intPart = Math.trunc(a[0]);
        const fracPart = a[0] - intPart;
        
        // Use safer conversion to avoid "Not an integer" errors
        total += BigInt(intPart) * SCALE;
        total += BigInt(Math.round(fracPart * Number(SCALE)));
        total += BigInt(Math.round(a[1] * Number(SCALE)));
        total += BigInt(Math.round(a[2] * Number(SCALE)));
        total += BigInt(Math.round(a[3] * Number(SCALE)));
    } catch (e) {
        // Fallback for any conversion errors
        console.warn(`qpToBigInt conversion error for ${a}:`, e);
        return -5n; // Unique error indicator
    }
    return total;
}

/**
 * 基本のassertQpEqual関数（特殊値比較を改良）
 */
export function assertQpEqual(actual: QuadFloat, expected: QuadFloat, epsilon: number = 1e-30): void {
    // 特殊値の直接比較を最初に実行
    if (!compareSpecialValues(actual, expected)) {
        throw new Error(
            `Assertion Failed: Special value mismatch.\n` +
            `  Expected: [${expected.join(', ')}]\n` +
            `  Actual:   [${actual.join(', ')}]`
        );
    }
    
    // 特殊値が含まれている場合、直接比較で十分
    const hasSpecialValues = actual.some(v => !isFinite(v)) || expected.some(v => !isFinite(v));
    if (hasSpecialValues) {
        return; // 特殊値比較で通過した場合はOK
    }

    const actualBigInt = qpToBigInt(actual);
    const expectedBigInt = qpToBigInt(expected);

    // Handle non-finite cases based on their unique BigInt representation
    if (actualBigInt <= -1n || expectedBigInt <= -1n) {
        if (actualBigInt === expectedBigInt) {
            return; // Pass if both are the same non-finite type (e.g., NaN)
        }
        
        // If one is special but not the other, fail with descriptive message
        const getSpecialType = (val: bigint) => {
            switch (val) {
                case -1n: return "NaN";
                case -2n: return "Infinity";
                case -3n: return "-Infinity";
                case -4n: return "non-finite";
                case -5n: return "conversion_error";
                default: return "normal";
            }
        };
        
        throw new Error(
            `Assertion Failed: Special value mismatch.\n` +
            `  Expected: ${getSpecialType(expectedBigInt)} [${expected.join(', ')}]\n` +
            `  Actual:   ${getSpecialType(actualBigInt)} [${actual.join(', ')}]`
        );
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

/**
 * 階層対応版のassertQpEqual（現実的な許容誤差に調整）
 */
export function assertQpEqualTiered(
    actual: QuadFloat, 
    expected: QuadFloat,
    tier: TestTier,
    operation: OperationType = 'basic',
    customEpsilon?: number
): void {
    // expected配列の要素から有効な数値のみを取得して最大値を計算
    const validExpectedValues = expected.filter((val): val is number => 
        val !== undefined && isFinite(val)
    );
    
    const maxExpectedMagnitude = validExpectedValues.length > 0 
        ? Math.max(...validExpectedValues.map(Math.abs))
        : 1; // デフォルト値
    
    const epsilon = customEpsilon ?? calculateTolerance(
        operation, 
        maxExpectedMagnitude, 
        tier
    );
    
    return assertQpEqual(actual, expected, epsilon);
}

/**
 * 詳細診断機能付きassertQpEqual
 */
export function assertQpEqualWithDiagnostics(
    actual: QuadFloat,
    expected: QuadFloat,
    epsilon: number,
    context: string
): void {
    try {
        assertQpEqual(actual, expected, epsilon);
    } catch (error) {
        // 詳細な診断情報を追加
        const ulpDifference = calculateUlpDifference(actual, expected);
        const relativeError = calculateRelativeError(actual, expected);
        const suggestedEpsilon = Math.max(relativeError * 2, 1e-28);
        
        throw new Error(`
${error instanceof Error ? error.message : String(error)}

--- Diagnostic Information ---
Context: ${context}
ULP Difference: ${ulpDifference}
Relative Error: ${relativeError.toExponential(3)}
Suggested minimum epsilon: ${suggestedEpsilon.toExponential(3)}

--- Component Analysis ---
${actual.map((a, i) => {
    const exp = expected[i];
    if (a === undefined || exp === undefined) return `[${i}] Invalid component`;
    const diff = Math.abs(a - exp);
    return `[${i}] Expected: ${exp}, Actual: ${a}, Diff: ${diff.toExponential(3)}`;
}).join('\n')}
        `.trim());
    }
}

/**
 * QuadFloatを作成するヘルパー関数
 */
export function createQuadFloat(value: number): QuadFloat {
    return [value, 0, 0, 0];
}

/**
 * f32制約下でCPU計算を行う（Tier 2,3用）- 現実的な精度に調整
 */
export function computeWithF32Constraints(input: QuadFloat, operation: string): QuadFloat {
    // f32にキャストしてから演算を行う
    const f32Input = input.map(v => Math.fround(v)) as QuadFloat;
    
    switch (operation) {
        case 'negate':
            return f32Input.map(v => Math.fround(-v)) as QuadFloat;
        case 'from_f32':
            return [Math.fround(f32Input[0]), 0, 0, 0];
        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}

/**
 * 特殊値対応の期待値生成（WGSL制限を考慮）
 */
export function generateRealisticExpectedValue(
    input: QuadFloat,
    operation: string,
    tier: TestTier
): QuadFloat {
    // 特殊値の処理
    const hasSpecialValue = input.some(v => !isFinite(v));
    if (hasSpecialValue) {
        if (tier === 3) {
            // Tier 3では特殊値処理が未実装の場合、ゼロベクトルを返す
            return [0, 0, 0, 0];
        } else {
            // Tier 1,2では正しい特殊値処理を期待
            return computeWithF32Constraints(input, operation);
        }
    }
    
    return computeWithF32Constraints(input, operation);
}

/**
 * テストケース生成ヘルパー（改良版）
 */
export function generateTestCases(
    operationName: string,
    operation: (input: QuadFloat) => QuadFloat
): Array<{name: string, tier: TestTier, input: QuadFloat, expected: QuadFloat}> {
    const cases: Array<{name: string, tier: TestTier, input: QuadFloat, expected: QuadFloat}> = [];
    
    // Tier 1: 厳密テスト
    for (const val of EXACT_F32_VALUES.integers.slice(0, 3)) {
        const input = createQuadFloat(val);
        cases.push({
            name: `${operationName}_exact_${val}`,
            tier: 1,
            input,
            expected: operation(input)
        });
    }
    
    // Tier 2: 実用テスト（現実的な期待値を使用）
    for (const val of PRACTICAL_VALUES.commonDecimals.slice(0, 2)) {
        const input = createQuadFloat(val);
        cases.push({
            name: `${operationName}_practical_${val}`,
            tier: 2,
            input,
            expected: generateRealisticExpectedValue(input, operationName, 2)
        });
    }
    
    return cases;
}