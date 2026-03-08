
-- Clients can view their own appointments
CREATE POLICY "Clients can view own appointments"
ON public.appointments
FOR SELECT
USING (
  client_id IN (
    SELECT p.client_id FROM profiles p
    WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL
  )
);

-- Clients can create appointments (online booking)
CREATE POLICY "Clients can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT p.client_id FROM profiles p
    WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL
  )
);

-- Clients can view their own invoices
CREATE POLICY "Clients can view own invoices"
ON public.invoices
FOR SELECT
USING (
  client_id IN (
    SELECT p.client_id FROM profiles p
    WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL
  )
);

-- Clients can view own invoice items
CREATE POLICY "Clients can view own invoice_items"
ON public.invoice_items
FOR SELECT
USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    WHERE i.client_id IN (
      SELECT p.client_id FROM profiles p
      WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL
    )
  )
);

-- Clients can view own payments
CREATE POLICY "Clients can view own payments"
ON public.payments
FOR SELECT
USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    WHERE i.client_id IN (
      SELECT p.client_id FROM profiles p
      WHERE p.user_id = auth.uid() AND p.client_id IS NOT NULL
    )
  )
);

-- Clients can view services for booking
-- (already has "Authenticated can view services" policy)

-- Clients can view service categories for booking
-- (already has "Authenticated can view service_categories" policy)
