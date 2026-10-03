# U-DOSA

うんち警報器の記録をブラウザで見るアプリです。

- **記録(`/`)**: 最後のうんちからの経過時間、直近の記録。外出中の記録の追加、警報器の誤検知の除外(元に戻せる)、手で追加した記録の削除
- **ダッシュボード(`/dashboard`)**: 1 / 7 / 30 / 90 日の回数、平均の間隔、誤検知の数。日ごと・時間帯ごとの回数と、うんちの間隔のグラフ

Next.js 16 / Tailwind CSS v4 / shadcn/ui / Recharts / Supabase。ログインはありません。

## はじめに

1. **テーブルを作る**: Supabase Dashboard(kakeiboo のプロジェクト)の SQL Editor で
   `supabase/migrations/` の SQL をファイル名の順に実行する
   - `20261004000000_create_poop_events.sql`: うんちの記録
   - `20261004120000_create_u_dosa_settings.sql`: 設定(便秘警報の時間)
   - `20261004180000_add_peak_tvoc.sql`: 警報中の TVOC の最大値
2. **接続先を設定する**: `.env.local.example` を `.env.local` にコピーし、
   Project Settings > API の URL と anon キーを入れる
3. **起動する**: `npm install` → `npm run dev`(ポート 3000 が使用中なら `npx next dev -p 3100`)

## 設定を変える

便秘警報(設定した時間うんちの記録がないとダッシュボードに出る警報)の時間は、
Supabase の Table Editor で `u_dosa_settings` の `constipation_alert_hours` を書き換える(1〜720 時間、最初は 48)。
SQL Editor なら `update public.u_dosa_settings set constipation_alert_hours = 72;`。
ダッシュボードを開き直すと反映される。

## 公開(Vercel)

Vercel でリポジトリを読み込み、**Root Directory を `web`** にして、
環境変数 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する。

## 注意

ログインがないため、アプリの URL を知っている人は記録を見たり変更したりできます。
anon キーで触れるのは `poop_events` テーブルだけで、kakeiboo の `expenses` には影響しません
(expenses の RLS はログインユーザー専用のため)。

## コマンド

- `npm run format` → `npm run lint` → `npm run build` の順で確認する
