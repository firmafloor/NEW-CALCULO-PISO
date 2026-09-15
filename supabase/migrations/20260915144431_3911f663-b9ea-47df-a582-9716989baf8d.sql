DROP POLICY IF EXISTS "Admins can create floor models" ON public.floor_models;
DROP POLICY IF EXISTS "Admins can update floor models" ON public.floor_models;
DROP POLICY IF EXISTS "Admins can delete floor models" ON public.floor_models;

CREATE POLICY "Admins can create floor models" ON public.floor_models FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update floor models" ON public.floor_models FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete floor models" ON public.floor_models FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.has_role(uuid, public.app_role);

REVOKE ALL ON FUNCTION public.initialize_current_user_profile(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_current_user_profile(text, text) TO service_role;