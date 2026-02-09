-- Restore public RLS policies for all tables

-- Appointments
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can delete appointments" ON public.appointments;
CREATE POLICY "Anyone can view appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Anyone can create appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete appointments" ON public.appointments FOR DELETE USING (true);

-- Clients
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can create clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can delete clients" ON public.clients;
CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Anyone can create clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clients" ON public.clients FOR DELETE USING (true);

-- Diseases
DROP POLICY IF EXISTS "Staff can view diseases" ON public.diseases;
DROP POLICY IF EXISTS "Staff can create diseases" ON public.diseases;
DROP POLICY IF EXISTS "Staff can update diseases" ON public.diseases;
DROP POLICY IF EXISTS "Staff can delete diseases" ON public.diseases;
CREATE POLICY "Anyone can view diseases" ON public.diseases FOR SELECT USING (true);
CREATE POLICY "Anyone can create diseases" ON public.diseases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update diseases" ON public.diseases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete diseases" ON public.diseases FOR DELETE USING (true);

-- Feedback
DROP POLICY IF EXISTS "Staff can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can delete feedback" ON public.feedback;
CREATE POLICY "Anyone can view feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can create feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feedback" ON public.feedback FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete feedback" ON public.feedback FOR DELETE USING (true);

-- Inventory Categories
DROP POLICY IF EXISTS "Staff can view inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can create inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can update inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can delete inventory_categories" ON public.inventory_categories;
CREATE POLICY "Anyone can view inventory_categories" ON public.inventory_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can create inventory_categories" ON public.inventory_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_categories" ON public.inventory_categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete inventory_categories" ON public.inventory_categories FOR DELETE USING (true);

-- Inventory Items
DROP POLICY IF EXISTS "Staff can view inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can create inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can update inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can delete inventory_items" ON public.inventory_items;
CREATE POLICY "Anyone can view inventory_items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create inventory_items" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_items" ON public.inventory_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete inventory_items" ON public.inventory_items FOR DELETE USING (true);

-- Inventory Movements
DROP POLICY IF EXISTS "Staff can view inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can create inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can update inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can delete inventory_movements" ON public.inventory_movements;
CREATE POLICY "Anyone can view inventory_movements" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Anyone can create inventory_movements" ON public.inventory_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_movements" ON public.inventory_movements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete inventory_movements" ON public.inventory_movements FOR DELETE USING (true);

-- Invoice Items
DROP POLICY IF EXISTS "Staff can view invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can create invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can update invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can delete invoice_items" ON public.invoice_items;
CREATE POLICY "Anyone can view invoice_items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoice_items" ON public.invoice_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete invoice_items" ON public.invoice_items FOR DELETE USING (true);

-- Invoices
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can delete invoices" ON public.invoices;
CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can create invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);

-- Medical Record Diagnoses
DROP POLICY IF EXISTS "Staff can view medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Staff can create medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Staff can update medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Staff can delete medical_record_diagnoses" ON public.medical_record_diagnoses;
CREATE POLICY "Anyone can view medical_record_diagnoses" ON public.medical_record_diagnoses FOR SELECT USING (true);
CREATE POLICY "Anyone can create medical_record_diagnoses" ON public.medical_record_diagnoses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_record_diagnoses" ON public.medical_record_diagnoses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete medical_record_diagnoses" ON public.medical_record_diagnoses FOR DELETE USING (true);

-- Medical Record Services
DROP POLICY IF EXISTS "Staff can view medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Staff can create medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Staff can update medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Staff can delete medical_record_services" ON public.medical_record_services;
CREATE POLICY "Anyone can view medical_record_services" ON public.medical_record_services FOR SELECT USING (true);
CREATE POLICY "Anyone can create medical_record_services" ON public.medical_record_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_record_services" ON public.medical_record_services FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete medical_record_services" ON public.medical_record_services FOR DELETE USING (true);

-- Medical Records
DROP POLICY IF EXISTS "Staff can view medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Staff can create medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Staff can update medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Staff can delete medical_records" ON public.medical_records;
CREATE POLICY "Anyone can view medical_records" ON public.medical_records FOR SELECT USING (true);
CREATE POLICY "Anyone can create medical_records" ON public.medical_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical_records" ON public.medical_records FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete medical_records" ON public.medical_records FOR DELETE USING (true);

-- Notifications
DROP POLICY IF EXISTS "Staff can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can delete notifications" ON public.notifications;
CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notifications" ON public.notifications FOR DELETE USING (true);

-- Payments
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON public.payments;
CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can create payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete payments" ON public.payments FOR DELETE USING (true);

-- Pets
DROP POLICY IF EXISTS "Staff can view pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can create pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can update pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can delete pets" ON public.pets;
CREATE POLICY "Anyone can view pets" ON public.pets FOR SELECT USING (true);
CREATE POLICY "Anyone can create pets" ON public.pets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pets" ON public.pets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pets" ON public.pets FOR DELETE USING (true);

-- Profiles
DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can delete profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can create profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete profiles" ON public.profiles FOR DELETE USING (true);

-- Service Categories
DROP POLICY IF EXISTS "Staff can view service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff can create service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff can update service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff can delete service_categories" ON public.service_categories;
CREATE POLICY "Anyone can view service_categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can create service_categories" ON public.service_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update service_categories" ON public.service_categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete service_categories" ON public.service_categories FOR DELETE USING (true);

-- Services
DROP POLICY IF EXISTS "Staff can view services" ON public.services;
DROP POLICY IF EXISTS "Staff can create services" ON public.services;
DROP POLICY IF EXISTS "Staff can update services" ON public.services;
DROP POLICY IF EXISTS "Staff can delete services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can create services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete services" ON public.services FOR DELETE USING (true);

-- Settings
DROP POLICY IF EXISTS "Staff can view settings" ON public.settings;
DROP POLICY IF EXISTS "Staff can create settings" ON public.settings;
DROP POLICY IF EXISTS "Staff can update settings" ON public.settings;
DROP POLICY IF EXISTS "Staff can delete settings" ON public.settings;
CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can create settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete settings" ON public.settings FOR DELETE USING (true);

-- Shop Sale Items
DROP POLICY IF EXISTS "Staff can view shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can create shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can update shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can delete shop_sale_items" ON public.shop_sale_items;
CREATE POLICY "Anyone can view shop_sale_items" ON public.shop_sale_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create shop_sale_items" ON public.shop_sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shop_sale_items" ON public.shop_sale_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete shop_sale_items" ON public.shop_sale_items FOR DELETE USING (true);

-- Shop Sales
DROP POLICY IF EXISTS "Staff can view shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can create shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can update shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can delete shop_sales" ON public.shop_sales;
CREATE POLICY "Anyone can view shop_sales" ON public.shop_sales FOR SELECT USING (true);
CREATE POLICY "Anyone can create shop_sales" ON public.shop_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shop_sales" ON public.shop_sales FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete shop_sales" ON public.shop_sales FOR DELETE USING (true);

-- User Roles
DROP POLICY IF EXISTS "Staff can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can create user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can delete user_roles" ON public.user_roles;
CREATE POLICY "Anyone can view user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can create user_roles" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_roles" ON public.user_roles FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete user_roles" ON public.user_roles FOR DELETE USING (true);