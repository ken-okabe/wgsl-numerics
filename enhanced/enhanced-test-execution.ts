// enhanced-test-execution.ts
// 強化されたテストフレームワークを使用したテスト実行例

import { test, expect } from 'bun:test';
import {
    TestGenerator,
    QAMonitor,
    Diagnostics,
    type TestResult,
    type TestSuiteReport
} from './enhanced-test-framework';
import {
    assertQpEqualTiered,
    type QuadFloat,
    type TestTier,
    type OperationType
} from '../assertQpEqual';

// テストの前提条件（実際のrunKernelInBrowser関数が利用可能と仮定）
declare function runKernelInBrowser(
    wgslFilePath: string,
    kernelEntryPoint: string,
    input: number | number[]
): Promise<QuadFloat>;

// --- グローバルインスタンス ---
const testGenerator = new TestGenerator();
const qaMonitor = new QAMonitor();

// --- 強化されたテストスイート実行器 ---
async function executeEnhancedTestSuite(
    suiteName: string,
    operation: string,
    kernelBaseName: string,
    operationType: OperationType
): Promise<TestSuiteReport> {
    console.log(`\n=== Enhanced Test Suite: ${suiteName.toUpperCase()} ===`);
    
    const results: TestResult[] = [];
    const tierBreakdown: Record<TestTier, { passed: number; total: number }> = {
        1: { passed: 0, total: 0 },
        2: { passed: 0, total: 0 },
        3: { passed: 0, total: 0 }
    };
    
    // Tier 1: 厳密精度テスト
    console.log(`\n--- Tier 1: Exact Precision Tests ---`);
    const tier1Cases = testGenerator.generateTier1Cases(operation);
    
    for (let i = 0; i < tier1Cases.length; i++) {
        const testCase = tier1Cases[i];
        const testName = `${suiteName}_tier1_case${i + 1}`;
        
        const result = await executeTestCase(
            testName,
            testCase.input,
            testCase.expected,
            1,
            operationType,
            kernelBaseName
        );
        
        results.push(result);
        tierBreakdown[1].total++;
        if (result.passed) tierBreakdown[1].passed++;
    }
    
    // Tier 2: 実用精度テスト
    console.log(`\n--- Tier 2: Practical Precision Tests ---`);
    const tier2Cases = testGenerator.generateTier2Cases(operation);
    
    for (let i = 0; i < tier2Cases.length; i++) {
        const testCase = tier2Cases[i];
        const testName = `${suiteName}_tier2_case${i + 1}`;
        
        const result = await executeTestCase(
            testName,
            testCase.input,
            testCase.expected,
            2,
            operationType,
            kernelBaseName
        );
        
        results.push(result);
        tierBreakdown[2].total++;
        if (result.passed) tierBreakdown[2].passed++;
    }
    
    // Tier 3: ストレステスト
    console.log(`\n--- Tier 3: Stress Tests ---`);
    const tier3Cases = testGenerator.generateTier3Cases(operation);
    
    for (let i = 0; i < tier3Cases.length; i++) {
        const testCase = tier3Cases[i];
        const testName = `${suiteName}_tier3_case${i + 1}`;
        
        const result = await executeTestCase(
            testName,
            testCase.input,
            testCase.expected,
            3,
            operationType,
            kernelBaseName,
            testCase.customEpsilon
        );
        
        results.push(result);
        tierBreakdown[3].total++;
        if (result.passed) tierBreakdown[3].passed++;
    }
    
    // スイート結果の集計
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;
    
    const report: TestSuiteReport = {
        suiteName,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        averageExecutionTime,
        tierBreakdown,
        results
    };
    
    // 品質監視への記録
    qaMonitor.recordTestResult(report);
    
    // レポート出力
    console.log(`\n--- Test Suite Summary ---`);
    console.log(`Total: ${totalTests}, Passed: ${passedTests}, Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Average Execution Time: ${averageExecutionTime.toFixed(2)}ms`);
    
    // 失敗したテストの診断
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        console.log(`\n--- Failure Analysis ---`);
        for (const failedTest of failedTests.slice(0, 3)) { // 最大3件まで詳細表示
            console.log(failedTest.errorMessage || `Test ${failedTest.name} failed without error message`);
        }
    }
    
    return report;
}

// --- 個別テストケース実行器 ---
async function executeTestCase(
    testName: string,
    input: QuadFloat,
    expected: QuadFloat,
    tier: TestTier,
    operationType: OperationType,
    kernelBaseName: string,
    customEpsilon?: number
): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
        // Red段階テスト（失敗することを確認）
        console.log(`[TDD] Testing Red stage for ${testName}...`);
        let redPassed = false;
        try {
            const redResult = await runKernelInBrowser(
                'code/kernels.wgsl',
                `${kernelBaseName}_red`,
                input
            );
            
            if (customEpsilon) {
                assertQpEqual(redResult, expected, customEpsilon);
            } else {
                assertQpEqualTiered(redResult, expected, tier, operationType);
            }
            redPassed = true; // もし例外が発生しなかった場合
        } catch (e) {
            // Red段階では失敗が期待される
            console.log(`[TDD] Red stage correctly failed: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
        }
        
        if (redPassed) {
            throw new Error(`Red stage unexpectedly passed - TDD cycle violation`);
        }
        
        // Green段階テスト（成功することを確認）
        console.log(`[TDD] Testing Green stage for ${testName}...`);
        const greenResult = await runKernelInBrowser(
            'code/kernels.wgsl',
            `${kernelBaseName}_green`,
            input
        );
        
        if (customEpsilon) {
            assertQpEqual(greenResult, expected, customEpsilon);
        } else {
            assertQpEqualTiered(greenResult, expected, tier, operationType);
        }
        
        const endTime = performance.now();
        console.log(`[TDD] ${testName} passed (${(endTime - startTime).toFixed(2)}ms)`);
        
        return {
            name: testName,
            tier,
            operation: operationType,
            passed: true,
            executionTime: endTime - startTime
        };
        
    } catch (error) {
        const endTime = performance.now();
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error(`[TDD] ${testName} failed: ${errorMessage.split('\n')[0]}`);
        
        // 詳細診断の生成
        const diagnostics = Diagnostics.generateFailureDiagnostics(
            testName,
            [NaN, NaN, NaN, NaN], // 実際の値は取得できない場合
            expected,
            tier,
            operationType
        );
        console.log(diagnostics);
        
        return {
            name: testName,
            tier,
            operation: operationType,
            passed: false,
            executionTime: endTime - startTime,
            errorMessage
        };
    }
}

// --- メインテスト実行 ---
test("Enhanced WGSL Test Framework - Full Suite", async () => {
    console.log("\n=== ENHANCED WGSL TEST FRAMEWORK ===");
    
    // 複数のオペレーションをテスト
    const testSuites = [
        {
            name: 'qp_from_f32',
            operation: 'from_f32',
            kernelBaseName: 'qp_from_f32_main',
            operationType: 'basic' as OperationType
        },
        {
            name: 'qp_negate',
            operation: 'negate',
            kernelBaseName: 'qp_negate_main',
            operationType: 'basic' as OperationType
        },
        {
            name: 'qp_add',
            operation: 'add',
            kernelBaseName: 'qp_add_main',
            operationType: 'basic' as OperationType
        }
    ];
    
    const suiteReports: TestSuiteReport[] = [];
    
    for (const suite of testSuites) {
        try {
            const report = await executeEnhancedTestSuite(
                suite.name,
                suite.operation,
                suite.kernelBaseName,
                suite.operationType
            );
            suiteReports.push(report);
        } catch (error) {
            console.error(`Suite ${suite.name} failed with error:`, error);
            // スイート全体の失敗でもテストを継続
        }
    }
    
    // 総合品質レポートの生成
    console.log(`\n=== COMPREHENSIVE QUALITY REPORT ===`);
    const totalTests = suiteReports.reduce((sum, report) => sum + report.totalTests, 0);
    const totalPassed = suiteReports.reduce((sum, report) => sum + report.passedTests, 0);
    const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    console.log(`Overall Results: ${totalPassed}/${totalTests} (${overallPassRate.toFixed(1)}%)`);
    
    // 品質要件の検証
    expect(overallPassRate).toBeGreaterThan(80); // 最低80%の成功率を要求
    
    // パフォーマンス要件の検証
    const allResults = suiteReports.flatMap(report => report.results);
    const performanceReport = Diagnostics.generatePerformanceReport(allResults);
    console.log(`\n${performanceReport}`);
    
    const avgExecutionTime = allResults.reduce((sum, r) => sum + r.executionTime, 0) / allResults.length;
    expect(avgExecutionTime).toBeLessThan(100); // 平均実行時間100ms以下を要求
    
    // QAモニターからの品質レポート
    console.log(`\n${qaMonitor.generateQualityReport()}`);
    
    // Tier別の詳細分析
    console.log(`\n=== TIER-SPECIFIC ANALYSIS ===`);
    for (const tier of [1, 2, 3] as TestTier[]) {
        const tierResults = allResults.filter(r => r.tier === tier);
        if (tierResults.length > 0) {
            const tierPassRate = (tierResults.filter(r => r.passed).length / tierResults.length) * 100;
            const tierAvgTime = tierResults.reduce((sum, r) => sum + r.executionTime, 0) / tierResults.length;
            
            console.log(`Tier ${tier}: ${tierPassRate.toFixed(1)}% pass rate, ${tierAvgTime.toFixed(2)}ms avg time`);
            
            // Tier別の品質要件
            switch (tier) {
                case 1:
                    expect(tierPassRate).toBeGreaterThan(95); // Tier 1は95%以上
                    break;
                case 2:
                    expect(tierPassRate).toBeGreaterThan(85); // Tier 2は85%以上
                    break;
                case 3:
                    expect(tierPassRate).toBeGreaterThan(70); // Tier 3は70%以上（緩い要件）
                    break;
            }
        }
    }
    
    // 継続的改善の提案
    console.log(`\n=== CONTINUOUS IMPROVEMENT RECOMMENDATIONS ===`);
    if (overallPassRate < 90) {
        console.log(`• Overall pass rate (${overallPassRate.toFixed(1)}%) below target 90% - review failing test cases`);
    }
    
    if (avgExecutionTime > 50) {
        console.log(`• Average execution time (${avgExecutionTime.toFixed(2)}ms) above optimal 50ms - consider optimization`);
    }
    
    const failedTier1 = allResults.filter(r => r.tier === 1 && !r.passed);
    if (failedTier1.length > 0) {
        console.log(`• ${failedTier1.length} Tier 1 test(s) failed - critical precision issues need immediate attention`);
    }
    
    console.log(`\n=== TEST SUITE COMPLETE ===`);
    
}, { timeout: 60000 }); // 長時間実行のためタイムアウトを延長

// --- 回帰テスト専用スイート ---
test("Regression Test Suite", async () => {
    console.log("\n=== REGRESSION TEST SUITE ===");
    
    // 過去のバグケースを再現するテスト
    const regressionCases = [
        {
            name: "WGSL_f32_overflow_fix",
            description: "Ensure WGSL f32 literals don't exceed representable range",
            test: async () => {
                // 以前のバグ: 3.4028235e38 がWGSLで表現不可能だった
                const maxSafeF32 = 3.4028234e38;
                const input = createQuadFloat(maxSafeF32);
                
                const result = await runKernelInBrowser(
                    'code/kernels.wgsl',
                    'qp_negate_main_green',
                    input
                );
                
                const expected = createQuadFloat(-maxSafeF32);
                assertQpEqualTiered(result, expected, 2, 'basic');
            }
        },
        {
            name: "special_value_handling",
            description: "Verify special values (NaN, Infinity) are handled correctly",
            test: async () => {
                const specialInput: QuadFloat = [NaN, Infinity, -Infinity, 0];
                
                const result = await runKernelInBrowser(
                    'code/kernels.wgsl',
                    'qp_negate_main_green',
                    specialInput
                );
                
                // Tier 3では特殊値処理が不完全でも許容
                const expected: QuadFloat = [NaN, -Infinity, Infinity, -0];
                assertQpEqualTiered(result, expected, 3, 'basic');
            }
        },
        {
            name: "precision_boundary_test",
            description: "Test precision at f32 representation boundaries",
            test: async () => {
                // f32で正確に表現できる境界値
                const boundaryValues: QuadFloat = [0.5, 0.25, 0.125, 0.0625];
                
                const result = await runKernelInBrowser(
                    'code/kernels.wgsl',
                    'qp_negate_main_green',
                    boundaryValues
                );
                
                const expected: QuadFloat = [-0.5, -0.25, -0.125, -0.0625];
                assertQpEqualTiered(result, expected, 1, 'basic'); // Tier 1で厳密テスト
            }
        }
    ];
    
    let passedRegression = 0;
    const totalRegression = regressionCases.length;
    
    for (const regressionCase of regressionCases) {
        console.log(`\n--- Regression Test: ${regressionCase.name} ---`);
        console.log(`Description: ${regressionCase.description}`);
        
        try {
            await regressionCase.test();
            console.log(`✅ ${regressionCase.name} passed`);
            passedRegression++;
        } catch (error) {
            console.error(`❌ ${regressionCase.name} failed: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
        }
    }
    
    console.log(`\n--- Regression Test Summary ---`);
    console.log(`Passed: ${passedRegression}/${totalRegression} (${((passedRegression/totalRegression)*100).toFixed(1)}%)`);
    
    // 回帰テストは100%の成功率を要求
    expect(passedRegression).toBe(totalRegression);
    
}, { timeout: 30000 });

// --- 継続的品質保証テスト ---
test("Continuous Quality Assurance", async () => {
    console.log("\n=== CONTINUOUS QUALITY ASSURANCE ===");
    
    // 許容誤差の段階的引き下げテスト
    console.log(`\n--- Testing Precision Threshold Tightening ---`);
    const currentThresholds = qaMonitor.getCurrentThresholds();
    console.log(`Current thresholds:`, currentThresholds);
    
    // 模擬的な四半期レビュー
    console.log(`\n--- Simulating Quarterly Review ---`);
    qaMonitor.tightenTolerances();
    const newThresholds = qaMonitor.getCurrentThresholds();
    console.log(`New thresholds after tightening:`, newThresholds);
    
    // より厳しい閾値でのテスト実行
    const strictTestInput = createQuadFloat(1.5);
    const strictExpected = createQuadFloat(-1.5);
    
    try {
        const result = await runKernelInBrowser(
            'code/kernels.wgsl',
            'qp_negate_main_green',
            strictTestInput
        );
        
        // 新しい厳しい閾値でテスト
        assertQpEqual(result, strictExpected, newThresholds[1]);
        console.log(`✅ Precision improvement target met`);
    } catch (error) {
        console.warn(`⚠️ Precision target not yet achievable: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
        console.log(`This indicates areas for algorithm improvement`);
    }
    
    // パフォーマンス異常検出テスト
    console.log(`\n--- Performance Anomaly Detection ---`);
    const performanceBaseline = 10; // ms
    const performanceTests = [];
    
    for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await runKernelInBrowser(
            'code/kernels.wgsl',
            'qp_from_f32_main_green',
            42.0
        );
        const endTime = performance.now();
        performanceTests.push(endTime - startTime);
    }
    
    const avgPerformance = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
    const maxPerformance = Math.max(...performanceTests);
    
    console.log(`Performance stats: avg=${avgPerformance.toFixed(2)}ms, max=${maxPerformance.toFixed(2)}ms`);
    
    // パフォーマンス異常の検出
    if (maxPerformance > avgPerformance * 3) {
        console.warn(`⚠️ Performance outlier detected: ${maxPerformance.toFixed(2)}ms (${(maxPerformance/avgPerformance).toFixed(1)}x average)`);
    }
    
    // 基本的なパフォーマンス要件
    expect(avgPerformance).toBeLessThan(100);
    expect(maxPerformance).toBeLessThan(200);
    
}, { timeout: 45000 });

// --- テストデータの永続化とレポート生成 ---
test("Test Data Persistence and Reporting", async () => {
    console.log("\n=== TEST DATA PERSISTENCE AND REPORTING ===");
    
    // テスト履歴のシミュレーション
    const mockHistoricalData = [
        {
            suiteName: "qp_negate",
            totalTests: 20,
            passedTests: 19,
            failedTests: 1,
            averageExecutionTime: 15.5,
            tierBreakdown: {
                1: { passed: 8, total: 8 },
                2: { passed: 7, total: 8 },
                3: { passed: 4, total: 4 }
            },
            results: []
        },
        {
            suiteName: "qp_negate",
            totalTests: 20,
            passedTests: 20,
            failedTests: 0,
            averageExecutionTime: 14.2,
            tierBreakdown: {
                1: { passed: 8, total: 8 },
                2: { passed: 8, total: 8 },
                3: { passed: 4, total: 4 }
            },
            results: []
        }
    ];
    
    // 履歴データの記録
    for (const historicalReport of mockHistoricalData) {
        qaMonitor.recordTestResult(historicalReport as TestSuiteReport);
    }
    
    // 品質レポートの生成
    const qualityReport = qaMonitor.generateQualityReport();
    console.log(`\n${qualityReport}`);
    
    // レポートの検証
    expect(qualityReport).toContain("Quality Trend:");
    expect(qualityReport).toContain("Tier Breakdown");
    
    // CSV形式でのレポート出力（実用的な例）
    console.log(`\n--- CSV Export Format ---`);
    const csvHeader = "Suite,Total,Passed,Failed,PassRate,AvgTime,Tier1Rate,Tier2Rate,Tier3Rate";
    console.log(csvHeader);
    
    for (const report of mockHistoricalData) {
        const passRate = ((report.passedTests / report.totalTests) * 100).toFixed(1);
        const tier1Rate = ((report.tierBreakdown[1].passed / report.tierBreakdown[1].total) * 100).toFixed(1);
        const tier2Rate = ((report.tierBreakdown[2].passed / report.tierBreakdown[2].total) * 100).toFixed(1);
        const tier3Rate = ((report.tierBreakdown[3].passed / report.tierBreakdown[3].total) * 100).toFixed(1);
        
        const csvRow = `${report.suiteName},${report.totalTests},${report.passedTests},${report.failedTests},${passRate}%,${report.averageExecutionTime}ms,${tier1Rate}%,${tier2Rate}%,${tier3Rate}%`;
        console.log(csvRow);
    }
    
    console.log(`\n=== DATA PERSISTENCE COMPLETE ===`);
});

// ヘルパー関数（不足している場合）
function createQuadFloat(value: number): QuadFloat {
    return [value, 0, 0, 0];
}

function assertQpEqual(actual: QuadFloat, expected: QuadFloat, epsilon: number): void {
    // 実装は assertQpEqual.ts から import される想定
    throw new Error("assertQpEqual implementation required");
}