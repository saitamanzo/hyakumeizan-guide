-- 公開機能追加のためのテーブル構造変更

-- climbs テーブルに公開フラグを追加
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- インデックスを追加（公開記録の検索用）
CREATE INDEX IF NOT EXISTS idx_climbs_public ON climbs(is_public, published_at) WHERE is_public = true;
