DROP FUNCTION public.initialize_current_user_profile(text, text);

CREATE OR REPLACE FUNCTION public.initialize_user_profile(_user_id uuid, _email text, _display_name text DEFAULT '', _avatar_url text DEFAULT NULL)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.app_role;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  PERFORM pg_advisory_xact_lock(77152026);

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    _user_id,
    COALESCE(NULLIF(trim(_display_name), ''), split_part(COALESCE(_email, ''), '@', 1)),
    NULLIF(trim(COALESCE(_avatar_url, '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = CASE WHEN public.profiles.display_name = '' THEN EXCLUDED.display_name ELSE public.profiles.display_name END,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  SELECT role INTO assigned_role FROM public.user_roles WHERE user_id = _user_id ORDER BY created_at LIMIT 1;
  IF assigned_role IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
      assigned_role := 'admin';
    ELSE
      assigned_role := 'operador';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, assigned_role);
  END IF;

  RETURN assigned_role;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_user_profile(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_profile(uuid, text, text, text) TO service_role;