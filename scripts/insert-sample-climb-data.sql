-- テスト用のサンプル登山記録と写真データを挿入

-- まず、存在する山のIDを使ってサンプル登山記録を作成
-- (実際のuser_idは使用時に置き換えてください)

-- サンプルユーザー（テスト用）
INSERT INTO users (id, display_name, experience_level, mountains_climbed) VALUES
('test-user-12345-67890-abcdef', 'テストユーザー', 'intermediate', 3)
ON CONFLICT (id) DO NOTHING;

-- サンプル登山記録
INSERT INTO climbs (id, user_id, mountain_id, climb_date, weather_conditions, notes, difficulty_rating, route_name, duration_minutes, companions, satisfaction_rating) VALUES
(
    'climb-001-富士山-test',
    'test-user-12345-67890-abcdef',
    '550e8400-e29b-41d4-a716-446655440001', -- 富士山
    '2024-08-15',
    '晴れ',
    '天気に恵まれ、素晴らしい登山でした。山頂からの眺めは格別で、雲海がとても美しかったです。',
    3,
    '吉田ルート',
    480, -- 8時間
    '友人2名',
    5
),
(
    'climb-002-筑波山-test',
    'test-user-12345-67890-abcdef',
    '550e8400-e29b-41d4-a716-44665544000a', -- 筑波山
    '2024-07-10',
    '曇り',
    '初心者の友人を案内して登りました。ケーブルカーもありますが、歩いて登ると達成感があります。',
    1,
    '白雲橋コース',
    120, -- 2時間
    '友人1名',
    4
),
(
    'climb-003-大菩薩嶺-test',
    'test-user-12345-67890-abcdef',
    '550e8400-e29b-41d4-a716-446655440009', -- 大菩薩嶺
    '2024-06-20',
    '晴れ時々曇り',
    '富士山の眺望が素晴らしかったです。稜線歩きが気持ちよく、初心者にもおすすめのコースです。',
    2,
    '上日川峠ルート',
    240, -- 4時間
    '単独',
    4
)
ON CONFLICT (id) DO NOTHING;

-- サンプル写真データ（実際の画像ファイルは存在しないが、データベース上のエントリとして）
INSERT INTO climb_photos (id, climb_id, user_id, storage_path, thumbnail_path, original_filename, caption, sort_order) VALUES
-- 富士山の写真
(
    'photo-001-富士山-山頂',
    'climb-001-富士山-test',
    'test-user-12345-67890-abcdef',
    'test-user-12345-67890-abcdef/climb-001-富士山-test/001_summit.jpg',
    'test-user-12345-67890-abcdef/climb-001-富士山-test/001_summit_thumb.jpg',
    '富士山山頂.jpg',
    '富士山山頂にて。雲海が美しい！',
    1
),
(
    'photo-002-富士山-御来光',
    'climb-001-富士山-test',
    'test-user-12345-67890-abcdef',
    'test-user-12345-67890-abcdef/climb-001-富士山-test/002_sunrise.jpg',
    'test-user-12345-67890-abcdef/climb-001-富士山-test/002_sunrise_thumb.jpg',
    '御来光.jpg',
    '山頂での御来光。感動的でした',
    2
),
-- 筑波山の写真
(
    'photo-003-筑波山-展望',
    'climb-002-筑波山-test',
    'test-user-12345-67890-abcdef',
    'test-user-12345-67890-abcdef/climb-002-筑波山-test/001_view.jpg',
    'test-user-12345-67890-abcdef/climb-002-筑波山-test/001_view_thumb.jpg',
    '筑波山展望.jpg',
    '筑波山からの関東平野の眺め',
    1
),
-- 大菩薩嶺の写真
(
    'photo-004-大菩薩嶺-富士山',
    'climb-003-大菩薩嶺-test',
    'test-user-12345-67890-abcdef',
    'test-user-12345-67890-abcdef/climb-003-大菩薩嶺-test/001_fuji_view.jpg',
    'test-user-12345-67890-abcdef/climb-003-大菩薩嶺-test/001_fuji_view_thumb.jpg',
    '大菩薩嶺から富士山.jpg',
    '大菩薩嶺から見た富士山',
    1
),
(
    'photo-005-大菩薩嶺-稜線',
    'climb-003-大菩薩嶺-test',
    'test-user-12345-67890-abcdef',
    'test-user-12345-67890-abcdef/climb-003-大菩薩嶺-test/002_ridge.jpg',
    'test-user-12345-67890-abcdef/climb-003-大菩薩嶺-test/002_ridge_thumb.jpg',
    '大菩薩嶺稜線.jpg',
    '気持ちの良い稜線歩き',
    2
)
ON CONFLICT (id) DO NOTHING;
