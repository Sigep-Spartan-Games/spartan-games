-- Insert daily streak bonus activity rule
INSERT INTO activity_rules (
  activity_key,
  points_per_unit,
  teammate_bonus,
  unit,
  label,
  input_type,
  unit_label,
  min_value,
  step_value,
  active,
  description
) VALUES (
  'daily_streak_bonus',
  1.0,      -- base points, overridden later depending on actual streak bonus
  1.0,      -- no teammate multiplier for streaks
  'streak',
  'Daily Streak Bonus',
  'number',
  'bonus',
  1.0,
  1.0,
  true,
  'Automatically awarded for maintaining consecutive days of activity.'
) ON CONFLICT (activity_key) DO UPDATE SET
  active = EXCLUDED.active,
  label = EXCLUDED.label;
