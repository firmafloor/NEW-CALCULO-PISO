ALTER TABLE public.floor_models
  ADD COLUMN IF NOT EXISTS include_leveling_compound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_lvt_adhesive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_preparation_compound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_planiprep boolean NOT NULL DEFAULT true;