import type { OperationType } from '../../../tests/LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// メタデータ
export const name = 'qp_add';
export const type = 'binary' as const;
export const operationType = 'basic' as OperationType;

/**
 * 依存関係の宣言。
 * テストフレームワークは、この配列を読み取り、
 * 指定されたモジュールのWGSLコードを自動的に結合します。
 */
export const dependencies: string[] = [
    "LV2_Primitives/quick_two_sum",
    // 本来は "LV2_Primitives/two_sum" も必要だが、TDDのため段階的に追加
];

/**
 * 神託(Oracle)関数: qp_add
 * 2つのQuadFloat値の理想的な和を計算します。
 */
export default (inputs: Decimal[]): Decimal => {
    const a = inputs[0]; // qp_addは2つのQuadFloatを入力とするが、神託はそれらをDecimalとして受け取る
    const b = inputs[1];
    if (!a || !b) {
        throw new Error("Invalid input for qp_add oracle: input array must contain two Decimals.");
    }
    // 神託は理想的な数学的結果を返す
    return a.plus(b);
};