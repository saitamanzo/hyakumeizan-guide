-- 既存環境との整合のため IF NOT EXISTS を付与
CREATE TABLE IF NOT EXISTS mountains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,          -- 山の名前（例：富士山）
    name_kana VARCHAR(255),              -- 読み仮名（例：フジサン）
    elevation INTEGER NOT NULL,          -- 標高（メートル）
    location VARCHAR(255) NOT NULL,      -- 位置（例：静岡県と山梨県の境）
    prefecture VARCHAR(255) NOT NULL,    -- 都道府県
    description TEXT,                    -- 山の説明
    best_season VARCHAR(255),            -- ベストシーズン
    difficulty_level VARCHAR(50),        -- 難易度（初級、中級、上級など）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE,  -- 関連する山のID
    name VARCHAR(255) NOT NULL,          -- ルート名（例：吉田ルート）
    description TEXT,                    -- ルートの説明
    distance DECIMAL(5,2),               -- 距離（km）
    elevation_gain INTEGER,              -- 獲得標高（メートル）
    estimated_time INTEGER,              -- 予想所要時間（分）
    difficulty_level VARCHAR(50),        -- ルートの難易度
    starting_point VARCHAR(255),         -- 開始地点（例：富士山五合目）
    trail_head_access TEXT,             -- アクセス方法の説明
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,  -- Supabase認証のユーザーID
    display_name VARCHAR(255),           -- 表示名
    biography TEXT,                      -- 自己紹介
    experience_level VARCHAR(50),        -- 登山経験レベル
    mountains_climbed INTEGER DEFAULT 0, -- 登頂した山の数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS climbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,         -- 登った人のID
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE, -- 登った山のID
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,      -- 使用したルートのID
    climb_date DATE NOT NULL,            -- 登山日
    start_time TIMESTAMP WITH TIME ZONE, -- 開始時刻
    end_time TIMESTAMP WITH TIME ZONE,   -- 終了時刻
    weather_conditions TEXT,             -- 天候状況
    notes TEXT,                          -- メモ
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5), -- 体感難易度（1-5）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,         -- レビュー投稿者のID
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE, -- レビュー対象の山のID
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,       -- レビュー対象のルートのID
    rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 評価（1-5）
    content TEXT,                        -- レビュー内容
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mountains_name ON mountains(name);
CREATE INDEX IF NOT EXISTS idx_routes_mountain_id ON routes(mountain_id);
CREATE INDEX IF NOT EXISTS idx_climbs_user_id ON climbs(user_id);
CREATE INDEX IF NOT EXISTS idx_climbs_mountain_id ON climbs(mountain_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mountain_id ON reviews(mountain_id);
CREATE INDEX IF NOT EXISTS idx_reviews_route_id ON reviews(route_id);

-- updated_at列を自動更新するためのトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを設定
-- 既存トリガーがあれば一旦削除してから作成
DROP TRIGGER IF EXISTS update_mountains_updated_at ON mountains;
CREATE TRIGGER update_mountains_updated_at
    BEFORE UPDATE ON mountains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_climbs_updated_at ON climbs;
CREATE TRIGGER update_climbs_updated_at
    BEFORE UPDATE ON climbs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
