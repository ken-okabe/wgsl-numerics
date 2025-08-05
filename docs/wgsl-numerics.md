### **WGSL Numerics 2.0 仕様書 (汎用ライブラリ版)**

#### **1. 目的と哲学：信頼性、持続可能性、そして人間中心設計**

**1.1. 目的**
本ライブラリ「WGSL Numerics」の唯一の目的は、WebGPU上で、科学技術計算、物理シミュレーション、金融モデリング、その他あらゆる高精度な演算を要求するアプリケーションで利用可能な、**完全に信頼できる汎用四倍精度数値演算環境**を構築することである。

**1.2. 開発哲学**
本ライブラリは、その根幹に以下の三つの哲学を置く。

1.  **信頼性 (Reliability):** 全ての関数は、厳格な**テスト駆動開発**によってその正しさが保証される。テストが存在しないコードは、存在しないのと同じである。
2.  **持続可能性 (Sustainability):** コードは書かれる時間より、読まれ、修正され、拡張される時間の方が圧倒的に長い。我々は、未来の開発者（1年後の自分自身を含む）のために、**可読性**と**保守性**を最高レベルに保つ。
3.  **人間中心設計 (Human-Centered Design):** ライブラリは、開発者が複雑な数値演算の実装詳細を意識することなく、本来の目的に集中できる、直感的で安全なツールでなければならない。

---

#### **2. テストフレームワーク「Numeris-Test」仕様**

**2.1. 目的**
関数の正しさを保証すると同時に、性能ボトルネックを特定するための、統合テスト・プロファイリング環境を提供する。

**2.2. 機能**
-   **マイクロベンチマーク機能:** `TestRunner`は、各テストカーネルのGPU実行時間を高精度タイマーで自動的に計測し、レポートに含める。
-   **アサーションレベル:** デバッグビルドでは、不正な演算が即座にテスト失敗となる、厳格なアサーションを適用する。

---

#### **3. ライブラリ憲章 (Library Charter)**

*本セクションは、ライブラリ全体の設計と実装を律する、普遍的な原則を定める。*

**3.1. API階層構造**
ライブラリは、明確な3つのコア階層から構成される。
1.  `qp_` (Quad-precision Primitives): 四倍精度数の基本演算。
2.  `qla_` / `qta_` (Linear Algebra / Tensor Algebra): 構造化データの汎用的な代数演算。
3.  `qna_`: 自己完結した汎用数値アルゴリズム。

**3.2. 命名規約**
-   プレフィックスと、`get/set`, `is/has`, `create/init`, `calc/compute` 等の動詞を、一貫した意味で用いる。

**3.3. エラーハンドリングポリシー**
-   数学的に未定義な操作は、`NaN`を返す。`Numeris-Test`のデバッグビルド実行時、これを検出してテストを失敗させる。

**3.4. ドキュメンテーションポリシー**
-   全ての公開関数は、インライン・ドキュメントコメントを持つことを**必須**とする。

**3.5. モジュール性 (Modularity)**
-   ライブラリは、`Core`, `LinearAlgebra`, `TensorOps`, `Algorithms` のような機能単位のモジュールに分割可能でなければならない。

**3.6. 設定可能性 (Configurability)**
-   ビルド時に、`NUMERIS_PRECISION` と `NUMERIS_ASSERT_LEVEL` を設定できる。

**3.7. コード生成 (Metaprogramming)**
-   **原則:** 冗長で機械的なコードは、手動で記述してはならない。
-   **方針:** PythonやTypeScriptで記述された**コード生成スクリプト**を用い、テンプレートからWGSLコードを自動生成する。

---

#### **4. 型システムとデータ構造**

| 構造体名 | WGSL定義（概念） | 説明 |
| :--- | :--- | :--- |
| `QuadFloat` | `struct QuadFloat { val: vec4<f32> };` | 4つの`f32`で一つの128-bit数を表現する。 |
| `QVector` | `struct QVector { data: array<QuadFloat>, size: u32 };` | サイズ情報を持つベクトル。 |
| `QMatrix` | `struct QMatrix { data: array<QuadFloat>, rows: u32, cols: u32 };` | 行・列情報を持つ行列。 |
| `QTensor` | `struct QTensor { data: array<QuadFloat>, shape: array<u32>, strides: array<u32> };` | 形状とストライド情報を持つ汎用テンソル。 |
| `SVDResult` | `struct SVDResult { U: QMatrix, S: QVector, Vh: QMatrix };` | 特異値分解の結果を格納する。 |
| `EigenResult`| `struct EigenResult { eigenvalues: QVector, eigenvectors: QMatrix };` | 固有値分解の結果を格納する。 |
| `QMetadata`| `struct QMetadata { version: u32, timestamp: u32, ... };` | データが生成された文脈を記録し、計算の再現性を保証する。CPU側で管理される。 |

---

#### **5. 全API仕様（完全版）**




レベル0: assertQpEqual — 検証の公理（聖域）

これは我々がCPU側で鍛造した、絶対的な**「ものさし」**そのものです。GPUという被検証システムから完全に独立した、信頼性の基点（公理）となります。

レベル1: qp_debug_ API — 最初の被検証オブジェクト

これらは、ライブラリが公式に提供する**最初の「精密部品」**です。これらの部品が仕様書通りの寸法（正しい挙動）で作られているかを、レベル0の「ものさし」を使って厳密に測定（テスト）しなければなりません。





#### **信頼性の階層モデル (Reliability Hierarchy Model)**

本ライブラリの信頼性は、厳格な階層モデルに基づいて構築される。下位の階層の信頼性が、その上位の階層の信頼性を再帰的に保証する。

-   **LV0: 検証の公理 (The Axiom of Verification)**
    
    -   **コンポーネント:** `assertQpEqual` API群 (`assert.ts`)。
        
    -   **責務:** このライブラリにおける「等価性」を定義する、唯一の判定基準。
        
    -   **依存関係:** **なし。** このレベルは、CPU側の高信頼な基盤（`BigInt`）のみに依存し、それ自体が単体テストによって**自己検証**される。GPU環境からは完全に独立している。
        
-   **LV1: デバッグと堅牢性 API (`qp_debug_`)**
    
    -   **コンポーネント:** `qp_debug_is_nan`, `qp_debug_is_inf` 等。
        
    -   **責務:** ライブラリの内部状態（NaN, infなど）を判定するための、公式に保証された手段を提供する。
        
    -   **依存関係:** **LV0にのみ依存する。** `qp_debug_` API群の正しさは、LV0の`assertQpEqual`によってのみ検証されなければならない。
        
-   **LV2: 基本演算 API (`qp_`)**
    
    -   **コンポーネント:** `qp_add`, `qp_mul`, `qp_sqrt` 等。
        
    -   **責務:** 四倍精度数に対する基本的な数学的演算を実行する。
        
    -   **依存関係:** **LV0およびLV1に依存する。** 計算結果の正しさはLV0によって検証され、ゼロ除算や不正な入力の判定にはLV1のAPIを利用する場合がある。




##### **5.1. デバッグと堅牢性API (`qp_debug_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qp_debug_is_nan` | `(a: QuadFloat) -> bool` | `a`が非数(`NaN`)であるかを判定する。 |
| `qp_debug_is_inf` | `(a: QuadFloat) -> bool` | `a`が無限大(`inf`)であるかを判定する。 |
| `qp_debug_is_finite`| `(a: QuadFloat) -> bool` | `a`が有限の値であるか（`NaN`でも`inf`でもないか）を判定する。 |
| `qla_debug_vec_has_nan` | `(vec: QVector) -> bool` | ベクトルのいずれかの要素に`NaN`が含まれるかを判定する。 |
| `qla_debug_vec_has_inf` | `(vec: QVector) -> bool` | ベクトルのいずれかの要素に`inf`が含まれるかを判定する。 |

##### **5.2. 基本演算API (`qp_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qp_from_f32` | `(v: f32) -> QuadFloat` | 単精度数から四倍精度数への変換。 |
| `qp_negate` | `(a: QuadFloat) -> QuadFloat` | 符号を反転する (`-a`)。 |
| `qp_add` | `(a: QuadFloat, b: QuadFloat) -> QuadFloat` | 加算 `a + b` を実行する。 |
| `qp_sub` | `(a: QuadFloat, b: QuadFloat) -> QuadFloat` | 減算 `a - b` を実行する。 |
| `qp_mul` | `(a: QuadFloat, b: QuadFloat) -> QuadFloat` | 乗算 `a * b` を実行する。 |
| `qp_div` | `(a: QuadFloat, b: QuadFloat) -> QuadFloat` | 除算 `a / b` を実行する。 |
| `qp_fma` | `(a: QuadFloat, b: QuadFloat, c: QuadFloat) -> QuadFloat` | 融合積和演算 `a*b + c` を実行。 |

### 【詳細仕様：基本演算API（qp_）】

#### qp_from_f32
- 入力: `v: f32`
- 出力: `QuadFloat`（128bit四倍精度数）
- アルゴリズム: f32値をvec4<f32>に変換（高精度化）
- エラーケース: NaN入力はNaN
- 数値的注意点: 精度保証

#### qp_negate
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（符号反転）
- アルゴリズム: 128bit四倍精度で符号反転
- エラーケース: NaN入力はNaN
- 数値的注意点: -0, +0の区別、精度保証

#### qp_add
- 入力: `a: QuadFloat`, `b: QuadFloat`
- 出力: `QuadFloat`（加算結果）
- アルゴリズム: 128bit四倍精度で加算
- エラーケース: NaN入力はNaN
- 数値的注意点: 桁落ち、精度保証

#### qp_sub
- 入力: `a: QuadFloat`, `b: QuadFloat`
- 出力: `QuadFloat`（減算結果）
- アルゴリズム: 128bit四倍精度で減算
- エラーケース: NaN入力はNaN
- 数値的注意点: 桁落ち、精度保証

#### qp_mul
- 入力: `a: QuadFloat`, `b: QuadFloat`
- 出力: `QuadFloat`（乗算結果）
- アルゴリズム: 128bit四倍精度で乗算
- エラーケース: NaN入力はNaN
- 数値的注意点: オーバーフロー・アンダーフロー、精度保証

#### qp_div
- 入力: `a: QuadFloat`, `b: QuadFloat`
- 出力: `QuadFloat`（除算結果）
- アルゴリズム: 128bit四倍精度で除算
- エラーケース: 0除算はNaN、NaN入力はNaN
- 数値的注意点: オーバーフロー・アンダーフロー、精度保証

#### qp_fma
- 入力: `a: QuadFloat`, `b: QuadFloat`, `c: QuadFloat`
- 出力: `QuadFloat`（融合積和）
- アルゴリズム: 128bit四倍精度でa*b+cを一括計算
- エラーケース: NaN入力はNaN
- 数値的注意点: 桁落ち防止、精度保証

##### **5.3. 拡張数学関数API (`qp_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qp_abs` | `(a: QuadFloat) -> QuadFloat` | 絶対値を計算する。 |
| `qp_sign` | `(a: QuadFloat) -> QuadFloat` | 符号を計算する (-1, 0, 1)。 |
| `qp_floor` | `(a: QuadFloat) -> QuadFloat` | 床関数を計算する。 |
| `qp_ceil` | `(a: QuadFloat) -> QuadFloat` | 天井関数を計算する。 |
| `qp_round` | `(a: QuadFloat) -> QuadFloat` | 最近接整数への丸め。 |
| `qp_sqrt` | `(a: QuadFloat) -> QuadFloat` | 平方根を計算する。（ニュートン法） |
| `qp_pow` | `(base: QuadFloat, exp: QuadFloat) -> QuadFloat` | べき乗 `base^exp` を計算する。 |
| `qp_log` | `(a: QuadFloat) -> QuadFloat` | 自然対数を計算する。 |
| `qp_exp` | `(a: QuadFloat) -> QuadFloat` | 指数関数 e<sup>a</sup> を計算する。 |
| `qp_sin` | `(a: QuadFloat) -> QuadFloat` | 正弦関数を計算する。 |
| `qp_cos` | `(a: QuadFloat) -> QuadFloat` | 余弦関数を計算する。 |
| `qp_atan2` | `(y: QuadFloat, x: QuadFloat) -> QuadFloat` | 2引数逆正接。 |
| `qp_eq` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a == b` を実行する。 |
| `qp_neq` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a != b` を実行する。 |
| `qp_gt` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a > b` を実行する。 |
| `qp_lt` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a < b` を実行する。 |
| `qp_gte` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a >= b` を実行する。 |
| `qp_lte` | `(a: QuadFloat, b: QuadFloat) -> bool` | 比較 `a <= b` を実行する。 |

### 【詳細仕様：拡張数学関数API（qp_）】

#### qp_abs
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（絶対値）
- アルゴリズム: 128bit四倍精度の符号判定、必要なら符号反転
- エラーケース: NaN入力はNaN
- 数値的注意点: -0の扱い、精度保証

#### qp_sign
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（-1, 0, 1）
- アルゴリズム: 0判定、符号判定
- エラーケース: NaN入力はNaN
- 数値的注意点: -0, +0の区別、精度保証

#### qp_floor
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（床値）
- アルゴリズム: 128bit四倍精度で小数点以下切り捨て
- エラーケース: NaN入力はNaN
- 数値的注意点: 負数の扱い、精度保証

#### qp_ceil
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（天井値）
- アルゴリズム: 128bit四倍精度で小数点以下切り上げ
- エラーケース: NaN入力はNaN
- 数値的注意点: 負数の扱い、精度保証

#### qp_round
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（最近接整数）
- アルゴリズム: 128bit四倍精度で四捨五入
- エラーケース: NaN入力はNaN
- 数値的注意点: 0.5の扱い、精度保証

#### qp_sqrt
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（平方根）
- アルゴリズム: ニュートン法による反復計算
- エラーケース: 負数入力はNaN、NaN入力はNaN
- 数値的注意点: 収束判定、精度保証

#### qp_pow
- 入力: `base: QuadFloat`, `exp: QuadFloat`
- 出力: `QuadFloat`（べき乗）
- アルゴリズム: 指数・対数変換によるべき乗計算
- エラーケース: 0^0, 負数のべき乗、NaN入力はNaN
- 数値的注意点: オーバーフロー・アンダーフロー、精度保証

#### qp_log
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（自然対数）
- アルゴリズム: 128bit四倍精度で対数計算
- エラーケース: 負数・ゼロ・NaN入力はNaN
- 数値的注意点: 収束判定、精度保証

#### qp_exp
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（指数関数）
- アルゴリズム: テイラー展開または高速近似
- エラーケース: NaN入力はNaN
- 数値的注意点: オーバーフロー・アンダーフロー、精度保証

#### qp_sin
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（正弦）
- アルゴリズム: テイラー展開または高速近似
- エラーケース: NaN入力はNaN
- 数値的注意点: 周期性、精度保証

#### qp_cos
- 入力: `a: QuadFloat`
- 出力: `QuadFloat`（余弦）
- アルゴリズム: テイラー展開または高速近似
- エラーケース: NaN入力はNaN
- 数値的注意点: 周期性、精度保証

#### qp_atan2
- 入力: `y: QuadFloat`, `x: QuadFloat`
- 出力: `QuadFloat`（逆正接）
- アルゴリズム: 128bit四倍精度でatan2計算
- エラーケース: NaN入力はNaN
- 数値的注意点: 境界値、精度保証

#### qp_eq, qp_neq, qp_gt, qp_lt, qp_gte, qp_lte
- 入力: `a: QuadFloat`, `b: QuadFloat`
- 出力: `bool`（比較結果）
- アルゴリズム: 128bit四倍精度で比較
- エラーケース: NaN入力は常にfalse
- 数値的注意点: -0, +0の区別、精度保証

##### **5.4. 線形代数API (`qla_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qla_vec_add` | `(a: QVector, b: QVector) -> QVector` | ベクトル加算 `a + b`。 |
| `qla_vec_sub` | `(a: QVector, b: QVector) -> QVector` | ベクトル減算 `a - b`。 |
| `qla_vec_scale` | `(vec: QVector, scalar: QuadFloat) -> QVector` | ベクトルのスカラー倍。 |
| `qla_vec_dot` | `(a: QVector, b: QVector) -> QuadFloat` | ベクトルの内積。 |
| `qla_vec_norm` | `(a: QVector) -> QuadFloat` | ベクトルのL2ノルム（長さ）を計算する。 |
| `qla_vec_normalize`| `(a: QVector) -> QVector` | ベクトルを正規化（単位ベクトル化）する。 |
| `qla_mat_vec_mul` | `(mat: QMatrix, vec: QVector) -> QVector` | 行列とベクトルの積。 |
| `qla_mat_mat_mul` | `(a: QMatrix, b: QMatrix) -> QMatrix` | 行列同士の積。 |
| `qla_mat_transpose` | `(mat: QMatrix) -> QMatrix` | 行列を転置する。 |
| `qla_mat_to_vec` | `(mat: QMatrix) -> QVector` | 行列を1次元ベクトルに平坦化する。 |

### 【詳細仕様：線形代数API（qla_）】

#### qla_vec_add
- 入力: `a: QVector`, `b: QVector`（サイズ一致必須）
- 出力: `QVector`（加算結果）
- アルゴリズム: 要素ごとに加算
- エラーケース: サイズ不一致はNaN
- 数値的注意点: 精度保証

#### qla_vec_sub
- 入力: `a: QVector`, `b: QVector`（サイズ一致必須）
- 出力: `QVector`（減算結果）
- アルゴリズム: 要素ごとに減算
- エラーケース: サイズ不一致はNaN
- 数値的注意点: 精度保証

#### qla_vec_scale
- 入力: `vec: QVector`, `scalar: QuadFloat`
- 出力: `QVector`（スカラー倍）
- アルゴリズム: 各要素にscalarを乗算
- エラーケース: NaN入力はNaN
- 数値的注意点: 精度保証

#### qla_vec_dot
- 入力: `a: QVector`, `b: QVector`（サイズ一致必須）
- 出力: `QuadFloat`（内積）
- アルゴリズム: 要素ごとに乗算し合計
- エラーケース: サイズ不一致はNaN
- 数値的注意点: 精度保証

#### qla_vec_norm
- 入力: `a: QVector`
- 出力: `QuadFloat`（L2ノルム）
- アルゴリズム: 各要素の2乗和の平方根
- エラーケース: NaN入力はNaN
- 数値的注意点: オーバーフロー、精度保証

#### qla_vec_normalize
- 入力: `a: QVector`
- 出力: `QVector`（単位ベクトル）
- アルゴリズム: L2ノルムで割る
- エラーケース: ゼロベクトルはNaN
- 数値的注意点: 精度保証

#### qla_mat_vec_mul
- 入力: `mat: QMatrix`, `vec: QVector`（サイズ一致必須）
- 出力: `QVector`（積）
- アルゴリズム: 行列×ベクトル積
- エラーケース: サイズ不一致はNaN
- 数値的注意点: 精度保証

#### qla_mat_mat_mul
- 入力: `a: QMatrix`, `b: QMatrix`（サイズ整合必須）
- 出力: `QMatrix`（積）
- アルゴリズム: 行列積
- エラーケース: サイズ不一致はNaN
- 数値的注意点: 精度保証

#### qla_mat_transpose
- 入力: `mat: QMatrix`
- 出力: `QMatrix`（転置）
- アルゴリズム: 行・列を入れ替え
- エラーケース: NaN入力はNaN
- 数値的注意点: 精度保証

#### qla_mat_to_vec
- 入力: `mat: QMatrix`
- 出力: `QVector`（平坦化ベクトル）
- アルゴリズム: 行列要素を1次元配列に展開
- エラーケース: NaN入力はNaN
- 数値的注意点: 精度保証

##### **5.5. テンソル演算API (`qta_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qta_tensor_reshape` | `(a: QTensor, new_shape: array<u32>) -> QTensor` | テンソルの形状を変更する。要素の総数は不変。 |
| `qta_tensor_permute` | `(a: QTensor, axes: array<u32>) -> QTensor` | テンソルの軸を、指定された順序で入れ替える。 |
| `qta_tensor_contract` | `(a: QTensor, b: QTensor, axes: array<vec2<u32>>) -> QTensor` | 2つのテンソルを、指定された軸に沿って縮約する。 |

### 【詳細仕様：テンソル演算API（qta_）】

#### qta_tensor_reshape
- 入力: `a: QTensor`, `new_shape: array<u32>`（要素総数不変）
- 出力: `QTensor`（新形状）
- アルゴリズム: shape情報のみ変更、dataは再配置しない
- エラーケース: 要素総数不一致はNaN
- 数値的注意点: shape/stride整合性

#### qta_tensor_permute
- 入力: `a: QTensor`, `axes: array<u32>`（軸数一致必須）
- 出力: `QTensor`（軸入替）
- アルゴリズム: shape/strideをaxes順に並べ替え、dataは再配置しない
- エラーケース: 軸数不一致はNaN
- 数値的注意点: shape/stride整合性

#### qta_tensor_contract
- 入力: `a: QTensor`, `b: QTensor`, `axes: array<vec2<u32>>`（縮約軸指定）
- 出力: `QTensor`（縮約結果）
- アルゴリズム: 指定軸で要素を合成、縮約後のshape/strideを計算
- エラーケース: 軸サイズ不一致・縮約不能はNaN
- 数値的注意点: shape/stride整合性、精度保証

##### **5.6. 数値アルゴリズムAPI (`qna_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qna_eigen_jacobi` | `(mat: QMatrix) -> EigenResult` | ヤコビ法により対称行列の固有値と固有ベクトルを計算する。 |
| `qna_svd` | `(mat: QMatrix) -> SVDResult` | 行列の特異値分解を行う。 |
| `qna_interpolate_linear` | `(table: array<vec2<QuadFloat>>, x: QuadFloat) -> QuadFloat` | 2次元の点データから、指定された`x`に対応する値を線形補間する。 |
### 【詳細仕様：数値アルゴリズムAPI（qna_）】

#### qna_eigen_jacobi
- 入力: `mat: QMatrix`（対称行列であることが前提。非対称の場合はNaNを返す）
- 出力: `EigenResult`（`eigenvalues: QVector`, `eigenvectors: QMatrix`）
- アルゴリズム: ヤコビ法（反復的に直交変換を適用し、対角化を進める）
- エラーケース: 入力が非対称・サイズ不一致・収束しない場合はNaN
- 数値的注意点: 収束判定閾値、最大反復回数、数値安定性

#### qna_svd
- 入力: `mat: QMatrix`（任意のm×n行列）
- 出力: `SVDResult`（`U: QMatrix`, `S: QVector`, `Vh: QMatrix`）
- アルゴリズム: ヤコビ法ベースまたはGolub-Reinsch法（実装方針は選択可能）
- エラーケース: サイズ不一致・収束しない場合はNaN
- 数値的注意点: 特異値の順序、ゼロ特異値の扱い、収束判定

#### qna_interpolate_linear
- 入力: `table: array<vec2<QuadFloat>>`（x昇順でソート済みの点列）、`x: QuadFloat`
- 出力: `QuadFloat`（補間値）
- アルゴリズム: xの区間を探索し、線形補間式で値を計算
- エラーケース: xが範囲外の場合は外挿（またはNaN）、点列が空の場合はNaN
- 数値的注意点: 境界値処理、精度保証

---

#### **6. 可視化・解析支援API (`qva_`)**

| 関数名 | シグネチャ | 説明 |
| :--- | :--- | :--- |
| `qva_mat_downsample` | `(mat: QMatrix, factor: u32) -> QMatrix` | 行列を指定された係数でダウンサンプリングし、全体像を把握しやすくする。 |
| `qva_tensor_slice` | `(tensor: QTensor, axis: u32, index: u32) -> QTensor` | 高階テンソルの特定の軸を固定し、低階のテンソル（スライス）を抽出する。 |
| `qva_vec_to_histogram`| `(vec: QVector, bins: u32) -> array<u32>` | ベクトルの値の分布を計算し、ヒストグラムを生成する。 |

### 【詳細仕様：可視化・解析支援API（qva_）】

#### qva_mat_downsample
- 入力: `mat: QMatrix`, `factor: u32`（factor > 0）
- 出力: `QMatrix`（ダウンサンプリング結果）
- アルゴリズム: factorごとに平均・代表値を抽出
- エラーケース: factor=0, サイズ不一致はNaN
- 数値的注意点: 境界値処理、精度保証

#### qva_tensor_slice
- 入力: `tensor: QTensor`, `axis: u32`, `index: u32`（軸・インデックス有効範囲）
- 出力: `QTensor`（スライス抽出結果）
- アルゴリズム: 指定軸を固定し、低次元テンソルを抽出
- エラーケース: 軸・インデックス範囲外はNaN
- 数値的注意点: shape/stride整合性

#### qva_vec_to_histogram
- 入力: `vec: QVector`, `bins: u32`（bins > 0）
- 出力: `array<u32>`（ヒストグラム）
- アルゴリズム: 値の範囲をbins分割し、各区間の個数を集計
- エラーケース: bins=0, NaN入力はNaN
- 数値的注意点: 境界値処理、精度保証

---

#### **7. ドメイン固有拡張の設計指針**

本ライブラリは、それ自体が目的ではなく、より高次の科学的探求を可能にするための**基盤**である。特定の応用分野（例：場の量子論、物性物理学、金融工学）に特化した機能は、この基盤の上に、**アプリケーション層**として構築されるべきである。

**7.1. 物理アルゴリズム層 (`qpa_`) の分離**
当初検討されていた`qpa_`層は、まさにこのアプリケーション層の一例である。
- **例：`qpa_calc_ricci_curvature`**
  - この関数は、`qla_`や`qna_`のAPIを内部で呼び出し、特定の物理理論で定義される「リッチ曲率」を計算する。
  - これは`WGSL Numerics`のコアライブラリには含まれず、**物理シミュレーションプロジェクトのリポジトリ内で、本ライブラリを利用する形で実装される。**

この責務の明確な分離により、本ライブラリは汎用性を保ち、物理理論の変更がライブラリのコアに影響を与えることを防ぐ。

---

#### **8. クックブック (Cookbook: Usage Examples)**

*新規参画者がライブラリの利用方法を迅速に習得できるよう、具体的な使用例を提供する。「生きたドキュメント」として機能する。*

-   **01: ベクトルの内積**
    ```wgsl
    // CPU側でデータ準備
    // var v1_data: array<QuadFloat> = ...;
    // var v2_data: array<QuadFloat> = ...;
    
    // WGSLカーネル内
    var v1: QVector = QVector(v1_data, 3u);
    var v2: QVector = QVector(v2_data, 3u);
    var dot_product: QuadFloat = qla_vec_dot(v1, v2);
    ```
-   **02: 3x3行列の固有値計算**
    ```wgsl
    // CPU側でデータ準備
    // var matrix_data: array<QuadFloat> = ...; // 9要素
    
    // WGSLカーネル内
    var matrix: QMatrix = QMatrix(matrix_data, 3u, 3u);
    var result: EigenResult = qna_eigen_jacobi(matrix);
    // result.eigenvalues はサイズ3のQVector
    // result.eigenvectors は3x3のQMatrix
    ```
-   **03: 2階テンソルと3階テンソルの縮約**
    ```wgsl
    // CPU側でデータ準備
    // var tensor_A_data: array<QuadFloat> = ...; // 12要素
    // var tensor_B_data: array<QuadFloat> = ...; // 120要素
    
    // WGSLカーネル内
    var tensor_A: QTensor = create_qtensor(tensor_A_data, array<u32, 2>(3u, 4u));
    var tensor_B: QTensor = create_qtensor(tensor_B_data, array<u32, 3>(4u, 5u, 6u));
    // テンソルAの1軸目(4)とテンソルBの0軸目(4)を縮約
    var C: QTensor = qta_tensor_contract(tensor_A, tensor_B, array<vec2<u32>, 1>(vec2<u32>(1u, 0u)));
    // 結果のテンソルCの形状は (3, 5, 6) となる
    ```
-   **04: 行列データのヒストグラム作成**
    ```wgsl
    // CPU側でデータ準備
    // var matrix_data: array<QuadFloat> = ...;
    
    // WGSLカーネル内
    var matrix: QMatrix = QMatrix(matrix_data, 100u, 100u);
    // 行列を1次元ベクトルに平坦化
    var vec: QVector = qla_mat_to_vec(matrix);
    // 値の分布を100個のビンでヒストグラム化
    var histogram: array<u32> = qva_vec_to_histogram(vec, 100u);
    ```

---

#### **9. ライブラリの提供形態とアーキテクチャ**

**9.1. 提供形態: JavaScript/TypeScriptライブラリ**
本ライブラリは、最終的にNPMパッケージとして配布される、高レベルな**JavaScript/TypeScriptライブラリ**として提供される。利用者は、WGSLやWebGPUの低レベルな詳細を意識することなく、本ライブラリを利用できる。

**9.2. アーキテクチャ: ラッパー・パターン**
ライブラリは、内部的にWGSLを完全にラッピングするラッパー・パターンを採用する。
-   **エンジン層 (WGSL):** 本仕様書で定義される全ての`qp_`, `qla_`, `qta_`, `qna_`, `qva_`関数。GPU上で実際の高精度計算を実行する。
-   **ラッパー層 (JS/TS):** 開発者が直接利用するAPI。WebGPUの初期化、バッファ管理、データ変換、非同期処理の管理など、全ての複雑な処理をカプセル化する。

**9.3. JS/TS API利用イメージ (概念)**
```typescript
import { Numerics, QMatrix } from 'wgsl-numerics';

async function main() {
  // 1. ライブラリを初期化（内部でWebGPUのセットアップが走る）
  const numerics = await Numerics.create();

  // 2. 通常のJS配列から高精度行列オブジェクトを生成
  const matrixA = numerics.createMatrix([[1, 2], [3, 4]]);
  const matrixB = numerics.createMatrix([[5, 6], [7, 8]]);

  // 3. 行列積を計算 (非同期)
  const resultMatrix: QMatrix = await numerics.matMul(matrixA, matrixB);

  // 4. 結果をJSの配列として取得して利用
  const resultArray = await resultMatrix.toArray();
  console.log(resultArray);

  // 5. リソースを解放
  numerics.destroy();
}

main();
```

---

#### **10. 結論：科学的探求のための、自己完結した基盤**

この「WGSL Numerics 2.0 仕様書 (汎用ライブラリ版)」は、単なるAPIの定義書ではない。それは、**テスト駆動開発、メタプログラミング、そして人間中心設計という方法論を通じて、あらゆる高精度計算の信頼性と持続可能性をコードのレベルで保証するための、我々の誓約である。**

特定の応用分野から独立したこの自己完結した仕様は、世界中の開発者や研究者が、それぞれの目的のために利用できる、堅牢な公共財となることを目指す。この基盤の上に、我々自身の物理シミュレーションを含む、無数の科学的探求が花開くことを確信している。
