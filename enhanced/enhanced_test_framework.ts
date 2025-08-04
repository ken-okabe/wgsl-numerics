// enhanced-test-framework.ts
// ポリシー準拠の強化されたテストフレームワーク

import {
    assertQpEqual,
    assertQpEqualTiered,
    createQuadFloat,
    type QuadFloat,
    type TestTier,
    type OperationType
} from '../assertQpEqual';

// --- テストレポート生成 ---
export interface TestResult {
    name: string;
    tier: TestTier;
    operation: OperationType;
    passed: boolean;
    executionTime: number;
    errorMessage?: string;
    ulpDifference?: number;
    relativeError?: number;
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

// --- 自動テストケース生成器 ---
export class WGSLTestCaseGenerator {
    private readonly WGSL_F32_MAX = 3.4028234e38;
    
    /**
     * Tier 1用: f32で正確に表現可能な値のテストケース生成
     */
    generateTier1Cases(operation: string): Array<{input: QuadFloat, expected: QuadFloat}> {
        const cases: Array<{input: QuadFloat, expected: QuadFloat}> = [];
        
        // 整数値（完全に表現可能）
        const exactIntegers = [-1024, -1, 0, 1, 42, 1024];
        for (const val of exactIntegers) {
            const input = createQuadFloat(val);
            cases.push({
                input,
                expected: this.computeExpected(input, operation)
            });
        }
        
        // 2のべき乗の分数（完全に表現可能）
        const powerOfTwoFractions = [0.5, 0.25, 0.125, 0.0625, 0.03125];
        for (const val of powerOfTwoFractions) {
            const input = createQuadFloat(val);
            cases.push({
                input,
                expected: this.computeExpected(input, operation)
            });
            
            // 負の値も追加
            const negInput = createQuadFloat(-val);
            cases.push({
                input: negInput,
                expected: this.computeExpected(negInput, operation)
            });
        }
        
        return cases;
    }
    
    /**
     * Tier 2用: 実用的だがf32で不正確な値のテストケース生成
     */
    generateTier2Cases(operation: string): Array<{input: QuadFloat, expected: QuadFloat}> {
        const cases: Array<{input: QuadFloat, expected: QuadFloat}> = [];
        
        // 一般的な小数（f32で近似される）
        const commonDecimals = [0.1, 0.2, 0.3, 0.7, 0.9];
        for (const val of commonDecimals) {
            const input = createQuadFloat(val);
            cases.push({
                input,
                expected: this.computeExpectedWithF32Constraints(input, operation)
            });
        }
        
        // 科学技術計算でよく使われる定数
        const scientificConstants = [
            3.14159, // π近似
            2.71828, // e近似
            1.41421, // √2近似
            0.69314  // ln(2)近似
        ];
        
        for (const val of scientificConstants) {
            const input = createQuadFloat(val);
            cases.push({
                input,
                expected: this.computeExpectedWithF32Constraints(input, operation)
            });
        }
        
        return cases;
    }
    
    /**
     * Tier 3用: 極値・特殊値のテストケース生成
     */
    generateTier3Cases(operation: string): Array<{input: QuadFloat, expected: QuadFloat, customEpsilon?: number}> {
        const cases: Array<{input: QuadFloat, expected: QuadFloat, customEpsilon?: number}> = [];
        
        // 極大値・極小値
        const extremeValues = [
            1e-38,  // 非常に小さな正の値
            1e38,   // 非常に大きな正の値
            -1e38,  // 非常に大きな負の値
            this.WGSL_F32_MAX,  // f32最大値
            -this.WGSL_F32_MAX  // f32最小値
        ];
        
        for (const val of extremeValues) {
            const input = createQuadFloat(val);
            cases.push({
                input,
                expected: this.computeExpectedWithF32Constraints(input, operation),
                customEpsilon: 1e-2  // Tier 3では緩い許容誤差
            });
        }
        
        // 特殊値
        const specialValues = [
            { value: NaN, name: 'NaN' },
            { value: Infinity, name: 'Infinity' },
            { value: -Infinity, name: '-Infinity' },
            { value: 0, name: 'zero' },
            { value: -0, name: '-zero' }
        ];
        
        for (const {value, name} of specialValues) {
            const input = createQuadFloat(value);
            cases.push({
                input,
                expected: this.computeSpecialValueExpected(input, operation),
                customEpsilon: 1e-1  // 特殊値では非常に緩い許容誤差
            });
        }
        
        return cases;
    }
    
    private computeExpected(input: QuadFloat, operation: string): QuadFloat {
        // Tier 1: 数学的に正確な計算
        switch (operation) {
            case 'negate':
                return input.map(v => -v) as QuadFloat;
            case 'from_f32':
                return [input[0], 0, 0, 0];
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }
    
    private computeExpectedWithF32Constraints(input: QuadFloat, operation: string): QuadFloat {
        // Tier 2: f32制約下での現実的な計算
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
    
    private computeSpecialValueExpected(input: QuadFloat, operation: string): QuadFloat {
        // Tier 3: 特殊値処理（WGSL制限を考慮）
        return input.map(v => {
            if (isNaN(v)) return v;  // NaNはそのまま
            if (operation === 'negate') {
                if (v === Infinity) return -Infinity;
                if (v === -Infinity) return Infinity;
                return -v;
            }
            return v;
        }) as QuadFloat;
    }
}

// --- 継続的品質保証クラス ---
export class QualityAssuranceMonitor {
    private testHistory: TestSuiteReport[] = [];
    private precisionThresholds: Record<TestTier, number> = {
        1: 1e-30,  // Tier 1: 極めて厳格
        2: 1e-4,   // Tier 2: 実用的
        3: 1e-2    // Tier 3: 緩い
    };
    
    /**
     * テスト結果を記録し、品質監視を行う
     */
    recordTestResult(report: TestSuiteReport): void {
        this.testHistory.push(report);
        this.analyzeQualityTrends();
        this.detectRegressions();
    }
    
    /**
     * 品質トレンドの分析
     */
    private analyzeQualityTrends(): void {
        if (this.testHistory.length < 2) return;
        
        const current = this.testHistory[this.testHistory.length - 1];
        const previous = this.testHistory[this.testHistory.length - 2];
        
        const currentPassRate = current.passedTests / current.totalTests;
        const previousPassRate = previous.passedTests / previous.totalTests;
        
        if (currentPassRate < previousPassRate * 0.9) {  // 10%以上の品質低下
            console.warn(`[QA] Quality degradation detected: ${(currentPassRate * 100).toFixed(1)}% → ${(previousPassRate * 100).toFixed(1)}%`);
        }
        
        // パフォーマンス監視
        const avgTimeIncrease = (current.averageExecutionTime - previous.averageExecutionTime) / previous.averageExecutionTime;
        if (avgTimeIncrease > 0.2) {  // 20%以上の性能低下
            console.warn(`[QA] Performance degradation detected: ${avgTimeIncrease * 100}% slower`);
        }
    }
    
    /**
     * 回帰検出
     */
    private detectRegressions(): void {
        if (this.testHistory.length < 5) return;
        
        const recent = this.testHistory.slice(-5);
        const baseline = this.testHistory.slice(0, Math.min(5, this.testHistory.length - 5));
        
        if (baseline.length === 0) return;
        
        // 各Tierの成功率を比較
        for (const tier of [1, 2, 3] as TestTier[]) {
            const recentAvg = recent.reduce((sum, report) => {
                const tierStats = report.tierBreakdown[tier];
                return sum + (tierStats ? tierStats.passed / tierStats.total : 0);
            }, 0) / recent.length;
            
            const baselineAvg = baseline.reduce((sum, report) => {
                const tierStats = report.tierBreakdown[tier];
                return sum + (tierStats ? tierStats.passed / tierStats.total : 0);
            }, 0) / baseline.length;
            
            if (recentAvg < baselineAvg * 0.95) {  // 5%以上の低下
                console.warn(`[QA] Regression detected in Tier ${tier}: ${(recentAvg * 100).toFixed(1)}% vs baseline ${(baselineAvg * 100).toFixed(1)}%`);
            }
        }
    }
    
    /**
     * 品質レポートの生成
     */
    generateQualityReport(): string {
        if (this.testHistory.length === 0) {
            return "No test history available.";
        }
        
        const latest = this.testHistory[this.testHistory.length - 1];
        const report = [`=== Quality Assurance Report ===`];
        
        report.push(`Suite: ${latest.suiteName}`);
        report.push(`Total Tests: ${latest.totalTests}`);
        report.push(`Pass Rate: ${(latest.passedTests / latest.totalTests * 100).toFixed(1)}%`);
        report.push(`Average Execution Time: ${latest.averageExecutionTime.toFixed(2)}ms`);
        
        report.push(`\n--- Tier Breakdown ---`);
        for (const tier of [1, 2, 3] as TestTier[]) {
            const tierStats = latest.tierBreakdown[tier];
            if (tierStats && tierStats.total > 0) {
                const passRate = (tierStats.passed / tierStats.total * 100).toFixed(1);
                report.push(`Tier ${tier}: ${tierStats.passed}/${tierStats.total} (${passRate}%)`);
            }
        }
        
        if (this.testHistory.length > 1) {
            report.push(`\n--- Trend Analysis ---`);
            const previous = this.testHistory[this.testHistory.length - 2];
            const currentRate = latest.passedTests / latest.totalTests;
            const previousRate = previous.passedTests / previous.totalTests;
            const trend = currentRate > previousRate ? "↗️ Improving" : 
                         currentRate < previousRate ? "↘️ Declining" : "→ Stable";
            report.push(`Quality Trend: ${trend}`);
        }
        
        return report.join('\n');
    }
    
    /**
     * 許容誤差の段階的引き下げ（四半期毎）
     */
    tightenTolerances(): void {
        const reductionFactor = 0.9;  // 10%ずつ引き下げ
        
        for (const tier of [1, 2, 3] as TestTier[]) {
            this.precisionThresholds[tier] *= reductionFactor;
        }
        
        console.log(`[QA] Precision thresholds tightened by ${(1 - reductionFactor) * 100}%`);
        console.log(`New thresholds: Tier 1: ${this.precisionThresholds[1]}, Tier 2: ${this.precisionThresholds[2]}, Tier 3: ${this.precisionThresholds[3]}`);
    }
    
    getCurrentThresholds(): Record<TestTier, number> {
        return { ...this.precisionThresholds };
    }
}

// --- 自動診断・レポート機能 ---
export class DiagnosticReporter {
    /**
     * 失敗したテストの詳細診断
     */
    static generateFailureDiagnostics(
        testName: string,
        actual: QuadFloat,
        expected: QuadFloat,
        tier: TestTier,
        operation: OperationType
    ): string {
        const diagnostics = [`=== Test Failure Diagnostics ===`];
        diagnostics.push(`Test: ${testName}`);
        diagnostics.push(`Tier: ${tier} (${operation})`);
        diagnostics.push(`Expected: [${expected.join(', ')}]`);
        diagnostics.push(`Actual:   [${actual.join(', ')}]`);
        
        // 成分別分析
        diagnostics.push(`\n--- Component Analysis ---`);
        for (let i = 0; i < 4; i++) {
            const exp = expected[i];
            const act = actual[i];
            
            if (exp === undefined || act === undefined) {
                diagnostics.push(`[${i}] Invalid component`);
                continue;
            }
            
            const absDiff = Math.abs(act - exp);
            const relDiff = exp !== 0 ? Math.abs((act - exp) / exp) : 0;
            
            diagnostics.push(`[${i}] Expected: ${exp}, Actual: ${act}`);
            diagnostics.push(`    Absolute difference: ${absDiff.toExponential(3)}`);
            if (exp !== 0) {
                diagnostics.push(`    Relative difference: ${(relDiff * 100).toExponential(3)}%`);
            }
        }
        
        // 推奨対応策
        diagnostics.push(`\n--- Recommended Actions ---`);
        const maxRelError = Math.max(...expected.map((exp, i) => 
            exp !== 0 ? Math.abs((actual[i] - exp) / exp) : 0
        ));
        
        if (maxRelError > 1e-2) {
            diagnostics.push(`• Algorithm review needed (high relative error: ${maxRelError.toExponential(3)})`);
        } else if (maxRelError > 1e-4) {
            diagnostics.push(`• Consider moving to higher tier or adjusting tolerance`);
        } else {
            diagnostics.push(`• Minor precision issue - review rounding behavior`);
        }
        
        return diagnostics.join('\n');
    }
    
    /**
     * パフォーマンス分析レポート
     */
    static generatePerformanceReport(results: TestResult[]): string {
        const report = [`=== Performance Analysis ===`];
        
        const executionTimes = results.map(r => r.executionTime);
        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);
        
        report.push(`Average Execution Time: ${avgTime.toFixed(2)}ms`);
        report.push(`Min/Max: ${minTime.toFixed(2)}ms / ${maxTime.toFixed(2)}ms`);
        report.push(`Standard Deviation: ${this.calculateStdDev(executionTimes).toFixed(2)}ms`);
        
        // Tier別パフォーマンス
        report.push(`\n--- Performance by Tier ---`);
        for (const tier of [1, 2, 3] as TestTier[]) {
            const tierResults = results.filter(r => r.tier === tier);
            if (tierResults.length > 0) {
                const tierAvg = tierResults.reduce((sum, r) => sum + r.executionTime, 0) / tierResults.length;
                report.push(`Tier ${tier}: ${tierAvg.toFixed(2)}ms average`);
            }
        }
        
        // パフォーマンス警告
        if (maxTime > avgTime * 3) {
            report.push(`\n⚠️  Performance outlier detected: ${maxTime.toFixed(2)}ms (${(maxTime/avgTime).toFixed(1)}x average)`);
        }
        
        return report.join('\n');
    }
    
    private static calculateStdDev(values: number[]): number {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}

// --- エクスポート ---
export {
    WGSLTestCaseGenerator as TestGenerator,
    QualityAssuranceMonitor as QAMonitor,
    DiagnosticReporter as Diagnostics
};