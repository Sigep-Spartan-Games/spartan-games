ALTER TABLE activity_rules
ADD COLUMN weekly_cap INTEGER DEFAULT NULL;

COMMENT ON COLUMN activity_rules.weekly_cap IS 'Maximum points a team can earn from this activity per week. NULL means no cap.';;
