-- Add transport_mode, lodging and period (start/end) to plans and climbs
-- Plans: transport_mode text, planned_start_date date, planned_end_date date, lodging text
-- Climbs: transport_mode text, climb_start_date date, climb_end_date date, lodging text

-- Plans table changes
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans') THEN
    ALTER TABLE plans ADD COLUMN IF NOT EXISTS transport_mode TEXT CHECK (transport_mode IN ('car','public','taxi','shuttle','bike','walk','other'));
    ALTER TABLE plans ADD COLUMN IF NOT EXISTS planned_start_date DATE;
    ALTER TABLE plans ADD COLUMN IF NOT EXISTS planned_end_date DATE;
    ALTER TABLE plans ADD COLUMN IF NOT EXISTS lodging TEXT;

    -- backfill start/end from planned_date when null
    UPDATE plans
      SET planned_start_date = COALESCE(planned_start_date, planned_date),
          planned_end_date = COALESCE(planned_end_date, planned_date)
      WHERE planned_date IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_plans_planned_range ON plans(planned_start_date, planned_end_date);
  END IF;
END $$;

-- Climbs table changes
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'climbs') THEN
    ALTER TABLE climbs ADD COLUMN IF NOT EXISTS transport_mode TEXT CHECK (transport_mode IN ('car','public','taxi','shuttle','bike','walk','other'));
    ALTER TABLE climbs ADD COLUMN IF NOT EXISTS climb_start_date DATE;
    ALTER TABLE climbs ADD COLUMN IF NOT EXISTS climb_end_date DATE;
    ALTER TABLE climbs ADD COLUMN IF NOT EXISTS lodging TEXT;

    -- backfill start/end from climb_date when null
    UPDATE climbs
      SET climb_start_date = COALESCE(climb_start_date, climb_date),
          climb_end_date = COALESCE(climb_end_date, climb_date)
      WHERE climb_date IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_climbs_climb_range ON climbs(climb_start_date, climb_end_date);
  END IF;
END $$;
