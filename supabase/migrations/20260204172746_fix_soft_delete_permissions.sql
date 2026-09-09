
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_soft_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_soft_delete();

-- Create a simpler function that only deletes the profile
-- The profile's foreign key CASCADE and team triggers will handle the rest
CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If deleted_at was just set (user was soft-deleted)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Delete their profile - this is safe because we use SECURITY DEFINER
    DELETE FROM public.profiles WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the function owner (postgres)
GRANT DELETE ON public.profiles TO postgres;

-- Recreate trigger on auth.users for soft delete
CREATE TRIGGER on_auth_user_soft_deleted
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION handle_user_soft_delete();
;
