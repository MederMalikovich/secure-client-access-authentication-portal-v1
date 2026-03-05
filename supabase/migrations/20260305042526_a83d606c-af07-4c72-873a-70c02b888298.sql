
-- Drop overly permissive policies and replace with role-based access

-- ============ MEDICAL RECORDS ============
DROP POLICY IF EXISTS "Authenticated can view medical_records" ON medical_records;
DROP POLICY IF EXISTS "Authenticated can create medical_records" ON medical_records;
DROP POLICY IF EXISTS "Authenticated can update medical_records" ON medical_records;

CREATE POLICY "Medical staff can view medical_records" ON medical_records FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Vets can create medical_records" ON medical_records FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));
CREATE POLICY "Vets can update medical_records" ON medical_records FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- ============ MEDICAL RECORD DIAGNOSES ============
DROP POLICY IF EXISTS "Authenticated can view medical_record_diagnoses" ON medical_record_diagnoses;
DROP POLICY IF EXISTS "Authenticated can create medical_record_diagnoses" ON medical_record_diagnoses;
DROP POLICY IF EXISTS "Authenticated can update medical_record_diagnoses" ON medical_record_diagnoses;

CREATE POLICY "Medical staff can view medical_record_diagnoses" ON medical_record_diagnoses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Vets can create medical_record_diagnoses" ON medical_record_diagnoses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));
CREATE POLICY "Vets can update medical_record_diagnoses" ON medical_record_diagnoses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- ============ MEDICAL RECORD SERVICES ============
DROP POLICY IF EXISTS "Authenticated can view medical_record_services" ON medical_record_services;
DROP POLICY IF EXISTS "Authenticated can create medical_record_services" ON medical_record_services;
DROP POLICY IF EXISTS "Authenticated can update medical_record_services" ON medical_record_services;

CREATE POLICY "Medical staff can view medical_record_services" ON medical_record_services FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Vets can create medical_record_services" ON medical_record_services FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));
CREATE POLICY "Vets can update medical_record_services" ON medical_record_services FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- ============ INVOICES ============
DROP POLICY IF EXISTS "Authenticated can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated can create invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated can update invoices" ON invoices;

CREATE POLICY "Finance staff can view invoices" ON invoices FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Finance staff can create invoices" ON invoices FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','accountant']::app_role[]));
CREATE POLICY "Finance staff can update invoices" ON invoices FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- ============ INVOICE ITEMS ============
DROP POLICY IF EXISTS "Authenticated can view invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated can create invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated can update invoice_items" ON invoice_items;

CREATE POLICY "Finance staff can view invoice_items" ON invoice_items FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Finance staff can create invoice_items" ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','accountant']::app_role[]));
CREATE POLICY "Finance staff can update invoice_items" ON invoice_items FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- ============ PAYMENTS ============
DROP POLICY IF EXISTS "Authenticated can view payments" ON payments;
DROP POLICY IF EXISTS "Authenticated can create payments" ON payments;
DROP POLICY IF EXISTS "Authenticated can update payments" ON payments;

CREATE POLICY "Finance staff can view payments" ON payments FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','accountant']::app_role[]));
CREATE POLICY "Finance staff can create payments" ON payments FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));
CREATE POLICY "Finance staff can update payments" ON payments FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- ============ CLIENTS ============
DROP POLICY IF EXISTS "Authenticated can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can create clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can update clients" ON clients;

CREATE POLICY "Staff can view clients" ON clients FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Staff can create clients" ON clients FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update clients" ON clients FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));

-- ============ PETS ============
DROP POLICY IF EXISTS "Authenticated can view pets" ON pets;
DROP POLICY IF EXISTS "Authenticated can create pets" ON pets;
DROP POLICY IF EXISTS "Authenticated can update pets" ON pets;

CREATE POLICY "Staff can view pets" ON pets FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Staff can create pets" ON pets FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update pets" ON pets FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));

-- ============ APPOINTMENTS ============
DROP POLICY IF EXISTS "Authenticated can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated can create appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated can update appointments" ON appointments;

CREATE POLICY "Staff can view appointments" ON appointments FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can create appointments" ON appointments FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update appointments" ON appointments FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));

-- ============ INVENTORY ITEMS ============
DROP POLICY IF EXISTS "Authenticated can view inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated can create inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated can update inventory_items" ON inventory_items;

CREATE POLICY "Staff can view inventory_items" ON inventory_items FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','manager']::app_role[]));
CREATE POLICY "Staff can create inventory_items" ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Staff can update inventory_items" ON inventory_items FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ============ INVENTORY MOVEMENTS ============
DROP POLICY IF EXISTS "Authenticated can view inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Authenticated can create inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Authenticated can update inventory_movements" ON inventory_movements;

CREATE POLICY "Staff can view inventory_movements" ON inventory_movements FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','manager']::app_role[]));
CREATE POLICY "Staff can create inventory_movements" ON inventory_movements FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','manager']::app_role[]));
CREATE POLICY "Staff can update inventory_movements" ON inventory_movements FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ============ SHOP SALES ============
DROP POLICY IF EXISTS "Authenticated can view shop_sales" ON shop_sales;
DROP POLICY IF EXISTS "Authenticated can create shop_sales" ON shop_sales;
DROP POLICY IF EXISTS "Authenticated can update shop_sales" ON shop_sales;

CREATE POLICY "Staff can view shop_sales" ON shop_sales FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Staff can create shop_sales" ON shop_sales FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update shop_sales" ON shop_sales FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ============ SHOP SALE ITEMS ============
DROP POLICY IF EXISTS "Authenticated can view shop_sale_items" ON shop_sale_items;
DROP POLICY IF EXISTS "Authenticated can create shop_sale_items" ON shop_sale_items;
DROP POLICY IF EXISTS "Authenticated can update shop_sale_items" ON shop_sale_items;

CREATE POLICY "Staff can view shop_sale_items" ON shop_sale_items FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager','accountant']::app_role[]));
CREATE POLICY "Staff can create shop_sale_items" ON shop_sale_items FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update shop_sale_items" ON shop_sale_items FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "Authenticated can view notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can update notifications" ON notifications;

CREATE POLICY "Staff can view notifications" ON notifications FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can create notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update notifications" ON notifications FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ============ FEEDBACK ============
DROP POLICY IF EXISTS "Authenticated can view feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated can create feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated can update feedback" ON feedback;

CREATE POLICY "Staff can view feedback" ON feedback FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can create feedback" ON feedback FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','veterinarian','registrar','manager']::app_role[]));
CREATE POLICY "Staff can update feedback" ON feedback FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
