import type { QuadFloat } from '../../../tests/LV0_Axiom/assert';

// メタデータ
export const name = 'qp_negate';
export const type = 'unary' as const;

// 神託関数（ロジック）をデフォルトエクスポートする
export default (inputs: QuadFloat[]): QuadFloat => {
    // ▼▼▼ 修正箇所 ▼▼▼
    const input = inputs[0];
    if (!input) {
        throw new Error("Invalid input for qp_negate oracle: input array is empty.");
    }
    // ▲▲▲ 修正箇所 ▲▲▲

    return [-input[0], -input[1], -input[2], -input[3]];
};