CREATE OR REPLACE FUNCTION public.validate_clients_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NULL OR char_length(btrim(NEW.full_name)) < 2 OR char_length(btrim(NEW.full_name)) > 100 THEN
    RAISE EXCEPTION 'Invalid full_name length: expected 2-100 characters';
  END IF;

  IF NEW.phone IS NULL OR char_length(btrim(NEW.phone)) < 5 OR char_length(btrim(NEW.phone)) > 20 THEN
    RAISE EXCEPTION 'Invalid phone length: expected 5-20 characters';
  END IF;

  IF NEW.email IS NOT NULL AND btrim(NEW.email) <> '' THEN
    IF char_length(NEW.email) > 100 OR NEW.email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;

  IF NEW.address IS NOT NULL AND char_length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address too long: max 500 characters';
  END IF;

  IF NEW.notes IS NOT NULL AND char_length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'Notes too long: max 2000 characters';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_clients_input_trigger ON public.clients;

CREATE TRIGGER validate_clients_input_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.validate_clients_input();