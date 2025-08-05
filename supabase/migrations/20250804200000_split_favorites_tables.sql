-- 旧likesテーブルを廃止し、用途ごとに分離

-- 山のお気に入りテーブル
CREATE TABLE IF NOT EXISTS mountain_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, mountain_id)
);

-- 登山計画のお気に入りテーブル
CREATE TABLE IF NOT EXISTS plan_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, plan_id)
);

-- RLS: 自分の分だけ見れる
ALTER TABLE mountain_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own mountain favorites"
  ON mountain_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mountain favorites"
  ON mountain_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mountain favorites"
  ON mountain_favorites FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE plan_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own plan favorites"
  ON plan_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plan favorites"
  ON plan_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan favorites"
  ON plan_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 旧likesテーブルをリネーム（バックアップ用途）
ALTER TABLE IF EXISTS likes RENAME TO legacy_likes;
