-- Drop the restrictive read policy
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

-- Allow all authenticated users to read profiles
-- This is standard for apps where users need to see each other's names
CREATE POLICY "profiles_read_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);;
