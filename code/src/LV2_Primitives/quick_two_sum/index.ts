import type { OperationType } from '../../../tests/LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// メタデータ
export const name = 'quick_two_sum';
export const type = 'binary' as const; // a と b の2つの入力
export const operationType = 'basic' as OperationType;
export const dependencies: string[] = []; // このモジュールは最下層なので依存なし

/**
 * 神託(Oracle)関数: quick_two_sum
 * |a| >= |b| の条件下で、a + b を誤差なしで計算する。
 * ただし、この神託は高精度なDecimal.jsを使うため、
 * そのものを実装する必要はなく、単純な加算で十分。
 */
export default (inputs: Decimal[]): Decimal => {
    const a = inputs[0];
    const b = inputs[1];
    if (!a || !b) {
        throw new Error("Invalid input for quick_two_sum oracle: input array must contain two Decimals.");
    }
    // 神託は理想的な数学的結果を返す
    return a.plus(b);
};