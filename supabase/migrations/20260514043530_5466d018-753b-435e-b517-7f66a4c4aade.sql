
-- Add foreign keys so PostgREST relations work in visits joins
ALTER TABLE public.visits
  ADD CONSTRAINT visits_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
  ADD CONSTRAINT visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT visits_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id) ON DELETE CASCADE,
  ADD CONSTRAINT visits_veterinarian_id_fkey FOREIGN KEY (veterinarian_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT visits_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

ALTER TABLE public.visit_services
  ADD CONSTRAINT visit_services_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE,
  ADD CONSTRAINT visit_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.visit_materials
  ADD CONSTRAINT visit_materials_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE,
  ADD CONSTRAINT visit_materials_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Optional FK for invoices.visit_id if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='visit_id') THEN
    BEGIN
      ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
