-- mountains にカテゴリ(1桁)とカテゴリ内順(2桁)を追加
-- 既存データへの影響を避けるためNULL許容で追加し、CHECK制約で範囲を制限

ALTER TABLE mountains
  ADD COLUMN IF NOT EXISTS category SMALLINT,
  ADD COLUMN IF NOT EXISTS category_order SMALLINT;

-- 値の範囲制約
ALTER TABLE mountains
  ADD CONSTRAINT mountains_category_chk CHECK (category IS NULL OR (category >= 0 AND category <= 9));

ALTER TABLE mountains
  ADD CONSTRAINT mountains_category_order_chk CHECK (category_order IS NULL OR (category_order >= 0 AND category_order <= 99));

-- 並び替え最適化用の複合インデックス
CREATE INDEX IF NOT EXISTS idx_mountains_category_order ON mountains(category, category_order);
