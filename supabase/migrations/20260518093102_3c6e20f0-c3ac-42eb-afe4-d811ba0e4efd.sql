DROP POLICY IF EXISTS "Admin can delete notifications" ON public.notifications;
CREATE POLICY "Staff can delete notifications" ON public.notifications
FOR DELETE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'registrar'::app_role, 'veterinarian'::app_role]));