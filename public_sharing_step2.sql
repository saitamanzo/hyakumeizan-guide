-- plansテーブルの作成（存在しない場合）

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
CREATE INDEX IF NOT EXISTS idx_plans_public ON plans(is_public, published_at) WHERE is_public = true;
