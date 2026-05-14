-- Fix: invoice number parsing was off by one and broke on malformed numbers
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

    new_number := current_year || '-' || LPAD(seq_number::TEXT, 6, '0');
    RETURN new_number;
END;
$function$;

-- Repair the malformed invoice number that prevents the trigger from running
UPDATE public.invoices
SET invoice_number = TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM()*900000+100000)::int::text, 6, '0')
WHERE invoice_number !~ '^[0-9]{4}-[0-9]+$';