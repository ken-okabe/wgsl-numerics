// look.ts (Corrected: Header Injection and Renaming Strategy)
import { promises as fs } from 'fs';
import path from 'path';

/**
 * srcディレクトリを再帰的に探索し、全てのkernel.wgslファイルのパスとモジュール名（ディレクトリ名）を収集する
 */
async function findAllWgslFiles(dir: string): Promise<{ path: string, moduleName: string }[]> {
    let files: { path: string, moduleName: string }[] = [];
    try {
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
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }
    return files;
}

/**
 * メインの実行関数
 */
async function generateAndPrintMonolithicCode() {
    console.log("--- Building Monolithic WGSL Shader for Inspection ---");

    const srcRoot = path.join(import.meta.dir, 'code/src');

    const wgslFiles = await findAllWgslFiles(srcRoot);

    if (wgslFiles.length === 0) {
        console.error("Error: No kernel.wgsl files found. Please check the 'srcRoot' path in look.ts.");
        return;
    }

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
            // グローバル変数定義行を確実に削除
            .replace(/^[ \t]*@group\([\s\S]*?;\s*\n/gm, '')
            // エントリーポイント名を置換
            .replace(/fn main_red\(/g, `fn ${file.moduleName}_main_red(`)
            .replace(/fn main_green\(/g, `fn ${file.moduleName}_main_green(`);

        combinedCode += `// --- From: ${path.relative(srcRoot, file.path)} ---\n${transformedCode}\n\n`;
    }

    const finalCode = wgslHeader + combinedCode;

    console.log("\n--- Generated Monolithic WGSL Code ---");
    console.log(finalCode);
    console.log("--------------------------------------\n");
    console.log("Inspection script finished.");
}

// スクリプトを実行
generateAndPrintMonolithicCode();