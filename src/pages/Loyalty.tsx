import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Settings as SettingsIcon, Coins, History, Users as UsersIcon, Plus, Copy, FileDown, Search, ChevronRight } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { generateCertificatePdf } from '@/lib/generateCertificatePdf';

export default function Loyalty() {
  const { hasRole, profile } = useAuth();
  const { toast } = useToast();
  const canManage = hasRole('admin') || hasRole('manager');

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Manual transaction
  const [txDialog, setTxDialog] = useState(false);
  const [txForm, setTxForm] = useState({ client_id: '', amount: 0, description: '' });

  // Certificate
  const [certDialog, setCertDialog] = useState(false);
  const [certForm, setCertForm] = useState({ amount: 5000, recipient_name: '', recipient_phone: '', expires_at: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, cRes, clRes] = await Promise.all([
        supabase.from('loyalty_settings').select('*').limit(1).maybeSingle(),
        supabase.from('loyalty_transactions').select('*, clients(full_name, client_number)').order('created_at', { ascending: false }).limit(100),
        supabase.from('gift_certificates').select('*, redeemed_by:clients(full_name)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, full_name, client_number, loyalty_balance, referral_code').order('full_name'),
      ]);
      if (sRes.error) throw sRes.error;
      setSettings(sRes.data);
      setTransactions(tRes.data || []);
      setCertificates(cRes.data || []);
      setClients(clRes.data || []);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    try {
      const { error } = await supabase.from('loyalty_settings').update({
        is_enabled: settings.is_enabled,
        accrual_percent: Number(settings.accrual_percent),
        max_redeem_percent: Number(settings.max_redeem_percent),
        referrer_bonus: Number(settings.referrer_bonus),
        referee_bonus: Number(settings.referee_bonus),
      }).eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Настройки сохранены' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const createTx = async () => {
    if (!txForm.client_id || !txForm.amount) {
      toast({ title: 'Заполните клиента и сумму', variant: 'destructive' }); return;
    }
    try {
      const { error } = await supabase.from('loyalty_transactions').insert({
        client_id: txForm.client_id,
        amount: Number(txForm.amount),
        type: 'manual',
        description: txForm.description || (Number(txForm.amount) > 0 ? 'Ручное начисление' : 'Ручное списание'),
        created_by: profile?.id,
      });
      if (error) throw error;
      toast({ title: 'Бонусы обновлены' });
      setTxDialog(false);
      setTxForm({ client_id: '', amount: 0, description: '' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const createCert = async () => {
    if (!certForm.amount) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    try {
      const { error } = await supabase.from('gift_certificates').insert({
        amount: Number(certForm.amount),
        recipient_name: certForm.recipient_name || null,
        recipient_phone: certForm.recipient_phone || null,
        expires_at: certForm.expires_at ? new Date(certForm.expires_at).toISOString() : null,
        notes: certForm.notes || null,
        created_by: profile?.id,
      });
      if (error) throw error;
      toast({ title: 'Сертификат создан' });
      setCertDialog(false);
      setCertForm({ amount: 5000, recipient_name: '', recipient_phone: '', expires_at: '', notes: '' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано', description: text });
  };

  // Stats
  const accrued = transactions.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const redeemed = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + Number(t.amount), 0));
  const totalBalance = clients.reduce((s, c) => s + Number(c.loyalty_balance || 0), 0);

  if (loading) return <div className="p-6 text-muted-foreground">Загрузка...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="Программа лояльности"
        description="Бонусные баллы, подарочные сертификаты и реферальная программа"
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Начислено всего</div><div className="text-2xl font-bold text-green-500">{formatCurrency(accrued)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Списано</div><div className="text-2xl font-bold text-orange-500">{formatCurrency(redeemed)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Активный баланс клиентов</div><div className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Сертификатов активно</div><div className="text-2xl font-bold">{certificates.filter(c => c.status === 'active').length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" />Настройки</TabsTrigger>
          <TabsTrigger value="transactions"><History className="h-4 w-4 mr-1" />История</TabsTrigger>
          <TabsTrigger value="certificates"><Gift className="h-4 w-4 mr-1" />Сертификаты</TabsTrigger>
          <TabsTrigger value="referrals"><UsersIcon className="h-4 w-4 mr-1" />Рефералы</TabsTrigger>
        </TabsList>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Параметры программы</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Программа активна</Label><p className="text-xs text-muted-foreground">Начислять бонусы за каждую оплату</p></div>
                <Switch checked={!!settings?.is_enabled} onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })} disabled={!canManage} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Процент начисления (%)</Label><Input type="number" min={0} max={100} value={settings?.accrual_percent ?? 0} onChange={(e) => setSettings({ ...settings, accrual_percent: e.target.value })} disabled={!canManage} /></div>
                <div><Label>Макс. % списания от чека</Label><Input type="number" min={0} max={100} value={settings?.max_redeem_percent ?? 0} onChange={(e) => setSettings({ ...settings, max_redeem_percent: e.target.value })} disabled={!canManage} /></div>
                <div><Label>Бонус пригласившему (₸)</Label><Input type="number" min={0} value={settings?.referrer_bonus ?? 0} onChange={(e) => setSettings({ ...settings, referrer_bonus: e.target.value })} disabled={!canManage} /></div>
                <div><Label>Бонус приглашённому (₸)</Label><Input type="number" min={0} value={settings?.referee_bonus ?? 0} onChange={(e) => setSettings({ ...settings, referee_bonus: e.target.value })} disabled={!canManage} /></div>
              </div>
              {canManage && <Button onClick={saveSettings} className="gradient-primary">Сохранить настройки</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions" className="space-y-3">
          <div className="flex justify-end">
            {canManage && <Button onClick={() => setTxDialog(true)}><Plus className="h-4 w-4 mr-1" />Ручная операция</Button>}
          </div>
          {transactions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Операций пока нет</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.clients?.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{t.description || t.type} · {format(new Date(t.created_at), 'd MMM yyyy HH:mm', { locale: ru })}</div>
                    </div>
                    <div className={`font-bold ${Number(t.amount) >= 0 ? 'text-green-500' : 'text-orange-500'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{formatCurrency(Number(t.amount))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Certificates */}
        <TabsContent value="certificates" className="space-y-3">
          <div className="flex justify-end">
            {canManage && <Button onClick={() => setCertDialog(true)}><Plus className="h-4 w-4 mr-1" />Новый сертификат</Button>}
          </div>
          {certificates.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Сертификатов пока нет</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {certificates.map((c) => (
                <Card key={c.id} className="glass-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold flex items-center gap-2">
                        {c.code}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyText(c.code)}><Copy className="h-3 w-3" /></Button>
                      </div>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(Number(c.amount))}</div>
                    {c.recipient_name && <div className="text-sm">Получатель: {c.recipient_name} {c.recipient_phone && `(${c.recipient_phone})`}</div>}
                    {c.expires_at && <div className="text-xs text-muted-foreground">До: {format(new Date(c.expires_at), 'd MMM yyyy', { locale: ru })}</div>}
                    {c.redeemed_by && <div className="text-xs text-muted-foreground">Активирован: {c.redeemed_by.full_name}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Referrals */}
        <TabsContent value="referrals" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Реферальные коды клиентов</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border-b border-border py-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground">№{c.client_number}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{c.referral_code}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(c.referral_code)}><Copy className="h-3 w-3" /></Button>
                      <span className="text-sm text-primary font-semibold">{formatCurrency(Number(c.loyalty_balance || 0))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual transaction dialog */}
      <Dialog open={txDialog} onOpenChange={setTxDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ручное начисление / списание</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Клиент</Label>
              <Select value={txForm.client_id} onValueChange={(v) => setTxForm({ ...txForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} (баланс {formatCurrency(Number(c.loyalty_balance || 0))})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма (положительная — начисление, отрицательная — списание)</Label>
              <Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Комментарий</Label>
              <Textarea value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialog(false)}>Отмена</Button>
            <Button onClick={createTx} className="gradient-primary">Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate dialog */}
      <Dialog open={certDialog} onOpenChange={setCertDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый подарочный сертификат</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Сумма (₸)</Label><Input type="number" value={certForm.amount} onChange={(e) => setCertForm({ ...certForm, amount: Number(e.target.value) })} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Имя получателя</Label><Input value={certForm.recipient_name} onChange={(e) => setCertForm({ ...certForm, recipient_name: e.target.value })} /></div>
              <div><Label>Телефон</Label><Input value={certForm.recipient_phone} onChange={(e) => setCertForm({ ...certForm, recipient_phone: e.target.value })} /></div>
            </div>
            <div><Label>Действителен до</Label><Input type="date" value={certForm.expires_at} onChange={(e) => setCertForm({ ...certForm, expires_at: e.target.value })} /></div>
            <div><Label>Заметка</Label><Textarea value={certForm.notes} onChange={(e) => setCertForm({ ...certForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialog(false)}>Отмена</Button>
            <Button onClick={createCert} className="gradient-primary">Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
