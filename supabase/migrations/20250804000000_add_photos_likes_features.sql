-- 写真管理テーブル
CREATE TABLE IF NOT EXISTS climb_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    climb_id UUID NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,          -- Supabase Storageのパス
    thumbnail_path TEXT,                 -- サムネイル画像のパス
    original_filename TEXT,              -- 元のファイル名
    file_size INTEGER,                   -- ファイルサイズ（バイト）
    mime_type TEXT,                      -- MIMEタイプ
    caption TEXT,                        -- 写真のキャプション
    sort_order INTEGER DEFAULT 0,       -- 表示順序
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- いいね機能テーブル
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    climb_id UUID REFERENCES climbs(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES climbing_plans(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT likes_unique_climb UNIQUE (user_id, climb_id),
    CONSTRAINT likes_unique_plan UNIQUE (user_id, plan_id),
    CONSTRAINT likes_check_target CHECK (
        (climb_id IS NOT NULL AND plan_id IS NULL) OR 
        (climb_id IS NULL AND plan_id IS NOT NULL)
    )
);

-- 登山計画テーブル（いいね機能で参照されるため）
CREATE TABLE IF NOT EXISTS climbing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mountain_id UUID NOT NULL REFERENCES mountains(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    planned_date DATE,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- climbs テーブルに公開設定を追加（まだ無い場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'climbs' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE climbs ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'climbs' AND column_name = 'published_at'
    ) THEN
        ALTER TABLE climbs ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_climb_photos_climb_id ON climb_photos(climb_id);
CREATE INDEX IF NOT EXISTS idx_climb_photos_user_id ON climb_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_climb_id ON likes(climb_id);
CREATE INDEX IF NOT EXISTS idx_likes_plan_id ON likes(plan_id);
CREATE INDEX IF NOT EXISTS idx_climbing_plans_user_id ON climbing_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_climbing_plans_mountain_id ON climbing_plans(mountain_id);
CREATE INDEX IF NOT EXISTS idx_climbing_plans_public ON climbing_plans(is_public, published_at);
CREATE INDEX IF NOT EXISTS idx_climbs_public ON climbs(is_public, published_at);

-- トリガーの追加
CREATE TRIGGER IF NOT EXISTS update_climb_photos_updated_at
    BEFORE UPDATE ON climb_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_climbing_plans_updated_at
    BEFORE UPDATE ON climbing_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- published_at を自動設定するトリガー
CREATE OR REPLACE FUNCTION update_published_at()
RETURNS TRIGGER AS $$
BEGIN
    -- is_public が true に変更された場合、published_at を設定
    IF NEW.is_public = true AND OLD.is_public = false THEN
        NEW.published_at = TIMEZONE('utc'::text, NOW());
    -- is_public が false に変更された場合、published_at をクリア
    ELSIF NEW.is_public = false AND OLD.is_public = true THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを climbs テーブルに適用
DROP TRIGGER IF EXISTS update_climbs_published_at ON climbs;
CREATE TRIGGER update_climbs_published_at
    BEFORE UPDATE ON climbs
    FOR EACH ROW
    EXECUTE FUNCTION update_published_at();

-- トリガーを climbing_plans テーブルに適用
DROP TRIGGER IF EXISTS update_climbing_plans_published_at ON climbing_plans;
CREATE TRIGGER update_climbing_plans_published_at
    BEFORE UPDATE ON climbing_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_published_at();

-- RLS (Row Level Security) を有効にする
ALTER TABLE climb_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbing_plans ENABLE ROW LEVEL SECURITY;

-- climb_photos のRLSポリシー
CREATE POLICY "写真は作成者のみ管理可能" ON climb_photos
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "公開された登山記録の写真は全員が閲覧可能" ON climb_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM climbs 
            WHERE climbs.id = climb_photos.climb_id 
            AND climbs.is_public = true
        )
    );

-- likes のRLSポリシー
CREATE POLICY "いいねは全員が閲覧可能" ON likes
    FOR SELECT USING (true);

CREATE POLICY "いいねは認証ユーザーが管理可能" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "いいねは本人のみ削除可能" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- climbing_plans のRLSポリシー
CREATE POLICY "登山計画は作成者のみ管理可能" ON climbing_plans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "公開された登山計画は全員が閲覧可能" ON climbing_plans
    FOR SELECT USING (is_public = true);

-- ストレージバケットの作成（存在しない場合）
INSERT INTO storage.buckets (id, name, public)
VALUES ('climb-photos', 'climb-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ストレージのRLSポリシー
CREATE POLICY IF NOT EXISTS "写真アップロードは認証ユーザーのみ" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'climb-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "写真閲覧は全員可能" ON storage.objects
    FOR SELECT USING (bucket_id = 'climb-photos');

CREATE POLICY IF NOT EXISTS "写真削除は作成者のみ" ON storage.objects
    FOR DELETE USING (bucket_id = 'climb-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "写真更新は作成者のみ" ON storage.objects
    FOR UPDATE USING (bucket_id = 'climb-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
