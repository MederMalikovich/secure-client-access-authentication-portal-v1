
CREATE TABLE IF NOT EXISTS public.clinic_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view working hours"
  ON public.clinic_working_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view working hours"
  ON public.clinic_working_hours FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage working hours"
  ON public.clinic_working_hours FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER update_clinic_working_hours_updated_at
  BEFORE UPDATE ON public.clinic_working_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults: Mon-Fri 9-18, Sat 9-15, Sun off
INSERT INTO public.clinic_working_hours (day_of_week, is_working, start_time, end_time, slot_duration_minutes) VALUES
  (1, true,  '09:00', '18:00', 30),
  (2, true,  '09:00', '18:00', 30),
  (3, true,  '09:00', '18:00', 30),
  (4, true,  '09:00', '18:00', 30),
  (5, true,  '09:00', '18:00', 30),
  (6, true,  '09:00', '15:00', 30),
  (0, false, '09:00', '18:00', 30)
ON CONFLICT (day_of_week) DO NOTHING;
