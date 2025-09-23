# 百名山ガイド

日本百名山の情報共有と登山記録のためのウェブアプリ。

## 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Weather API Configuration
NEXT_PUBLIC_USE_REAL_WEATHER_API=false  # true: 実際のAPI, false: デモデータ
NEXT_PUBLIC_OPENWEATHER_API_KEY=your-openweather-api-key

# Elevation（Google）
# サーバ専用キーのみを使用します。ブラウザへは公開しません。
# Google Cloud で Elevation API を有効化し、HTTP リファラまたはIP制限を設定してください。
GOOGLE_MAPS_API_KEY=your-server-side-google-maps-api-key

# API保護（任意） – /api/elevation のレート制限
ELEVATION_RATE_LIMIT_PER_MINUTE=60
ELEVATION_RATE_LIMIT_WINDOW_MS=60000

# 監視（任意） – Sentry を使用する場合
# パッケージ: @sentry/nextjs を導入し、以下を設定してください
# npm i @sentry/nextjs
SENTRY_DSN=
```

## API設定（オプション）

### 天気API の設定

実際の天気データを使用する場合：

1. [OpenWeatherMap](https://openweathermap.org/api) でアカウントを作成
2. APIキーを取得
3. `.env.local` で以下を設定：

   ```bash
   NEXT_PUBLIC_USE_REAL_WEATHER_API=true
   NEXT_PUBLIC_OPENWEATHER_API_KEY=your-actual-api-key
   ```

**注意**: 無効なAPIキーの場合、自動的にデモデータにフォールバックします。

### Google Maps API の設定（標高データ取得用）

正確な標高データを取得する場合：

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Elevation API を有効化
3. APIキーを作成し、必要に応じて制限を設定
4. `.env.local` で設定：

   ```bash
   GOOGLE_MAPS_API_KEY=your-server-side-google-maps-api-key
   ```

**料金**: Google Elevation API は月間200ドル分（約40,000リクエスト）まで無料。それ以降は1,000リクエストあたり約$5。

**注意**: APIキーが未設定の場合は推定値にフォールバックします。クライアント側で Google のキーは参照しません。

## 機能

- 山の一覧表示と詳細情報
- 登山ルート情報
- ユーザー登録・認証
- 登山記録の作成と共有
- レビューシステム

## 技術スタック

- Next.js 14（App Router）
- TypeScript
- Tailwind CSS
- Supabase（認証・データベース）

## 開発環境のセットアップ

1. リポジトリのクローン

```bash
git clone https://github.com/saitamanzo/hyakumeizan-guide.git
cd hyakumeizan-guide
```

2. 依存関係のインストール

```bash
npm install
```

3. 環境変数の設定（上記参照）

4. 開発サーバーの起動

```bash
npm run dev
```

## データベース構造

- `mountains`: 百名山の基本情報
- `routes`: 登山ルート情報
- `users`: ユーザープロフィール
- `climbs`: 登山記録
- `reviews`: 山・ルートのレビュー

## ライセンス

[MIT License](LICENSE)

## Redis / Redlock / StatsD (オプション)

このリポジトリは Redis を使ったキャッシュ、分散ロック（Redlock）、および StatsD（hot-shots）でのメトリクス送信をサポートしますが、これらは必須ではありません。開発や小規模デプロイでは Redis が無くてもアプリは動作します。

有効化手順（必要なときのみ）:

- 必要な環境変数を設定します（例 `.env.local`）:

```bash
REDIS_URL=redis://user:pass@redis-host:6379
REDIS_KEY_PREFIX=hyakumeizan:
PUSHGATEWAY_URL=http://pushgateway.example:9091
STATSD_HOST=statsd.example
STATSD_PORT=8125
```

- optionalDependencies をインストールします（プロジェクトの依存関係にインストールする場合）:

```bash
npm install --include=optional
```

- 一部の管理スクリプトは Redis を前提としています（例: `scripts/migrate-redis-prefix.mjs`、`scripts/test-redis-connection.mjs`）。これらは README の指示通り `REDIS_URL` を設定してから実行してください。

挙動のポイント:

- アプリ本体は in-memory キャッシュにフォールバックするため、`REDIS_URL` が未設定でも機能します。
- Redis が利用可能な場合、キャッシュの永続化、分散ロック、メトリクス蓄積が有効になります。
- optional なパッケージは動的 import で取り扱っており、インストールしていない環境ではロードを試みず安全にフォールバックします。

質問があれば次に Redis を完全に除去するか、運用時に有効化するためのドキュメントをさらに整備します。
