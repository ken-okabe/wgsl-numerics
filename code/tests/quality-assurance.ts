// tests/quality-assurance.ts

import { type TestResult, type TestSuiteReport } from './diagnostics';
import { type TestTier } from './assert';

/**
 * テスト履歴に新しいスイートレポートを追加し、品質分析を行います
 */
export function analyzeHistory(
    currentHistory: TestSuiteReport[],
    newReport: TestSuiteReport
): { newHistory: TestSuiteReport[]; warnings: string[] } {
    const newHistory = [...currentHistory, newReport];
    const warnings: string[] = [];
    const current = newReport;

    if (newHistory.length >= 2) {
        const previous = newHistory[newHistory.length - 2];
        if (previous && current.suiteName === previous.suiteName) {
            const currentPassRate = current.totalTests > 0 ? current.passedTests / current.totalTests : 0;
            const previousPassRate = previous.totalTests > 0 ? previous.passedTests / previous.totalTests : 0;
            if (currentPassRate < previousPassRate * 0.95) {
                warnings.push(
                    `[QA Warning] Quality degradation in suite '${current.suiteName}': ` +
                    `Pass rate dropped from ${(previousPassRate * 100).toFixed(1)}% to ${(currentPassRate * 100).toFixed(1)}%`
                );
            }
            if (current.averageExecutionTime > previous.averageExecutionTime * 1.2) {
                 warnings.push(
                    `[QA Warning] Performance degradation in suite '${current.suiteName}': ` +
                    `Average time increased from ${previous.averageExecutionTime.toFixed(2)}ms to ${current.averageExecutionTime.toFixed(2)}ms`
                );
            }
        }
    }

    return { newHistory, warnings };
}

/**
 * テスト履歴全体からサマリーレポートを生成します
 */
export function generateQualityReport(history: TestSuiteReport[]): string {
    if (history.length === 0) {
        return "--- Quality Assurance Report ---\nNo test history available.";
    }
    const latest = history[history.length - 1];
    if (!latest) {
        return "--- Quality Assurance Report ---\nError: Could not retrieve the latest report.";
    }

    const report = [`--- Quality Assurance Report for Suite: ${latest.suiteName} ---`];
    const passRate = latest.totalTests > 0 ? (latest.passedTests / latest.totalTests * 100).toFixed(1) : "N/A";
    report.push(`Latest Run: ${latest.passedTests}/${latest.totalTests} passed (${passRate}%)`);
    report.push(`Average Execution Time: ${latest.averageExecutionTime.toFixed(2)}ms`);

    report.push(`\n--- Tier Breakdown ---`);
    for (const tier of [1, 2, 3] as TestTier[]) {
        const tierStats = latest.tierBreakdown[tier];
        if (tierStats && tierStats.total > 0) {
            const tierPassRate = (tierStats.passed / tierStats.total * 100).toFixed(1);
            report.push(`  Tier ${tier}: ${tierStats.passed}/${tierStats.total} (${tierPassRate}%)`);
        }
    }

    const previousRuns = history.filter(h => h.suiteName === latest.suiteName);
    if (previousRuns.length > 1) {
        const previous = previousRuns[previousRuns.length - 2];
        if (previous) {
            const currentRate = latest.totalTests > 0 ? latest.passedTests / latest.totalTests : 0;
            const previousRate = previous.totalTests > 0 ? previous.passedTests / previous.totalTests : 0;
            const trend = currentRate > previousRate ? "↗️ Improving" :
                          currentRate < previousRate ? "↘️ Declining" : "→ Stable";
            report.push(`\nQuality Trend vs. previous '${previous.suiteName}' run: ${trend}`);
        }
    }

    return report.join('\n');
}