-- いいね機能のためのテーブル作成
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  climb_id UUID REFERENCES climbs(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- 一つのユーザーが同じ記録・計画に複数回いいねできないように制約
  UNIQUE(user_id, climb_id),
  UNIQUE(user_id, plan_id),
  
  -- climb_id または plan_id のどちらか一つだけ設定されるように制約
  CHECK ((climb_id IS NOT NULL)::integer + (plan_id IS NOT NULL)::integer = 1)
);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_likes_climb_id ON likes(climb_id);
CREATE INDEX IF NOT EXISTS idx_likes_plan_id ON likes(plan_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Row Level Security (RLS) ポリシーを設定
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 自分のいいねは見ることができる
CREATE POLICY "Users can view their own likes"
  ON likes FOR SELECT
  USING (auth.uid() = user_id);

-- 誰でもいいねの数は見ることができる（公開記録・計画のみ）
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
  );

-- ログインユーザーはいいねを追加できる
CREATE POLICY "Authenticated users can insert likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分のいいねは削除できる
CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- 便利なビューを作成（いいね数の集計用）
CREATE VIEW climb_likes_count AS
SELECT 
  climb_id,
  COUNT(*) AS like_count
FROM likes 
WHERE climb_id IS NOT NULL
GROUP BY climb_id;

CREATE VIEW plan_likes_count AS
SELECT 
  plan_id,
  COUNT(*) AS like_count
FROM likes 
WHERE plan_id IS NOT NULL
GROUP BY plan_id;
