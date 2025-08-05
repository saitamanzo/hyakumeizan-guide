-- likesテーブルのカラムをNULL許容にし、データの整合性を保つ
ALTER TABLE likes ALTER COLUMN climb_id DROP NOT NULL;
ALTER TABLE likes ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE likes ALTER COLUMN mountain_id DROP NOT NULL;

-- 不正な複合レコードを削除（mountain_id, climb_id, plan_idのうち2つ以上埋まっているもの）
DELETE FROM likes WHERE (climb_id IS NOT NULL AND mountain_id IS NOT NULL)
   OR (plan_id IS NOT NULL AND mountain_id IS NOT NULL)
   OR (climb_id IS NOT NULL AND plan_id IS NOT NULL);

-- mountain_id, climb_id, plan_idがすべてNULLのレコードも削除
DELETE FROM likes WHERE mountain_id IS NULL AND climb_id IS NULL AND plan_id IS NULL;
