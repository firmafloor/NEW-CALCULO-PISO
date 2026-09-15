CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.initialize_current_user_profile(_display_name text DEFAULT '', _avatar_url text DEFAULT NULL)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  assigned_role public.app_role;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(77152026);

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (current_user_id, COALESCE(NULLIF(trim(_display_name), ''), split_part(COALESCE(auth.jwt() ->> 'email', ''), '@', 1)), NULLIF(trim(COALESCE(_avatar_url, '')), ''))
  ON CONFLICT (id) DO UPDATE SET
    display_name = CASE WHEN public.profiles.display_name = '' THEN EXCLUDED.display_name ELSE public.profiles.display_name END,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  SELECT role INTO assigned_role FROM public.user_roles WHERE user_id = current_user_id ORDER BY created_at LIMIT 1;
  IF assigned_role IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
      assigned_role := 'admin';
    ELSE
      assigned_role := 'operador';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (current_user_id, assigned_role);
  END IF;

  RETURN assigned_role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.initialize_current_user_profile(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

REVOKE INSERT, UPDATE, DELETE ON public.floor_models FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.floor_models FROM authenticated;
GRANT SELECT ON public.floor_models TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.floor_models TO authenticated;

DROP POLICY IF EXISTS "Public can create floor models" ON public.floor_models;
DROP POLICY IF EXISTS "Public can update floor models" ON public.floor_models;
DROP POLICY IF EXISTS "Public can delete floor models" ON public.floor_models;

CREATE POLICY "Admins can create floor models" ON public.floor_models FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update floor models" ON public.floor_models FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete floor models" ON public.floor_models FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));