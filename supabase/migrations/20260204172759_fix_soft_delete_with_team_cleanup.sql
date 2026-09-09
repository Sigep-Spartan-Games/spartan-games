
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_soft_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_soft_delete();

-- Create the function with proper security context
-- Running as postgres (superuser) via SECURITY DEFINER allows table access
CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_team_id uuid;
  v_is_member1 boolean;
  v_other_member_exists boolean;
BEGIN
  -- If deleted_at was just set (user was soft-deleted)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    
    -- 1. Delete their submissions first
    DELETE FROM public.submissions WHERE submitted_by = NEW.id;
    
    -- 2. Handle team membership - check if they're on a team
    SELECT id, 
           (member1_id = NEW.id) as is_m1,
           CASE 
             WHEN member1_id = NEW.id THEN member2_id IS NOT NULL
             ELSE member1_id IS NOT NULL
           END as other_exists
    INTO v_team_id, v_is_member1, v_other_member_exists
    FROM public.teams
    WHERE member1_id = NEW.id OR member2_id = NEW.id
    LIMIT 1;
    
    IF v_team_id IS NOT NULL THEN
      IF NOT v_other_member_exists THEN
        -- They're the last member, delete the team
        DELETE FROM public.teams WHERE id = v_team_id;
      ELSIF v_is_member1 THEN
        -- They're member1 with a teammate - promote member2 to member1
        UPDATE public.teams 
        SET member1_id = member2_id,
            member1_name = member2_name,
            member2_id = NULL,
            member2_name = NULL
        WHERE id = v_team_id;
      ELSE
        -- They're member2 - just clear member2
        UPDATE public.teams 
        SET member2_id = NULL, member2_name = NULL 
        WHERE id = v_team_id;
      END IF;
    END IF;
    
    -- 3. Delete their profile
    DELETE FROM public.profiles WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set the function owner to postgres (superuser) to ensure it has permissions
ALTER FUNCTION handle_user_soft_delete() OWNER TO postgres;

-- Recreate trigger
CREATE TRIGGER on_auth_user_soft_deleted
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION handle_user_soft_delete();
;
