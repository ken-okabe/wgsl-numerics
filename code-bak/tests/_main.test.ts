// tests/main.test.ts

import { test, expect, beforeAll, afterAll } from 'bun:test';
import type { Subprocess } from "bun";
import type { ServerWebSocket } from "bun";

// 型定義とアサーション関数
import { assertQpEqualTiered, type QuadFloat, type TestTier, type OperationType } from './assert';
// テストケース生成関数
import * as TestCaseGenerator from './test-case-generator';
import type { TestCase } from './test-case-generator';
// 品質保証と診断関数
import * as QualityAssurance from './quality-assurance';
import * as Diagnostics from './diagnostics';
import type { TestResult, TestSuiteReport } from './diagnostics';

// --- 実行基盤 ---
let server: ReturnType<typeof Bun.serve>;
let chromeProcess: Subprocess;
let ws: ServerWebSocket<unknown> | undefined;
let currentTestResolver: ((result: string) => void) | undefined;
beforeAll(async () => {
    Bun.spawnSync({ cmd: ["pkill", "-f", "google-chrome.*--user-data-dir=/tmp/wgsl-numerics-test-fp"] });
    const wsReadyPromise = new Promise<void>(resolve => {
        server = Bun.serve({
            port: 0,
            fetch(req) {
                if (server.upgrade(req)) return;
                return new Response(Bun.file("code/_test-runner.html"));
            },
            websocket: {
                open(newWs) { ws = newWs; resolve(); },
                message(ws, msg) {
                    if (typeof msg === 'string' && currentTestResolver) {
                        try {
                            const parsedMsg = JSON.parse(msg);
                            currentTestResolver(parsedMsg.result);
                        } catch (e) { console.error("Failed to parse message from browser:", msg); }
                    }
                },
            },
        });
    });
    chromeProcess = Bun.spawn({
        cmd: ["google-chrome-stable", "--headless=new", "--no-sandbox", "--enable-unsafe-webgpu", `--user-data-dir=/tmp/wgsl-numerics-test-fp`, `--no-first-run`, `http://localhost:${server.port}`],
        stdout: "ignore", stderr: "inherit",
    });
    await wsReadyPromise;
});
afterAll(() => {
    if (ws) ws.send(JSON.stringify({ command: 'close' }));
    chromeProcess.kill();
    server.stop(true);
});

async function runKernelInBrowser(kernelEntryPoint: string, input: number | number[]): Promise<QuadFloat> {
    if (!ws) throw new Error("WebSocket connection not established.");
    const resultPromise = new Promise<string>(resolve => { currentTestResolver = resolve; });
    try {
        const wgslCode = await Bun.file('code/kernels.wgsl').text();
        
        const serializableInput = (Array.isArray(input) ? input : [input]).map(v => {
            if (Number.isNaN(v)) return 'NaN';
            if (v === Infinity) return 'Infinity';
            if (v === -Infinity) return '-Infinity';
            if (Object.is(v, -0)) return '-0';
            return v;
        });
        
        ws.send(JSON.stringify({ wgslCode, kernelEntryPoint, input: serializableInput }));
        const resultRaw = await resultPromise;
        if (resultRaw.startsWith('GPU_EXECUTION_ERROR:')) { throw new Error(resultRaw); }
        return resultRaw.split(',').map(Number) as QuadFloat;
    } finally {
        currentTestResolver = undefined;
    }
}
// --- 実行基盤ここまで ---

async function executeSingleTestCase(
    kernelBaseName: string,
    testCase: TestCase,
    operationType: OperationType
): Promise<TestResult> {
    const { name, tier, input, expected } = testCase;
    const startTime = performance.now();
    let errorMessage: string | undefined;
    let actual: QuadFloat | undefined;
    try {
        let redDidFailAsExpected = false;
        try {
            const redActual = await runKernelInBrowser(`${kernelBaseName}_red`, input);
            assertQpEqualTiered(redActual, expected, tier, operationType);
        } catch (e) {
            redDidFailAsExpected = true;
        }
        if (!redDidFailAsExpected) {
            throw new Error("TDD Violation: Red stage unexpectedly passed.");
        }
        actual = await runKernelInBrowser(`${kernelBaseName}_green`, input);
        assertQpEqualTiered(actual, expected, tier, operationType);
    } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
        const executionTime = performance.now() - startTime;
        return { name, tier, passed: !errorMessage, executionTime, errorMessage, actual, expected };
    }
}

function createSuiteReport(suiteName: string, results: TestResult[]): TestSuiteReport {
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / (totalTests || 1);
    const tierBreakdown: Record<TestTier, { passed: number, total: number }> = { 1: {passed:0, total:0}, 2: {passed:0, total:0}, 3: {passed:0, total:0} };
    for(const r of results) {
        tierBreakdown[r.tier].total++;
        if (r.passed) tierBreakdown[r.tier].passed++;
    }
    return { suiteName, totalTests, passedTests, failedTests: totalTests - passedTests, averageExecutionTime, tierBreakdown, results };
}

// --- メインテストブロック ---
test("WGSL Numerics Test Suite (Functional)", async () => {
    let qaHistory: TestSuiteReport[] = [];
    const testSuites = [
        { name: 'qp_from_f32', operation: 'from_f32', type: 'basic' as OperationType, kernel: 'qp_from_f32_main' },
        { name: 'qp_negate', operation: 'negate', type: 'basic' as OperationType, kernel: 'qp_negate_main' },
        { name: 'qp_add', operation: 'add', type: 'basic' as OperationType, kernel: 'qp_add_main' },
        { name: 'qp_sub', operation: 'sub', type: 'basic' as OperationType, kernel: 'qp_sub_main' },
        { name: 'qp_mul', operation: 'mul', type: 'basic' as OperationType, kernel: 'qp_mul_main' },
        { name: 'qp_div', operation: 'div', type: 'basic' as OperationType, kernel: 'qp_div_main' },
        { name: 'qp_abs', operation: 'abs', type: 'basic' as OperationType, kernel: 'qp_abs_main' },
        { name: 'qp_sign', operation: 'sign', type: 'basic' as OperationType, kernel: 'qp_sign_main' },
        { name: 'qp_floor', operation: 'floor', type: 'basic' as OperationType, kernel: 'qp_floor_main' },
        { name: 'qp_ceil', operation: 'ceil', type: 'basic' as OperationType, kernel: 'qp_ceil_main' },
        { name: 'qp_round', operation: 'round', type: 'basic' as OperationType, kernel: 'qp_round_main' },
    ];
    const allTestCases: { suite: typeof testSuites[0], testCase: TestCase }[] = [];
    for (const suite of testSuites) {
        const cases = [
            ...TestCaseGenerator.generateTier1Cases(suite.operation),
            ...TestCaseGenerator.generateTier2Cases(suite.operation),
            ...TestCaseGenerator.generateTier3Cases(suite.operation),
        ];
        for (const testCase of cases) {
            allTestCases.push({ suite, testCase });
        }
    }
    const totalCaseCount = allTestCases.length;
    let currentCaseIndex = 0;
    for (const suite of testSuites) {
        console.log(`\n--- Executing Suite: ${suite.name} ---`);
        const suiteResults: TestResult[] = [];
        const casesForSuite = allTestCases.filter(tc => tc.suite.name === suite.name).map(tc => tc.testCase);
        for (const testCase of casesForSuite) {
            currentCaseIndex++;
            const progress = `[${currentCaseIndex}/${totalCaseCount}]`;
            process.stdout.write(`${progress} Running ${testCase.name}... `);
            const result = await executeSingleTestCase(suite.kernel, testCase, suite.type);
            suiteResults.push(result);
            if (result.passed) {
                console.log(`✅ Passed (${result.executionTime.toFixed(2)}ms)`);
            } else {
                console.log(`❌ Failed`);
                console.log(Diagnostics.generateFailureDiagnostics(result));
            }
        }
        const suiteReport = createSuiteReport(suite.name, suiteResults);
        const analysis = QualityAssurance.analyzeHistory(qaHistory, suiteReport);
        qaHistory = analysis.newHistory;
        analysis.warnings.forEach(w => console.warn(w));
    }
    console.log('\n\n--- FINAL QUALITY REPORT ---');
    if (qaHistory.length > 0) {
        for (const report of qaHistory) {
             console.log(QualityAssurance.generateQualityReport([report]));
        }
    }
    const totalPassed = qaHistory.reduce((sum, r) => sum + r.passedTests, 0);
    const totalTests = qaHistory.reduce((sum, r) => sum + r.totalTests, 0);
    const overallPassRate = totalTests > 0 ? totalPassed / totalTests : 0;
    console.log(`\nOverall Pass Rate: ${(overallPassRate * 100).toFixed(1)}%`);
    expect(overallPassRate).toBeGreaterThan(0.99); // 100%を目指す
}, { timeout: 90000 });
