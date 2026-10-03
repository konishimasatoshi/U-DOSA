# kakeiboo 開発 TODO

`requirements.md`（要件定義書）をもとにした開発の進め方と TODO リスト。進捗に合わせてチェックを付けて更新する。

- 凡例: `[ ]` 未着手 / `[x]` 完了 / 👤 ユーザー作業（ダッシュボード操作やキー設定など） / 🤖 Claude が実装
- 参照ドキュメント: `design_system.md`（UI）、`supabase_document.md`、`clerk_document.md`、`clerk_supabase_integration_document.md`

## 進め方の方針

1. **土台 → 認証 → データ → 画面 → 課金 → プレミアム → リリース** の順に、依存関係の下流から積み上げる。
   - 支出データは Clerk のユーザー ID に紐づくため、認証を先に動かしてから DB を作る。
   - ダッシュボードは支出データがないと確認できないため、記録・履歴の後に作る。
2. **無料版を一通り完成させてから有料版に進む。** 無料版（記録・履歴・合計表示）だけで MVP として成立し、課金は要件どおり開発後半に回す。
3. **集計ロジックは無料版の段階で共通化しておく。** 期間の計算（日本時間・週は月曜始まり）と合計の集計を `lib/` にまとめ、プレミアムの期間分析で再利用する。
4. **ユーザー作業は早めに済ませておく。** Clerk / Supabase のプロジェクト作成、両者のネイティブ連携、キー設定は、各フェーズの直前ではなくフェーズ 0 でまとめて行うと待ちが発生しない。Clerk Billing（Stripe 連携）はフェーズ 7 の前までに。

## 決定事項（2026-10-02 決定）

要件定義書と CLAUDE.md・各ドキュメントで食い違っていた点の決定内容。CLAUDE.md にも反映済み。

- [x] **Clerk × Supabase の連携方式: 公式の JWT 方式（Clerk のネイティブ Supabase 連携）**
  - 要件定義書の「カスタムヘッダー方式」は、ヘッダーを偽装できるため採用しない。
  - Clerk を Supabase のサードパーティ認証に設定し、Supabase クライアントの `accessToken` に Clerk のセッショントークンを渡す。RLS は `auth.jwt()->>'sub'` と `user_id` を比較する。
  - JWT テンプレート（`getToken({ template: 'supabase' })`）は 2025-04-01 に非推奨になったため使わない。`getToken()` を引数なしで呼ぶ。
- [x] **Supabase CLI の使い方: クラウドの開発用プロジェクトに反映して検証する**（Docker は使わない）。CLI はマイグレーション管理・`db push`・型生成に使う。
- [x] **shadcn/ui と lucide-react: 導入する**（要件定義書どおり）。shadcn/ui のコンポーネントはデザインシステムの配色・角丸・影に合わせて調整する。
  - shadcn/ui は CSS 変数モードで使う（CSS 変数なしモードは現行の CLI で壊れたクラスを出力するため）。`app/globals.css` のテーマトークンは Tailwind のカラーパレットを参照するだけにし（例: `--primary: var(--color-blue-500)`）、独自の色の値は定義しない。
- [x] **プレミアムのグラデーション: 青系に限定して許可**。プレミアム要素（アクティブタブ、プレミアム枠の帯など）に限り `from-blue-600 to-blue-800` などの青系グラデーション + 白文字を使う。コントラスト基準は守る。
- [x] **マイグレーションの適用: Supabase Dashboard の SQL Editor で行う**（2026-10-02 追加）。社内ネットワークから DB ポート（5432/6543）に接続できず `supabase db push` が使えないため。
  - `npm run migration:sql -- supabase/migrations/<ファイル>.sql` で、本体と履歴テーブルへの記録をまとめた SQL を `supabase/.apply/` に作り、ユーザーが SQL Editor で実行する。履歴に記録されるので、ポートが使えるネットワークから後で `db push` しても二重に適用されない。
  - 型生成（`gen types --linked`）は HTTPS で動くので CLI のまま使う。
- [x] **ダークモード: MVP では無効**。白背景で統一し、`app/globals.css` の `prefers-color-scheme` による切り替えを削除する。
- [x] **サービス名: kakeiboo**（要件定義書の「Money Tracker」は使わない）。画面表示・metadata・ドキュメントでは「kakeiboo」を使う。Supabase のプロジェクト名も `kakeiboo`。

## フェーズ 0: 事前準備（ユーザー作業）

- [x] 👤 Clerk でアプリケーションを作成し、サインイン方法を「メールアドレス + パスワード」のみにする（ソーシャルログインは無効）
- [x] 👤 Supabase クラウドに開発用プロジェクト（`kakeiboo`、リージョンは東京）を作成
- [x] 👤 `.env.local` を作成し、以下を設定
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard` / `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（JWT 方式のため Service Role キーは通常の処理では使わない）
- [x] 👤 `npx supabase login` と `npx supabase link --project-ref <開発用プロジェクトID>` を実行
- [x] 👤 Clerk と Supabase のネイティブ連携を設定（JWT 方式のため）
  - Clerk Dashboard の Supabase 連携設定（https://dashboard.clerk.com/setup/supabase）で連携を有効化し、表示される Clerk ドメインを控える
  - Supabase Dashboard の Authentication > Sign In / Providers > Third Party Auth で Clerk を追加し、Clerk ドメインを貼り付ける
- [x] 上の「着手前に決めること」を決定

## フェーズ 1: プロジェクトの土台

- [x] 🤖 パッケージ導入: `lucide-react`、`date-fns`、`date-fns-tz`、`react-hook-form`（Recharts と Clerk 系はそれぞれのフェーズで導入）
- [x] 🤖 shadcn/ui の初期化（Tailwind v4 対応の手順で）と、使うコンポーネント（Button、Card、Input、Tabs など）の追加・デザインシステムへの調整
- [x] 🤖 Prettier の導入と ESLint との併用設定、`format` スクリプトの追加
- [x] 🤖 `app/globals.css` をデザインシステムに合わせて整理（白背景・文字色、`prefers-color-scheme` のダークモード切り替えを削除）
- [x] 🤖 `app/layout.tsx`: `lang="ja"`、サービス名「kakeiboo」の metadata
- [x] 🤖 定数の定義: 固定カテゴリ 9 種類（`lib/constants.ts`）、プランのスラグ `premium`
- [x] 🤖 共通ヘッダー（ロゴ、ナビゲーション。ユーザーメニューはフェーズ 2 で追加）
- [x] 🤖 `.gitignore` に `supabase/.temp`（`supabase link` のローカル情報）を追加
- [x] 🤖 CLAUDE.md の更新（shadcn/ui 導入後の記述、Prettier のコマンド）

## フェーズ 2: 認証（Clerk）

- [x] 🤖 `@clerk/nextjs` 導入、ルートレイアウトに `ClerkProvider`（日本語化する場合は `@clerk/localizations` も）
- [x] 🤖 `proxy.ts`（Next.js 16 で Middleware から改名）に `clerkMiddleware()`、`/dashboard` と `/api/expenses` を保護
  - Clerk Core 3 で `createRouteMatcher` が非推奨になったため、`proxy.ts` は `clerkMiddleware()` のみ。保護は各ページ・Route Handler で `await auth.protect()` を呼んで行う（`/api/expenses` はフェーズ 4 で作るときに入れる）
- [x] 🤖 `/sign-in`、`/sign-up` ページ（Clerk コンポーネント）
- [x] 🤖 ヘッダーにユーザーメニュー（`UserButton`、未ログイン時はサインインボタン）
- [x] 🤖 `/dashboard` の仮ページ（ログイン必須の確認用）
- [x] 確認: サインアップ → サインイン → パスワードリセット → サインアウトが一通り動く

## フェーズ 3: データベース（Supabase）

- [x] 🤖 `npx supabase init`、マイグレーションで `expenses` テーブルを作成
  - `id` UUID / `user_id` TEXT（Clerk のユーザー ID、`DEFAULT auth.jwt()->>'sub'`）/ `amount` INTEGER（円、1 以上）/ `category` TEXT（固定 9 種類の CHECK 制約）/ `spent_at` TIMESTAMPTZ（記録日時）/ `created_at` / `updated_at`
  - インデックス: `(user_id, spent_at)`
  - RLS を有効化し、SELECT / INSERT / UPDATE / DELETE の各ポリシーを `authenticated` ロール向けに `(select auth.jwt()->>'sub') = user_id` で設定
- [x] 🤖 `users` テーブルの要否を判断（要件上は不要。必要になった場合は Webhook を使わず、初回データ登録時に作成する）
  - 判断: 不要。支出は `expenses.user_id`（Clerk のユーザー ID）だけで紐づけられるため作らない
- [x] 🤖 `npx supabase db push` で開発用プロジェクトに反映、`npx supabase gen types typescript --linked` で型を生成
  - 社内ネットワークでは DB ポートに接続できないため、`npm run migration:sql` で作った SQL を Dashboard の SQL Editor で実行する（決定事項を参照）
- [x] 👤 `supabase/.apply/20261002073229_create_expenses.sql` を Supabase Dashboard の SQL Editor で実行
- [x] 🤖 Supabase クライアント: サーバー用（`accessToken` で `(await auth()).getToken()`）とクライアント用（`useSession()` の `session?.getToken()`）
- [x] 確認: 別ユーザーでサインインすると、他人の支出が取得・更新・削除できない（RLS が効いている）
  - 未ログイン（anon キーのみ）では取得 0 件・登録は RLS エラー・更新／削除 0 件を確認済み（2026-10-02）。別ユーザー間の確認もフェーズ 4 の画面で OK（2026-10-02）

## フェーズ 4: 支出記録とデータ管理（機能 1・2）

- [x] 🤖 API: `GET/POST /api/expenses`、`PATCH/DELETE /api/expenses/[id]`（要件どおり API Routes 経由。サーバー側で Clerk 認証を確認し、Clerk のトークン付き Supabase クライアントで RLS を効かせる。入力値の検証）
- [x] 🤖 支出記録フォーム（react-hook-form）: 金額入力 → カテゴリをボタンで選択 → 記録。最小ステップ・スマホで押しやすいサイズ（タッチターゲット 44px 以上）
- [x] 🤖 記録後のフィードバック（成功表示、入力欄のリセット）
- [x] 確認: 記録が 1 秒以内に完了する（ログインした状態でブラウザから確認）
- [x] 🤖 支出履歴の一覧（新しい順）
  - 最新 50 件を日付ごとにまとめて表示。それより古い分のページ送りは必要になったら追加する
- [x] 🤖 支出の編集・削除（削除は確認ダイアログ付き）
  - 編集できるのは金額・カテゴリ・日付（時刻は元のまま）
- [x] 確認: 記録 → 履歴に表示 → 編集 → 削除が一通り動く（スマホ幅でも）

## フェーズ 5: ダッシュボード（無料版、機能 3）

- [x] 🤖 期間計算の共通ロジック（`lib/`）: 日本時間（`Asia/Tokyo`）、週は月曜始まり。今日/昨日・今週/先週・今月/先月を返す
- [x] 🤖 集計 API: 期間内の合計（プレミアムでも使えるよう、期間を引数で受け取る形にする）
  - `GET /api/expenses/summary?start=&end=`（合計と件数）。PostgREST の集計関数は既定で無効なので、金額を取得してサーバーで合計する
- [x] 🤖 `/dashboard` に「今週の支出合計」「今月の支出合計」、記録フォーム、履歴をまとめる
- [ ] 確認: スマホ幅での表示、記録すると合計がすぐ更新される

## フェーズ 6: 公開ページ

- [x] 🤖 トップページ `/`: サービス紹介（「3つの機能だけ。続けられる家計簿」）、機能説明、料金プラン（無料 / プレミアム $10/月）、サインアップへの導線
- [x] 🤖 フッター（コピーライト、トップページのみ）
- [x] 🤖 ログイン済みユーザーのヘッダーにダッシュボードへのリンク（未ログインでは表示しない）
- [ ] 確認: トップページの表示（スマホ・PC 幅）、ログイン前後でボタンとヘッダーのリンクが切り替わる
  - ヘッダーの「料金」とプレミアムのボタンは `/pricing` へのリンク。ページはフェーズ 7 で作るので、それまでは 404 になる

**ここまでで無料版の MVP が完成。** 一度 Vercel にデプロイしてもよい（フェーズ 9 の一部を前倒し）。

## フェーズ 7: 課金（Clerk Billing）

- [x] 👤 Clerk Dashboard で Billing を有効化し、Stripe（テストモード）を接続
- [x] 👤 プランを作成: スラグ `premium`、$10/月
- [x] 🤖 `/pricing` に Clerk の `PricingTable`（`'use client'` のコンポーネント内で動的インポート）
- [x] 🤖 プラン判定ヘルパー（サーバー: `lib/plan.ts` の `isPremium()`（`auth()` の `has({ plan: 'premium' })`）、クライアント: `<Show when={{ plan: "premium" }}>`。Clerk Core 3 で `<Protect>` は削除された）
- [x] 🤖 無料ユーザー向けのアップグレード導線（ダッシュボードのプレミアム枠に「プレミアムで使える機能」と `/pricing` へのボタン）
- [x] 確認: テストカードで購読 → プレミアム判定が true になる → 解約で false に戻る

## フェーズ 8: プレミアム分析機能

- [x] 🤖 Recharts 導入
- [x] 🤖 集計 API の拡張（`GET /api/analytics`、`has({ plan: 'premium' })` をサーバー側で必ず確認）
  - カテゴリ別合計、前期間との比較（増減率 %）、1 日平均、最も支出が多いカテゴリ
  - グラフ用の時系列データ（日次: 時間帯別、週次: 日別 × カテゴリ、月次: 週別）
  - 計算は `lib/analytics.ts`（純粋な関数）。平均の分母は、進行中の期間では今日までの日数。日次は 1 件あたりの平均
  - 週次のカスタム期間は開始日〜終了日（最大 31 日）。前の期間は同じ日数だけさかのぼる
- [x] 🤖 期間切り替えタブ（日次 / 週次 / 月次）。アクティブタブは青系グラデーション背景 + 白文字、トランジション付き
- [x] 🤖 期間セレクター
  - 日次: 今日 / 昨日 + カレンダーピッカー
  - 週次: 今週 / 先週 + カスタム期間
  - 月次: 今月 / 先月 + 年月ピッカー
- [x] 🤖 サマリーカード（総支出、前期間比較、1 日平均、最多カテゴリ）。増減は色（増加: 赤、減少: 緑）に加えて矢印・符号でも示す（色だけに頼らない）
- [x] 🤖 グラフ: 円グラフ（支出割合）、棒グラフ（カテゴリ別比較）、日次: 折れ線、週次: 日別積み上げ棒、月次: 週別トレンドライン
  - 日次の折れ線は時間帯ごとの累計。カテゴリ別の比較は「この期間」と「前の期間」の横棒。各グラフに「表で見る」を付けた
  - サンプルデータで PC 幅・スマホ幅の表示を確認済み（2026-10-02）。支出の記録・編集・削除で分析も取り直す
- [x] 🤖 プレミアム感のある UI（青系グラデーションに限定、アニメーションは `prefers-reduced-motion` に対応）
- [ ] 確認: 無料ユーザーには表示されず、API も 403 を返す

## フェーズ 9: 仕上げとリリース

- [x] 🤖 `design_system.md` の「12. 実装チェックリスト」「13. 禁止事項」で全画面を確認（コントラスト、キーボード操作、aria、タッチターゲット）
  - ヘッダーのロゴのリンクを 44px 以上に、「表で見る」に影を追加、データがない期間の推移グラフに空の表示を追加（2026-10-02）
  - Clerk の PricingTable の中（「今後のプラン」のバッジなど）は Clerk の部品のため、配色を調整していない
- [ ] 🤖 スマホ・タブレット・PC 幅でのレスポンシブ確認
  - PC 幅と、Chrome で縮められる最小幅（約 650px）までは確認済み。スマホ実機（390px 前後）での確認が残っている
- [x] 🤖 `npm run lint`、`npm run build` が通ることを確認
- 本番の準備とデプロイの詳しい手順は `release_guide.md` にまとめた（独自ドメインが必要なこと、Vercel の Root Directory、環境変数の一覧など）
- [ ] 👤 Supabase に本番用プロジェクトを作成し、`supabase/.apply/` の SQL を SQL Editor で実行（社内ネットワークでは `db push` が使えないため）。本番の Clerk ドメインで Third Party Auth を設定
- [ ] 👤 Clerk を本番インスタンスに切り替え（独自ドメインが必要）、Billing（自分の Stripe を接続）・プラン `premium`（$10/月）を本番でも作成
- [ ] 👤 GitHub にプッシュし、Vercel にプロジェクトを作成（Root Directory は `test1`）。本番用の環境変数を設定してデプロイ（HTTPS は Vercel で自動）
- [ ] 確認: 本番環境でサインアップ → 記録 → ダッシュボード → 購読 → プレミアム分析が一通り動く
