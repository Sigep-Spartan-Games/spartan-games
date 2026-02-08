-- Add RLS policies for tier_settings and weekly_history

-- TIer Settings RLS
ALTER TABLE tier_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON tier_settings;
CREATE POLICY "Public read access" ON tier_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update access" ON tier_settings;
CREATE POLICY "Admin update access" ON tier_settings
  FOR ALL USING (
    (SELECT is_admin(auth.uid()))
  );


-- Weekly History RLS
ALTER TABLE weekly_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON weekly_history;
CREATE POLICY "Public read access" ON weekly_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all access" ON weekly_history;
CREATE POLICY "Admin all access" ON weekly_history
  FOR ALL USING (
    (SELECT is_admin(auth.uid()))
  );
