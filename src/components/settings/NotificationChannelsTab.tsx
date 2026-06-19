import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Send, Instagram, Settings2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyError } from '@/lib/errorHandler';

interface ChannelConfig {
  id: string;
  channel: string;
  is_enabled: boolean;
  config: any;
}

const channelMeta: Record<string, { icon: any; label: string; color: string; description: string }> = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-500',
    description: 'Отправка уведомлений на электронную почту клиента',
  },
  telegram: {
    icon: Send,
    label: 'Telegram',
    color: 'text-sky-500',
    description: 'Уведомления через Telegram-бота',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp Business',
    color: 'text-green-500',
    description: 'Уведомления через WhatsApp Business — Meta Cloud API или Twilio',
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-pink-500',
    description: 'Уведомления через Instagram Direct (требует Meta Business API)',
  },
};

export function NotificationChannelsTab() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_channel_config')
        .select('*')
        .order('channel');
      if (error) throw error;
      setChannels(data || []);
      
      const configs: Record<string, Record<string, string>> = {};
      (data || []).forEach((ch: any) => {
        configs[ch.channel] = ch.config || {};
      });
      setEditConfig(configs);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить настройки каналов' });
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channel: ChannelConfig) => {
    try {
      const { error } = await supabase
        .from('notification_channel_config')
        .update({ is_enabled: !channel.is_enabled })
        .eq('id', channel.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: `${channelMeta[channel.channel]?.label} ${!channel.is_enabled ? 'включён' : 'выключен'}` });
      fetchChannels();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const saveConfig = async (channelName: string) => {
    setSaving(channelName);
    try {
      const channel = channels.find(c => c.channel === channelName);
      if (!channel) return;

      const { error } = await supabase
        .from('notification_channel_config')
        .update({ config: editConfig[channelName] || {} })
        .eq('id', channel.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Настройки сохранены' });
      fetchChannels();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    } finally {
      setSaving(null);
    }
  };

  const updateConfigField = (channel: string, field: string, value: string) => {
    setEditConfig(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value },
    }));
  };

  const renderConfigFields = (channelName: string) => {
    const config = editConfig[channelName] || {};

    switch (channelName) {
      case 'email':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-xs">Email отправителя</Label>
              <Input
                placeholder="noreply@vetclinic.ru"
                value={config.sender_email || ''}
                onChange={e => updateConfigField('email', 'sender_email', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Имя отправителя</Label>
              <Input
                placeholder="VetCRM Клиника"
                value={config.sender_name || ''}
                onChange={e => updateConfigField('email', 'sender_name', e.target.value)}
              />
            </div>
          </div>
        );

      case 'telegram':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-xs">Bot Token</Label>
              <Input
                type="password"
                placeholder="123456:ABC-DEF..."
                value={config.bot_token || ''}
                onChange={e => updateConfigField('telegram', 'bot_token', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Получите токен у @BotFather в Telegram
              </p>
            </div>
          </div>
        );

      case 'whatsapp':
        return (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label className="text-xs">Номер Twilio (From)</Label>
              <Input
                placeholder="+14155238886"
                value={config.twilio_from || ''}
                onChange={e => updateConfigField('whatsapp', 'twilio_from', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Номер WhatsApp из аккаунта Twilio
              </p>
            </div>
          </div>
        );

      case 'instagram':
        return (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                ⚠️ Instagram Direct API требует верификации через Meta Business Suite. 
                Интеграция доступна в ограниченном режиме.
              </p>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Instagram Business Account ID</Label>
              <Input
                placeholder="17841400..."
                value={config.account_id || ''}
                onChange={e => updateConfigField('instagram', 'account_id', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="glass animate-pulse">
            <CardContent className="p-6 h-40" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {channels.map(channel => {
          const meta = channelMeta[channel.channel];
          if (!meta) return null;
          const Icon = meta.icon;

          return (
            <Card key={channel.id} className="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                    {meta.label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {channel.is_enabled ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Активен
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Выключен
                      </Badge>
                    )}
                    <Switch
                      checked={channel.is_enabled}
                      onCheckedChange={() => toggleChannel(channel)}
                    />
                  </div>
                </div>
                <CardDescription className="text-xs">{meta.description}</CardDescription>
              </CardHeader>

              {channel.is_enabled && (
                <CardContent className="pt-0 space-y-3">
                  {renderConfigFields(channel.channel)}
                  <Button
                    size="sm"
                    onClick={() => saveConfig(channel.channel)}
                    disabled={saving === channel.channel}
                  >
                    <Settings2 className="h-4 w-4 mr-1.5" />
                    {saving === channel.channel ? 'Сохранение...' : 'Сохранить настройки'}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="glass">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Как это работает:</strong> Включите нужные каналы и настройте их. 
            Затем в карточке каждого клиента можно указать предпочтительный канал уведомлений и контактные данные. 
            Система автоматически отправит напоминания о приёмах, результаты анализов и другие уведомления через выбранный канал.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
