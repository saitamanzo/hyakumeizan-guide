Vercel デプロイ手順

概要

このプロジェクトを Vercel にデプロイする際に必要な手順と、Vercel の環境変数に登録すべきキーをまとめます。特に SUPABASE の service role key は絶対に公開しないでください。

必須（Vercel の Environment Variables に登録）

- NEXT_PUBLIC_SUPABASE_URL
  - 例: https://your-project.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Supabase の公開用 anon key
- SUPABASE_SERVICE_ROLE_KEY (Masked)
  - Supabase のサービスロールキー（管理 API が必要とするキー）
- NEXT_PUBLIC_SITE_URL
  - 例: https://your-app.vercel.app
- NEXT_PUBLIC_APP_URL
  - 例: https://your-app.vercel.app

推奨 / 必要に応じて

- NEXT_PUBLIC_OPENWEATHER_API_KEY
- GOOGLE_MAPS_API_KEY (サーバー用。絶対に NEXT_PUBLIC_ を付けない)
- SENTRY_DSN
- REDIS_URL
- ADMIN_EMAILS

注意事項

1. 秘密情報をリポジトリに残さない
   - `.env.local` や `.env.vercel` に秘匿情報が含まれている場合、リポジトリから削除してください。履歴に残っている場合はキーのローテーションを行ってください。

2. SUPABASE_SERVICE_ROLE_KEY はサーバー側でのみ使用
   - クライアント側で露出しないように `NEXT_PUBLIC_` プレフィックスを付けないでください。Vercel の「Environment Variables」で Masked を設定します。

3. OAuth のリダイレクト設定
   - Supabase で OAuth を使う場合、`NEXT_PUBLIC_SITE_URL`（例: https://your-app.vercel.app）を Supabase の OAuth リダイレクト設定に追加してください。

設定手順（Vercel ダッシュボード）

1. Vercel のプロジェクトに移動 → Settings → Environment Variables
2. 上の一覧で必要なキーを追加（Value を貼り付け、Environment を Production/Preview/Development を選択）
3. `SUPABASE_SERVICE_ROLE_KEY` は必ず Masked にチェック
4. 変更後、Deploy を実行して動作を確認

リポジトリ内の掃除（推奨）

- 既に秘匿情報をコミットしている場合:
  1. 対象キーを無効化（Supabase のコンソールでサービスロールキーの再発行）
  2. git 履歴から削除するなら `git filter-repo` 等を使用（注意: 操作は履歴改変なのでチームで合意をとること）

例: すぐに行う簡易手順

```bash
# 1) .env.local をコミット対象から除外
git rm --cached .env.local || true
# 2) .gitignore を追加してコミット
git add .gitignore
git commit -m "Ignore env files and build artifacts"
# 3) リモートへ push
git push origin main
```

必要なら、私が `.gitignore` を追加して `.env.local` を git のインデックスから除外するコマンドの生成や、`DEPLOYMENT.md` の内容調整、あるいは履歴抹消手順の詳細を作成します。どれを先に進めますか？
