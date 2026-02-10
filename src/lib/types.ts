export type AppRole = 'admin' | 'veterinarian' | 'registrar' | 'accountant' | 'manager' | 'viewer';

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rodent' | 'reptile' | 'fish' | 'other';

export type PetGender = 'male' | 'female' | 'unknown';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export type MovementType = 'in' | 'out' | 'adjustment' | 'sale' | 'treatment';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  position?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Client {
  id: string;
  client_number?: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  pets?: Pet[];
}

export interface Pet {
  id: string;
  client_id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  gender: PetGender;
  birth_date?: string;
  weight?: number;
  color?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ServiceCategory;
}

export interface Disease {
  id: string;
  name: string;
  description?: string;
  symptoms?: string;
  treatment_guidelines?: string;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  pet_id: string;
  veterinarian_id?: string;
  service_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  pet?: Pet;
  veterinarian?: Profile;
  service?: Service;
}

export interface MedicalRecord {
  id: string;
  pet_id: string;
  appointment_id?: string;
  veterinarian_id?: string;
  visit_date: string;
  chief_complaint?: string;
  examination_notes?: string;
  diagnosis?: string;
  treatment?: string;
  prescriptions?: string;
  lab_results?: string;
  materials_used?: string;
  doctor_notes?: string;
  weight_at_visit?: number;
  temperature?: number;
  created_at: string;
  updated_at: string;
  pet?: Pet;
  veterinarian?: Profile;
  diagnoses?: MedicalRecordDiagnosis[];
  services?: MedicalRecordService[];
}

export interface MedicalRecordDiagnosis {
  id: string;
  medical_record_id: string;
  disease_id?: string;
  custom_diagnosis?: string;
  notes?: string;
  created_at: string;
  disease?: Disease;
}

export interface MedicalRecordService {
  id: string;
  medical_record_id: string;
  service_id?: string;
  quantity: number;
  price?: number;
  notes?: string;
  created_at: string;
  service?: Service;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  category_id?: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  item?: InventoryItem;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  pet_id?: string;
  medical_record_id?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: PaymentStatus;
  notes?: string;
  issued_at: string;
  due_at?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  pet?: Pet;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  service_id?: string;
  inventory_item_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  paid_at: string;
  created_by?: string;
  created_at: string;
}

export interface ShopSale {
  id: string;
  client_id?: string;
  pet_id?: string;
  total: number;
  payment_status: PaymentStatus;
  payment_method: string;
  notes?: string;
  sold_by?: string;
  created_at: string;
  client?: Client;
  items?: ShopSaleItem[];
}

export interface ShopSaleItem {
  id: string;
  sale_id: string;
  item_id?: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  item?: InventoryItem;
}

export interface Feedback {
  id: string;
  client_id: string;
  appointment_id?: string;
  medical_record_id?: string;
  rating?: number;
  comment?: string;
  status: string;
  response?: string;
  responded_at?: string;
  responded_by?: string;
  created_at: string;
  client?: Client;
}

export interface Notification {
  id: string;
  client_id?: string;
  appointment_id?: string;
  type: string;
  title: string;
  message?: string;
  channel: string;
  is_sent: boolean;
  sent_at?: string;
  scheduled_for?: string;
  created_at: string;
}

export interface DashboardStats {
  totalClients: number;
  totalPets: number;
  todayAppointments: number;
  monthlyRevenue: number;
}

// Species translations
export const speciesLabels: Record<PetSpecies, string> = {
  dog: 'Собака',
  cat: 'Кошка',
  bird: 'Птица',
  rodent: 'Грызун',
  reptile: 'Рептилия',
  fish: 'Рыба',
  other: 'Другое'
};

// Gender translations
export const genderLabels: Record<PetGender, string> = {
  male: 'Самец',
  female: 'Самка',
  unknown: 'Неизвестно'
};

// Status translations
export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Запланировано',
  confirmed: 'Подтверждено',
  in_progress: 'В процессе',
  completed: 'Завершено',
  cancelled: 'Отменено',
  no_show: 'Не явился'
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Ожидает',
  partial: 'Частично',
  paid: 'Оплачено',
  refunded: 'Возврат',
  cancelled: 'Отменено'
};

// Role translations
export const roleLabels: Record<AppRole, string> = {
  admin: 'Администратор',
  veterinarian: 'Ветеринар',
  registrar: 'Регистратор',
  accountant: 'Бухгалтер',
  manager: 'Менеджер',
  viewer: 'Просмотр'
};
