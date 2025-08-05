import type { QuadFloat } from '../../../tests/LV0_Axiom/assert';

// メタデータ
export const name = 'qp_debug_is_nan';
export const type = 'unary' as const;

// 神託関数（ロジック）をデフォルトエクスポートする
export default (inputs: QuadFloat[]): QuadFloat => {
    // ▼▼▼ 修正箇所 ▼▼▼
    const input = inputs[0];
    if (!input) {
        throw new Error("Invalid input for qp_debug_is_nan oracle: input array is empty.");
    }
    // ▲▲▲ 修正箇所 ▲▲▲
    
    const isNan = Number.isNaN(input[0]);
    return [isNan ? 1.0 : 0.0, 0, 0, 0];
};