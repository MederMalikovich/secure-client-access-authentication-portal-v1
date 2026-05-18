import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, Check, X, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
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
  appointment_id: string | null;
}

// Keep only "relevant for now" — hide notifications about past appointments,
// deduplicate same-title notifications (e.g. repeated low-stock alerts).
function filterRelevant(items: NotificationItem[]): NotificationItem[] {
  const now = Date.now();
  const filtered = items.filter((n) => {
    // Hide reminders for past appointments
    if (n.type === 'appointment_reminder' && n.scheduled_for) {
      if (new Date(n.scheduled_for).getTime() < now - 60 * 60 * 1000) return false;
    }
    return true;
  });
  // Dedupe by title — keep newest only
  const seen = new Set<string>();
  const result: NotificationItem[] = [];
  for (const n of filtered) {
    const key = `${n.type}::${n.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(n);
  }
  return result;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const relevant = filterRelevant(notifications);
  const unreadCount = relevant.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, severity, is_read, created_at, client_id, scheduled_for, appointment_id')
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications((data as NotificationItem[]) || []);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    const unreadIds = relevant.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)),
    );
  };

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getSeverityIcon = (severity: string | null) => {
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    return <Info className="h-4 w-4 text-primary shrink-0" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Актуальные уведомления</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" />
              Прочитать все
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {relevant.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Нет актуальных уведомлений</p>
          ) : (
            relevant.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'group flex gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors',
                  !n.is_read && 'bg-primary/5',
                )}
                onClick={() => markAsRead(n.id)}
              >
                {getSeverityIcon(n.severity)}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-tight', !n.is_read && 'font-medium')}>{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteOne(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  title="Удалить"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => setOpen(false)}>
            <Link to="/notifications">
              <ExternalLink className="h-3 w-3 mr-1" />
              Открыть журнал уведомлений
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
