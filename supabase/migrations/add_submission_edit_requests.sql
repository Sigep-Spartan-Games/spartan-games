-- Create the submission_edit_requests table
CREATE TABLE submission_edit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    expected_values TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE submission_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own requests
CREATE POLICY "Users can create their own edit requests"
ON submission_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own edit requests"
ON submission_edit_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update the existing Admin policy if there is an admin role or handle it through the application.
-- Often in this app, admins bypass RLS using the service role key, but let's add a general policy if they use RLS for admins.
-- Based on the user's setup, they use `requireAdmin` which likely uses the service role key giving full access.
-- So the above policies are sufficient for authenticated users.

-- Add an index for fetching pending requests efficiently
CREATE INDEX idx_submission_edit_requests_status ON submission_edit_requests(status);
CREATE INDEX idx_submission_edit_requests_submission_id ON submission_edit_requests(submission_id);
