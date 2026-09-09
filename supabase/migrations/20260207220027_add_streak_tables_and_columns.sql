-- Create streak_settings table
CREATE TABLE IF NOT EXISTS public.streak_settings (
    id boolean PRIMARY KEY DEFAULT true,
    daily_bonus_increment integer DEFAULT 1,
    max_bonus integer DEFAULT 10,
    CONSTRAINT single_row CHECK (id)
);

-- Insert default row if not exists
INSERT INTO public.streak_settings (id, daily_bonus_increment, max_bonus)
VALUES (true, 1, 10)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on streak_settings
ALTER TABLE public.streak_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow public read access" ON public.streak_settings
    FOR SELECT TO authenticated USING (true);

-- Allow update access to admins only (assuming is_admin in profiles)
CREATE POLICY "Allow admin update access" ON public.streak_settings
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Add streak columns to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Add streak_bonus to submissions
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS streak_bonus integer DEFAULT 0;
;
