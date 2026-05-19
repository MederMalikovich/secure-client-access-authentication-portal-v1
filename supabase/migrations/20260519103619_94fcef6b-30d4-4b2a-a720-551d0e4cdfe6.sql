
-- 1) Invoice number without zero padding: YYYY-N
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    new_number TEXT;
    current_year TEXT;
    seq_number INTEGER;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
        CASE WHEN SUBSTRING(invoice_number FROM 6) ~ '^[0-9]+$'
             THEN CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)
             ELSE 0
        END
    ), 0) + 1
    INTO seq_number
    FROM public.invoices
    WHERE invoice_number LIKE current_year || '-%';

    new_number := current_year || '-' || seq_number::TEXT;
    RETURN new_number;
END;
$function$;

-- 2) Sync visit status -> linked appointment status
CREATE OR REPLACE FUNCTION public.sync_visit_status_to_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_status public.appointment_status;
BEGIN
  IF NEW.appointment_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  target_status := CASE NEW.status
    WHEN 'completed' THEN 'completed'::public.appointment_status
    WHEN 'in_consultation' THEN 'in_progress'::public.appointment_status
    WHEN 'procedures' THEN 'in_progress'::public.appointment_status
    WHEN 'hospital' THEN 'in_progress'::public.appointment_status
    WHEN 'waiting' THEN 'confirmed'::public.appointment_status
    ELSE NULL
  END;

  IF target_status IS NOT NULL THEN
    UPDATE public.appointments
       SET status = target_status, updated_at = now()
     WHERE id = NEW.appointment_id
       AND status IS DISTINCT FROM target_status;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_visit_status_to_appointment ON public.visits;
CREATE TRIGGER trg_sync_visit_status_to_appointment
AFTER INSERT OR UPDATE OF status ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.sync_visit_status_to_appointment();
