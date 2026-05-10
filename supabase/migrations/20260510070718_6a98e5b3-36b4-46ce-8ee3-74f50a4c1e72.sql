
-- ============ Missing FK fixes ============
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
  ADD CONSTRAINT prescriptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT prescriptions_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT prescriptions_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id) ON DELETE CASCADE;

ALTER TABLE public.hospitalizations
  ADD CONSTRAINT hospitalizations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
  ADD CONSTRAINT hospitalizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT hospitalizations_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospitalization_logs
  ADD CONSTRAINT hospitalization_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.medical_record_files
  ADD CONSTRAINT medical_record_files_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;

-- ============ Loyalty: clients fields ============
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS loyalty_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_code text;
  attempts int := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL AND NEW.referral_code <> '' THEN RETURN NEW; END IF;
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE referral_code = v_code);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Cannot generate unique referral_code'; END IF;
  END LOOP;
  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.clients;
CREATE TRIGGER trg_generate_referral_code
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

UPDATE public.clients SET referral_code = upper(substr(md5(id::text || clock_timestamp()::text), 1, 8)) WHERE referral_code IS NULL;

-- ============ Loyalty settings ============
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  accrual_percent numeric NOT NULL DEFAULT 5,
  max_redeem_percent numeric NOT NULL DEFAULT 30,
  referrer_bonus numeric NOT NULL DEFAULT 1000,
  referee_bonus numeric NOT NULL DEFAULT 500,
  points_expire_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.loyalty_settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_settings);
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Anyone authenticated can view loyalty settings" ON public.loyalty_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/manager can manage loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Admin/manager can manage loyalty settings" ON public.loyalty_settings FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- ============ Loyalty transactions ============
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('accrual','redemption','referral','manual','expired','certificate')),
  description text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON public.loyalty_transactions(client_id, created_at DESC);
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clients can view own loyalty txns" ON public.loyalty_transactions;
CREATE POLICY "Clients can view own loyalty txns" ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL));
DROP POLICY IF EXISTS "Staff can view loyalty txns" ON public.loyalty_transactions;
CREATE POLICY "Staff can view loyalty txns" ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role, 'registrar'::app_role]));
DROP POLICY IF EXISTS "Staff can create loyalty txns" ON public.loyalty_transactions;
CREATE POLICY "Staff can create loyalty txns" ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role, 'registrar'::app_role]));
DROP POLICY IF EXISTS "Admin can delete loyalty txns" ON public.loyalty_transactions;
CREATE POLICY "Admin can delete loyalty txns" ON public.loyalty_transactions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.apply_loyalty_balance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.clients SET loyalty_balance = COALESCE(loyalty_balance,0) + NEW.amount WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_loyalty_balance ON public.loyalty_transactions;
CREATE TRIGGER trg_apply_loyalty_balance
AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_balance();

-- ============ Gift certificates ============
CREATE TABLE IF NOT EXISTS public.gift_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL DEFAULT '',
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled')),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  recipient_name text,
  recipient_phone text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view gift certificates" ON public.gift_certificates;
CREATE POLICY "Staff view gift certificates" ON public.gift_certificates FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role, 'registrar'::app_role]));
DROP POLICY IF EXISTS "Clients view own redeemed certificates" ON public.gift_certificates;
CREATE POLICY "Clients view own redeemed certificates" ON public.gift_certificates FOR SELECT TO authenticated
  USING (redeemed_by_client_id IN (SELECT p.client_id FROM profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL));
DROP POLICY IF EXISTS "Admin/manager create certificates" ON public.gift_certificates;
CREATE POLICY "Admin/manager create certificates" ON public.gift_certificates FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
DROP POLICY IF EXISTS "Admin/manager/accountant update certificates" ON public.gift_certificates;
CREATE POLICY "Admin/manager/accountant update certificates" ON public.gift_certificates FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'accountant'::app_role]));
DROP POLICY IF EXISTS "Admin delete certificates" ON public.gift_certificates;
CREATE POLICY "Admin delete certificates" ON public.gift_certificates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.generate_certificate_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_code text;
  attempts int := 0;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN RETURN NEW; END IF;
  LOOP
    v_code := 'GC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_certificates WHERE code = v_code);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Cannot generate unique certificate code'; END IF;
  END LOOP;
  NEW.code := v_code;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_generate_certificate_code ON public.gift_certificates;
CREATE TRIGGER trg_generate_certificate_code
BEFORE INSERT ON public.gift_certificates
FOR EACH ROW EXECUTE FUNCTION public.generate_certificate_code();

-- ============ Auto-accrue loyalty on payment ============
CREATE OR REPLACE FUNCTION public.auto_accrue_loyalty_on_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  s public.loyalty_settings%ROWTYPE;
  inv public.invoices%ROWTYPE;
  pts numeric;
BEGIN
  SELECT * INTO s FROM public.loyalty_settings LIMIT 1;
  IF NOT FOUND OR NOT s.is_enabled OR s.accrual_percent <= 0 THEN RETURN NEW; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
  IF NOT FOUND OR inv.client_id IS NULL THEN RETURN NEW; END IF;
  pts := round(NEW.amount * s.accrual_percent / 100, 2);
  IF pts > 0 THEN
    INSERT INTO public.loyalty_transactions (client_id, amount, type, description, invoice_id, payment_id)
    VALUES (inv.client_id, pts, 'accrual', 'Начисление за оплату ' || COALESCE(inv.invoice_number,''), inv.id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_accrue_loyalty ON public.payments;
CREATE TRIGGER trg_auto_accrue_loyalty
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.auto_accrue_loyalty_on_payment();
