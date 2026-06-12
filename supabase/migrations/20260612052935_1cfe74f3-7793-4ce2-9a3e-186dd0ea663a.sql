
-- Allow anonymous (login page) to read just the public brand keys
DROP POLICY IF EXISTS "Anon can view public brand settings" ON public.settings;
CREATE POLICY "Anon can view public brand settings"
ON public.settings FOR SELECT
TO anon
USING (key IN ('brand_name', 'brand_logo_url'));

GRANT SELECT ON public.settings TO anon;

-- Seed default brand settings if missing
INSERT INTO public.settings (key, value, description)
VALUES
  ('brand_name', to_jsonb('VetCRM'::text), 'Название клиники в шапке'),
  ('brand_logo_url', to_jsonb(''::text), 'Публичный URL логотипа клиники')
ON CONFLICT (key) DO NOTHING;
