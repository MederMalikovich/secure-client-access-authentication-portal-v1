-- ============ PRESCRIPTIONS (Назначения / Электронные рецепты) ============
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  client_id UUID NOT NULL,
  veterinarian_id UUID,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT,
  frequency_per_day INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  times_of_day TEXT[] NOT NULL DEFAULT ARRAY['09:00'],
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.prescription_doses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_pet ON public.prescriptions(pet_id);
CREATE INDEX idx_prescriptions_client ON public.prescriptions(client_id);
CREATE INDEX idx_prescription_doses_prescription ON public.prescription_doses(prescription_id);
CREATE INDEX idx_prescription_doses_scheduled ON public.prescription_doses(scheduled_at);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_doses ENABLE ROW LEVEL SECURITY;

-- Prescriptions policies
CREATE POLICY "Medical staff can view prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));

CREATE POLICY "Clients can view own pet prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL));

CREATE POLICY "Vets can create prescriptions" ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

CREATE POLICY "Vets can update prescriptions" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

CREATE POLICY "Vets can delete prescriptions" ON public.prescriptions
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

-- Prescription doses policies
CREATE POLICY "Medical staff can view doses" ON public.prescription_doses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));

CREATE POLICY "Clients can view own pet doses" ON public.prescription_doses
  FOR SELECT TO authenticated
  USING (prescription_id IN (
    SELECT pr.id FROM prescriptions pr
    WHERE pr.client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  ));

CREATE POLICY "Vets can manage doses" ON public.prescription_doses
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

-- Clients can mark their pets' doses as taken
CREATE POLICY "Clients can update own pet doses" ON public.prescription_doses
  FOR UPDATE TO authenticated
  USING (prescription_id IN (
    SELECT pr.id FROM prescriptions pr
    WHERE pr.client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  ))
  WITH CHECK (prescription_id IN (
    SELECT pr.id FROM prescriptions pr
    WHERE pr.client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  ));

CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate doses on prescription create
CREATE OR REPLACE FUNCTION public.generate_prescription_doses()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  d INTEGER;
  t TEXT;
  ts TIMESTAMPTZ;
BEGIN
  FOR d IN 0..(NEW.duration_days - 1) LOOP
    FOREACH t IN ARRAY NEW.times_of_day LOOP
      ts := (NEW.start_date + d)::TIMESTAMPTZ + t::TIME;
      INSERT INTO prescription_doses (prescription_id, scheduled_at, status)
      VALUES (NEW.id, ts, 'pending');
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_doses AFTER INSERT ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.generate_prescription_doses();

-- ============ HOSPITALIZATIONS (Стационар) ============
CREATE TABLE public.hospitalizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL,
  client_id UUID NOT NULL,
  veterinarian_id UUID,
  cage_number TEXT,
  admission_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_at TIMESTAMPTZ,
  diagnosis TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hospitalization_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL DEFAULT 'note',
  title TEXT,
  description TEXT,
  temperature NUMERIC,
  weight NUMERIC,
  appetite TEXT,
  mood TEXT,
  photo_url TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospitalizations_pet ON public.hospitalizations(pet_id);
CREATE INDEX idx_hospitalizations_client ON public.hospitalizations(client_id);
CREATE INDEX idx_hospitalizations_status ON public.hospitalizations(status);
CREATE INDEX idx_hosp_logs_hosp ON public.hospitalization_logs(hospitalization_id);

ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medical staff can view hospitalizations" ON public.hospitalizations
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role,'accountant'::app_role]));

CREATE POLICY "Clients can view own hospitalizations" ON public.hospitalizations
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL));

CREATE POLICY "Vets can create hospitalizations" ON public.hospitalizations
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

CREATE POLICY "Vets can update hospitalizations" ON public.hospitalizations
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]));

CREATE POLICY "Admin can delete hospitalizations" ON public.hospitalizations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Medical staff can view hosp logs" ON public.hospitalization_logs
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));

CREATE POLICY "Clients can view own hosp logs" ON public.hospitalization_logs
  FOR SELECT TO authenticated
  USING (is_visible_to_client = true AND hospitalization_id IN (
    SELECT h.id FROM hospitalizations h
    WHERE h.client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  ));

CREATE POLICY "Vets can manage hosp logs" ON public.hospitalization_logs
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

CREATE TRIGGER trg_hospitalizations_updated_at BEFORE UPDATE ON public.hospitalizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for hospitalization photos (public for simplicity, signed approach optional)
INSERT INTO storage.buckets (id, name, public) VALUES ('hospitalization-photos', 'hospitalization-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view hosp photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'hospitalization-photos');

CREATE POLICY "Vets can upload hosp photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hospitalization-photos' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));

CREATE POLICY "Vets can delete hosp photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hospitalization-photos' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));
