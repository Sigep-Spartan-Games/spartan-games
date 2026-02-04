-- Tier-Based Competition System Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/skwvrpgpkxwfhxtjwcgz/sql/new

-- Add tier column to teams table
-- Tier values: 'gold', 'purple', 'red'
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('gold', 'purple', 'red'));

-- Optional: Delete all existing teams for fresh start (as discussed)
-- DELETE FROM teams;
-- DELETE FROM submissions; -- Also clear submissions if needed
