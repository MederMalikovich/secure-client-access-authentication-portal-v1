
-- Add columns to notifications for in-app notification system
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_role text,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info';

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Allow staff to read notifications targeted to their role
-- (existing policies already cover staff SELECT)
