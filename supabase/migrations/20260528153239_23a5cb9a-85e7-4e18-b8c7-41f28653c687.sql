
-- =========================
-- 1. CASH SHIFTS
-- =========================
CREATE TABLE public.cash_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opened_by UUID NOT NULL,
  closed_by UUID,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  expected_cash NUMERIC,
  difference NUMERIC,
  cash_sales NUMERIC DEFAULT 0,
  card_sales NUMERIC DEFAULT 0,
  other_sales NUMERIC DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_shifts TO authenticated;
GRANT ALL ON public.cash_shifts TO service_role;

ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cash shifts"
  ON public.cash_shifts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role, 'registrar'::app_role]));

CREATE POLICY "Staff can open cash shifts"
  ON public.cash_shifts FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role, 'registrar'::app_role]));

CREATE POLICY "Staff can close cash shifts"
  ON public.cash_shifts FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role]));

CREATE POLICY "Admin can delete cash shifts"
  ON public.cash_shifts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_cash_shifts_updated_at
  BEFORE UPDATE ON public.cash_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cash_shifts_status ON public.cash_shifts(status);
CREATE INDEX idx_cash_shifts_opened_at ON public.cash_shifts(opened_at DESC);

-- =========================
-- 2. MEDICAL RECORD AUDIT
-- =========================
CREATE TABLE public.medical_record_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL,
  pet_id UUID,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.medical_record_audit TO authenticated;
GRANT ALL ON public.medical_record_audit TO service_role;

ALTER TABLE public.medical_record_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medical staff can view audit"
  ON public.medical_record_audit FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'veterinarian'::app_role, 'manager'::app_role]));

CREATE INDEX idx_mr_audit_record ON public.medical_record_audit(medical_record_id, created_at DESC);
CREATE INDEX idx_mr_audit_pet ON public.medical_record_audit(pet_id, created_at DESC);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_medical_record_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old JSONB;
  v_new JSONB;
  v_fields TEXT[] := ARRAY[]::TEXT[];
  v_email TEXT;
  v_pet UUID;
  v_record UUID;
  k TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record := NEW.id;
    v_pet := NEW.pet_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record := NEW.id;
    v_pet := NEW.pet_id;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->k IS DISTINCT FROM v_new->k AND k NOT IN ('updated_at') THEN
        v_fields := array_append(v_fields, k);
      END IF;
    END LOOP;
    IF array_length(v_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record := OLD.id;
    v_pet := OLD.pet_id;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.medical_record_audit
    (medical_record_id, pet_id, user_id, user_email, action, old_data, new_data, changed_fields)
  VALUES
    (v_record, v_pet, auth.uid(), v_email, v_action, v_old, v_new, v_fields);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER medical_records_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.log_medical_record_changes();
