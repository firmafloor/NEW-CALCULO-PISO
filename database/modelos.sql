CREATE TABLE public.floor_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  manufacturer text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'Piso',
  length numeric NOT NULL,
  width numeric NOT NULL,
  thickness numeric NOT NULL,
  pieces_per_box integer NOT NULL,
  yield_per_box numeric NOT NULL,
  box_unit text NOT NULL DEFAULT 'caixas',
  requires_underlayment boolean NOT NULL DEFAULT false,
  price_per_box numeric NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

ALTER TABLE public.floor_models ENABLE ROW LEVEL SECURITY

CREATE POLICY "Permitir leitura pública dos modelos" ON public.floor_models
  FOR SELECT
  USING (true)

CREATE POLICY "Permitir cadastro público de modelos" ON public.floor_models
  FOR INSERT
  WITH CHECK (true)

CREATE POLICY "Permitir alteração pública de modelos" ON public.floor_models
  FOR UPDATE
  USING (true)
  WITH CHECK (true)

CREATE POLICY "Permitir exclusão pública de modelos" ON public.floor_models
  FOR DELETE
  USING (true)