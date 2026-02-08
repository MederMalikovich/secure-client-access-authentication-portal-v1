-- Drop existing restrictive policies and create open policies for development without auth
-- Note: In production, you would want to re-enable proper RLS after auth is set up

-- CLIENTS
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can manage clients" ON public.clients;
CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete clients" ON public.clients FOR DELETE USING (true);

-- PETS
DROP POLICY IF EXISTS "Authenticated can view pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can manage pets" ON public.pets;
CREATE POLICY "Anyone can view pets" ON public.pets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pets" ON public.pets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pets" ON public.pets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete pets" ON public.pets FOR DELETE USING (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "Authenticated can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;
CREATE POLICY "Anyone can view appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete appointments" ON public.appointments FOR DELETE USING (true);

-- SERVICES
DROP POLICY IF EXISTS "All can view services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update services" ON public.services FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete services" ON public.services FOR DELETE USING (true);

-- SERVICE_CATEGORIES
DROP POLICY IF EXISTS "All can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;
CREATE POLICY "Anyone can view service_categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert service_categories" ON public.service_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update service_categories" ON public.service_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete service_categories" ON public.service_categories FOR DELETE USING (true);

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
CREATE POLICY "Anyone can view inventory_items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory_items" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_items" ON public.inventory_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete inventory_items" ON public.inventory_items FOR DELETE USING (true);

-- INVENTORY_CATEGORIES
DROP POLICY IF EXISTS "Staff can view inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Admins can manage inventory categories" ON public.inventory_categories;
CREATE POLICY "Anyone can view inventory_categories" ON public.inventory_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory_categories" ON public.inventory_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_categories" ON public.inventory_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete inventory_categories" ON public.inventory_categories FOR DELETE USING (true);

-- INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "Staff can view movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can create movements" ON public.inventory_movements;
CREATE POLICY "Anyone can view inventory_movements" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory_movements" ON public.inventory_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_movements" ON public.inventory_movements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete inventory_movements" ON public.inventory_movements FOR DELETE USING (true);

-- INVOICES
DROP POLICY IF EXISTS "Finance staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance staff can manage invoices" ON public.invoices;
CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);

-- INVOICE_ITEMS
DROP POLICY IF EXISTS "Finance staff can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Finance staff can manage invoice items" ON public.invoice_items;
CREATE POLICY "Anyone can view invoice_items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoice_items" ON public.invoice_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete invoice_items" ON public.invoice_items FOR DELETE USING (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Finance staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Finance staff can manage payments" ON public.payments;
CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete payments" ON public.payments FOR DELETE USING (true);

-- MEDICAL_RECORDS
DROP POLICY IF EXISTS "Staff can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Vets/admins can manage medical records" ON public.medical_records;
CREATE POLICY "Anyone can view medical_records" ON public.medical_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medical_records" ON public.medical_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_records" ON public.medical_records FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete medical_records" ON public.medical_records FOR DELETE USING (true);

-- MEDICAL_RECORD_DIAGNOSES
DROP POLICY IF EXISTS "Staff can view diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Vets can manage diagnoses" ON public.medical_record_diagnoses;
CREATE POLICY "Anyone can view medical_record_diagnoses" ON public.medical_record_diagnoses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medical_record_diagnoses" ON public.medical_record_diagnoses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_record_diagnoses" ON public.medical_record_diagnoses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete medical_record_diagnoses" ON public.medical_record_diagnoses FOR DELETE USING (true);

-- MEDICAL_RECORD_SERVICES
DROP POLICY IF EXISTS "Staff can view record services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Vets can manage record services" ON public.medical_record_services;
CREATE POLICY "Anyone can view medical_record_services" ON public.medical_record_services FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medical_record_services" ON public.medical_record_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_record_services" ON public.medical_record_services FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete medical_record_services" ON public.medical_record_services FOR DELETE USING (true);

-- DISEASES
DROP POLICY IF EXISTS "All can view diseases" ON public.diseases;
DROP POLICY IF EXISTS "Vets/admins can manage diseases" ON public.diseases;
CREATE POLICY "Anyone can view diseases" ON public.diseases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert diseases" ON public.diseases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update diseases" ON public.diseases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete diseases" ON public.diseases FOR DELETE USING (true);

-- SHOP_SALES
DROP POLICY IF EXISTS "Staff can view shop sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can manage shop sales" ON public.shop_sales;
CREATE POLICY "Anyone can view shop_sales" ON public.shop_sales FOR SELECT USING (true);
CREATE POLICY "Anyone can insert shop_sales" ON public.shop_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shop_sales" ON public.shop_sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete shop_sales" ON public.shop_sales FOR DELETE USING (true);

-- SHOP_SALE_ITEMS
DROP POLICY IF EXISTS "Staff can view shop sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can manage shop sale items" ON public.shop_sale_items;
CREATE POLICY "Anyone can view shop_sale_items" ON public.shop_sale_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert shop_sale_items" ON public.shop_sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shop_sale_items" ON public.shop_sale_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete shop_sale_items" ON public.shop_sale_items FOR DELETE USING (true);

-- FEEDBACK
DROP POLICY IF EXISTS "Staff can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can manage feedback" ON public.feedback;
CREATE POLICY "Anyone can view feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feedback" ON public.feedback FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete feedback" ON public.feedback FOR DELETE USING (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Staff can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can manage notifications" ON public.notifications;
CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete notifications" ON public.notifications FOR DELETE USING (true);

-- SETTINGS
DROP POLICY IF EXISTS "All can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete settings" ON public.settings FOR DELETE USING (true);

-- PROFILES
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete profiles" ON public.profiles FOR DELETE USING (true);

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Anyone can view user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_roles" ON public.user_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete user_roles" ON public.user_roles FOR DELETE USING (true);