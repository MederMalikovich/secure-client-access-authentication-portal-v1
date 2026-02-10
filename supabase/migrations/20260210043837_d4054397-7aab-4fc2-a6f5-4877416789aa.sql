-- Drop all restrictive role-based policies and keep only permissive public ones

-- Appointments
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;

-- Clients
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can create clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;

-- Diseases
DROP POLICY IF EXISTS "Admins can delete diseases" ON public.diseases;
DROP POLICY IF EXISTS "Staff can view diseases" ON public.diseases;
DROP POLICY IF EXISTS "Vets can manage diseases" ON public.diseases;
DROP POLICY IF EXISTS "Vets can update diseases" ON public.diseases;

-- Feedback
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Staff can view feedback" ON public.feedback;

-- Inventory Categories
DROP POLICY IF EXISTS "Admins can delete inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can manage inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can update inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Staff can view inventory categories" ON public.inventory_categories;

-- Inventory Items
DROP POLICY IF EXISTS "Admins can delete inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can manage inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can update inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can view inventory items" ON public.inventory_items;

-- Inventory Movements
DROP POLICY IF EXISTS "Admins can delete inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can create inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can update inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Staff can view inventory movements" ON public.inventory_movements;

-- Invoice Items
DROP POLICY IF EXISTS "Admins can delete invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can create invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can view invoice items" ON public.invoice_items;

-- Invoices
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;

-- Medical Record Diagnoses
DROP POLICY IF EXISTS "Admins can delete medical record diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Staff can view medical record diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Vets can create medical record diagnoses" ON public.medical_record_diagnoses;
DROP POLICY IF EXISTS "Vets can update medical record diagnoses" ON public.medical_record_diagnoses;

-- Medical Record Services
DROP POLICY IF EXISTS "Admins can delete medical record services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Staff can view medical record services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Vets can create medical record services" ON public.medical_record_services;
DROP POLICY IF EXISTS "Vets can update medical record services" ON public.medical_record_services;

-- Medical Records
DROP POLICY IF EXISTS "Admins can delete medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Staff can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Vets can create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Vets can update medical records" ON public.medical_records;

-- Notifications
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can view notifications" ON public.notifications;

-- Payments
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;

-- Pets
DROP POLICY IF EXISTS "Admins can delete pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can create pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can update pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can view pets" ON public.pets;

-- Profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Service Categories
DROP POLICY IF EXISTS "Admins can delete service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admins can update service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff can view service categories" ON public.service_categories;

-- Services
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins/managers can manage services" ON public.services;
DROP POLICY IF EXISTS "Staff can view services" ON public.services;

-- Settings
DROP POLICY IF EXISTS "Authenticated can view settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Staff can view settings" ON public.settings;

-- Shop Sale Items
DROP POLICY IF EXISTS "Admins can delete shop sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can create shop sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can manage sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can update shop sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can view sale items" ON public.shop_sale_items;
DROP POLICY IF EXISTS "Staff can view shop sale items" ON public.shop_sale_items;

-- Shop Sales
DROP POLICY IF EXISTS "Admins can delete shop sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can create shop sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can update shop sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Staff can view shop sales" ON public.shop_sales;

-- User Roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;