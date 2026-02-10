
-- Add unique 6-digit client number
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

-- Create function to generate unique 6-digit client number
CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number TEXT;
    attempts INTEGER := 0;
BEGIN
    LOOP
        new_number := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE client_number = new_number);
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Could not generate unique client number';
        END IF;
    END LOOP;
    NEW.client_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-assign client number on insert
DROP TRIGGER IF EXISTS set_client_number ON public.clients;
CREATE TRIGGER set_client_number
BEFORE INSERT ON public.clients
FOR EACH ROW
WHEN (NEW.client_number IS NULL)
EXECUTE FUNCTION public.generate_client_number();

-- Generate numbers for existing clients
DO $$
DECLARE
    client_rec RECORD;
    new_number TEXT;
    attempts INTEGER;
BEGIN
    FOR client_rec IN SELECT id FROM public.clients WHERE client_number IS NULL LOOP
        attempts := 0;
        LOOP
            new_number := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clients WHERE client_number = new_number);
            attempts := attempts + 1;
            IF attempts > 100 THEN
                RAISE EXCEPTION 'Could not generate unique client number';
            END IF;
        END LOOP;
        UPDATE public.clients SET client_number = new_number WHERE id = client_rec.id;
    END LOOP;
END $$;
