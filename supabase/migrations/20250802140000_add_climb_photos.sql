-- Enable storage (if not already exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('climb-photos', 'climb-photos', true)
ON CONFLICT (id) DO NOTHING;

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

-- Create climb_photos table to store photo metadata (if not exists)
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

-- Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add thumbnail_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climb_photos' AND column_name='thumbnail_path') THEN
        ALTER TABLE climb_photos ADD COLUMN thumbnail_path TEXT;
    END IF;
    
    -- Add other potentially missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climb_photos' AND column_name='sort_order') THEN
        ALTER TABLE climb_photos ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for climb_photos (if not exists)
CREATE INDEX IF NOT EXISTS idx_climb_photos_climb_id ON climb_photos(climb_id);
CREATE INDEX IF NOT EXISTS idx_climb_photos_user_id ON climb_photos(user_id);

-- Add trigger for updating updated_at column (drop if exists first)
DROP TRIGGER IF EXISTS update_climb_photos_updated_at ON climb_photos;
CREATE TRIGGER update_climb_photos_updated_at
    BEFORE UPDATE ON climb_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update climbs table to include more detailed fields for the new system
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS route_name TEXT;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS companions TEXT;
ALTER TABLE climbs ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5);

-- Create RLS policies for climb_photos (drop existing policies first)
ALTER TABLE climb_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all climb photos" ON climb_photos;
DROP POLICY IF EXISTS "Users can insert their own climb photos" ON climb_photos;
DROP POLICY IF EXISTS "Users can update their own climb photos" ON climb_photos;
DROP POLICY IF EXISTS "Users can delete their own climb photos" ON climb_photos;

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
