// code/src/LV2_Primitives/qp_negate/index.ts (Corrected)

import type { OperationType } from '../../../tests/LV0_Axiom/assert';
import { Decimal } from 'decimal.js';

// メタデータ
export const name = 'qp_negate';
export const type = 'unary' as const;
export const operationType = 'basic' as OperationType;

// ▼▼▼ 修正箇所: 神託関数がDecimalを扱うようにする ▼▼▼
export default (inputs: Decimal[]): Decimal => {
    const input = inputs[0];
    if (!input) {
        throw new Error("Invalid input for qp_negate oracle: input array is empty.");
    }
    
    return input.negated();
};
// ▲▲▲ 修正箇所 ▲▲▲