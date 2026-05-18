import { useEffect, useState } from 'react';
import { AlertTriangle, Info, Trash2, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: string | null;
  is_read: boolean | null;
  created_at: string;
  client_id: string | null;
  scheduled_for: string | null;
}

const typeLabels: Record<string, string> = {
  appointment_reminder: 'Напоминание о приёме',
  low_stock: 'Низкий остаток',
  follow_up_reminder: 'Повторный визит',
};

export default function Notifications() {
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, severity, is_read, created_at, client_id, scheduled_for')
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(500);
    setItems((data as NotificationItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const filtered = items.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (statusFilter === 'unread' && n.is_read) return false;
    if (statusFilter === 'read' && !n.is_read) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!n.title.toLowerCase().includes(s) && !(n.message || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const types = Array.from(new Set(items.map((n) => n.type)));

  const deleteOne = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteFiltered = async () => {
    if (filtered.length === 0) return;
    if (!confirm(`Удалить ${filtered.length} уведомлений?`)) return;
    const ids = filtered.map((n) => n.id);
    const { error } = await supabase.from('notifications').delete().in('id', ids);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    toast({ title: 'Удалено', description: `Удалено ${ids.length} уведомлений` });
  };

  const markAllRead = async () => {
    const ids = filtered.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Журнал уведомлений" description="Полная история уведомлений системы" />

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по уведомлениям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="md:w-[220px]">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabels[t] || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="unread">Непрочитанные</SelectItem>
              <SelectItem value="read">Прочитанные</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4 mr-1" /> Прочитать
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteFiltered}>
            <Trash2 className="h-4 w-4 mr-1" /> Удалить ({filtered.length})
          </Button>
        </div>
      </Card>

      <Card className="divide-y">
        {loading ? (
          <p className="p-6 text-center text-muted-foreground text-sm">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">Нет уведомлений</p>
        ) : (
          filtered.map((n) => (
            <div key={n.id} className={cn('flex items-start gap-3 p-4', !n.is_read && 'bg-primary/5')}>
              {n.severity === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn('text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[n.type] || n.type}
                  </Badge>
                  {!n.is_read && <Badge className="text-xs">Новое</Badge>}
                </div>
                {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(n.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteOne(n.id)} title="Удалить">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
