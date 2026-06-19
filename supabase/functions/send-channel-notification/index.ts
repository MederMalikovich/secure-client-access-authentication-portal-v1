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

  try {
    const { client_id, title, message, channel_override } = await req.json()

    if (!client_id || !title) {
      return new Response(
        JSON.stringify({ error: 'client_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('id, full_name, phone, email')
      .eq('id', client_id)
      .single()

    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client notification preferences
    const { data: prefs } = await supabase
      .from('client_notification_preferences')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle()

    // Get enabled channel configs
    const { data: channelConfigs } = await supabase
      .from('notification_channel_config')
      .select('*')
      .eq('is_enabled', true)

    const enabledChannels = new Map(
      (channelConfigs || []).map((c: any) => [c.channel, c.config])
    )

    const results: Record<string, { sent: boolean; error?: string }> = {}

    // Determine which channels to use
    const channelsToSend: string[] = []

    if (channel_override) {
      channelsToSend.push(channel_override)
    } else if (prefs) {
      if (prefs.email_notifications && enabledChannels.has('email') && client.email) {
        channelsToSend.push('email')
      }
      if (prefs.telegram_notifications && enabledChannels.has('telegram') && prefs.telegram_chat_id) {
        channelsToSend.push('telegram')
      }
      if (prefs.whatsapp_notifications && enabledChannels.has('whatsapp') && prefs.whatsapp_number) {
        channelsToSend.push('whatsapp')
      }
    } else {
      // Default: try email if available
      if (enabledChannels.has('email') && client.email) {
        channelsToSend.push('email')
      }
    }

    for (const channel of channelsToSend) {
      try {
        switch (channel) {
          case 'telegram': {
            const config = enabledChannels.get('telegram') as any
            const botToken = config?.bot_token
            const chatId = prefs?.telegram_chat_id

            if (!botToken || !chatId) {
              results.telegram = { sent: false, error: 'Missing bot_token or chat_id' }
              break
            }

            // Check for connector (TELEGRAM_API_KEY)
            const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
            const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')

            let telegramResponse: Response

            if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
              // Use connector gateway
              telegramResponse = await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'X-Connection-Api-Key': TELEGRAM_API_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `🏥 *${title}*\n\n${message || ''}`,
                  parse_mode: 'Markdown',
                }),
              })
            } else {
              // Direct API call with bot token from config
              telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `🏥 *${title}*\n\n${message || ''}`,
                  parse_mode: 'Markdown',
                }),
              })
            }

            const tgResult = await telegramResponse.json()
            results.telegram = telegramResponse.ok
              ? { sent: true }
              : { sent: false, error: JSON.stringify(tgResult) }
            break
          }

          case 'whatsapp': {
            const config = enabledChannels.get('whatsapp') as any
            const provider = config?.provider || 'meta'
            const whatsappNumber = prefs?.whatsapp_number

            if (!whatsappNumber) {
              results.whatsapp = { sent: false, error: 'Missing whatsapp_number in client preferences' }
              break
            }

            if (provider === 'meta') {
              const phoneId = config?.meta_phone_number_id
              const token = Deno.env.get('WHATSAPP_META_TOKEN')
              if (!phoneId || !token) {
                results.whatsapp = { sent: false, error: 'Missing meta_phone_number_id or WHATSAPP_META_TOKEN secret' }
                break
              }
              const to = whatsappNumber.replace(/[^0-9]/g, '')
              const templateName = config?.meta_template_name
              const body = templateName
                ? {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'template',
                    template: {
                      name: templateName,
                      language: { code: 'ru' },
                      components: [
                        { type: 'body', parameters: [
                          { type: 'text', text: title },
                          { type: 'text', text: message || '' },
                        ] },
                      ],
                    },
                  }
                : {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'text',
                    text: { body: `🏥 *${title}*\n\n${message || ''}` },
                  }

              const waResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
              })
              const waResult = await waResponse.json()
              results.whatsapp = waResponse.ok
                ? { sent: true }
                : { sent: false, error: JSON.stringify(waResult) }
              break
            }

            // Twilio fallback
            const twilioFrom = config?.twilio_from
            if (!twilioFrom) {
              results.whatsapp = { sent: false, error: 'Missing twilio_from' }
              break
            }
            const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
            const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY')
            if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
              results.whatsapp = { sent: false, error: 'Twilio connector not configured' }
              break
            }
            const waResponse = await fetch('https://connector-gateway.lovable.dev/twilio/Messages.json', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TWILIO_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: `whatsapp:${whatsappNumber}`,
                From: `whatsapp:${twilioFrom}`,
                Body: `🏥 ${title}\n\n${message || ''}`,
              }),
            })
            const waResult = await waResponse.json()
            results.whatsapp = waResponse.ok
              ? { sent: true }
              : { sent: false, error: JSON.stringify(waResult) }
            break
          }

          case 'email': {
            // Log for now - email integration can be set up via Lovable Emails
            results.email = { sent: false, error: 'Email sending requires email domain setup. Use Lovable Cloud Emails.' }
            break
          }

          case 'instagram': {
            results.instagram = { sent: false, error: 'Instagram DM API not yet implemented' }
            break
          }
        }
      } catch (err) {
        results[channel] = { sent: false, error: String(err) }
      }
    }

    return new Response(JSON.stringify({ success: true, results, channelsAttempted: channelsToSend }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
