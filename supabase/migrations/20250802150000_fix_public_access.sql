-- 山データの読み取り権限を匿名ユーザーに付与
-- これにより、ログインしていないユーザーでも山の一覧を表示できるようになります

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "mountains_public_read" ON mountains;

-- 匿名ユーザーでも山データを読み取れるポリシーを作成
CREATE POLICY "mountains_public_read" ON mountains
    FOR SELECT
    USING (true);

-- ルートデータも同様に読み取り可能にする
DROP POLICY IF EXISTS "routes_public_read" ON routes;

CREATE POLICY "routes_public_read" ON routes
    FOR SELECT
    USING (true);

-- ポリシーが正しく作成されたか確認用のコメント
-- SELECT * FROM pg_policies WHERE tablename IN ('mountains', 'routes');
