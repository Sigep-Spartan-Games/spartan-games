
-- Create a function to handle user deletion from teams
-- This function is called when a user's member_id is set to NULL (via ON DELETE SET NULL)
-- It checks if the team is now empty (both members NULL) and deletes it,
-- or if one member remains, promotes them to member1

CREATE OR REPLACE FUNCTION handle_team_member_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if a member_id was actually set to NULL
  -- (This happens when ON DELETE SET NULL is triggered)
  
  -- Case 1: Both members are now NULL - delete the team
  IF NEW.member1_id IS NULL AND NEW.member2_id IS NULL THEN
    DELETE FROM public.teams WHERE id = NEW.id;
    RETURN NULL; -- Row is being deleted, return NULL
  END IF;
  
  -- Case 2: member1 is NULL but member2 exists - promote member2 to member1
  IF NEW.member1_id IS NULL AND NEW.member2_id IS NOT NULL THEN
    NEW.member1_id := NEW.member2_id;
    NEW.member1_name := NEW.member2_name;
    NEW.member2_id := NULL;
    NEW.member2_name := NULL;
  END IF;
  
  -- Case 3: member2 is NULL but member1 exists - no action needed, member1 stays
  -- (This is already the correct state)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires BEFORE UPDATE on teams
-- This allows us to modify the row before it's written
DROP TRIGGER IF EXISTS on_team_member_removal ON public.teams;

CREATE TRIGGER on_team_member_removal
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  WHEN (
    (OLD.member1_id IS NOT NULL AND NEW.member1_id IS NULL) OR
    (OLD.member2_id IS NOT NULL AND NEW.member2_id IS NULL)
  )
  EXECUTE FUNCTION handle_team_member_removal();

-- Also clear member names when member IDs are set to NULL
-- This ensures name fields stay in sync
CREATE OR REPLACE FUNCTION clear_member_name_on_id_null()
RETURNS TRIGGER AS $$
BEGIN
  -- If member1_id is being set to NULL, clear member1_name
  IF OLD.member1_id IS NOT NULL AND NEW.member1_id IS NULL THEN
    NEW.member1_name := NULL;
  END IF;
  
  -- If member2_id is being set to NULL, clear member2_name
  IF OLD.member2_id IS NOT NULL AND NEW.member2_id IS NULL THEN
    NEW.member2_name := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger runs BEFORE the member removal trigger
DROP TRIGGER IF EXISTS on_member_id_cleared ON public.teams;

CREATE TRIGGER on_member_id_cleared
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  WHEN (
    (OLD.member1_id IS NOT NULL AND NEW.member1_id IS NULL) OR
    (OLD.member2_id IS NOT NULL AND NEW.member2_id IS NULL)
  )
  EXECUTE FUNCTION clear_member_name_on_id_null();
;
