import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bell, MessageCircle, Mail, Trash2, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyError } from '@/lib/errorHandler';

interface Props {
  clientId: string;
  clientName?: string;
}

type Channel = 'whatsapp' | 'email';

export function ClientReminders({ clientId, clientName }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  })();

  const [scheduledFor, setScheduledFor] = useState(defaultDate);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [title, setTitle] = useState('Напоминание из клиники');
  const [message, setMessage] = useState('');

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)
      .eq('type', 'custom_client_reminder')
      .order('scheduled_for', { ascending: false })
      .limit(50);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [clientId]);

  const handleCreate = async () => {
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Введите текст сообщения' });
      return;
    }
    if (!scheduledFor) {
      toast({ variant: 'destructive', title: 'Выберите дату' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'custom_client_reminder',
        title: title.trim() || 'Напоминание клиенту',
        message: message.trim(),
        channel,
        scheduled_for: new Date(scheduledFor).toISOString(),
        is_sent: false,
        target_role: 'registrar',
        severity: 'info',
      });
      if (error) throw error;
      toast({ title: 'Напоминание запланировано', description: `${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} • ${format(new Date(scheduledFor), 'd MMM HH:mm', { locale: ru })}` });
      setMessage('');
      setShowForm(false);
      fetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
      return;
    }
    fetch();
  };

  const upcoming = items.filter(i => !i.is_sent);
  const past = items.filter(i => i.is_sent);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Напоминания клиенту</h3>
        </div>
        <Button size="sm" variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {showForm ? 'Закрыть' : 'Запланировать'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Дата и время отправки</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Канал</Label>
                <Select value={channel} onValueChange={(v: Channel) => setChannel(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</span>
                    </SelectItem>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Заголовок</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Сообщение</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Напр.: ${clientName || 'Здравствуйте'}, напоминаем о вакцинации питомца на этой неделе.`}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Сохранение...' : 'Запланировать'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Сообщение будет отправлено автоматически в указанное время через выбранный канал.
              Убедитесь, что в карточке клиента указан соответствующий контакт.
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground py-4">Загрузка...</div>
      ) : (
        <>
          {upcoming.length === 0 && past.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Нет запланированных напоминаний</p>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Запланированы</p>
              {upcoming.map(n => (
                <ReminderRow key={n.id} item={n} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Отправлены</p>
              {past.slice(0, 10).map(n => (
                <ReminderRow key={n.id} item={n} onDelete={handleDelete} sent />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ item, onDelete, sent }: { item: any; onDelete: (id: string) => void; sent?: boolean }) {
  const ChannelIcon = item.channel === 'whatsapp' ? MessageCircle : item.channel === 'email' ? Mail : Bell;
  return (
    <Card className="bg-card/40">
      <CardContent className="p-3 flex items-start gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${sent ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
          {sent ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1">
              <ChannelIcon className="h-3 w-3" />
              {item.channel}
            </Badge>
          </div>
          {item.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>}
          <p className="text-[11px] text-muted-foreground mt-1">
            {item.scheduled_for ? format(new Date(item.scheduled_for), 'd MMM yyyy, HH:mm', { locale: ru }) : '—'}
            {sent && item.sent_at && ` • отправлено ${format(new Date(item.sent_at), 'd MMM HH:mm', { locale: ru })}`}
          </p>
        </div>
        {!sent && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
