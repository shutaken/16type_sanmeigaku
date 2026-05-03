# 16宿命タイプ診断 MVP

性格タイプ × 算命学 陽占5位置の無料診断サイトです。Next.js App Router / Supabase / Stripe Checkout / Vercel 本番デプロイを前提にしています。

## 重要な前提

- 無料診断はDBマスタのテンプレート文章から生成します。
- 生成AIは使っていません。
- `lib/sanmei.ts` の `calculateYosenFiveStars` は、デプロイ検証用の決定的フォールバックです。正式な算命学計算ロジックに差し替えてください。
- `ALLOW_DETERMINISTIC_SANMEI_FALLBACK=false` にすると、正式ロジック未実装時は診断生成が停止します。

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase SQL Editor で以下を順に実行してください。

```text
sql/fortune_site_schema.sql
sql/fortune_site_seed_content.sql
sql/fortune_site_seed_star_position_texts_v2_delete_insert.sql
```

## 必要な環境変数

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SITE_NAME
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_COOKIE_NAME
SESSION_COOKIE_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
ALLOW_DETERMINISTIC_SANMEI_FALLBACK
```

Vercelでは Project Settings > Environment Variables に設定してください。Next.jsでは、ブラウザに公開する値だけ `NEXT_PUBLIC_` を付け、Service Role Key や Stripe Secret Key はサーバー側環境変数としてのみ扱います。

## 画面

- `/` LP
- `/diagnosis` 無料診断入力
- `/result/[id]` 診断結果
- `/premium/[resultId]` 有料レポート購入導線
- `/payment/success` 決済成功後
- `/payment/cancel` 決済キャンセル後

## API

- `POST /api/diagnosis/start`
- `POST /api/diagnosis/submit`
- `POST /api/checkout`
- `POST /api/stripe/webhook`

## 最低限のセキュリティ対策

- Supabase Service Role Key はサーバー専用で利用
- ユーザー系テーブルはRLS有効、フロントから直接書き込まない
- 匿名診断結果は httpOnly cookie の `session_token` と紐づけて閲覧制御
- API入力は zod で検証
- 診断・決済APIに簡易レート制限
- 同一Originチェック
- Stripe Webhook署名検証
- Stripe WebhookイベントIDで冪等性管理
- セキュリティヘッダー/CSP設定
- IPはHMACハッシュ化して保存

## 正式リリース前に必要な作業

1. `lib/sanmei.ts` の正式な算命学計算ロジック実装
2. Stripe本番キーとWebhook URL設定
3. Supabaseの本番プロジェクトでDDL/seed投入
4. `ALLOW_DETERMINISTIC_SANMEI_FALLBACK=false` で診断生成テスト
5. 法務・表示確認：診断免責、特商法表記、プライバシーポリシー、利用規約
6. 有料レポート本文生成ロジックの実装

## GitHubアップロード

```bash
git init
git add .
git commit -m "Initial fortune diagnosis MVP"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```
