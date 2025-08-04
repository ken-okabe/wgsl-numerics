# 4倍精度数値計算ライブラリ テスト戦略・ポリシー

## 1. 基本理念

**精度保証を最優先**とし、浮動小数点演算の限界を理解しつつも、4倍精度ライブラリとしての品質を妥協しない。

## 2. テスト階層

### Tier 1: 厳密精度テスト (Exact Precision Tests)
- **目的**: 理論的に完璧な結果との比較
- **対象**: f32で正確に表現可能な値のみ
- **許容誤差**: 1e-30 (極めて厳格)
- **値の選択基準**:
  - 整数: -1024 ～ 1024
  - 2のべき乗の分数: 0.5, 0.25, 0.125, 0.0625, etc.
  - 正確に表現可能な小数: 1.5, 2.75, 3.375, etc.

### Tier 2: 実用精度テスト (Practical Precision Tests)  
- **目的**: 実際の使用場面での精度検証
- **対象**: 一般的な数値（f32で不正確な値含む）
- **許容誤差**: 適応的（入力値の大きさに応じて調整）
- **値の選択基準**:
  - 科学技術計算でよく使われる値: 0.1, 0.2, π, e, etc.
  - 境界値: 非常に大きな値、小さな値

### Tier 3: ストレステスト (Stress Tests)
- **目的**: 極限条件での動作確認
- **対象**: 極値、特殊値
- **許容誤差**: 関数別に定義
- **値の選択基準**:
  - 極大値: FLT_MAX近辺
  - 極小値: FLT_MIN近辺  
  - 特殊値: NaN, ±Infinity, ±0

## 3. 許容誤差算出ポリシー

### 3.1 適応的許容誤差計算

```typescript
function calculateTolerance(
    operation: 'basic' | 'complex' | 'transcendental',
    inputMagnitude: number,
    tier: 1 | 2 | 3
): number {
    const baseTolerance = {
        1: 1e-30,  // 厳密
        2: 1e-25,  // 実用的
        3: 1e-20   // ストレス
    }[tier];
    
    const operationMultiplier = {
        'basic': 1,           // +, -, *, /
        'complex': 10,        // sqrt, pow
        'transcendental': 100 // sin, cos, log, exp
    }[operation];
    
    // 入力値の大きさに応じた調整
    const magnitudeAdjustment = Math.max(1, Math.abs(inputMagnitude) * 1e-15);
    
    return baseTolerance * operationMultiplier * magnitudeAdjustment;
}
```

### 3.2 相対誤差 vs 絶対誤差

- **小さな値** (|x| < 1e-10): 絶対誤差を使用
- **通常の値** (1e-10 ≤ |x| ≤ 1e10): 相対誤差を使用  
- **大きな値** (|x| > 1e10): 相対誤差 + 絶対下限を使用

## 4. テストケース設計指針

### 4.1 値の分類と選択

```typescript
// Tier 1用: f32で正確に表現可能な値
const EXACT_F32_VALUES = {
    integers: [-1024, -1, 0, 1, 42, 1024],
    powerOfTwoFractions: [0.5, 0.25, 0.125, 0.0625, 0.03125],
    exactDecimals: [1.5, 2.75, 3.375, 4.625],
    negatives: [-0.5, -1.5, -2.75]
};

// Tier 2用: 実用的だがf32で不正確な値
const PRACTICAL_VALUES = {
    commonDecimals: [0.1, 0.2, 0.3, 0.7, 0.9],
    scientific: [Math.PI, Math.E, Math.sqrt(2), Math.LN2],
    engineering: [1.234, 9.876, 12.345]
};

// Tier 3用: 極値・特殊値
const STRESS_VALUES = {
    extremes: [1e-38, 1e38, -1e38, Number.MAX_VALUE],
    special: [NaN, Infinity, -Infinity, 0, -0],
    boundary: [Number.MIN_VALUE, Number.EPSILON]
};
```

### 4.2 組み合わせ戦略

各関数で最低限テストすべき組み合わせ:
- **Tier 1**: 正確値同士の演算（5-10ケース）
- **Tier 2**: 正確値と不正確値の混合（10-15ケース）  
- **Tier 3**: 極値・特殊値の処理（5-10ケース）

## 5. assertQpEqual の改良

### 5.1 階層対応版

```typescript
export function assertQpEqualTiered(
    actual: QuadFloat, 
    expected: QuadFloat,
    tier: 1 | 2 | 3,
    operation: 'basic' | 'complex' | 'transcendental' = 'basic',
    customEpsilon?: number
): void {
    const epsilon = customEpsilon ?? calculateTolerance(
        operation, 
        Math.max(...expected.map(Math.abs)), 
        tier
    );
    
    return assertQpEqual(actual, expected, epsilon);
}
```

### 5.2 詳細診断機能

```typescript
export function assertQpEqualWithDiagnostics(
    actual: QuadFloat,
    expected: QuadFloat,
    epsilon: number,
    context: string
): void {
    try {
        assertQpEqual(actual, expected, epsilon);
    } catch (error) {
        // 詳細な診断情報を追加
        const ulpDifference = calculateUlpDifference(actual, expected);
        const relativeError = calculateRelativeError(actual, expected);
        
        throw new Error(`
${error.message}
Context: ${context}
ULP Difference: ${ulpDifference}
Relative Error: ${relativeError}
Suggested minimum epsilon: ${Math.max(relativeError * 2, 1e-28)}
        `.trim());
    }
}
```

## 6. テストケース実装パターン

### 6.1 基本演算テンプレート

```typescript
function createBasicOperationTests(
    operationName: string,
    kernelBaseName: string,
    operation: (a: QuadFloat, b?: QuadFloat) => QuadFloat
) {
    return [
        // Tier 1: 厳密テスト
        ...EXACT_F32_VALUES.integers.map(val => ({
            name: `${operationName}_exact_${val}`,
            tier: 1 as const,
            input: createQuadFloat(val),
            expected: operation(createQuadFloat(val))
        })),
        
        // Tier 2: 実用テスト  
        ...PRACTICAL_VALUES.commonDecimals.map(val => ({
            name: `${operationName}_practical_${val}`,
            tier: 2 as const,
            input: createQuadFloat(val),
            expected: operation(createQuadFloat(val))
        })),
        
        // Tier 3: ストレステスト
        ...STRESS_VALUES.special.map(val => ({
            name: `${operationName}_stress_${val}`,
            tier: 3 as const,
            input: createQuadFloat(val),
            expected: operation(createQuadFloat(val))
        }))
    ];
}
```

### 6.2 期待値生成戦略

```typescript
function generateExpectedValues(
    input: QuadFloat,
    operation: string,
    tier: number
): QuadFloat {
    if (tier === 1) {
        // Tier 1: 数学的に正確な値
        return computeMathematicallyExact(input, operation);
    } else {
        // Tier 2,3: 同じf32制約下でのCPU計算結果
        return computeWithF32Constraints(input, operation);
    }
}
```

## 7. 継続的品質保証

### 7.1 回帰テスト戦略
- 全Tierのテストを毎回実行
- 新機能追加時は対応するTier 1テストを必須追加
- 月次でTier 3の拡張を検討

### 7.2 精度劣化の早期検出
- 許容誤差の段階的引き下げ（四半期毎に10%ずつ）
- ベンチマーク結果の履歴追跡
- 異常値検出アルゴリズムの導入

### 7.3 ドキュメント化
- 各関数の精度保証レベルを明文化
- 使用場面別の推奨Tierを文書化
- 制限事項・既知の問題を明確化

## 8. 実装優先順位

1. **Phase 1**: assertQpEqualTiered の実装
2. **Phase 2**: 基本演算（+, -, *, /）のTier 1,2テスト整備
3. **Phase 3**: 高次演算のテスト体系構築
4. **Phase 4**: 自動診断・レポート機能の追加

この戦略により、4倍精度ライブラリとしての品質を確保しつつ、実用性も担保できます。