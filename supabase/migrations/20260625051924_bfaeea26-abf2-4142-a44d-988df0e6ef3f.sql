-- Ensure visit status changes propagate to its appointment
DROP TRIGGER IF EXISTS trg_sync_visit_to_appointment ON public.visits;
CREATE TRIGGER trg_sync_visit_to_appointment
  AFTER INSERT OR UPDATE OF status ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.sync_visit_status_to_appointment();

-- New: free the doctor as soon as payment is recorded
CREATE OR REPLACE FUNCTION public.free_vet_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id uuid;
  v_appt_id uuid;
BEGIN
  IF NEW.invoice_id IS NULL THEN RETURN NEW; END IF;

  SELECT visit_id INTO v_visit_id FROM public.invoices WHERE id = NEW.invoice_id;
  IF v_visit_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.visits
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now())
   WHERE id = v_visit_id
     AND status <> 'completed';

  SELECT appointment_id INTO v_appt_id FROM public.visits WHERE id = v_visit_id;
  IF v_appt_id IS NOT NULL THEN
    UPDATE public.appointments
       SET status = 'completed', updated_at = now()
     WHERE id = v_appt_id
       AND status <> 'completed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_free_vet_on_payment ON public.payments;
CREATE TRIGGER trg_free_vet_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.free_vet_on_payment();