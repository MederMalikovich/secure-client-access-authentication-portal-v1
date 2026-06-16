import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Phone, Mail, Send, Users, TrendingDown, Clock, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';

type RiskBucket = '3m' | '6m' | '12m';

interface RiskClient {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  last_visit_at: string | null;
  days_since: number;
  bucket: RiskBucket;
  last_12m_revenue: number;
  lifetime_spend: number;
  pet_names: string[];
  preferred_channel?: string;
}

const bucketLabels: Record<RiskBucket, string> = {
  '3m': '3–6 месяцев',
  '6m': '6–12 месяцев',
  '12m': 'Более 12 месяцев',
};

const bucketColors: Record<RiskBucket, string> = {
  '3m': 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  '6m': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  '12m': 'bg-destructive/15 text-destructive border-destructive/30',
};

const defaultTemplate = (clientName: string, petNames: string[]) =>
  `Здравствуйте, ${clientName}! Мы соскучились${petNames.length ? ` по ${petNames.join(', ')}` : ''} 🐾\n\n` +
  `Прошло немало времени с вашего последнего визита. Рекомендуем профилактический осмотр и обновление вакцинации — это поможет сохранить здоровье питомца.\n\n` +
  `Запишитесь на удобное время — будем рады видеть вас снова!`;

export function ClientsAtRisk() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<RiskClient[]>([]);
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<'all' | RiskBucket>('all');
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [dialogClient, setDialogClient] = useState<RiskClient | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [channelOverride, setChannelOverride] = useState<'auto' | 'email' | 'whatsapp' | 'telegram'>('auto');
  const [bulkMessage, setBulkMessage] = useState(
    'Здравствуйте! Мы давно вас не видели в клинике 🐾 Запишитесь на профилактический осмотр — это поможет сохранить здоровье вашего питомца.'
  );

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const twelveMonthsAgo = subMonths(now, 12).toISOString();

      const [clientsRes, visitsRes, apptRes, prefsRes, petsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, phone, email, lifetime_spend'),
        supabase.from('visits').select('client_id, visit_date').order('visit_date', { ascending: false }),
        supabase.from('appointments').select('client_id, scheduled_at').gte('scheduled_at', now.toISOString()),
        supabase.from('client_notification_preferences').select('client_id, preferred_channel, email_notifications, whatsapp_notifications, telegram_notifications'),
        supabase.from('pets').select('id, name, client_id'),
        supabase.from('invoices').select('client_id, total, issued_at, status').eq('status', 'paid').gte('issued_at', twelveMonthsAgo),
      ]);

      const lastVisitMap = new Map<string, string>();
      (visitsRes.data || []).forEach((v: any) => {
        if (!v.client_id) return;
        if (!lastVisitMap.has(v.client_id)) lastVisitMap.set(v.client_id, v.visit_date);
      });

      const futureApptClients = new Set((apptRes.data || []).map((a: any) => a.client_id).filter(Boolean));

      const petsByClient = new Map<string, string[]>();
      (petsRes.data || []).forEach((p: any) => {
        const arr = petsByClient.get(p.client_id) || [];
        arr.push(p.name);
        petsByClient.set(p.client_id, arr);
      });

      const revenueByClient = new Map<string, number>();
      (invoicesRes.data || []).forEach((inv: any) => {
        if (!inv.client_id) return;
        revenueByClient.set(inv.client_id, (revenueByClient.get(inv.client_id) || 0) + Number(inv.total || 0));
      });

      const prefsByClient = new Map<string, any>();
      (prefsRes.data || []).forEach((p: any) => prefsByClient.set(p.client_id, p));

      const at_risk: RiskClient[] = [];
      (clientsRes.data || []).forEach((c: any) => {
        if (futureApptClients.has(c.id)) return; // у клиента уже есть будущая запись
        const last = lastVisitMap.get(c.id);
        if (!last) {
          // Никогда не был на визите — пропускаем, не относится к "оттоку"
          return;
        }
        const days = differenceInDays(now, new Date(last));
        if (days < 90) return;
        const b: RiskBucket = days >= 365 ? '12m' : days >= 180 ? '6m' : '3m';
        at_risk.push({
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
          email: c.email,
          last_visit_at: last,
          days_since: days,
          bucket: b,
          last_12m_revenue: revenueByClient.get(c.id) || 0,
          lifetime_spend: Number(c.lifetime_spend || 0),
          pet_names: petsByClient.get(c.id) || [],
          preferred_channel: prefsByClient.get(c.id)?.preferred_channel,
        });
      });

      at_risk.sort((a, b) => b.last_12m_revenue - a.last_12m_revenue);
      setClients(at_risk);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить данные' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (bucket !== 'all' && c.bucket !== bucket) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.full_name.toLowerCase().includes(q) && !(c.phone || '').includes(q) && !(c.email || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [clients, search, bucket]);

  const stats = useMemo(() => {
    const calc = (b: RiskBucket) => {
      const list = clients.filter(c => c.bucket === b);
      return { count: list.length, revenue: list.reduce((s, c) => s + c.last_12m_revenue, 0) };
    };
    return {
      '3m': calc('3m'),
      '6m': calc('6m'),
      '12m': calc('12m'),
      total: {
        count: clients.length,
        revenue: clients.reduce((s, c) => s + c.last_12m_revenue, 0),
      },
    };
  }, [clients]);

  const sendReminder = async (client: RiskClient, customMessage?: string, override?: string) => {
    setSending(prev => new Set(prev).add(client.id));
    try {
      const message = customMessage || defaultTemplate(client.full_name, client.pet_names);
      const { data, error } = await supabase.functions.invoke('send-channel-notification', {
        body: {
          client_id: client.id,
          title: 'Мы вас ждём в нашей клинике 🐾',
          message,
          channel_override: override && override !== 'auto' ? override : undefined,
        },
      });
      if (error) throw error;
      const anySent = data?.results && Object.values(data.results).some((r: any) => r.sent);
      if (anySent) {
        setSent(prev => new Set(prev).add(client.id));
        toast({ title: 'Отправлено', description: `Напоминание для ${client.full_name} доставлено.` });
      } else {
        const errs = data?.results ? Object.entries(data.results).map(([k, v]: any) => `${k}: ${v.error || 'не отправлено'}`).join('; ') : 'нет доступных каналов';
        toast({ variant: 'destructive', title: 'Не отправлено', description: errs });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: e?.message || 'Не удалось отправить' });
    } finally {
      setSending(prev => { const ns = new Set(prev); ns.delete(client.id); return ns; });
    }
  };

  const sendBulk = async () => {
    setBulkSending(true);
    let ok = 0, fail = 0;
    for (const c of filtered) {
      if (sent.has(c.id)) continue;
      try {
        const { data, error } = await supabase.functions.invoke('send-channel-notification', {
          body: { client_id: c.id, title: 'Мы вас ждём в нашей клинике 🐾', message: bulkMessage },
        });
        if (!error && data?.results && Object.values(data.results).some((r: any) => r.sent)) {
          ok++;
          setSent(prev => new Set(prev).add(c.id));
        } else fail++;
      } catch { fail++; }
    }
    setBulkSending(false);
    setBulkDialogOpen(false);
    toast({ title: 'Массовая отправка завершена', description: `Успешно: ${ok}, ошибок: ${fail}` });
  };

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">3–6 месяцев</p>
                <p className="text-xl font-bold">{stats['3m'].count}</p>
                <p className="text-[11px] text-muted-foreground">{formatCurrency(stats['3m'].revenue)} в риске</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">6–12 месяцев</p>
                <p className="text-xl font-bold">{stats['6m'].count}</p>
                <p className="text-[11px] text-muted-foreground">{formatCurrency(stats['6m'].revenue)} в риске</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">12+ месяцев</p>
                <p className="text-xl font-bold">{stats['12m'].count}</p>
                <p className="text-[11px] text-muted-foreground">{formatCurrency(stats['12m'].revenue)} в риске</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Всего под риском</p>
                <p className="text-xl font-bold">{stats.total.count}</p>
                <p className="text-[11px] text-primary font-medium">{formatCurrency(stats.total.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs">Поиск</Label>
              <Input placeholder="Имя, телефон, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Сегмент</Label>
              <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сегменты</SelectItem>
                  <SelectItem value="3m">3–6 месяцев</SelectItem>
                  <SelectItem value="6m">6–12 месяцев</SelectItem>
                  <SelectItem value="12m">Более 12 месяцев</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setBulkDialogOpen(true)} disabled={filtered.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Массовая рассылка ({filtered.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client list */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Клиенты под риском оттока
            <Badge variant="outline">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50 text-green-500" />
              <p>Отлично! Нет клиентов под риском в этом сегменте.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const isSending = sending.has(c.id);
                const wasSent = sent.has(c.id);
                return (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/60 transition">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.full_name}</span>
                        <Badge variant="outline" className={bucketColors[c.bucket]}>{bucketLabels[c.bucket]}</Badge>
                        {wasSent && <Badge className="bg-green-500/15 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Отправлено</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        {c.pet_names.length > 0 && <span>🐾 {c.pet_names.join(', ')}</span>}
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Последний визит: {c.last_visit_at ? format(new Date(c.last_visit_at), 'd MMM yyyy', { locale: ru }) : '—'}
                        <span className="mx-1">·</span>
                        {c.days_since} дн. назад
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">{formatCurrency(c.last_12m_revenue)}</div>
                      <div className="text-[11px] text-muted-foreground">выручка за 12 мес.</div>
                    </div>
                    <Button size="sm" disabled={isSending} onClick={() => {
                      setDialogClient(c);
                      setMessageText(defaultTemplate(c.full_name, c.pet_names));
                      setChannelOverride('auto');
                    }}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                      Напомнить
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single send dialog */}
      <Dialog open={!!dialogClient} onOpenChange={(o) => !o && setDialogClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Напоминание клиенту</DialogTitle>
            <DialogDescription>
              {dialogClient?.full_name} — {dialogClient?.days_since} дн. без визита
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Канал отправки</Label>
              <Select value={channelOverride} onValueChange={(v) => setChannelOverride(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто (по настройкам клиента)</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Сообщение</Label>
              <Textarea rows={7} value={messageText} onChange={(e) => setMessageText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogClient(null)}>Отмена</Button>
            <Button onClick={async () => {
              if (!dialogClient) return;
              await sendReminder(dialogClient, messageText, channelOverride);
              setDialogClient(null);
            }}>
              <Send className="h-4 w-4 mr-1" /> Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk send dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Массовая рассылка напоминаний</DialogTitle>
            <DialogDescription>
              Будет отправлено {filtered.length} клиент(ам) по их предпочитаемому каналу
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkSending}>Отмена</Button>
            <Button onClick={sendBulk} disabled={bulkSending}>
              {bulkSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Отправить всем
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
