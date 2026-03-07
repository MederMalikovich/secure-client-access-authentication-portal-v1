
-- Add 'client' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Add client_id to profiles to link client accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- RLS: Clients can view their own client record
CREATE POLICY "Clients can view own client record" ON public.clients
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  );

-- RLS: Clients can view their own pets
CREATE POLICY "Clients can view own pets" ON public.pets
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
  );

-- RLS: Clients can view medical records of their pets
CREATE POLICY "Clients can view own pet medical_records" ON public.medical_records
  FOR SELECT TO authenticated
  USING (
    pet_id IN (
      SELECT pets.id FROM public.pets
      WHERE pets.client_id IN (SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL)
    )
  );
