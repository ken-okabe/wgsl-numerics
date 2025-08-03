import { test, expect } from "bun:test";

// BunからPlaywright CLIをspawnし、webgpu-calc.htmlのWebGPU演算結果をE2E検証

test("WebGPU 2+3 calculation returns 5 via google-chrome-stable", async () => {
    let actualPort: number | undefined = 0;
    let resolveResult: (status: string) => void;
    const resultPromise = new Promise<string>(resolve => { resolveResult = resolve; });
    const server = Bun.serve({
        port: 0,
        fetch(req) {
            const url = new URL(req.url);
            if (url.pathname === "/") {
                return new Response(Bun.file("webgpu-calc.html"));
            }
            if (url.pathname === "/report") {
                const status = url.searchParams.get("status");
                resolveResult(status ?? "");
                server.stop();
                return new Response(status);
            }
            return new Response("Not Found", { status: 404 });
        },
    });
    actualPort = server.port;

    const chrome = Bun.spawn({
        cmd: [
            "google-chrome-stable",
            `--enable-unsafe-webgpu`,
            `--user-data-dir=/tmp/chrome-wgsl-test`,
            `--no-first-run`,
            `--no-default-browser-check`,
            `--disable-extensions`,
            `http://localhost:${actualPort}`,
        ],
        stdout: "ignore",
        stderr: "inherit",
    });

    // ブラウザからの結果報告をPromiseで待つ
    const timeout = 10000;
    let result = await Promise.race([
        resultPromise,
        new Promise(resolve => setTimeout(() => resolve("timeout"), timeout))
    ]);
    chrome.kill();
    expect(result).toBe("success");
});
