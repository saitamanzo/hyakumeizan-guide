-- 登山記録と計画に公開機能を追加

-- climbs テーブルに公開フラグを追加
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- インデックスを追加（公開記録の検索用）
CREATE INDEX IF NOT EXISTS idx_climbs_public ON climbs(is_public, published_at) WHERE is_public = true;

-- plans テーブルが存在する場合は公開フラグを追加
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans') THEN
        ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
        ALTER TABLE plans ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_plans_public ON plans(is_public, published_at) WHERE is_public = true;
    END IF;
END $$;

-- plansテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    planned_date DATE,
    estimated_duration INTEGER, -- 分単位
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'hard')),
    route_plan TEXT,
    equipment_list TEXT[],
    notes TEXT,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- plansテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_mountain_id ON plans(mountain_id);

-- RLS (Row Level Security) ポリシー更新

-- climbs テーブル: 公開記録は全員が閲覧可能
DROP POLICY IF EXISTS "Allow public read access to public climbs" ON climbs;
CREATE POLICY "Allow public read access to public climbs" ON climbs
FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- 既存のポリシーを更新（自分の記録は常に閲覧可能）
DROP POLICY IF EXISTS "Allow individual read access for users" ON climbs;
CREATE POLICY "Allow individual read access for users" ON climbs
FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- plans テーブルのRLSを有効化
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- plans テーブルのポリシー
DROP POLICY IF EXISTS "Users can view their own plans" ON plans;
CREATE POLICY "Users can view their own plans" ON plans
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read access to public plans" ON plans;
CREATE POLICY "Allow public read access to public plans" ON plans
FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own plans" ON plans;
CREATE POLICY "Users can insert their own plans" ON plans
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own plans" ON plans;
CREATE POLICY "Users can update their own plans" ON plans
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own plans" ON plans;
CREATE POLICY "Users can delete their own plans" ON plans
FOR DELETE USING (auth.uid() = user_id);

-- climb_photos テーブル: 公開記録に関連する写真は全員が閲覧可能
DROP POLICY IF EXISTS "Users can view all climb photos" ON climb_photos;
CREATE POLICY "Users can view all climb photos" ON climb_photos
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM climbs 
        WHERE climbs.id = climb_photos.climb_id 
        AND (climbs.is_public = true OR climbs.user_id = auth.uid())
    )
);

-- トリガー関数を作成（公開時に published_at を設定）
CREATE OR REPLACE FUNCTION set_published_at_on_public()
RETURNS TRIGGER AS $$
BEGIN
    -- is_public が true になった場合、published_at を設定
    IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
        NEW.published_at = NOW();
    -- is_public が false になった場合、published_at をクリア
    ELSIF NEW.is_public = false THEN
        NEW.published_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを climbs テーブルに適用
DROP TRIGGER IF EXISTS trigger_set_published_at_climbs ON climbs;
CREATE TRIGGER trigger_set_published_at_climbs
    BEFORE UPDATE ON climbs
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at_on_public();

-- トリガーを plans テーブルに適用
DROP TRIGGER IF EXISTS trigger_set_published_at_plans ON plans;
CREATE TRIGGER trigger_set_published_at_plans
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at_on_public();

-- updated_at カラムの自動更新トリガー
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
