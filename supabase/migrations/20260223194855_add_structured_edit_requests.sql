ALTER TABLE submission_edit_requests ADD COLUMN suggested_changes JSONB;
ALTER TABLE submission_edit_requests DROP COLUMN expected_values;;
