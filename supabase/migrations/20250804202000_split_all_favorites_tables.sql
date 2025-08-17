-- 山・登山記録・登山計画のお気に入りを用途ごとに分離

-- 山のお気に入り
CREATE TABLE IF NOT EXISTS mountain_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, mountain_id)
);

-- 登山記録のお気に入り
CREATE TABLE IF NOT EXISTS climb_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  climb_id UUID REFERENCES climbs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, climb_id)
);

-- 登山計画のお気に入り
CREATE TABLE IF NOT EXISTS plan_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, plan_id)
);

-- RLS: 自分の分だけ見れる
ALTER TABLE mountain_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own mountain favorites" ON mountain_favorites;
CREATE POLICY "Users can view their own mountain favorites"
  ON mountain_favorites FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own mountain favorites" ON mountain_favorites;
CREATE POLICY "Users can insert their own mountain favorites"
  ON mountain_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own mountain favorites" ON mountain_favorites;
CREATE POLICY "Users can delete their own mountain favorites"
  ON mountain_favorites FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE climb_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own climb favorites" ON climb_favorites;
CREATE POLICY "Users can view their own climb favorites"
  ON climb_favorites FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own climb favorites" ON climb_favorites;
CREATE POLICY "Users can insert their own climb favorites"
  ON climb_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own climb favorites" ON climb_favorites;
CREATE POLICY "Users can delete their own climb favorites"
  ON climb_favorites FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE plan_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own plan favorites" ON plan_favorites;
CREATE POLICY "Users can view their own plan favorites"
  ON plan_favorites FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own plan favorites" ON plan_favorites;
CREATE POLICY "Users can insert their own plan favorites"
  ON plan_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own plan favorites" ON plan_favorites;
CREATE POLICY "Users can delete their own plan favorites"
  ON plan_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 旧likesテーブルをリネーム（バックアップ用途）
DO $$
BEGIN
  IF to_regclass('public.legacy_likes') IS NULL AND to_regclass('public.likes') IS NOT NULL THEN
    ALTER TABLE likes RENAME TO legacy_likes;
  END IF;
END $$;
