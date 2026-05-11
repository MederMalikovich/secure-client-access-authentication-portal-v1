-- Skip auto-accrue when payment is via loyalty points or gift certificate
CREATE OR REPLACE FUNCTION public.auto_accrue_loyalty_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.loyalty_settings%ROWTYPE;
  inv public.invoices%ROWTYPE;
  pts numeric;
BEGIN
  IF NEW.payment_method IN ('loyalty_points', 'gift_certificate') THEN
    RETURN NEW;
  END IF;
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
$function$;