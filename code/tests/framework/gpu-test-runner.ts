import type { Subprocess } from "bun";
import type { ServerWebSocket } from "bun";
import { type QuadFloat } from "../LV0_Axiom/assert";
import path from "path";

export interface GpuTestRunner {
    server: ReturnType<typeof Bun.serve>;
    chromeProcess: Subprocess;
    ws: ServerWebSocket<unknown>;
    close: () => Promise<void>;
}

let currentTestResolver: ((result: string) => void) | undefined;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function setupGpuTestRunner(): Promise<GpuTestRunner> {
    return new Promise<GpuTestRunner>((resolve, reject) => {
        Bun.spawnSync({ cmd: ["pkill", "-f", "google-chrome.*--user-data-dir=/tmp/wgsl-numerics-test-fp"] });

        let wsInstance: ServerWebSocket<unknown> | undefined;
        let server: ReturnType<typeof Bun.serve>;
        let chromeProcess: Subprocess;

        const close = async () => {
            if (wsInstance && wsInstance.readyState === 1) { 
                wsInstance.send(JSON.stringify({ command: 'close' }));
                await sleep(100); 
            }
            if (chromeProcess) chromeProcess.kill();
            if (server) server.stop(true);
        };

        server = Bun.serve({
            port: 0,
            fetch(req) {
                if (server.upgrade(req)) return;
                return new Response(Bun.file(path.join(import.meta.dir, "assets/_test-runner.html")));
            },
            websocket: {
                open(ws) {
                    wsInstance = ws;
                    const runner: GpuTestRunner = { server, chromeProcess, ws, close };
                    resolve(runner);
                },
                message(ws, msg) {
                    if (typeof msg === 'string' && currentTestResolver) {
                        try {
                            const parsedMsg = JSON.parse(msg);
                            currentTestResolver(parsedMsg.result);
                        } catch (e) {
                            console.error("Failed to parse message from browser:", msg);
                        }
                    }
                },
            },
        });
        
        const chromeFlags = [
            "--headless=new",
            "--no-sandbox",
            "--enable-unsafe-webgpu",
            "--no-first-run",
            `--user-data-dir=/tmp/wgsl-numerics-test-fp`,
            // ★変更: ログレベルを致命的なエラー(3)のみに設定
            "--log-level=3", 
            `http://localhost:${server.port}`
        ];

        chromeProcess = Bun.spawn({
            cmd: ["google-chrome-stable", ...chromeFlags],
            // ★変更: 標準出力と標準エラー出力を両方とも無視する
            stdout: "ignore", 
            stderr: "ignore",
        });
    });
}

// runKernelInBrowser関数は変更なし
export async function runKernelInBrowser(runner: GpuTestRunner, wgslCode: string, kernelEntryPoint: string, input: number[]): Promise<QuadFloat> {
    if (!runner.ws) throw new Error("WebSocket connection not established.");
    const resultPromise = new Promise<string>(resolve => { currentTestResolver = resolve; });
    try {
        const serializableInput = input.map(v => {
            if (Number.isNaN(v)) return 'NaN';
            if (v === Infinity) return 'Infinity';
            if (v === -Infinity) return '-Infinity';
            if (Object.is(v, -0)) return '-0';
            return v;
        });
        runner.ws.send(JSON.stringify({ wgslCode, kernelEntryPoint, input: serializableInput }));
        const resultRaw = await resultPromise;
        if (resultRaw.startsWith('GPU_EXECUTION_ERROR:')) {
            throw new Error(resultRaw);
        }
        return resultRaw.split(',').map(Number) as QuadFloat;
    } finally {
        currentTestResolver = undefined;
    }
}