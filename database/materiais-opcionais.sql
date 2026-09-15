ALTER TABLE public.floor_models
  ADD COLUMN include_leveling_compound boolean NOT NULL DEFAULT true,
  ADD COLUMN include_lvt_adhesive boolean NOT NULL DEFAULT true,
  ADD COLUMN include_preparation_compound boolean NOT NULL DEFAULT true,
  ADD COLUMN include_planiprep boolean NOT NULL DEFAULT true;