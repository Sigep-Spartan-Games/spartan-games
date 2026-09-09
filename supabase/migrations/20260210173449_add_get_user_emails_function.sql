-- Function to get all confirmed user emails (only callable by admins via RLS)
CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE(email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.email::text
  FROM auth.users au
  INNER JOIN public.profiles p ON p.id = au.id
  WHERE au.email_confirmed_at IS NOT NULL
    AND p.is_admin IS NOT NULL  -- user has a profile (exists in system)
$$;;
