-- mountain_idカラムをlikesテーブルに強制追加（NULL許容、UUID型、mountains(id)参照）
ALTER TABLE likes ADD COLUMN IF NOT EXISTS mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE;
ALTER TABLE likes ALTER COLUMN mountain_id DROP NOT NULL;

-- CHECK制約を再設定（mountain_id, climb_id, plan_idのうち1つだけ）
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_only_one_target_check;
ALTER TABLE likes ADD CONSTRAINT likes_only_one_target_check
  CHECK ((climb_id IS NOT NULL)::integer + (plan_id IS NOT NULL)::integer + (mountain_id IS NOT NULL)::integer = 1);

-- 不正な複合レコードを削除
DELETE FROM likes WHERE (climb_id IS NOT NULL AND mountain_id IS NOT NULL)
   OR (plan_id IS NOT NULL AND mountain_id IS NOT NULL)
   OR (climb_id IS NOT NULL AND plan_id IS NOT NULL);
-- すべてNULLのレコードも削除
DELETE FROM likes WHERE mountain_id IS NULL AND climb_id IS NULL AND plan_id IS NULL;
