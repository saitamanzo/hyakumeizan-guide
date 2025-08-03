# Supabase マイグレーション実行手順

## 方法1: Supabase Dashboard経由（推奨）

1. Supabase Dashboard にアクセス
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. SQL Editor を開く
   - 左サイドバーの「SQL Editor」をクリック

3. マイグレーションファイルの内容をコピー&ペースト
   - `supabase/migrations/20250802140000_add_climb_photos.sql` の内容を貼り付け
   - 「Run」ボタンをクリック

## 方法2: Supabase CLI（要インストール）

```bash
# Supabase CLI インストール（macOS）
brew install supabase/tap/supabase

# プロジェクトをリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーション実行
supabase db push
```

## 方法3: 手動SQL実行

もしSupabase CLIが使用できない場合は、以下のSQLを順番に実行：

### 1. Storage設定

```sql
-- Enable storage (if not already exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('climb-photos', 'climb-photos', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. Storage Policies

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own photos" ON storage.objects;

-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'climb-photos' 
    AND auth.role() = 'authenticated'
);

-- Allow public read access to photos
CREATE POLICY "Allow public read access to photos" ON storage.objects
FOR SELECT USING (bucket_id = 'climb-photos');

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete their own photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'climb-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. テーブル作成

```sql
-- Create climb_photos table to store photo metadata
CREATE TABLE IF NOT EXISTS climb_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    climb_id UUID REFERENCES climbs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    original_filename TEXT,
    file_size INTEGER,
    mime_type TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### 4. インデックス作成

```sql
-- Create indexes for climb_photos
CREATE INDEX IF NOT EXISTS idx_climb_photos_climb_id ON climb_photos(climb_id);
CREATE INDEX IF NOT EXISTS idx_climb_photos_user_id ON climb_photos(user_id);
```

### 5. トリガー作成

```sql
-- Add trigger for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_climb_photos_updated_at
    BEFORE UPDATE ON climb_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6. RLS設定

```sql
-- Create RLS policies for climb_photos
ALTER TABLE climb_photos ENABLE ROW LEVEL SECURITY;

-- Users can view all climb photos
CREATE POLICY "Users can view all climb photos" ON climb_photos
FOR SELECT USING (true);

-- Users can insert their own climb photos
CREATE POLICY "Users can insert their own climb photos" ON climb_photos
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own climb photos
CREATE POLICY "Users can update their own climb photos" ON climb_photos
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own climb photos
CREATE POLICY "Users can delete their own climb photos" ON climb_photos
FOR DELETE USING (auth.uid() = user_id);
```

### 7. climbs テーブル拡張

```sql
-- Update climbs table to include more detailed fields for the new system
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS route_name TEXT;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS companions TEXT;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5);
```

## 実行後の確認

以下のクエリで正常に作成されたかを確認：

```sql
-- テーブル確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'climb_photos'
ORDER BY ordinal_position;

-- Storage bucket確認
SELECT * FROM storage.buckets WHERE id = 'climb-photos';

-- Policies確認
SELECT policyname, tablename FROM pg_policies WHERE tablename = 'climb_photos';
```

## トラブルシューティング

### エラー: "relation does not exist"
- 依存するテーブル（climbs, users）が存在することを確認
- 先に基本スキーマのマイグレーションを実行

### エラー: "bucket already exists"
- `ON CONFLICT (id) DO NOTHING` により無視される
- 既存bucketがある場合は正常

### エラー: "policy already exists"
- `DROP POLICY IF EXISTS` により解決
- 同名のポリシーがある場合は削除後に再作成
