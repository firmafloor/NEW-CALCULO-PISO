CREATE TABLE public.floor_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  manufacturer text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'Piso',
  length numeric NOT NULL CHECK (length > 0),
  width numeric NOT NULL CHECK (width > 0),
  thickness numeric NOT NULL CHECK (thickness >= 0),
  pieces_per_box integer NOT NULL CHECK (pieces_per_box > 0),
  yield_per_box numeric NOT NULL CHECK (yield_per_box > 0),
  box_unit text NOT NULL DEFAULT 'caixas',
  requires_underlayment boolean NOT NULL DEFAULT false,
  price_per_box numeric NOT NULL DEFAULT 0 CHECK (price_per_box >= 0),
  is_default boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.floor_models TO anon, authenticated;
GRANT ALL ON public.floor_models TO service_role;

ALTER TABLE public.floor_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read floor models"
ON public.floor_models FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can create floor models"
ON public.floor_models FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can update floor models"
ON public.floor_models FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete floor models"
ON public.floor_models FOR DELETE
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.set_floor_models_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_floor_models_updated_at
BEFORE UPDATE ON public.floor_models
FOR EACH ROW
EXECUTE FUNCTION public.set_floor_models_updated_at();

INSERT INTO public.floor_models
  (id, name, manufacturer, kind, length, width, thickness, pieces_per_box, yield_per_box, box_unit, requires_underlayment, price_per_box, is_default)
VALUES
  ('prime', 'Laminado Prime Click', 'Eucafloor', 'Laminado', 135.7, 21.7, 7, 8, 2.36, 'caixas', true, 189.90, true),
  ('evidence', 'Laminado New Evidence', 'Durafloor', 'Laminado', 135.7, 29.2, 7, 7, 2.77, 'caixas', true, 219.90, true),
  ('elegance', 'Laminado New Elegance', 'Durafloor', 'Laminado', 135.7, 29.2, 7, 7, 3.87, 'caixas', true, 289.90, true),
  ('magnifique', 'Vinílico Magnifique', 'Tarkett', 'Vinílico', 122, 18.4, 2, 20, 4.49, 'caixas', false, 349.90, true),
  ('chateau', 'Vinílico Château Decor', 'Durafloor', 'Vinílico', 122.9, 22.8, 3, 6, 5.08, 'pacotes', false, 399.90, true),
  ('lumiere', 'Vinílico Lumiere', 'Tarkett', 'Vinílico', 122, 18.4, 3, 15, 3.37, 'pacotes', false, 279.90, true),
  ('euca', 'Vinílico Eucafloor Basic', 'Eucafloor', 'Vinílico', 122.9, 23.8, 2, 16, 4.68, 'pacotes', false, 259.90, true),
  ('porcelanato-urban', 'Porcelanato Urban 60×60', 'Portobello', 'Porcelanato', 60, 60, 9, 4, 1.44, 'caixas', false, 129.90, true);