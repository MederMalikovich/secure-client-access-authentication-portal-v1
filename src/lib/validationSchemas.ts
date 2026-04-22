import { z } from 'zod';

export const clientSchema = z.object({
  full_name: z.string()
    .min(2, 'Минимум 2 символа')
    .max(100, 'Максимум 100 символов'),
  phone: z.string()
    .min(5, 'Минимум 5 символов')
    .max(20, 'Максимум 20 символов'),
  email: z.string()
    .email('Некорректный email')
    .max(100, 'Максимум 100 символов')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Максимум 500 символов').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
});

export const petSchema = z.object({
  name: z.string().min(1, 'Введите кличку').max(100, 'Максимум 100 символов'),
  client_id: z.string().uuid('Выберите владельца'),
  species: z.string(),
  gender: z.string(),
  breed: z.string().max(100, 'Максимум 100 символов').optional().or(z.literal('')),
  color: z.string().max(50, 'Максимум 50 символов').optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  weight: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
});

export const medicalRecordSchema = z.object({
  pet_id: z.string().uuid('Выберите питомца'),
  veterinarian_id: z.string().optional().or(z.literal('')),
  visit_date: z.string().min(1, 'Укажите дату'),
  chief_complaint: z.string().max(500, 'Максимум 500 символов').optional().or(z.literal('')),
  examination_notes: z.string().max(5000, 'Максимум 5000 символов').optional().or(z.literal('')),
  diagnosis: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  treatment: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  prescriptions: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  lab_results: z.string().max(5000, 'Максимум 5000 символов').optional().or(z.literal('')),
  anamnesis: z.string().max(5000, 'Максимум 5000 символов').optional().or(z.literal('')),
  clinical_findings: z.string().max(5000, 'Максимум 5000 символов').optional().or(z.literal('')),
  vaccination_status: z.string().max(1000, 'Максимум 1000 символов').optional().or(z.literal('')),
  allergy_notes: z.string().max(1000, 'Максимум 1000 символов').optional().or(z.literal('')),
  follow_up_plan: z.string().max(3000, 'Максимум 3000 символов').optional().or(z.literal('')),
  owner_recommendations: z.string().max(3000, 'Максимум 3000 символов').optional().or(z.literal('')),
  next_visit_date: z.string().optional().or(z.literal('')),
  materials_used: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  doctor_notes: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  weight_at_visit: z.string().optional().or(z.literal('')),
  temperature: z.string().optional().or(z.literal('')),
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Введите название').max(200, 'Максимум 200 символов'),
  description: z.string().max(1000, 'Максимум 1000 символов').optional().or(z.literal('')),
  price: z.number().min(0, 'Цена не может быть отрицательной'),
  category_id: z.string().optional().or(z.literal('')),
});

export const feedbackSchema = z.object({
  client_id: z.string().uuid('Выберите клиента'),
  comment: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  rating: z.string().optional().or(z.literal('')),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Введите название').max(200, 'Максимум 200 символов'),
  sku: z.string().max(50, 'Максимум 50 символов').optional().or(z.literal('')),
  description: z.string().max(1000, 'Максимум 1000 символов').optional().or(z.literal('')),
  quantity: z.number().min(0),
  min_quantity: z.number().min(0).optional(),
  purchase_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  unit: z.string().max(20).optional().or(z.literal('')),
  category_id: z.string().optional().or(z.literal('')),
});

export const appointmentSchema = z.object({
  client_id: z.string().uuid('Выберите клиента'),
  pet_id: z.string().uuid('Выберите питомца'),
  scheduled_at: z.string().min(1, 'Укажите дату'),
  notes: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  veterinarian_id: z.string().optional().or(z.literal('')),
  service_id: z.string().optional().or(z.literal('')),
  duration_minutes: z.string().optional(),
  status: z.string().optional(),
});

export const diseaseSchema = z.object({
  name: z.string().min(1, 'Введите название').max(200, 'Максимум 200 символов'),
  description: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  symptoms: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  treatment_guidelines: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export const invoiceSchema = z.object({
  client_id: z.string().uuid('Выберите клиента'),
  subtotal: z.string().min(1, 'Укажите сумму'),
  discount: z.string().optional().or(z.literal('')),
  tax: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
});

export function getValidationError<T>(schema: z.ZodSchema<T>, data: unknown): string | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Ошибка валидации';
}

export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return { success: false as const, error: result.error.errors[0]?.message || 'Ошибка валидации' };
}
