-- Add latitude and longitude columns to mountains table
ALTER TABLE mountains 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Update with sample coordinates for some famous mountains
-- 富士山は最後の正値で上書きされるため一度でOK
UPDATE mountains SET latitude = 36.557777, longitude = 137.648056 WHERE name = '白馬岳';
UPDATE mountains SET latitude = 36.405556, longitude = 137.798333 WHERE name = '穂高岳';
UPDATE mountains SET latitude = 36.578333, longitude = 137.625000 WHERE name = '槍ヶ岳';
UPDATE mountains SET latitude = 35.358056, longitude = 138.731111 WHERE name = '富士山';

-- Set default coordinates for mountains without specific data (using Mt. Fuji as default)
UPDATE mountains SET 
  latitude = 35.360833, 
  longitude = 138.727500 
WHERE latitude IS NULL OR longitude IS NULL;
