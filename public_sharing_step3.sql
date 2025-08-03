-- RLS (Row Level Security) ポリシー設定

-- plans テーブルのRLSを有効化
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- climbs テーブル: 公開記録は全員が閲覧可能
DROP POLICY IF EXISTS "Allow public read access to public climbs" ON climbs;
CREATE POLICY "Allow public read access to public climbs" ON climbs
FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- 既存のポリシーを更新（自分の記録は常に閲覧可能）
DROP POLICY IF EXISTS "Allow individual read access for users" ON climbs;
CREATE POLICY "Allow individual read access for users" ON climbs
FOR SELECT USING (auth.uid() = user_id OR is_public = true);

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
