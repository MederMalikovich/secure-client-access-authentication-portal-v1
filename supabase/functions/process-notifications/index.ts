import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const results = {
    appointmentReminders: 0,
    lowStockAlerts: 0,
    followUpReminders: 0,
    customReminders: 0,
  }

  try {
    // 1. APPOINTMENT REMINDERS (24h before)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: upcomingApts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, client_id, pet_id, client:clients(full_name, phone), pet:pets(name), service:services(name)')
      .gte('scheduled_at', tomorrow.toISOString())
      .lt('scheduled_at', tomorrowEnd.toISOString())
      .in('status', ['scheduled', 'confirmed'])

    for (const apt of upcomingApts || []) {
      // Check if reminder already exists
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', apt.id)
        .eq('type', 'appointment_reminder')
        .limit(1)

      if (!existing?.length) {
        const clientName = (apt.client as any)?.full_name || 'Клиент'
        const petName = (apt.pet as any)?.name || 'питомец'
        const serviceName = (apt.service as any)?.name || 'приём'
        const time = new Date(apt.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        const date = new Date(apt.scheduled_at).toLocaleDateString('ru-RU')

        await supabase.from('notifications').insert({
          client_id: apt.client_id,
          appointment_id: apt.id,
          type: 'appointment_reminder',
          title: `Напоминание о приёме: ${clientName}`,
          message: `${petName} — ${serviceName}, ${date} в ${time}`,
          channel: 'in_app',
          is_sent: true,
          sent_at: now.toISOString(),
          scheduled_for: apt.scheduled_at,
          target_role: 'registrar',
          severity: 'info',
        })
        results.appointmentReminders++
      }
    }

    // 2. LOW STOCK ALERTS
    const { data: lowStockItems } = await supabase
      .from('inventory_items')
      .select('id, name, quantity, min_quantity, unit')
      .eq('is_active', true)
      .not('min_quantity', 'is', null)

    for (const item of lowStockItems || []) {
      if (Number(item.quantity) <= Number(item.min_quantity)) {
        // Check if alert already sent today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'low_stock')
          .ilike('title', `%${item.name}%`)
          .gte('created_at', todayStart.toISOString())
          .limit(1)

        if (!existing?.length) {
          await supabase.from('notifications').insert({
            type: 'low_stock',
            title: `Низкий остаток: ${item.name}`,
            message: `Осталось ${item.quantity} ${item.unit || 'шт'} (мин: ${item.min_quantity})`,
            channel: 'in_app',
            is_sent: true,
            sent_at: now.toISOString(),
            target_role: 'manager',
            severity: 'warning',
          })
          results.lowStockAlerts++
        }
      }
    }

    // 3. FOLLOW-UP / VACCINATION REMINDERS
    // Check medical records from ~11 months ago that might need annual follow-up
    const elevenMonthsAgo = new Date(now.getTime() - 330 * 24 * 60 * 60 * 1000)
    const elevenMonthsAgoEnd = new Date(now.getTime() - 323 * 24 * 60 * 60 * 1000)

    const { data: oldRecords } = await supabase
      .from('medical_records')
      .select('id, pet_id, visit_date, diagnosis, treatment, pet:pets(name, client_id, client:clients(full_name))')
      .gte('visit_date', elevenMonthsAgo.toISOString())
      .lt('visit_date', elevenMonthsAgoEnd.toISOString())

    for (const record of oldRecords || []) {
      const pet = record.pet as any
      if (!pet) continue

      // Check if reminder already exists for this record
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'follow_up_reminder')
        .ilike('title', `%${pet.name}%`)
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (!existing?.length) {
        const clientName = pet.client?.full_name || 'Клиент'
        await supabase.from('notifications').insert({
          client_id: pet.client_id,
          type: 'follow_up_reminder',
          title: `Повторный визит: ${pet.name} (${clientName})`,
          message: `Прошло ~11 месяцев с последнего визита. Рекомендуется повторный осмотр/вакцинация.`,
          channel: 'in_app',
          is_sent: true,
          sent_at: now.toISOString(),
          target_role: 'registrar',
          severity: 'info',
        })
        results.followUpReminders++
      }
    }

    // 4. CUSTOM CLIENT REMINDERS (manual from client card)
    const { data: dueReminders } = await supabase
      .from('notifications')
      .select('id, client_id, channel, title, message')
      .eq('type', 'custom_client_reminder')
      .eq('is_sent', false)
      .not('client_id', 'is', null)
      .lte('scheduled_for', now.toISOString())

    for (const r of dueReminders || []) {
      try {
        const channelOverride = r.channel && ['whatsapp','email','telegram','instagram'].includes(r.channel)
          ? [r.channel] : undefined
        const { error: sendErr } = await supabase.functions.invoke('send-channel-notification', {
          body: {
            client_id: r.client_id,
            title: r.title || 'Напоминание',
            message: r.message || '',
            channel_override: channelOverride,
          },
        })
        await supabase.from('notifications').update({
          is_sent: true,
          sent_at: new Date().toISOString(),
          message: sendErr ? `${r.message}\n[Ошибка отправки: ${sendErr.message}]` : r.message,
        }).eq('id', r.id)
        if (!sendErr) results.customReminders++
      } catch (e) {
        console.error('Failed to send custom reminder', r.id, e)
      }
    }



    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing notifications:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
