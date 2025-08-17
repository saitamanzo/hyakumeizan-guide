-- likesテーブルにmountain_idカラムを追加し、山単体のお気に入りをサポート
ALTER TABLE likes ADD COLUMN IF NOT EXISTS mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE;

ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_climb_id_key;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_plan_id_key;

-- 新しいUNIQUE制約を追加（存在チェック付き）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_mountain_id_key'
  ) THEN
    ALTER TABLE likes ADD CONSTRAINT likes_user_id_mountain_id_key UNIQUE(user_id, mountain_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_climb_id_key'
  ) THEN
    ALTER TABLE likes ADD CONSTRAINT likes_user_id_climb_id_key UNIQUE(user_id, climb_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_plan_id_key'
  ) THEN
    ALTER TABLE likes ADD CONSTRAINT likes_user_id_plan_id_key UNIQUE(user_id, plan_id);
  END IF;
END $$;

-- mountain_id/climb_id/plan_idのうち1つだけ設定されるように制約
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_climb_id_plan_id_check;
ALTER TABLE likes ADD CONSTRAINT likes_only_one_target_check
  CHECK ((climb_id IS NOT NULL)::integer + (plan_id IS NOT NULL)::integer + (mountain_id IS NOT NULL)::integer = 1);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_likes_mountain_id ON likes(mountain_id);

-- RLS: 自分のいいねは見れる
DROP POLICY IF EXISTS "Users can view their own likes" ON likes;
CREATE POLICY "Users can view their own likes"
  ON likes FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: 誰でも公開記録・計画・山のいいね数は見れる
DROP POLICY IF EXISTS "Anyone can view likes on public content" ON likes;
CREATE POLICY "Anyone can view likes on public content"
  ON likes FOR SELECT
  USING (
    (climb_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM climbs WHERE climbs.id = likes.climb_id AND climbs.is_public = true
    ))
    OR
    (plan_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM plans WHERE plans.id = likes.plan_id AND plans.is_public = true
    ))
    OR
    (mountain_id IS NOT NULL)
  );

-- RLS: ログインユーザーは自分のいいねを追加できる
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON likes;
CREATE POLICY "Authenticated users can insert likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: 自分のいいねは削除できる
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- mountain_id用の集計ビュー
CREATE OR REPLACE VIEW mountain_likes_count AS
SELECT 
  mountain_id,
  COUNT(*) AS like_count
FROM likes 
WHERE mountain_id IS NOT NULL
GROUP BY mountain_id;
