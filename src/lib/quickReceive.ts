import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyError } from '@/lib/errorHandler';

/**
 * Создаёт визит со статусом "На приёме" прямо сейчас и возвращает его id.
 * Используется кнопкой «Принять сейчас» в карточках питомца/клиента.
 */
export async function startQuickReceive(petId: string, clientId: string): Promise<string> {
  const now = new Date().toISOString();
  const { data: { user } } = await supabase.auth.getUser();

  // Попробуем подтянуть профиль текущего пользователя как врача (если он врач)
  let vetProfileId: string | null = null;
  if (user) {
    const { data: vetRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('role', 'veterinarian')
      .maybeSingle();
    if (vetRole) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      vetProfileId = prof?.id || null;
    }
  }

  // 1. Создаём appointment (для занятости в календаре)
  const { data: apt, error: aptErr } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      pet_id: petId,
      veterinarian_id: vetProfileId,
      scheduled_at: now,
      duration_minutes: 30,
      status: 'in_progress',
      notes: 'Быстрый приём',
    })
    .select('id')
    .single();
  if (aptErr) throw new Error(getUserFriendlyError(aptErr));

  // 2. Получаем/создаём медкарту питомца
  const { data: mrId, error: mrErr } = await supabase.rpc('ensure_pet_medical_record', { _pet_id: petId });
  if (mrErr) throw new Error(getUserFriendlyError(mrErr));

  // 3. Создаём visit со статусом in_consultation
  const { data: visit, error: visitErr } = await supabase
    .from('visits')
    .insert({
      client_id: clientId,
      pet_id: petId,
      veterinarian_id: vetProfileId,
      visit_date: now,
      status: 'in_consultation',
      appointment_id: apt.id,
      medical_record_id: mrId as string,
    })
    .select('id')
    .single();
  if (visitErr) throw new Error(getUserFriendlyError(visitErr));

  return visit.id;
}
