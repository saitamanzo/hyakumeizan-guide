-- トリガー関数とトリガーの設定

-- トリガー関数を作成（公開時に published_at を設定）
CREATE OR REPLACE FUNCTION set_published_at_on_public()
RETURNS TRIGGER AS $$
BEGIN
    -- is_public が true になった場合、published_at を設定
    IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
        NEW.published_at = NOW();
    -- is_public が false になった場合、published_at をクリア
    ELSIF NEW.is_public = false THEN
        NEW.published_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを climbs テーブルに適用
DROP TRIGGER IF EXISTS trigger_set_published_at_climbs ON climbs;
CREATE TRIGGER trigger_set_published_at_climbs
    BEFORE UPDATE ON climbs
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at_on_public();

-- トリガーを plans テーブルに適用
DROP TRIGGER IF EXISTS trigger_set_published_at_plans ON plans;
CREATE TRIGGER trigger_set_published_at_plans
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at_on_public();

-- updated_at カラムの自動更新トリガー
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
