import { test, describe, expect } from 'bun:test';
import { assertQpEqual, type QuadFloat } from './assert';

describe('LV0: assertQpEqual Self-Validation', () => {

    test('should PASS for identical, non-trivial values', () => {
        const a: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
        const b: QuadFloat = [1.23, 1e-9, 1e-17, 1e-25];
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should PASS for differences smaller than the tolerance', () => {
        const a: QuadFloat = [1.0, 0, 0, 0];
        const b: QuadFloat = [1.0, 1e-32, 0, 0]; 
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should THROW for differences larger than the tolerance', () => {
        const a: QuadFloat = [1.0, 0, 0, 0];
        const b: QuadFloat = [1.0, 1e-28, 0, 0]; 
        expect(() => assertQpEqual(a, b, 1e-30)).toThrow();
    });

    test('should PASS for two NaN values', () => {
        const a: QuadFloat = [NaN, 0, 0, 0];
        const b: QuadFloat = [NaN, 0, 0, 0];
        expect(() => assertQpEqual(a, b, 1e-30)).not.toThrow();
    });

    test('should THROW for a zero and non-zero value', () => {
        const a: QuadFloat = [0, 0, 0, 0];
        const b: QuadFloat = [1e-29, 0, 0, 0];
        expect(() => assertQpEqual(a, b, 1e-30)).toThrow();
    });
});