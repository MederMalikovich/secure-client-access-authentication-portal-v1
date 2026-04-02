
-- Table for notification channel configuration (global settings)
CREATE TABLE public.notification_channel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL UNIQUE CHECK (channel IN ('email', 'telegram', 'whatsapp', 'instagram')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default channels
INSERT INTO public.notification_channel_config (channel, is_enabled) VALUES
  ('email', false),
  ('telegram', false),
  ('whatsapp', false),
  ('instagram', false);

-- Table for client notification preferences
CREATE TABLE public.client_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  preferred_channel TEXT NOT NULL DEFAULT 'email' CHECK (preferred_channel IN ('email', 'telegram', 'whatsapp', 'instagram')),
  telegram_chat_id TEXT,
  whatsapp_number TEXT,
  instagram_username TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  telegram_notifications BOOLEAN NOT NULL DEFAULT false,
  whatsapp_notifications BOOLEAN NOT NULL DEFAULT false,
  instagram_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

-- RLS
ALTER TABLE public.notification_channel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Channel config: admin/manager can manage, authenticated can read
CREATE POLICY "Authenticated users can view channel config"
  ON public.notification_channel_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage channel config"
  ON public.notification_channel_config FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

-- Client preferences: staff can manage
CREATE POLICY "Staff can view client notification preferences"
  ON public.client_notification_preferences FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage client notification preferences"
  ON public.client_notification_preferences FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'registrar']::app_role[]));

-- Updated_at triggers
CREATE TRIGGER update_notification_channel_config_updated_at
  BEFORE UPDATE ON public.notification_channel_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_notification_preferences_updated_at
  BEFORE UPDATE ON public.client_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
