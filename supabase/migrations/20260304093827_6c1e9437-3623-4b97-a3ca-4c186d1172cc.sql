
-- Drop ALL public "Anyone can..." policies from all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Anyone can%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- PROFILES
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can create profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- USER_ROLES
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CLIENTS
CREATE POLICY "Authenticated can view clients"
  ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create clients"
  ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients"
  ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- PETS
CREATE POLICY "Authenticated can view pets"
  ON public.pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create pets"
  ON public.pets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pets"
  ON public.pets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete pets"
  ON public.pets FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- MEDICAL_RECORDS
CREATE POLICY "Authenticated can view medical_records"
  ON public.medical_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create medical_records"
  ON public.medical_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update medical_records"
  ON public.medical_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/vet can delete medical_records"
  ON public.medical_records FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- MEDICAL_RECORD_DIAGNOSES
CREATE POLICY "Authenticated can view medical_record_diagnoses"
  ON public.medical_record_diagnoses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create medical_record_diagnoses"
  ON public.medical_record_diagnoses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update medical_record_diagnoses"
  ON public.medical_record_diagnoses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/vet can delete medical_record_diagnoses"
  ON public.medical_record_diagnoses FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- MEDICAL_RECORD_SERVICES
CREATE POLICY "Authenticated can view medical_record_services"
  ON public.medical_record_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create medical_record_services"
  ON public.medical_record_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update medical_record_services"
  ON public.medical_record_services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/vet can delete medical_record_services"
  ON public.medical_record_services FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));

-- APPOINTMENTS
CREATE POLICY "Authenticated can view appointments"
  ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create appointments"
  ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update appointments"
  ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- SERVICES
CREATE POLICY "Authenticated can view services"
  ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can create services"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin/manager can update services"
  ON public.services FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin can delete services"
  ON public.services FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SERVICE_CATEGORIES
CREATE POLICY "Authenticated can view service_categories"
  ON public.service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can create service_categories"
  ON public.service_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin/manager can update service_categories"
  ON public.service_categories FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin can delete service_categories"
  ON public.service_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DISEASES
CREATE POLICY "Authenticated can view diseases"
  ON public.diseases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/vet can create diseases"
  ON public.diseases FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));
CREATE POLICY "Admin/vet can update diseases"
  ON public.diseases FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','veterinarian']::app_role[]));
CREATE POLICY "Admin can delete diseases"
  ON public.diseases FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVENTORY_ITEMS
CREATE POLICY "Authenticated can view inventory_items"
  ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create inventory_items"
  ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inventory_items"
  ON public.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete inventory_items"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- INVENTORY_CATEGORIES
CREATE POLICY "Authenticated can view inventory_categories"
  ON public.inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can create inventory_categories"
  ON public.inventory_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin/manager can update inventory_categories"
  ON public.inventory_categories FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin can delete inventory_categories"
  ON public.inventory_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVENTORY_MOVEMENTS
CREATE POLICY "Authenticated can view inventory_movements"
  ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create inventory_movements"
  ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inventory_movements"
  ON public.inventory_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can delete inventory_movements"
  ON public.inventory_movements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVOICES
CREATE POLICY "Authenticated can view invoices"
  ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create invoices"
  ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoices"
  ON public.invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/accountant can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- INVOICE_ITEMS
CREATE POLICY "Authenticated can view invoice_items"
  ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create invoice_items"
  ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoice_items"
  ON public.invoice_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/accountant can delete invoice_items"
  ON public.invoice_items FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- PAYMENTS
CREATE POLICY "Authenticated can view payments"
  ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create payments"
  ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update payments"
  ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/accountant can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));

-- SHOP_SALES
CREATE POLICY "Authenticated can view shop_sales"
  ON public.shop_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create shop_sales"
  ON public.shop_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shop_sales"
  ON public.shop_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete shop_sales"
  ON public.shop_sales FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- SHOP_SALE_ITEMS
CREATE POLICY "Authenticated can view shop_sale_items"
  ON public.shop_sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create shop_sale_items"
  ON public.shop_sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shop_sale_items"
  ON public.shop_sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete shop_sale_items"
  ON public.shop_sale_items FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- FEEDBACK
CREATE POLICY "Authenticated can view feedback"
  ON public.feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create feedback"
  ON public.feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update feedback"
  ON public.feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/manager can delete feedback"
  ON public.feedback FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- NOTIFICATIONS
CREATE POLICY "Authenticated can view notifications"
  ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SETTINGS
CREATE POLICY "Authenticated can view settings"
  ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can create settings"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete settings"
  ON public.settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
