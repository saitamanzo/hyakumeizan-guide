-- Add nickname to users and comments feature for public plans/climbs

-- 1) Add nickname column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2) Plan comments
CREATE TABLE IF NOT EXISTS plan_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3) Climb comments
CREATE TABLE IF NOT EXISTS climb_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  climb_id UUID REFERENCES climbs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4) Enable RLS
ALTER TABLE plan_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE climb_comments ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies
-- Plan comments: public can read comments for public plans; owners can always read their own comments
DROP POLICY IF EXISTS "Select plan comments for public plans" ON plan_comments;
CREATE POLICY "Select plan comments for public plans" ON plan_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM plans 
    WHERE plans.id = plan_comments.plan_id 
      AND (plans.is_public = true OR plans.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Insert own plan comments" ON plan_comments;
CREATE POLICY "Insert own plan comments" ON plan_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own plan comments" ON plan_comments;
CREATE POLICY "Update own plan comments" ON plan_comments
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own plan comments" ON plan_comments;
CREATE POLICY "Delete own plan comments" ON plan_comments
FOR DELETE USING (auth.uid() = user_id);

-- Climb comments policies
DROP POLICY IF EXISTS "Select climb comments for public climbs" ON climb_comments;
CREATE POLICY "Select climb comments for public climbs" ON climb_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM climbs 
    WHERE climbs.id = climb_comments.climb_id 
      AND (climbs.is_public = true OR climbs.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Insert own climb comments" ON climb_comments;
CREATE POLICY "Insert own climb comments" ON climb_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own climb comments" ON climb_comments;
CREATE POLICY "Update own climb comments" ON climb_comments
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own climb comments" ON climb_comments;
CREATE POLICY "Delete own climb comments" ON climb_comments
FOR DELETE USING (auth.uid() = user_id);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan_id_created_at ON plan_comments(plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_climb_comments_climb_id_created_at ON climb_comments(climb_id, created_at DESC);
