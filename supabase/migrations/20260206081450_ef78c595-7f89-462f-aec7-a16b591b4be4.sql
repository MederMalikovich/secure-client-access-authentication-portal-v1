-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'veterinarian', 'registrar', 'accountant', 'manager', 'viewer');

-- User roles table for RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    position TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clients table (pet owners)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pet species enum
CREATE TYPE public.pet_species AS ENUM ('dog', 'cat', 'bird', 'rodent', 'reptile', 'fish', 'other');

-- Pet gender enum  
CREATE TYPE public.pet_gender AS ENUM ('male', 'female', 'unknown');

-- Pets table
CREATE TABLE public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    species pet_species NOT NULL DEFAULT 'dog',
    breed TEXT,
    gender pet_gender NOT NULL DEFAULT 'unknown',
    birth_date DATE,
    weight DECIMAL(6,2),
    color TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service categories
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Diseases catalog
CREATE TABLE public.diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    symptoms TEXT,
    treatment_guidelines TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointment status enum
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    veterinarian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medical records table (key module)
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    veterinarian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    chief_complaint TEXT,
    examination_notes TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescriptions TEXT,
    lab_results TEXT,
    materials_used TEXT,
    doctor_notes TEXT,
    weight_at_visit DECIMAL(6,2),
    temperature DECIMAL(4,1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medical record diagnoses (link to diseases)
CREATE TABLE public.medical_record_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE NOT NULL,
    disease_id UUID REFERENCES public.diseases(id) ON DELETE SET NULL,
    custom_diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medical record services (procedures performed)
CREATE TABLE public.medical_record_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory categories
CREATE TABLE public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory items (stock)
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    unit TEXT DEFAULT 'шт',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    sale_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory movements
CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'adjustment', 'sale', 'treatment');

CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
    movement_type movement_type NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded', 'cancelled');

-- Invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice items
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shop sales (separate from medical)
CREATE TABLE public.shop_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    sold_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shop sale items
CREATE TABLE public.shop_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.shop_sales(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client feedback/reviews
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status TEXT DEFAULT 'new',
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications/reminders
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    channel TEXT DEFAULT 'email',
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for clients (most roles can access)
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage clients" ON public.clients FOR ALL TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);

-- RLS Policies for pets
CREATE POLICY "Authenticated users can view pets" ON public.pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage pets" ON public.pets FOR ALL TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);

-- RLS Policies for service categories
CREATE POLICY "All can view service categories" ON public.service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage service categories" ON public.service_categories FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
);

-- RLS Policies for services
CREATE POLICY "All can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/managers can manage services" ON public.services FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
);

-- RLS Policies for diseases
CREATE POLICY "All can view diseases" ON public.diseases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Vets/admins can manage diseases" ON public.diseases FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[])
);

-- RLS Policies for appointments
CREATE POLICY "Authenticated can view appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage appointments" ON public.appointments FOR ALL TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);

-- RLS Policies for medical records
CREATE POLICY "Staff can view medical records" ON public.medical_records FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);
CREATE POLICY "Vets/admins can manage medical records" ON public.medical_records FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[])
);

-- RLS Policies for medical record diagnoses
CREATE POLICY "Staff can view diagnoses" ON public.medical_record_diagnoses FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);
CREATE POLICY "Vets can manage diagnoses" ON public.medical_record_diagnoses FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[])
);

-- RLS Policies for medical record services
CREATE POLICY "Staff can view record services" ON public.medical_record_services FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian', 'registrar', 'manager']::app_role[])
);
CREATE POLICY "Vets can manage record services" ON public.medical_record_services FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'veterinarian']::app_role[])
);

-- RLS Policies for inventory
CREATE POLICY "Staff can view inventory categories" ON public.inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage inventory categories" ON public.inventory_categories FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
);

CREATE POLICY "Staff can view inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage inventory" ON public.inventory_items FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'veterinarian']::app_role[])
);

CREATE POLICY "Staff can view movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create movements" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'veterinarian']::app_role[])
);

-- RLS Policies for financial
CREATE POLICY "Finance staff can view invoices" ON public.invoices FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager', 'registrar']::app_role[])
);
CREATE POLICY "Finance staff can manage invoices" ON public.invoices FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager']::app_role[])
);

CREATE POLICY "Finance staff can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager', 'registrar']::app_role[])
);
CREATE POLICY "Finance staff can manage invoice items" ON public.invoice_items FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager']::app_role[])
);

CREATE POLICY "Finance staff can view payments" ON public.payments FOR SELECT TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager', 'registrar']::app_role[])
);
CREATE POLICY "Finance staff can manage payments" ON public.payments FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'accountant', 'manager']::app_role[])
);

-- RLS Policies for shop
CREATE POLICY "Staff can view shop sales" ON public.shop_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage shop sales" ON public.shop_sales FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[])
);

CREATE POLICY "Staff can view sale items" ON public.shop_sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage sale items" ON public.shop_sale_items FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[])
);

-- RLS Policies for feedback
CREATE POLICY "Staff can view feedback" ON public.feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage feedback" ON public.feedback FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
);

-- RLS Policies for notifications
CREATE POLICY "Staff can view notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage notifications" ON public.notifications FOR ALL USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[])
);

-- RLS Policies for settings
CREATE POLICY "Authenticated can view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage settings" ON public.settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile and assign admin role for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    -- Check if this is the first user
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    
    -- First user gets admin role, others get viewer
    IF user_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    current_year TEXT;
    seq_number INTEGER;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
    INTO seq_number
    FROM public.invoices
    WHERE invoice_number LIKE current_year || '-%';
    
    new_number := current_year || '-' || LPAD(seq_number::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;