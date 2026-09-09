
-- Create a function to handle soft delete of users
-- This triggers when deleted_at is set (soft delete)
CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If deleted_at was just set (user was soft-deleted)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Delete their profile
    DELETE FROM public.profiles WHERE id = NEW.id;
    
    -- Also clear their team membership (set member IDs to null)
    -- The team trigger will handle cleanup (promote member2 or delete empty team)
    UPDATE public.teams 
    SET member1_id = NULL, member1_name = NULL 
    WHERE member1_id = NEW.id;
    
    UPDATE public.teams 
    SET member2_id = NULL, member2_name = NULL 
    WHERE member2_id = NEW.id;
    
    -- Delete their submissions
    DELETE FROM public.submissions WHERE submitted_by = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for soft delete
DROP TRIGGER IF EXISTS on_auth_user_soft_deleted ON auth.users;

CREATE TRIGGER on_auth_user_soft_deleted
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION handle_user_soft_delete();
;
