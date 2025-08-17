-- Add photo_url column to mountains table (idempotent)
-- This migration only handles photo_url because latitude/longitude were added in 20250802130000_add_coordinates.sql

ALTER TABLE IF EXISTS public.mountains
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Optional: If you later want to enforce URL format or length, consider adding a CHECK constraint
-- (kept minimal now to avoid breaking existing data).
