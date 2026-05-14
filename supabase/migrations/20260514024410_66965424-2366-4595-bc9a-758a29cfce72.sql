
-- ============ ЭТАП 0: АВТОСЧЁТ ПРИ ВЫПИСКЕ ИЗ СТАЦИОНАРА ============

CREATE OR REPLACE FUNCTION public.auto_invoice_on_discharge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_count int;
  total_amount numeric;
  new_invoice_id uuid;
  new_invoice_number text;
  hosp_service_name text;
  existing_invoice_count int;
BEGIN
  -- Срабатывает только при переходе в статус 'discharged'
  IF NEW.status <> 'discharged' OR (OLD.status = 'discharged') THEN
    RETURN NEW;
  END IF;

  IF NEW.discharge_at IS NULL THEN
    NEW.discharge_at := now();
  END IF;

  -- Проверяем, не создан ли уже счёт за этот стационар (по примечанию)
  SELECT COUNT(*) INTO existing_invoice_count
  FROM invoices
  WHERE notes LIKE 'HOSP:' || NEW.id::text || '%';
  IF existing_invoice_count > 0 THEN RETURN NEW; END IF;

  days_count := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (NEW.discharge_at - NEW.admission_at)) / 86400.0)::int);
  total_amount := COALESCE(NEW.daily_rate,0) * days_count;

  IF total_amount <= 0 THEN RETURN NEW; END IF;

  new_invoice_number := generate_invoice_number();

  INSERT INTO invoices (invoice_number, client_id, pet_id, subtotal, total, status, notes, issued_at)
  VALUES (
    new_invoice_number, NEW.client_id, NEW.pet_id,
    total_amount, total_amount, 'pending',
    'HOSP:' || NEW.id::text || ' Стационар ' || days_count || ' дн. × ' || NEW.daily_rate || ' ₸',
    now()
  )
  RETURNING id INTO new_invoice_id;

  hosp_service_name := 'Стационар: ' || days_count || ' дн. × ' || NEW.daily_rate || ' ₸/день';

  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
  VALUES (new_invoice_id, hosp_service_name, days_count, NEW.daily_rate, total_amount);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_on_discharge ON public.hospitalizations;
CREATE TRIGGER trg_auto_invoice_on_discharge
BEFORE UPDATE ON public.hospitalizations
FOR EACH ROW
EXECUTE FUNCTION public.auto_invoice_on_discharge();

-- ============ ЭТАП 1: VISIT-CENTRIC СХЕМА ============

-- Visit статусы (текстовые значения для гибкости)
-- waiting / in_consultation / procedures / hospital / completed / cancelled

CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  client_id uuid NOT NULL,
  appointment_id uuid,
  veterinarian_id uuid,
  visit_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'waiting',
  -- SOAP
  subjective text,        -- S: жалобы + анамнез
  objective text,          -- O: осмотр
  assessment text,         -- A: диагноз
  plan text,               -- P: план лечения
  chief_complaint text,
  -- vitals
  weight numeric,
  temperature numeric,
  pulse integer,
  respiratory_rate integer,
  -- meta
  notes text,
  next_visit_date timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_pet ON public.visits(pet_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_medrec ON public.visits(medical_record_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status, visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_appointment ON public.visits(appointment_id);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medical staff can view visits" ON public.visits
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role,'accountant'::app_role]));
CREATE POLICY "Vets can create visits" ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));
CREATE POLICY "Vets can update visits" ON public.visits
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));
CREATE POLICY "Admin/vet can delete visits" ON public.visits
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role]));
CREATE POLICY "Clients can view own pet visits" ON public.visits
  FOR SELECT TO authenticated
  USING (pet_id IN (SELECT p.id FROM pets p WHERE p.client_id IN (SELECT pr.client_id FROM profiles pr WHERE pr.user_id = auth.uid() AND pr.client_id IS NOT NULL)));

CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Услуги визита
CREATE TABLE IF NOT EXISTS public.visit_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  service_id uuid,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visit_services_visit ON public.visit_services(visit_id);
ALTER TABLE public.visit_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage visit_services" ON public.visit_services
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role,'accountant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'registrar'::app_role,'manager'::app_role]));
CREATE POLICY "Clients view own visit_services" ON public.visit_services
  FOR SELECT TO authenticated
  USING (visit_id IN (SELECT v.id FROM visits v WHERE v.pet_id IN (SELECT p.id FROM pets p WHERE p.client_id IN (SELECT pr.client_id FROM profiles pr WHERE pr.user_id=auth.uid() AND pr.client_id IS NOT NULL))));

-- Материалы визита
CREATE TABLE IF NOT EXISTS public.visit_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  charged_to_client boolean NOT NULL DEFAULT true,
  deducted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visit_materials_visit ON public.visit_materials(visit_id);
ALTER TABLE public.visit_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage visit_materials" ON public.visit_materials
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]));

-- Шаблоны визитов (быстрый режим врача)
CREATE TABLE IF NOT EXISTS public.visit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subjective text,
  objective text,
  assessment text,
  plan text,
  service_ids uuid[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view visit_templates" ON public.visit_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Vets manage visit_templates" ON public.visit_templates
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'veterinarian'::app_role,'manager'::app_role]));
CREATE TRIGGER trg_visit_templates_updated_at BEFORE UPDATE ON public.visit_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Привязка prescriptions и hospitalizations к visit (опционально)
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS visit_id uuid;
ALTER TABLE public.hospitalizations ADD COLUMN IF NOT EXISTS visit_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS visit_id uuid;

-- ============ ОБЕСПЕЧЕНИЕ ОДНОЙ MEDICAL_RECORD НА ПИТОМЦА ============

CREATE OR REPLACE FUNCTION public.ensure_pet_medical_record(_pet_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec_id uuid;
BEGIN
  SELECT id INTO rec_id FROM medical_records WHERE pet_id = _pet_id ORDER BY created_at ASC LIMIT 1;
  IF rec_id IS NULL THEN
    INSERT INTO medical_records (pet_id, visit_date) VALUES (_pet_id, now()) RETURNING id INTO rec_id;
  END IF;
  RETURN rec_id;
END;
$$;

-- Авто-создание медкарты при создании питомца
CREATE OR REPLACE FUNCTION public.auto_create_medical_record_for_pet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ensure_pet_medical_record(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_create_medrec ON public.pets;
CREATE TRIGGER trg_auto_create_medrec
AFTER INSERT ON public.pets
FOR EACH ROW EXECUTE FUNCTION public.auto_create_medical_record_for_pet();

-- Создаём медкарту для всех существующих питомцев у которых её нет
INSERT INTO medical_records (pet_id, visit_date)
SELECT p.id, now() FROM pets p
WHERE NOT EXISTS (SELECT 1 FROM medical_records mr WHERE mr.pet_id = p.id);

-- Авто-привязка medical_record_id при создании visit
CREATE OR REPLACE FUNCTION public.set_visit_medical_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.medical_record_id IS NULL THEN
    NEW.medical_record_id := ensure_pet_medical_record(NEW.pet_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_visit_medrec ON public.visits;
CREATE TRIGGER trg_set_visit_medrec
BEFORE INSERT ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.set_visit_medical_record();

-- ============ АВТОМАТИЗАЦИЯ ПРИ ЗАВЕРШЕНИИ ВИЗИТА ============

CREATE OR REPLACE FUNCTION public.auto_process_visit_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_services numeric := 0;
  total_materials numeric := 0;
  grand_total numeric := 0;
  new_invoice_id uuid;
  new_invoice_number text;
  vs RECORD;
  vm RECORD;
  existing_invoice_id uuid;
BEGIN
  IF NEW.status <> 'completed' OR (OLD.status = 'completed') THEN RETURN NEW; END IF;

  IF NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  -- Списание материалов со склада
  FOR vm IN SELECT * FROM visit_materials WHERE visit_id = NEW.id AND deducted = false LOOP
    UPDATE inventory_items SET quantity = GREATEST(0, quantity - vm.quantity) WHERE id = vm.inventory_item_id;
    INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_id, notes)
    VALUES (vm.inventory_item_id, 'treatment', vm.quantity, NEW.id, 'Визит ' || NEW.id);
    UPDATE visit_materials SET deducted = true WHERE id = vm.id;
  END LOOP;

  -- Подсчёт сумм
  SELECT COALESCE(SUM(total),0) INTO total_services FROM visit_services WHERE visit_id = NEW.id;
  SELECT COALESCE(SUM(total),0) INTO total_materials FROM visit_materials WHERE visit_id = NEW.id AND charged_to_client = true;
  grand_total := total_services + total_materials;

  -- Создание счёта (если ещё нет)
  SELECT id INTO existing_invoice_id FROM invoices WHERE visit_id = NEW.id LIMIT 1;
  IF existing_invoice_id IS NULL AND grand_total > 0 THEN
    new_invoice_number := generate_invoice_number();
    INSERT INTO invoices (invoice_number, client_id, pet_id, visit_id, subtotal, total, status, issued_at)
    VALUES (new_invoice_number, NEW.client_id, NEW.pet_id, NEW.id, grand_total, grand_total, 'pending', now())
    RETURNING id INTO new_invoice_id;

    FOR vs IN SELECT * FROM visit_services WHERE visit_id = NEW.id LOOP
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, service_id)
      VALUES (new_invoice_id, vs.description, vs.quantity, vs.unit_price, vs.total, vs.service_id);
    END LOOP;
    FOR vm IN SELECT * FROM visit_materials WHERE visit_id = NEW.id AND charged_to_client = true LOOP
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, inventory_item_id)
      VALUES (new_invoice_id, vm.description, vm.quantity, vm.unit_price, vm.total, vm.inventory_item_id);
    END LOOP;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_process_visit_completion ON public.visits;
CREATE TRIGGER trg_auto_process_visit_completion
BEFORE UPDATE ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.auto_process_visit_completion();

-- ============ УРОВНИ ЛОЯЛЬНОСТИ ============

ALTER TABLE public.loyalty_settings
  ADD COLUMN IF NOT EXISTS gold_threshold numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS vip_threshold numeric NOT NULL DEFAULT 200000,
  ADD COLUMN IF NOT EXISTS silver_percent numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS gold_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS vip_percent numeric NOT NULL DEFAULT 10;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS loyalty_tier text NOT NULL DEFAULT 'silver',
  ADD COLUMN IF NOT EXISTS lifetime_spend numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_client_tier(_client_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.loyalty_settings%ROWTYPE;
  spend numeric;
  new_tier text;
BEGIN
  SELECT * INTO s FROM loyalty_settings LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(p.amount),0) INTO spend
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  WHERE i.client_id = _client_id
    AND p.payment_method NOT IN ('loyalty_points','gift_certificate')
    AND p.paid_at >= now() - interval '12 months';

  new_tier := 'silver';
  IF spend >= s.vip_threshold THEN new_tier := 'vip';
  ELSIF spend >= s.gold_threshold THEN new_tier := 'gold';
  END IF;

  UPDATE clients SET loyalty_tier = new_tier, lifetime_spend = spend WHERE id = _client_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_tier_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv_client uuid;
BEGIN
  SELECT client_id INTO inv_client FROM invoices WHERE id = NEW.invoice_id;
  IF inv_client IS NOT NULL THEN PERFORM recalc_client_tier(inv_client); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_tier_after_payment ON public.payments;
CREATE TRIGGER trg_recalc_tier_after_payment
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_tier_on_payment();

-- Обновляем функцию начисления лояльности — учитываем уровень клиента
CREATE OR REPLACE FUNCTION public.auto_accrue_loyalty_on_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  s public.loyalty_settings%ROWTYPE;
  inv public.invoices%ROWTYPE;
  cli public.clients%ROWTYPE;
  pct numeric;
  pts numeric;
BEGIN
  IF NEW.payment_method IN ('loyalty_points', 'gift_certificate') THEN RETURN NEW; END IF;
  SELECT * INTO s FROM loyalty_settings LIMIT 1;
  IF NOT FOUND OR NOT s.is_enabled THEN RETURN NEW; END IF;
  SELECT * INTO inv FROM invoices WHERE id = NEW.invoice_id;
  IF NOT FOUND OR inv.client_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO cli FROM clients WHERE id = inv.client_id;
  pct := CASE COALESCE(cli.loyalty_tier,'silver')
    WHEN 'vip' THEN s.vip_percent
    WHEN 'gold' THEN s.gold_percent
    ELSE s.silver_percent
  END;
  IF pct IS NULL OR pct <= 0 THEN pct := s.accrual_percent; END IF;
  pts := round(NEW.amount * pct / 100, 2);
  IF pts > 0 THEN
    INSERT INTO loyalty_transactions (client_id, amount, type, description, invoice_id, payment_id)
    VALUES (inv.client_id, pts, 'accrual', 'Начисление ('|| COALESCE(cli.loyalty_tier,'silver') ||') за оплату ' || COALESCE(inv.invoice_number,''), inv.id, NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- Realtime для visits и flowboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
