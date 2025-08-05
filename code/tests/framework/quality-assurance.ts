// code/tests/framework/quality-assurance.ts (Reintegrated Version)

import type { TestResult, TestSuiteReport } from './diagnostics';
import type { TestTier } from '../LV0_Axiom/assert';

/**
 * テスト履歴に新しいスイートレポートを追加し、品質分析を行う
 */
export function analyzeHistory(
    currentHistory: TestSuiteReport[],
    newReport: TestSuiteReport
): { newHistory: TestSuiteReport[]; warnings: string[] } {
    const newHistory = [...currentHistory, newReport];
    const warnings: string[] = [];
    const current = newReport;

    const previousRun = currentHistory.find(h => h.suiteName === current.suiteName);

    if (previousRun) {
        const currentPassRate = current.totalTests > 0 ? current.passedTests / current.totalTests : 0;
        const previousPassRate = previousRun.totalTests > 0 ? previousRun.passedTests / previousRun.totalTests : 0;
        
        if (currentPassRate < previousPassRate) {
            warnings.push(
                `[QA Warning] Quality degradation in suite '${current.suiteName}': ` +
                `Pass rate dropped from ${(previousPassRate * 100).toFixed(1)}% to ${(currentPassRate * 100).toFixed(1)}%`
            );
        }
        if (current.averageExecutionTime > previousRun.averageExecutionTime * 1.2 && previousRun.averageExecutionTime > 0) {
             warnings.push(
                `[QA Warning] Performance degradation in suite '${current.suiteName}': ` +
                `Average time increased by ${((current.averageExecutionTime / previousRun.averageExecutionTime - 1) * 100).toFixed(0)}%`
            );
        }
    }

    return { newHistory, warnings };
}

/**
 * テストスイートの結果を集計する
 */
export function generateSuiteReport(suiteName: string, results: TestResult[]): TestSuiteReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / (totalTests || 1);
    const tierBreakdown: Record<TestTier, { passed: number, total: number }> = { 1: {passed:0, total:0}, 2: {passed:0, total:0}, 3: {passed:0, total:0} };

    for(const r of results) {
        tierBreakdown[r.tier].total++;
        if (r.passed) tierBreakdown[r.tier].passed++;
    }

    return {
        suiteName,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        averageExecutionTime,
        tierBreakdown,
        results,
    };
}

/**
 * ▼▼▼ 再統合: テスト履歴全体から品質トレンドを含むサマリーレポートを生成する ▼▼▼
 */
export function generateQualityReport(history: TestSuiteReport[]): string {
    if (history.length === 0) {
        return "--- Quality Assurance Report ---\nNo test history available.";
    }

    const reportLines: string[] = [];
    const reportBySuite: { [name: string]: TestSuiteReport[] } = {};

    // スイートごとに履歴をグループ化
    for (const report of history) {
        if (!reportBySuite[report.suiteName]) {
            reportBySuite[report.suiteName] = [];
        }
        reportBySuite[report.suiteName].push(report);
    }

    for (const suiteName in reportBySuite) {
        const suiteHistory = reportBySuite[suiteName];
        const latest = suiteHistory[suiteHistory.length - 1];
        if (!latest) continue;

        const suiteTitle = `--- Quality Assurance Report for Func: ${latest.suiteName} ---`;
        reportLines.push(suiteTitle);
        
        const passRate = latest.totalTests > 0 ? (latest.passedTests / latest.totalTests * 100).toFixed(1) : "N/A";
        reportLines.push(`Latest Run: ${latest.passedTests}/${latest.totalTests} passed (${passRate}%)`);
        reportLines.push(`Average Execution Time: ${latest.averageExecutionTime.toFixed(2)}ms`);

        reportLines.push(`\n--- Tier Breakdown ---`);
        for (const tier of [1, 2, 3] as TestTier[]) {
            const tierStats = latest.tierBreakdown[tier];
            if (tierStats && tierStats.total > 0) {
                const tierPassRate = (tierStats.passed / tierStats.total * 100).toFixed(1);
                reportLines.push(`  Tier ${tier}: ${tierStats.passed}/${tierStats.total} (${tierPassRate}%)`);
            }
        }

        // トレンド分析
        if (suiteHistory.length > 1) {
            const previous = suiteHistory[suiteHistory.length - 2];
            if (previous) {
                const currentRate = latest.totalTests > 0 ? latest.passedTests / latest.totalTests : 0;
                const previousRate = previous.totalTests > 0 ? previous.passedTests / previous.totalTests : 0;
                const trend = currentRate > previousRate ? "↗️ Improving" :
                              currentRate < previousRate ? "↘️ Declining" : "→ Stable";
                reportLines.push(`\nQuality Trend vs. previous run: ${trend}`);
            }
        }
        reportLines.push("-".repeat(suiteTitle.length));
    }

    return reportLines.join('\n');
}