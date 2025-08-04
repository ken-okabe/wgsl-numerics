import { test, expect, beforeAll, afterAll } from 'bun:test';
import { assertQpEqual, type QuadFloat } from './assertQpEqual';
import type { Subprocess } from "bun";
import type { ServerWebSocket } from "bun";

// --- グローバル変数 ---
let chromeProcess: Subprocess;
let server: ReturnType<typeof Bun.serve>;
let ws: ServerWebSocket<unknown> | undefined;
let currentTestResolver: ((result: string) => void) | undefined;
// 修正点：Graceful Shutdownを待つためのPromiseとresolve関数
let closePromiseResolve: (() => void) | undefined;
let clientDidClosePromise: Promise<void>;

// --- 全テストの前に一度だけ実行 ---
beforeAll(async () => {
    Bun.spawnSync({ cmd: ["pkill", "-f", "google-chrome.*--user-data-dir=/tmp/wgsl-numerics-test"] });

    // 修正点：closeを待つPromiseをここで初期化
    clientDidClosePromise = new Promise<void>(resolve => {
        closePromiseResolve = resolve;
    });

    const wsReadyPromise = new Promise<void>(resolve => {
        server = Bun.serve({
            port: 0,
            fetch(req, server) {
                const url = new URL(req.url);
                if (server.upgrade(req)) return;
                if (url.pathname === "/") return new Response(Bun.file("code/_test-runner.html"));
                return new Response("Not Found", { status: 404 });
            },
            websocket: {
                open(newWs) { ws = newWs; resolve(); },
                message(ws, msg) {
                    if (typeof msg === 'string' && currentTestResolver) {
                        const parsedMsg = JSON.parse(msg);
                        currentTestResolver(parsedMsg.result);
                        currentTestResolver = undefined;
                    }
                },
                // 修正点：closeハンドラを最初から定義しておく
                close(ws, code, reason) {
                    console.log(`[Server] WebSocket connection closed. Code: ${code}`);
                    if (closePromiseResolve) {
                        closePromiseResolve(); // closeを検知したらPromiseを解決
                    }
                    ws.close();
                },
            },
        });
    });
    // in code/all-tests.test.ts (beforeAllフック内)

    chromeProcess = Bun.spawn({
        cmd: [
            "google-chrome-stable",
            // --- テスト自動化のための最適化フラグ ---
            "--headless=new",                 // CI/CD環境のためのヘッドレスモード
            "--no-sandbox",                   // Dockerなどのコンテナ環境で必要
            "--disable-dev-shm-usage",        // メモリ共有の問題を回避
            "--disable-background-networking",// 不要なバックグラウンド通信を無効化
            "--disable-sync",                 // 同期サービスを無効化
            "--disable-default-apps",         // デフォルトアプリの読み込みを無効化
            "--disable-gpu",                  // 補足：WebGPUテストでは外すが、一般的なテストでは安定化のために使用

            // --- 我々のテストで必要なフラグ ---
            "--enable-unsafe-webgpu",

            // --- 既存のフラグ ---
            `--user-data-dir=/tmp/wgsl-numerics-test`,
            `--no-first-run`,
            `--no-default-browser-check`,
            `--disable-extensions`,
            `http://localhost:${server.port}`,
        ],
        stdout: "ignore",
        stderr: "inherit",
    });
    await wsReadyPromise;
});

// --- 全テストの後に一度だけ実行 ---
afterAll(async () => {
    console.log("[Test Runner] Cleaning up gracefully...");

    if (ws) {
        ws.send(JSON.stringify({ command: 'close' }));
        // 修正点：上で定義したPromiseを待つ
        await Promise.race([clientDidClosePromise, new Promise(r => setTimeout(r, 500))]);
    }

    chromeProcess.kill();
    server.stop(true);
    console.log("[Test Runner] Cleanup complete.");
});

// --- runKernelInBrowser (変更なし) ---
async function runKernelInBrowser(
    wgslFilePath: string,
    kernelEntryPoint: string,
    input: number | QuadFloat
): Promise<QuadFloat> {
    if (!ws) throw new Error("WebSocket connection not established.");
    if (currentTestResolver) throw new Error("Another test is already running.");
    const resultPromise = new Promise<string>(resolve => {
        currentTestResolver = resolve;
    });
    const wgslCode = await Bun.file(wgslFilePath).text();
    ws.send(JSON.stringify({ wgslCode, kernelEntryPoint, input }));
    const resultRaw = await Promise.race([resultPromise, new Promise(resolve => setTimeout(() => resolve("timeout"), 5000))]);
    if (typeof resultRaw !== 'string' || resultRaw === 'timeout') {
        currentTestResolver = undefined;
        throw new Error(`Test for ${kernelEntryPoint} timed out or failed.`);
    }
    if (resultRaw.startsWith('GPU_EXECUTION_ERROR:')) {
        throw new Error(`Browser-side error for ${kernelEntryPoint}: ${resultRaw}`);
    }
    return resultRaw.split(',').map(Number) as QuadFloat;
}

// --- assertQpEqual Self-Test (変更なし) ---
test('assertQpEqual: identical values should pass', () => { /* ... */ });
test('assertQpEqual: small difference within tolerance should pass', () => { /* ... */ });
test('assertQpEqual: difference outside of tolerance should throw', () => { /* ... */ });
test('assertQpEqual: NaN handling should pass for NaN === NaN', () => { /* ... */ });

// --- WGSL TDDサイクル実行ブロック (変更なし) ---
test("WGSL TDD Cycles", async () => {
    const testCases = [
        {
            name: 'qp_from_f32',
            kernelBaseName: 'qp_from_f32_main',
            input: 123.456,
            expected: [123.45600128173828, 0, 0, 0] as QuadFloat
        },
        {
            name: 'qp_negate',
            kernelBaseName: 'qp_negate_main',
            input: [2.5, -128.0, 0, 0] as QuadFloat,
            expected: [-2.5, 128.0, 0, 0] as QuadFloat
        }
    ];
    for (const tc of testCases) {
        console.log(`\n--- Running TDD Cycle for ${tc.name} ---`);
        console.log(`[TDD] Verifying Red stage for ${tc.name}...`);
        let didThrowInRed = false;
        try {
            const actual = await runKernelInBrowser('code/kernels.wgsl', `${tc.kernelBaseName}_red`, tc.input);
            assertQpEqual(actual, tc.expected);
        } catch (e) {
            didThrowInRed = true;
        }
        expect(didThrowInRed).toBe(true);
        console.log(`[TDD] Red stage for ${tc.name} passed (failed as expected).`);
        console.log(`[TDD] Verifying Green stage for ${tc.name}...`);
        const actualGreen = await runKernelInBrowser('code/kernels.wgsl', `${tc.kernelBaseName}_green`, tc.input);
        assertQpEqual(actualGreen, tc.expected);
        console.log(`[TDD] Green stage for ${tc.name} passed.`);
    }
}, { timeout: 20000 });