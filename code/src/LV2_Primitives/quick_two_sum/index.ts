import type { OperationType } from '../../../tests/LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// メタデータ
export const name = 'quick_two_sum';
export const type = 'binary' as const;
export const operationType = 'basic' as OperationType;
export const dependencies: string[] = [];

/**
 * 神託(Oracle)関数: quick_two_sum
 * CPU側で、Decimal.jsを用いてquick_two_sumアルゴリズムを
 * 高精度にシミュレートし、[和, 誤差] の両方を返すように修正。
 */
export default (inputs: Decimal[]): Decimal[] => { // ▼▼▼ 戻り値をDecimal[]に変更
    const a = inputs[0];
    const b = inputs[1];
    if (!a || !b) {
        throw new Error("Invalid input for quick_two_sum oracle: input array must contain two Decimals.");
    }
    
    // f32の精度で丸める操作をシミュレート
    const fround = (d: Decimal): Decimal => new Decimal(new Float32Array([d.toNumber()])[0]);

    // アルゴリズムを高精度で実行
    const s = fround(a.plus(b));
    const e = fround(b.minus(s.minus(a)));

    return [s, e]; // [和, 誤差] の配列を返す
};