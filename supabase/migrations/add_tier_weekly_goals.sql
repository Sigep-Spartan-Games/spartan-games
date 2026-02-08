-- Tier Weekly Goals Settings Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/skwvrpgpkxwfhxtjwcgz/sql/new

-- Create tier_settings table to store weekly point goals for each tier
CREATE TABLE IF NOT EXISTS tier_settings (
    tier TEXT PRIMARY KEY CHECK (tier IN ('gold', 'purple', 'red')),
    weekly_goal INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default weekly goals for each tier
INSERT INTO tier_settings (tier, weekly_goal) VALUES
    ('gold', 100),
    ('purple', 75),
    ('red', 50)
ON CONFLICT (tier) DO NOTHING;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tier_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS tier_settings_updated_at ON tier_settings;
CREATE TRIGGER tier_settings_updated_at
    BEFORE UPDATE ON tier_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_tier_settings_updated_at();
