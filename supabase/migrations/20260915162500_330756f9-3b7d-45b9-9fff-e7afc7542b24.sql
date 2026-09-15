GRANT SELECT ON TABLE public.floor_models TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.floor_models TO authenticated;
GRANT ALL ON TABLE public.floor_models TO service_role;