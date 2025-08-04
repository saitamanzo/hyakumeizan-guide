# 百名山ガイド

日本百名山の情報共有と登山記録のためのウェブアプ3. 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Weather API Configuration
NEXT_PUBLIC_USE_REAL_WEATHER_API=false  # true: 実際のAPI, false: デモデータ
NEXT_PUBLIC_OPENWEATHER_API_KEY=your-openweather-api-key

# Google Maps API Configuration (標高データ取得用)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
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
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

**料金**: Google Elevation API は月間200ドル分（約40,000リクエスト）まで無料。それ以降は1,000リクエストあたり約$5。

**注意**: APIキーが設定されていない場合、日本の地形を考慮した推定値を使用します。## 機能

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

1. 依存関係のインストール

```bash
npm install
```

1. 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

1. 開発サーバーの起動

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
