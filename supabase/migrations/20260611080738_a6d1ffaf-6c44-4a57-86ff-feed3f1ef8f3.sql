
-- 1) shortage column on visit_materials
ALTER TABLE public.visit_materials ADD COLUMN IF NOT EXISTS shortage boolean NOT NULL DEFAULT false;

-- 2) Atomic RPC: complete visit and return invoice id
CREATE OR REPLACE FUNCTION public.complete_visit_and_get_invoice(_visit_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  UPDATE public.visits SET status = 'completed' WHERE id = _visit_id AND status <> 'completed';
  SELECT id INTO v_invoice_id FROM public.invoices WHERE visit_id = _visit_id ORDER BY created_at DESC LIMIT 1;
  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_visit_and_get_invoice(uuid) TO authenticated;

-- 3) Update auto_process_visit_completion to warn on shortages
CREATE OR REPLACE FUNCTION public.auto_process_visit_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_services numeric := 0;
  total_materials numeric := 0;
  grand_total numeric := 0;
  new_invoice_id uuid;
  new_invoice_number text;
  vs RECORD;
  vm RECORD;
  existing_invoice_id uuid;
  current_qty numeric;
  item_name text;
BEGIN
  IF NEW.status <> 'completed' OR (OLD.status = 'completed') THEN RETURN NEW; END IF;

  IF NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  FOR vm IN SELECT * FROM visit_materials WHERE visit_id = NEW.id AND deducted = false LOOP
    SELECT quantity, name INTO current_qty, item_name FROM inventory_items WHERE id = vm.inventory_item_id;
    IF current_qty IS NOT NULL AND current_qty < vm.quantity THEN
      UPDATE visit_materials SET shortage = true WHERE id = vm.id;
      INSERT INTO notifications (type, title, message, channel, is_sent, sent_at, target_role, severity)
      VALUES (
        'low_stock',
        'Дефицит материала: ' || COALESCE(item_name,''),
        'Требуется ' || vm.quantity || ', доступно ' || current_qty || ' (визит ' || NEW.id || ')',
        'in_app', true, now(), 'manager', 'warning'
      );
      RAISE WARNING 'Insufficient stock for item % on visit %: required %, available %', vm.inventory_item_id, NEW.id, vm.quantity, current_qty;
    END IF;
    UPDATE inventory_items SET quantity = GREATEST(0, quantity - vm.quantity) WHERE id = vm.inventory_item_id;
    INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_id, notes)
    VALUES (vm.inventory_item_id, 'treatment', vm.quantity, NEW.id, 'Визит ' || NEW.id);
    UPDATE visit_materials SET deducted = true WHERE id = vm.id;
  END LOOP;

  SELECT COALESCE(SUM(total),0) INTO total_services FROM visit_services WHERE visit_id = NEW.id;
  SELECT COALESCE(SUM(total),0) INTO total_materials FROM visit_materials WHERE visit_id = NEW.id AND charged_to_client = true;
  grand_total := total_services + total_materials;

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
END;
$$;

-- 4) Recalc invoice items when visit_services / visit_materials change, only while invoice pending
CREATE OR REPLACE FUNCTION public.recalc_pending_invoice_for_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id uuid;
  v_invoice_id uuid;
  v_status text;
  total_services numeric := 0;
  total_materials numeric := 0;
  grand_total numeric := 0;
  vs RECORD;
  vm RECORD;
BEGIN
  v_visit_id := COALESCE(NEW.visit_id, OLD.visit_id);
  IF v_visit_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT id, status INTO v_invoice_id, v_status FROM invoices WHERE visit_id = v_visit_id LIMIT 1;
  IF v_invoice_id IS NULL OR v_status <> 'pending' THEN RETURN COALESCE(NEW, OLD); END IF;

  DELETE FROM invoice_items WHERE invoice_id = v_invoice_id;

  FOR vs IN SELECT * FROM visit_services WHERE visit_id = v_visit_id LOOP
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, service_id)
    VALUES (v_invoice_id, vs.description, vs.quantity, vs.unit_price, vs.total, vs.service_id);
    total_services := total_services + COALESCE(vs.total,0);
  END LOOP;
  FOR vm IN SELECT * FROM visit_materials WHERE visit_id = v_visit_id AND charged_to_client = true LOOP
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, inventory_item_id)
    VALUES (v_invoice_id, vm.description, vm.quantity, vm.unit_price, vm.total, vm.inventory_item_id);
    total_materials := total_materials + COALESCE(vm.total,0);
  END LOOP;

  grand_total := total_services + total_materials;
  UPDATE invoices SET subtotal = grand_total, total = grand_total WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_on_visit_services ON public.visit_services;
CREATE TRIGGER trg_recalc_invoice_on_visit_services
AFTER INSERT OR UPDATE OR DELETE ON public.visit_services
FOR EACH ROW EXECUTE FUNCTION public.recalc_pending_invoice_for_visit();

DROP TRIGGER IF EXISTS trg_recalc_invoice_on_visit_materials ON public.visit_materials;
CREATE TRIGGER trg_recalc_invoice_on_visit_materials
AFTER INSERT OR UPDATE OR DELETE ON public.visit_materials
FOR EACH ROW EXECUTE FUNCTION public.recalc_pending_invoice_for_visit();
