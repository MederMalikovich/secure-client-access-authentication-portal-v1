
-- ============================================
-- 1. АТОМАРНЫЕ RPC ФУНКЦИИ
-- ============================================

-- Атомарная выписка из стационара + возврат invoice_id
CREATE OR REPLACE FUNCTION public.discharge_hospitalization_and_get_invoice(_hosp_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  UPDATE public.hospitalizations
     SET status = 'discharged',
         discharge_at = COALESCE(discharge_at, now())
   WHERE id = _hosp_id AND status <> 'discharged';

  SELECT id INTO v_invoice_id
    FROM public.invoices
   WHERE notes LIKE 'HOSP:' || _hosp_id::text || '%'
   ORDER BY created_at DESC LIMIT 1;

  RETURN v_invoice_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.discharge_hospitalization_and_get_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discharge_hospitalization_and_get_invoice(uuid) TO authenticated;

-- Атомарная отмена счёта (void)
CREATE OR REPLACE FUNCTION public.void_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_paid numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'accountant'::public.app_role)) THEN
    RAISE EXCEPTION 'Недостаточно прав для отмены счёта';
  END IF;

  SELECT status INTO v_status FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Счёт не найден'; END IF;
  IF v_status = 'cancelled' THEN RETURN true; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = _invoice_id;
  IF v_paid > 0 THEN
    RAISE EXCEPTION 'Нельзя отменить счёт с оплатами. Сначала верните оплату.';
  END IF;

  UPDATE public.invoices
     SET status = 'cancelled',
         notes = COALESCE(notes,'') || E'\n[VOID] ' || COALESCE(_reason,'без причины') || ' @ ' || now()::text
   WHERE id = _invoice_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.void_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, text) TO authenticated;

-- ============================================
-- 2. ИДЕМПОТЕНТНОСТЬ + АУДИТ
-- ============================================

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uniq
  ON public.payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_idempotency_key_uniq
  ON public.invoices(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Журнал аудита финансов
CREATE TABLE IF NOT EXISTS public.finance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'invoice' | 'payment'
  entity_id uuid NOT NULL,
  action text NOT NULL,      -- 'create' | 'update' | 'delete'
  user_id uuid,
  user_email text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.finance_audit TO authenticated;
GRANT ALL ON public.finance_audit TO service_role;

ALTER TABLE public.finance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/accountant can read finance audit"
ON public.finance_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'accountant'::public.app_role));

CREATE INDEX IF NOT EXISTS finance_audit_entity_idx ON public.finance_audit(entity_type, entity_id, created_at DESC);

-- Универсальная функция аудита для invoices / payments
CREATE OR REPLACE FUNCTION public.log_finance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_fields text[] := ARRAY[]::text[];
  v_email text;
  v_id uuid;
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create'; v_old := NULL; v_new := to_jsonb(NEW); v_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update'; v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_id := NEW.id;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->k IS DISTINCT FROM v_new->k AND k NOT IN ('updated_at') THEN
        v_fields := array_append(v_fields, k);
      END IF;
    END LOOP;
    IF array_length(v_fields,1) IS NULL THEN RETURN NEW; END IF;
  ELSE
    v_action := 'delete'; v_old := to_jsonb(OLD); v_new := NULL; v_id := OLD.id;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.finance_audit (entity_type, entity_id, action, user_id, user_email, old_data, new_data, changed_fields)
  VALUES (TG_ARGV[0], v_id, v_action, auth.uid(), v_email, v_old, v_new, v_fields);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes('invoice');

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes('payment');

-- ============================================
-- 3. REALTIME
-- ============================================

ALTER TABLE public.visits REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.hospitalizations REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.visits; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hospitalizations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
