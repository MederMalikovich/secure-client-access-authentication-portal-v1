-- =====================================================
-- SECURITY FIX: Replace public RLS policies with role-based access control
-- =====================================================

-- Drop all "Anyone can..." policies and replace with authenticated role-based policies

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can delete appointments" ON public.appointments;

CREATE POLICY "Staff can view appointments" ON public.appointments 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create appointments" ON public.appointments 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Staff can update appointments" ON public.appointments 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Admins can delete appointments" ON public.appointments 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can update clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone can delete clients" ON public.clients;

CREATE POLICY "Staff can view clients" ON public.clients 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create clients" ON public.clients 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Staff can update clients" ON public.clients 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Admins can delete clients" ON public.clients 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- DISEASES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view diseases" ON public.diseases;
DROP POLICY IF EXISTS "Anyone can insert diseases" ON public.diseases;
DROP POLICY IF EXISTS "Anyone can update diseases" ON public.diseases;
DROP POLICY IF EXISTS "Anyone can delete diseases" ON public.diseases;

CREATE POLICY "Staff can view diseases" ON public.diseases 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Vets can manage diseases" ON public.diseases 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'manager']::app_role[]));

CREATE POLICY "Vets can update diseases" ON public.diseases 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'manager']::app_role[]));

CREATE POLICY "Admins can delete diseases" ON public.diseases 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- FEEDBACK TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can delete feedback" ON public.feedback;

CREATE POLICY "Staff can view feedback" ON public.feedback 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create feedback" ON public.feedback 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Staff can update feedback" ON public.feedback 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Admins can delete feedback" ON public.feedback 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- INVENTORY_CATEGORIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Anyone can insert inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Anyone can update inventory_categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Anyone can delete inventory_categories" ON public.inventory_categories;

CREATE POLICY "Staff can view inventory categories" ON public.inventory_categories 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can manage inventory categories" ON public.inventory_categories 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Staff can update inventory categories" ON public.inventory_categories 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete inventory categories" ON public.inventory_categories 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- INVENTORY_ITEMS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can insert inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can update inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can delete inventory_items" ON public.inventory_items;

CREATE POLICY "Staff can view inventory items" ON public.inventory_items 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can manage inventory items" ON public.inventory_items 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Staff can update inventory items" ON public.inventory_items 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete inventory items" ON public.inventory_items 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- INVENTORY_MOVEMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Anyone can insert inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Anyone can update inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Anyone can delete inventory_movements" ON public.inventory_movements;

CREATE POLICY "Staff can view inventory movements" ON public.inventory_movements 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create inventory movements" ON public.inventory_movements 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'veterinarian']::app_role[]));

CREATE POLICY "Staff can update inventory movements" ON public.inventory_movements 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete inventory movements" ON public.inventory_movements 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- INVOICE_ITEMS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Anyone can insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Anyone can update invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Anyone can delete invoice_items" ON public.invoice_items;

CREATE POLICY "Staff can view invoice items" ON public.invoice_items 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create invoice items" ON public.invoice_items 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'registrar']::app_role[]));

CREATE POLICY "Staff can update invoice items" ON public.invoice_items 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete invoice items" ON public.invoice_items 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- INVOICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can delete invoices" ON public.invoices;

CREATE POLICY "Staff can view invoices" ON public.invoices 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create invoices" ON public.invoices 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'registrar']::app_role[]));

CREATE POLICY "Staff can update invoices" ON public.invoices 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete invoices" ON public.invoices 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- MEDICAL_RECORD_DIAGNOSES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Anyone can insert medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Anyone can update medical_record_diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Anyone can delete medical_record_diagnoses" ON public.medical_record_diagnoses;

CREATE POLICY "Staff can view medical record diagnoses" ON public.medical_record_diagnoses 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Vets can create medical record diagnoses" ON public.medical_record_diagnoses 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Vets can update medical record diagnoses" ON public.medical_record_diagnoses 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Admins can delete medical record diagnoses" ON public.medical_record_diagnoses 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- MEDICAL_RECORD_SERVICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Anyone can insert medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Anyone can update medical_record_services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Anyone can delete medical_record_services" ON public.medical_record_services;

CREATE POLICY "Staff can view medical record services" ON public.medical_record_services 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Vets can create medical record services" ON public.medical_record_services 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Vets can update medical record services" ON public.medical_record_services 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Admins can delete medical record services" ON public.medical_record_services 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- MEDICAL_RECORDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Anyone can insert medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Anyone can update medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Anyone can delete medical_records" ON public.medical_records;

CREATE POLICY "Staff can view medical records" ON public.medical_records 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Vets can create medical records" ON public.medical_records 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Vets can update medical records" ON public.medical_records 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[]));

CREATE POLICY "Admins can delete medical records" ON public.medical_records 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can delete notifications" ON public.notifications;

CREATE POLICY "Staff can view notifications" ON public.notifications 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create notifications" ON public.notifications 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]));

CREATE POLICY "Staff can update notifications" ON public.notifications 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]));

CREATE POLICY "Admins can delete notifications" ON public.notifications 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can delete payments" ON public.payments;

CREATE POLICY "Staff can view payments" ON public.payments 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Staff can create payments" ON public.payments 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'registrar']::app_role[]));

CREATE POLICY "Staff can update payments" ON public.payments 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete payments" ON public.payments 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- PETS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view pets" ON public.pets;
DROP POLICY IF EXISTS "Anyone can insert pets" ON public.pets;
DROP POLICY IF EXISTS "Anyone can update pets" ON public.pets;
DROP POLICY IF EXISTS "Anyone can delete pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can view pets" ON public.pets;

CREATE POLICY "Staff can view pets" ON public.pets 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Staff can create pets" ON public.pets 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Staff can update pets" ON public.pets 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[]));

CREATE POLICY "Admins can delete pets" ON public.pets 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE_CATEGORIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anyone can insert service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anyone can update service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anyone can delete service_categories" ON public.service_categories;

CREATE POLICY "Staff can view service categories" ON public.service_categories 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Admins can manage service categories" ON public.service_categories 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Admins can update service categories" ON public.service_categories 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Admins can delete service categories" ON public.service_categories 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- SERVICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "Anyone can insert services" ON public.services;
DROP POLICY IF EXISTS "Anyone can update services" ON public.services;
DROP POLICY IF EXISTS "Anyone can delete services" ON public.services;

CREATE POLICY "Staff can view services" ON public.services 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

CREATE POLICY "Admins can manage services" ON public.services 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Admins can update services" ON public.services 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Admins can delete services" ON public.services 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can delete settings" ON public.settings;

CREATE POLICY "Staff can view settings" ON public.settings 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']::app_role[]));

-- =====================================================
-- SHOP_SALE_ITEMS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Anyone can insert shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Anyone can update shop_sale_items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Anyone can delete shop_sale_items" ON public.shop_sale_items;

CREATE POLICY "Staff can view shop sale items" ON public.shop_sale_items 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'registrar']::app_role[]));

CREATE POLICY "Staff can create shop sale items" ON public.shop_sale_items 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]));

CREATE POLICY "Staff can update shop sale items" ON public.shop_sale_items 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete shop sale items" ON public.shop_sale_items 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- SHOP_SALES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Anyone can insert shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Anyone can update shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Anyone can delete shop_sales" ON public.shop_sales;

CREATE POLICY "Staff can view shop sales" ON public.shop_sales 
FOR SELECT TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant', 'registrar']::app_role[]));

CREATE POLICY "Staff can create shop sales" ON public.shop_sales 
FOR INSERT TO authenticated 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]));

CREATE POLICY "Staff can update shop sales" ON public.shop_sales 
FOR UPDATE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'accountant']::app_role[]));

CREATE POLICY "Admins can delete shop sales" ON public.shop_sales 
FOR DELETE TO authenticated 
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- =====================================================
-- USER_ROLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can delete user_roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));