// code/src/LV1_Debug/qp_debug_is_nan/index.ts (Corrected)

import type { OperationType } from '../../../tests/LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// メタデータ
export const name = 'qp_debug_is_nan';
export const type = 'unary' as const;
export const operationType = 'basic' as OperationType;

// ▼▼▼ 修正箇所: 神託関数がDecimalを扱うようにする ▼▼▼
export default (inputs: Decimal[]): Decimal => {
    const input = inputs[0];
    if (!input) {
        throw new Error("Invalid input for qp_debug_is_nan oracle: input array is empty.");
    }
    
    const isNan = input.isNaN();
    return new Decimal(isNan ? 1.0 : 0.0);
};
// ▲▲▲ 修正箇所 ▲▲▲