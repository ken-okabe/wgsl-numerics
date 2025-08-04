// tests/diagnostics.ts
import { type QuadFloat, type TestTier, type OperationType } from "./assert";

// --- 型定義 ---
export interface TestResult {
    name: string;
    tier: TestTier;
    passed: boolean;
    executionTime: number;
    errorMessage?: string;
    actual?: QuadFloat;
    expected?: QuadFloat;
}

export interface TestSuiteReport {
    suiteName: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageExecutionTime: number;
    tierBreakdown: Record<TestTier, { passed: number; total: number }>;
    results: TestResult[];
}


/**
 * 失敗した単一テストの詳細な診断レポートを生成します
 */
export function generateFailureDiagnostics(result: TestResult): string {
    if (result.passed) {
        return `No diagnostics needed for passed test: ${result.name}`;
    }
    if (!result.expected || !result.actual) {
        return `--- Failure Diagnostics for: ${result.name} ---\nError: ${result.errorMessage || 'Unknown error'}\n(No detailed data available)`;
    }

    const { name, tier, expected, actual, errorMessage } = result;
    const diagnostics = [`\n--- Failure Diagnostics for: ${name} ---`];
    diagnostics.push(`Tier: ${tier}`);

    // ▼▼▼ 修正箇所: ゼロの符号を明確に表示 ▼▼▼
    let formattedErrorMessage = errorMessage?.split('\n')[0] || '';
    if (formattedErrorMessage.includes("Sign of zero mismatch")) {
        const expectedSign = Object.is(expected[0], -0) ? '-0' : '+0';
        const actualSign = Object.is(actual[0], -0) ? '-0' : '+0';
        formattedErrorMessage = `Assertion Failed: Sign of zero mismatch. Expected ${expectedSign}, got ${actualSign}`;
    }
    diagnostics.push(`Error: ${formattedErrorMessage}`);
    // ▲▲▲ 修正箇所 ▲▲▲

    diagnostics.push(`\nExpected: [${expected.join(', ')}]`);
    diagnostics.push(`Actual:   [${actual.join(', ')}]`);

    diagnostics.push(`\n--- Component-wise Analysis ---`);
    let maxAbsDiff = 0;
    for (let i = 0; i < 4; i++) {
        const e = expected[i];
        const a = actual[i];
        if (a === undefined || e === undefined) {
            diagnostics.push(`[${i}]: Invalid component data.`);
            continue;
        }
        const absDiff = Math.abs(a - e);
        if (absDiff > maxAbsDiff) maxAbsDiff = absDiff;
        const relDiff = e !== 0 ? Math.abs((a - e) / e) : 0;
        diagnostics.push(`[${i}]: Exp=${e.toExponential(4)}, Act=${a.toExponential(4)}, AbsDiff=${absDiff.toExponential(2)}, RelDiff=${(relDiff * 100).toExponential(2)}%`);
    }

    diagnostics.push('\n--- Recommended Actions ---');
    if ((errorMessage || '').includes("Special value mismatch")) {
        diagnostics.push('• Review special value handling (NaN, Infinity) in the WGSL kernel.');
    } else if (tier === 1 && maxAbsDiff > 1e-15) {
        diagnostics.push('• Critical precision loss in Tier 1. Review the algorithm for fundamental errors.');
    } else {
        diagnostics.push('• Check for floating point inaccuracies or rounding errors. Consider if the tolerance for this tier is appropriate.');
    }

    return diagnostics.join('\n');
}