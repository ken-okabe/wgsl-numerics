// code/tests/framework/test-runner.test.ts (Self-Validation Restored & Final)

import { test, describe, expect, beforeAll, afterAll } from 'bun:test';
import { assertQpEqual, assertQpEqualTiered, type QuadFloat, type OperationType } from '../LV0_Axiom/assert';
import { type GpuTestRunner, setupGpuTestRunner, runKernelInBrowser } from './gpu-test-runner';
import { generateExpected, generateTestCases, type TestCase } from './test-case-generator';
import { promises as fs } from 'fs';
import path from 'path';
import type { TestResult, TestSuiteReport } from './diagnostics';
import { generateSuiteReport, analyzeHistory, generateQualityReport } from './quality-assurance';
import { generateFailureDiagnostics } from './diagnostics';
import { Decimal } from 'decimal.js';

// ▼▼▼ 復活させた自己テスト ▼▼▼
describe('LV0: assertQpEqual Self-Validation', () => {
    test('should PASS for identical, non-trivial values', () => {
        const a: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
        const b: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should PASS for differences smaller than the tolerance', () => {
        const a: QuadFloat = [1.0, 0, 0, 0];
        const b: QuadFloat = [1.0, 1e-32, 0, 0]; 
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should THROW for differences larger than the tolerance', () => {
        const a: QuadFloat = [1.0, 0, 0, 0];
        const b: QuadFloat = [1.0, 1e-28, 0, 0]; 
        expect(() => assertQpEqual(a, b, 1e-30)).toThrow();
    });

    test('should PASS for two NaN values', () => {
        const a: QuadFloat = [NaN, 0, 0, 0];
        const b: QuadFloat = [NaN, 0, 0, 0];
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should THROW for a zero and non-zero value', () => {
        const a: QuadFloat = [0, 0, 0, 0];
        const b: QuadFloat = [1e-29, 0, 0, 0];
        expect(() => assertQpEqual(a, b, 1e-30)).toThrow();
    });
});
// ▲▲▲ 復活させた自己テスト ▲▲▲

interface TestModule {
    default: (inputs: Decimal[]) => Decimal; // oracleはDecimalを扱う
    name: string;
    type: 'unary' | 'binary';
    operationType: OperationType;
}

let gpuRunner: GpuTestRunner;
let qaHistory: TestSuiteReport[] = [];

beforeAll(async () => {
    gpuRunner = await setupGpuTestRunner();
});

afterAll(async () => {
    if (gpuRunner) {
        await gpuRunner.close();
    }
    console.log("\n--- FINAL QUALITY REPORT ---");
    console.log(generateQualityReport(qaHistory));
});

const srcRoot = path.join(import.meta.dir, '../../src');
const levelDirs = await fs.readdir(srcRoot);

for (const levelDir of levelDirs) {
    if (!levelDir.startsWith('LV')) continue;
    
    const levelPath = path.join(srcRoot, levelDir);
    if (!(await fs.stat(levelPath)).isDirectory()) continue;

    const functionDirs = await fs.readdir(levelPath);

    for (const functionDir of functionDirs) {
        const functionPath = path.join(levelPath, functionDir);
        if (!(await fs.stat(functionPath)).isDirectory()) continue;

        const indexPath = path.join(functionPath, 'index.ts');
        const kernelPath = path.join(functionPath, 'kernel.wgsl');

        try {
            await fs.access(indexPath);
            await fs.access(kernelPath);
        } catch (e) { continue; }

        const testModule: TestModule = await import(indexPath);

        describe(`${levelDir}: ${testModule.name}`, () => {
            let kernelCode: string;
            const suiteResults: TestResult[] = [];

            beforeAll(async () => {
                kernelCode = await fs.readFile(kernelPath, 'utf-8');
            });

            afterAll(() => {
                const suiteReport = generateSuiteReport(testModule.name, suiteResults);
                const analysis = analyzeHistory(qaHistory, suiteReport);
                qaHistory = analysis.newHistory;
                analysis.warnings.forEach(w => console.warn(w));
            });
            
            const testCases = generateTestCases(testModule.type, testModule.operationType);

            for (const tc of testCases) {
                test(`TDD Cycle: ${tc.name}`, async () => {
                    const inputs = Array.isArray(tc.input[0]) ? tc.input as QuadFloat[] : [tc.input as QuadFloat];
                    
                    const expected = generateExpected(testModule.default, inputs);
                    
                    const flatInput = inputs.flat();
                    const startTime = performance.now();
                    let result: TestResult | undefined;
                    
                    try {
                        await expect(async () => {
                            const red_actual = await runKernelInBrowser(gpuRunner, kernelCode, 'main_red', flatInput);
                            assertQpEqualTiered(red_actual, expected, tc.tier, tc.operationType, false);
                        }).toThrow();

                        const green_actual = await runKernelInBrowser(gpuRunner, kernelCode, 'main_green', flatInput);
                        assertQpEqualTiered(green_actual, expected, tc.tier, tc.operationType, false);
                        
                        result = { name: tc.name, tier: tc.tier, passed: true, executionTime: performance.now() - startTime, expected: expected, actual: green_actual };
                    } catch (e) {
                        const error = e as Error;
                        
                        let green_actual_on_fail: QuadFloat | undefined;
                        if (error.message && error.message.includes('Actual:')) {
                            const actualString = error.message.split('Actual:')[1]?.split('\n')[0]?.trim();
                            if (actualString) {
                                try {
                                    green_actual_on_fail = JSON.parse(actualString) as QuadFloat;
                                } catch (parseError) {}
                            }
                        }

                        result = { 
                            name: tc.name, tier: tc.tier, passed: false, 
                            executionTime: performance.now() - startTime, 
                            errorMessage: error.message, expected: expected, actual: green_actual_on_fail
                        };
                        
                        console.error(generateFailureDiagnostics(result));
                        expect(error.message).toBeNull();
                    } finally {
                        if(result) {
                            suiteResults.push(result);
                        }
                    }
                }, 30000);
            }
        });
    }
}