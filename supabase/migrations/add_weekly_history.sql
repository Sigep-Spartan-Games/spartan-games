-- Weekly History Tracking Migration
-- Records historical weekly performance data for teams

-- Create weekly_history table
CREATE TABLE IF NOT EXISTS weekly_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    week_identifier TEXT NOT NULL, -- Format: "2026-W06" (ISO week)
    weekly_points INTEGER NOT NULL DEFAULT 0,
    tier TEXT CHECK (tier IN ('gold', 'purple', 'red')),
    weekly_goal INTEGER NOT NULL,
    met_goal BOOLEAN NOT NULL DEFAULT false,
    weeks_won_count INTEGER NOT NULL DEFAULT 0, -- Snapshot of total weeks won at this time
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries for same team and week
    UNIQUE(team_id, week_identifier)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_weekly_history_team_id ON weekly_history(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_history_week ON weekly_history(week_identifier);
CREATE INDEX IF NOT EXISTS idx_weekly_history_tier ON weekly_history(tier);
CREATE INDEX IF NOT EXISTS idx_weekly_history_met_goal ON weekly_history(met_goal);
CREATE INDEX IF NOT EXISTS idx_weekly_history_created_at ON weekly_history(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE weekly_history IS 'Historical record of team performance at the end of each week, tracking whether teams met their tier-specific weekly goals';
