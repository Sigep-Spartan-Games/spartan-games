ALTER TABLE activity_rules ADD COLUMN description TEXT;
ALTER TABLE activity_rules ALTER COLUMN teammate_bonus TYPE numeric USING (CASE WHEN teammate_bonus = 0 THEN 0 ELSE 1.5 END);;
