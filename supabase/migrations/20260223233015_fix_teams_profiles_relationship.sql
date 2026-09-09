-- Drop existing foreign keys that point to auth.users
ALTER TABLE public.teams 
  DROP CONSTRAINT IF EXISTS teams_member1_id_fkey,
  DROP CONSTRAINT IF EXISTS teams_member2_id_fkey;

-- Add new foreign keys that point to public.profiles
-- This allows PostgREST to recognize the relationship for joins
ALTER TABLE public.teams 
  ADD CONSTRAINT teams_member1_id_fkey 
  FOREIGN KEY (member1_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.teams 
  ADD CONSTRAINT teams_member2_id_fkey 
  FOREIGN KEY (member2_id) REFERENCES public.profiles(id) ON DELETE SET NULL;;
