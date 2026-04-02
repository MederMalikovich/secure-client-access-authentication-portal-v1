import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Send, Instagram } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyError } from '@/lib/errorHandler';

interface Props {
  clientId: string;
}

const channelLabels: Record<string, { label: string; icon: any }> = {
  email: { label: 'Email', icon: Mail },
  telegram: { label: 'Telegram', icon: Send },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  instagram: { label: 'Instagram', icon: Instagram },
};

export function ClientNotificationPreferences({ clientId }: Props) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabledChannels, setEnabledChannels] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prefsRes, channelsRes] = await Promise.all([
        supabase
          .from('client_notification_preferences')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle(),
        supabase
          .from('notification_channel_config')
          .select('channel, is_enabled')
          .eq('is_enabled', true),
      ]);

      setEnabledChannels((channelsRes.data || []).map((c: any) => c.channel));

      if (prefsRes.data) {
        setPrefs(prefsRes.data);
      } else {
        setPrefs({
          client_id: clientId,
          preferred_channel: 'email',
          telegram_chat_id: '',
          whatsapp_number: '',
          instagram_username: '',
          email_notifications: true,
          telegram_notifications: false,
          whatsapp_notifications: false,
          instagram_notifications: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        preferred_channel: prefs.preferred_channel,
        telegram_chat_id: prefs.telegram_chat_id || null,
        whatsapp_number: prefs.whatsapp_number || null,
        instagram_username: prefs.instagram_username || null,
        email_notifications: prefs.email_notifications,
        telegram_notifications: prefs.telegram_notifications,
        whatsapp_notifications: prefs.whatsapp_notifications,
        instagram_notifications: prefs.instagram_notifications,
      };

      const { error } = await supabase
        .from('client_notification_preferences')
        .upsert(payload, { onConflict: 'client_id' });

      if (error) throw error;
      toast({ title: 'Успешно', description: 'Настройки уведомлений сохранены' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return <div className="text-sm text-muted-foreground py-2">Загрузка...</div>;
  }

  if (enabledChannels.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Каналы уведомлений не настроены. Включите их в Настройках → Уведомления.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs font-medium">Основной канал</Label>
          <Select
            value={prefs.preferred_channel}
            onValueChange={v => setPrefs({ ...prefs, preferred_channel: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enabledChannels.map(ch => {
                const meta = channelLabels[ch];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <SelectItem key={ch} value={ch}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {enabledChannels.includes('telegram') && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Telegram Chat ID</Label>
              <Switch
                checked={prefs.telegram_notifications}
                onCheckedChange={v => setPrefs({ ...prefs, telegram_notifications: v })}
              />
            </div>
            <Input
              placeholder="123456789"
              value={prefs.telegram_chat_id || ''}
              onChange={e => setPrefs({ ...prefs, telegram_chat_id: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        )}

        {enabledChannels.includes('whatsapp') && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">WhatsApp номер</Label>
              <Switch
                checked={prefs.whatsapp_notifications}
                onCheckedChange={v => setPrefs({ ...prefs, whatsapp_notifications: v })}
              />
            </div>
            <Input
              placeholder="+79991234567"
              value={prefs.whatsapp_number || ''}
              onChange={e => setPrefs({ ...prefs, whatsapp_number: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        )}

        {enabledChannels.includes('instagram') && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Instagram</Label>
              <Switch
                checked={prefs.instagram_notifications}
                onCheckedChange={v => setPrefs({ ...prefs, instagram_notifications: v })}
              />
            </div>
            <Input
              placeholder="@username"
              value={prefs.instagram_username || ''}
              onChange={e => setPrefs({ ...prefs, instagram_username: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        )}

        {enabledChannels.includes('email') && (
          <div className="flex items-center justify-between">
            <Label className="text-xs">Email уведомления</Label>
            <Switch
              checked={prefs.email_notifications}
              onCheckedChange={v => setPrefs({ ...prefs, email_notifications: v })}
            />
          </div>
        )}
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </Button>
    </div>
  );
}
