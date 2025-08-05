// code/tests/framework/test-runner.test.ts (Final Version with Monolithic Strategy)

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

describe('LV0: assertQpEqual Self-Validation', () => {
    // (Self-validation tests remain unchanged)
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

interface TestModule {
    default: (inputs: Decimal[]) => Decimal | Decimal[];
    name: string;
    type: 'unary' | 'binary';
    operationType: OperationType;
    dependencies?: string[];
}

let gpuRunner: GpuTestRunner;
let qaHistory: TestSuiteReport[] = [];
let monolithicWgslCode: string;

async function findAllWgslFiles(dir: string): Promise<{path: string, moduleName: string}[]> {
    let files: {path: string, moduleName: string}[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await findAllWgslFiles(fullPath));
        } else if (entry.name === 'kernel.wgsl') {
            const moduleName = path.basename(path.dirname(fullPath));
            files.push({ path: fullPath, moduleName });
        }
    }
    return files;
}

beforeAll(async () => {
    gpuRunner = await setupGpuTestRunner();
    console.log("--- Building Monolithic WGSL Shader ---");
    const srcRoot = path.join(import.meta.dir, '../../src');
    const wgslFiles = await findAllWgslFiles(srcRoot);
    
    wgslFiles.sort((a, b) => {
        const levelA = a.path.includes('LV1') ? 1 : a.path.includes('LV2') ? 2 : a.path.includes('LV3') ? 3 : 99;
        const levelB = b.path.includes('LV1') ? 1 : b.path.includes('LV2') ? 2 : b.path.includes('LV3') ? 3 : 99;
        return levelA - levelB;
    });

    const wgslHeader = `@group(0) @binding(0) var<storage, read> generic_input: array<f32>;
@group(0) @binding(1) var<storage, read_write> generic_output: vec4<f32>;
`;

    let combinedCode = '';
    for (const file of wgslFiles) {
        const code = await fs.readFile(file.path, 'utf-8');
        
        const transformedCode = code
            .replace(/^[ \t]*@group\([\s\S]*?;\s*\n/gm, '')
            .replace(/fn main_red\(/g, `fn ${file.moduleName}_main_red(`)
            .replace(/fn main_green\(/g, `fn ${file.moduleName}_main_green(`);
            
        combinedCode += `// --- From: ${path.relative(srcRoot, file.path)} ---\n${transformedCode}\n\n`;
    }

    monolithicWgslCode = wgslHeader + combinedCode;
    console.log("--- Monolithic WGSL Shader Built Successfully ---\n");
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
            const suiteResults: TestResult[] = [];

            afterAll(() => {
                const suiteReport = generateSuiteReport(testModule.name, suiteResults);
                const analysis = analyzeHistory(qaHistory, suiteReport);
                qaHistory = analysis.newHistory;
                analysis.warnings.forEach(w => console.warn(w));
            });
            
            const testCases = generateTestCases(testModule.type, testModule.operationType);

            for (const tc of testCases) {
                test(`TDD Cycle: ${tc.name}`, async () => {
                    const inputs = Array.isArray(tc.input[0]) ? tc.input as QuadFloat[] : [tc.input as QuadFloat[]];
                    
                    const expected = generateExpected(testModule.default, inputs);
                    
                    const flatInput = inputs.flat();
                    const startTime = performance.now();
                    let result: TestResult | undefined;
                    
                    try {
                        const redEntryPoint = `${testModule.name}_main_red`;
                        const greenEntryPoint = `${testModule.name}_main_green`;

                        await expect(async () => {
                            const red_actual = await runKernelInBrowser(gpuRunner, monolithicWgslCode, redEntryPoint, flatInput);
                            assertQpEqualTiered(red_actual, expected, tc.tier, tc.operationType, false);
                        }).toThrow();

                        const green_actual = await runKernelInBrowser(gpuRunner, monolithicWgslCode, greenEntryPoint, flatInput);
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