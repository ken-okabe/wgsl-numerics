// code/tests/framework/diagnostics.ts (Reintegrated Version)

import { type QuadFloat, type TestTier } from "../LV0_Axiom/assert";

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
 * (code-bakの推奨アクション機能と詳細エラーメッセージを再統合)
 */
export function generateFailureDiagnostics(result: TestResult): string {
    if (result.passed || !result.expected || !result.actual) {
        return '';
    }

    const { name, tier, expected, actual, errorMessage } = result;
    const diagnostics = [`\n--- Failure Diagnostics for: ${name} ---`];
    diagnostics.push(`Tier: ${tier}`);

    // ▼▼▼ 再統合: ゼロの符号に関するエラーメッセージをより詳細に ▼▼▼
    let formattedErrorMessage = errorMessage?.split('\n')[0] || 'Unknown assertion error';
    if (formattedErrorMessage.includes("Sign of zero mismatch")) {
        const expectedSign = Object.is(expected[0], -0) ? '-0' : '+0';
        const actualSign = Object.is(actual[0], -0) ? '-0' : '+0';
        formattedErrorMessage = `Assertion Failed: Sign of zero mismatch. Expected ${expectedSign}, got ${actualSign}`;
    }
    diagnostics.push(`Error: ${formattedErrorMessage}`);
    // ▲▲▲ 再統合 ▲▲▲

    diagnostics.push(`\nExpected: [${expected.join(', ')}]`);
    diagnostics.push(`Actual:   [${actual.join(', ')}]`);

    diagnostics.push(`\n--- Component-wise Analysis ---`);
    let maxAbsDiff = 0;
    for (let i = 0; i < 4; i++) {
        const e = expected[i];
        const a = actual[i];
        if (a === undefined || e === undefined) continue;
        const absDiff = Math.abs(a - e);
        if (absDiff > maxAbsDiff) maxAbsDiff = absDiff;
        const relDiff = e !== 0 ? Math.abs((a - e) / e) : (a !== 0 ? Infinity : 0);
        diagnostics.push(`[${i}]: Exp=${e.toExponential(4)}, Act=${a.toExponential(4)}, AbsDiff=${absDiff.toExponential(2)}, RelDiff=${(relDiff * 100).toExponential(2)}%`);
    }

    // ▼▼▼ 再統合: 失敗原因に応じた推奨アクションを提示 ▼▼▼
    diagnostics.push('\n--- Recommended Actions ---');
    if ((errorMessage || '').includes("Special value mismatch")) {
        diagnostics.push('• Review special value handling (NaN, Infinity) in the WGSL kernel.');
    } else if (tier === 1 && maxAbsDiff > 1e-15) {
        diagnostics.push('• Critical precision loss in Tier 1. Review the algorithm for fundamental errors.');
    } else {
        diagnostics.push('• Check for floating point inaccuracies or rounding errors. Consider if the tolerance for this tier is appropriate.');
    }
    // ▲▲▲ 再統合 ▲▲▲

    return diagnostics.join('\n');
}