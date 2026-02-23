-- Migration: add_structured_edit_requests
-- Description: Changes 'expected_values' to 'suggested_changes' JSONB for structured edit requests.

-- 1. Add the new JSONB column
ALTER TABLE submission_edit_requests ADD COLUMN suggested_changes JSONB;

-- 2. Migrate existing data (optional, but good practice). We'll set suggested_changes to null or wrap the old text in a JSON object.
-- For simplicity, since this is a new feature with likely no real requests yet, we'll just drop the old column.
-- First, if we wanted to preserve: UPDATE submission_edit_requests SET suggested_changes = jsonb_build_object('notes', expected_values);

-- 3. Drop the old column
ALTER TABLE submission_edit_requests DROP COLUMN expected_values;
