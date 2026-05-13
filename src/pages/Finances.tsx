import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { getValidationError, invoiceSchema } from '@/lib/validationSchemas';
import { DollarSign, TrendingUp, CreditCard, MoreVertical, Eye, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { ProcessHint } from '@/components/ProcessHint';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, PaymentStatus, paymentStatusLabels, Client } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Finances() {
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'accountant']);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ subtotal: '', discount: '0', tax: '0', notes: '', status: 'pending' as PaymentStatus });

  const [formData, setFormData] = useState({
    client_id: '',
    subtotal: '',
    discount: '0',
    tax: '0',
    notes: '',
    use_points: '0',
    certificate_code: '',
  });
  const [createClientBalance, setCreateClientBalance] = useState<number>(0);
  const [createCertPreview, setCreateCertPreview] = useState<{ id: string; amount: number } | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    use_points: '0',
    certificate_code: '',
  });
  const [clientBalance, setClientBalance] = useState<number>(0);
  const [maxRedeemPercent, setMaxRedeemPercent] = useState<number>(30);
  const [certificatePreview, setCertificatePreview] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            client:clients(id, full_name),
            payments:payments(id, amount)
          `)
          .order('issued_at', { ascending: false }),
        supabase.from('clients').select('id, full_name').order('full_name'),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      
      setInvoices(invoicesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${year}-${random}`;
  };

  const onCreateClientChange = async (clientId: string) => {
    setFormData((prev) => ({ ...prev, client_id: clientId }));
    setCreateCertPreview(null);
    if (!clientId) { setCreateClientBalance(0); return; }
    const { data } = await supabase.from('clients').select('loyalty_balance').eq('id', clientId).maybeSingle();
    setCreateClientBalance(Number(data?.loyalty_balance || 0));
  };

  const validateCreateCertificate = async () => {
    const code = formData.certificate_code.trim();
    if (!code) { setCreateCertPreview(null); return; }
    const { data, error } = await supabase
      .from('gift_certificates')
      .select('id, amount, status, expires_at')
      .eq('code', code)
      .maybeSingle();
    if (error || !data) { toast({ variant: 'destructive', title: 'Сертификат не найден' }); setCreateCertPreview(null); return; }
    if (data.status !== 'active') { toast({ variant: 'destructive', title: 'Сертификат неактивен' }); setCreateCertPreview(null); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast({ variant: 'destructive', title: 'Срок действия истёк' }); setCreateCertPreview(null); return; }
    setCreateCertPreview({ id: data.id, amount: Number(data.amount) });
    toast({ title: 'Сертификат активирован', description: `На сумму ${formatCurrency(Number(data.amount))}` });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const validationError = getValidationError(invoiceSchema, {
      client_id: formData.client_id,
      subtotal: formData.subtotal,
      discount: formData.discount,
      tax: formData.tax,
      notes: formData.notes,
    });
    if (validationError) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validationError });
      return;
    }
    setSubmitting(true);

    const subtotal = parseFloat(formData.subtotal);
    const discount = parseFloat(formData.discount) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal - discount + tax;

    const usePoints = Math.max(0, parseFloat(formData.use_points) || 0);
    const certAmount = createCertPreview?.amount || 0;

    const { data: settingsRow } = await supabase.from('loyalty_settings').select('max_redeem_percent').limit(1).maybeSingle();
    const maxPct = Number(settingsRow?.max_redeem_percent ?? 30);
    const maxRedeem = (total * maxPct) / 100;

    if (usePoints > createClientBalance) {
      toast({ variant: 'destructive', title: 'Недостаточно баллов', description: `Баланс: ${createClientBalance}` });
      setSubmitting(false); return;
    }
    if (usePoints > maxRedeem) {
      toast({ variant: 'destructive', title: `Можно списать не более ${maxPct}% от счёта (${formatCurrency(maxRedeem)})` });
      setSubmitting(false); return;
    }
    if (usePoints + certAmount > total + 0.01) {
      toast({ variant: 'destructive', title: 'Сумма баллов и сертификата превышает счёт' });
      setSubmitting(false); return;
    }

    const data = {
      invoice_number: generateInvoiceNumber(),
      client_id: formData.client_id,
      subtotal,
      discount,
      tax,
      total,
      notes: formData.notes,
      status: 'pending' as PaymentStatus,
    };

    try {
      const { data: created, error } = await supabase.from('invoices').insert(data).select().single();
      if (error) throw error;

      let paidSoFar = 0;
      if (usePoints > 0) {
        const { error: pErr } = await supabase.from('payments').insert({
          invoice_id: created.id, amount: usePoints, payment_method: 'loyalty_points',
          notes: 'Списание бонусных баллов при выставлении счёта',
        });
        if (pErr) throw pErr;
        const { error: tErr } = await supabase.from('loyalty_transactions').insert({
          client_id: formData.client_id, amount: -usePoints, type: 'redemption',
          description: `Списание за счёт ${created.invoice_number}`, invoice_id: created.id,
        });
        if (tErr) throw tErr;
        paidSoFar += usePoints;
      }

      if (createCertPreview && certAmount > 0) {
        const { error: pErr } = await supabase.from('payments').insert({
          invoice_id: created.id, amount: certAmount, payment_method: 'gift_certificate',
          reference_number: formData.certificate_code, notes: 'Оплата подарочным сертификатом',
        });
        if (pErr) throw pErr;
        const { error: cErr } = await supabase.from('gift_certificates').update({
          status: 'redeemed', redeemed_by_client_id: formData.client_id, redeemed_at: new Date().toISOString(),
        }).eq('id', createCertPreview.id);
        if (cErr) throw cErr;
        paidSoFar += certAmount;
      }

      if (paidSoFar > 0) {
        const newStatus: PaymentStatus = paidSoFar >= total - 0.01 ? 'paid' : 'partial';
        await supabase.from('invoices').update({ status: newStatus }).eq('id', created.id);
      }

      toast({ title: 'Успешно', description: 'Счёт создан' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentDialog = async (invoice: any) => {
    setSelectedInvoice(invoice);
    const alreadyPaid = (invoice.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
    const due = Math.max(0, invoice.total - alreadyPaid);
    setPaymentForm({
      amount: due.toString(),
      payment_method: 'cash',
      reference_number: '',
      notes: '',
      use_points: '0',
      certificate_code: '',
    });
    setCertificatePreview(null);
    try {
      const [clientRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('loyalty_balance').eq('id', invoice.client_id).maybeSingle(),
        supabase.from('loyalty_settings').select('max_redeem_percent').limit(1).maybeSingle(),
      ]);
      setClientBalance(Number(clientRes.data?.loyalty_balance || 0));
      setMaxRedeemPercent(Number(settingsRes.data?.max_redeem_percent ?? 30));
    } catch {
      setClientBalance(0);
    }
    setPaymentDialogOpen(true);
  };

  const validateCertificate = async () => {
    const code = paymentForm.certificate_code.trim();
    if (!code) { setCertificatePreview(null); return; }
    const { data, error } = await supabase
      .from('gift_certificates')
      .select('id, amount, status, expires_at')
      .eq('code', code)
      .maybeSingle();
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Сертификат не найден' });
      setCertificatePreview(null);
      return;
    }
    if (data.status !== 'active') {
      toast({ variant: 'destructive', title: 'Сертификат неактивен' });
      setCertificatePreview(null);
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast({ variant: 'destructive', title: 'Срок действия сертификата истёк' });
      setCertificatePreview(null);
      return;
    }
    setCertificatePreview({ id: data.id, amount: Number(data.amount) });
    toast({ title: 'Сертификат активирован', description: `На сумму ${formatCurrency(Number(data.amount))}` });
  };

  const handlePayment = async () => {
    if (!selectedInvoice) return;

    const cashAmount = parseFloat(paymentForm.amount) || 0;
    const usePoints = Math.max(0, parseFloat(paymentForm.use_points) || 0);
    const certAmount = certificatePreview?.amount || 0;
    const totalThisOp = cashAmount + usePoints + certAmount;

    if (totalThisOp <= 0) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Укажите сумму, баллы или сертификат' });
      return;
    }

    const alreadyPaid = ((selectedInvoice as any).payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0);
    const due = selectedInvoice.total - alreadyPaid;
    const maxRedeem = (selectedInvoice.total * maxRedeemPercent) / 100;
    if (usePoints > clientBalance) {
      toast({ variant: 'destructive', title: 'Недостаточно баллов', description: `Баланс: ${clientBalance}` });
      return;
    }
    if (usePoints > maxRedeem) {
      toast({ variant: 'destructive', title: `Можно списать не более ${maxRedeemPercent}% от счёта (${formatCurrency(maxRedeem)})` });
      return;
    }
    if (totalThisOp > due + 0.01) {
      toast({ variant: 'destructive', title: 'Сумма превышает остаток к оплате' });
      return;
    }

    const newTotalPaid = alreadyPaid + totalThisOp;
    const newStatus: PaymentStatus = newTotalPaid >= selectedInvoice.total - 0.01 ? 'paid' : 'partial';

    try {
      if (cashAmount > 0) {
        const { error } = await supabase.from('payments').insert({
          invoice_id: selectedInvoice.id,
          amount: cashAmount,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number,
          notes: paymentForm.notes,
        });
        if (error) throw error;
      }

      if (usePoints > 0 && selectedInvoice.client_id) {
        const { error: payErr } = await supabase.from('payments').insert({
          invoice_id: selectedInvoice.id,
          amount: usePoints,
          payment_method: 'loyalty_points',
          notes: 'Списание бонусных баллов',
        });
        if (payErr) throw payErr;
        const { error: txnErr } = await supabase.from('loyalty_transactions').insert({
          client_id: selectedInvoice.client_id,
          amount: -usePoints,
          type: 'redemption',
          description: `Списание за счёт ${selectedInvoice.invoice_number}`,
          invoice_id: selectedInvoice.id,
        });
        if (txnErr) throw txnErr;
      }

      if (certificatePreview && certAmount > 0) {
        const { error: payErr } = await supabase.from('payments').insert({
          invoice_id: selectedInvoice.id,
          amount: certAmount,
          payment_method: 'gift_certificate',
          reference_number: paymentForm.certificate_code,
          notes: 'Оплата подарочным сертификатом',
        });
        if (payErr) throw payErr;
        const { error: certErr } = await supabase
          .from('gift_certificates')
          .update({
            status: 'redeemed',
            redeemed_by_client_id: selectedInvoice.client_id,
            redeemed_at: new Date().toISOString(),
          })
          .eq('id', certificatePreview.id);
        if (certErr) throw certErr;
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', selectedInvoice.id);
      if (updateError) throw updateError;

      toast({ title: 'Успешно', description: 'Платёж зафиксирован' });
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: '', payment_method: 'cash', reference_number: '', notes: '', use_points: '0', certificate_code: '' });
      setCertificatePreview(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      subtotal: '',
      discount: '0',
      tax: '0',
      notes: '',
      use_points: '0',
      certificate_code: '',
    });
    setCreateClientBalance(0);
    setCreateCertPreview(null);
  };

  const openEditDialog = (invoice: any) => {
    setEditInvoice(invoice);
    setEditForm({
      subtotal: String(invoice.subtotal ?? invoice.total ?? ''),
      discount: String(invoice.discount ?? '0'),
      tax: String(invoice.tax ?? '0'),
      notes: invoice.notes || '',
      status: invoice.status,
    });
  };

  const handleEditSubmit = async () => {
    if (!editInvoice) return;
    const subtotal = parseFloat(editForm.subtotal) || 0;
    const discount = parseFloat(editForm.discount) || 0;
    const tax = parseFloat(editForm.tax) || 0;
    const total = subtotal - discount + tax;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ subtotal, discount, tax, total, notes: editForm.notes, status: editForm.status })
        .eq('id', editInvoice.id);
      if (error) throw error;
      toast({ title: 'Счёт обновлён' });
      setEditInvoice(null);
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(e) });
    }
  };

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', deleteInvoice.id);
      if (error) throw error;
      toast({ title: 'Счёт удалён' });
      setDeleteInvoice(null);
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(e) });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('kk-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const variants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      partial: 'secondary',
      paid: 'default',
      refunded: 'destructive',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[status]}>
        {paymentStatusLabels[status]}
      </Badge>
    );
  };

  // Calculate stats
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0);
  const pendingAmount = invoices
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .reduce((sum, i) => sum + Number(i.total), 0);
  const thisMonthRevenue = invoices
    .filter(i => {
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const invoiceDate = new Date(i.issued_at);
      return i.status === 'paid' && invoiceDate.getMonth() === month && invoiceDate.getFullYear() === year;
    })
    .reduce((sum, i) => sum + Number(i.total), 0);

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: '№ Счёта',
      cell: (invoice) => (
        <div className="font-mono font-medium">{invoice.invoice_number}</div>
      ),
    },
    {
      key: 'client',
      header: 'Клиент',
      cell: (invoice) => (
        <span className="text-muted-foreground">
          {(invoice as any).client?.full_name || '—'}
        </span>
      ),
    },
    {
      key: 'issued_at',
      header: 'Дата',
      cell: (invoice) => (
        <span className="text-muted-foreground">
          {format(new Date(invoice.issued_at), 'd MMM yyyy', { locale: ru })}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Сумма',
      cell: (invoice) => (
        <span className="font-semibold">{formatCurrency(invoice.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (invoice) => getStatusBadge(invoice.status),
    },
    {
      key: 'actions',
      header: '',
      cell: (invoice) => canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Принять оплату
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Финансы"
        description="Управление счетами и платежами"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Финансы' },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          title="Общая выручка"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          description="Все оплаченные счета"
        />
        <StatCard
          title="За этот месяц"
          value={formatCurrency(thisMonthRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          description={format(new Date(), 'LLLL yyyy', { locale: ru })}
        />
        <StatCard
          title="Ожидает оплаты"
          value={formatCurrency(pendingAmount)}
          icon={<CreditCard className="h-5 w-5" />}
          description="Неоплаченные счета"
        />
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        searchPlaceholder="Поиск по номеру..."
        searchKey="invoice_number"
        onAdd={canManage ? () => {
          resetForm();
          setDialogOpen(true);
        } : undefined}
        addLabel="Создать счёт"
        isLoading={loading}
        emptyMessage="Нет счетов"
      />

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый счёт</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Клиент *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => onCreateClientChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Сумма (₸) *</Label>
              <Input
                type="number"
                value={formData.subtotal}
                onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Скидка (₸)</Label>
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Налог (₸)</Label>
                <Input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Итого</Label>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(
                  (parseFloat(formData.subtotal) || 0) -
                  (parseFloat(formData.discount) || 0) +
                  (parseFloat(formData.tax) || 0)
                )}
              </div>
            </div>

            {formData.client_id && (
              <div className="border-t border-border pt-4 grid gap-3">
                <div className="text-sm font-medium">Бонусы и сертификаты</div>
                <div className="grid gap-2">
                  <Label>Списать баллов (баланс: {createClientBalance})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.use_points}
                    onChange={(e) => setFormData({ ...formData, use_points: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Лимит — макс. % от счёта (см. настройки лояльности)</p>
                </div>
                <div className="grid gap-2">
                  <Label>Код подарочного сертификата</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.certificate_code}
                      onChange={(e) => setFormData({ ...formData, certificate_code: e.target.value })}
                      placeholder="GC-XXXXXXXXXX"
                    />
                    <Button type="button" variant="outline" onClick={validateCreateCertificate}>Проверить</Button>
                  </div>
                  {createCertPreview && (
                    <p className="text-xs text-green-500">✓ Будет применён сертификат на {formatCurrency(createCertPreview.amount)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Принять оплату</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Сумма к оплате (₸)</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Способ оплаты</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Карта</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Номер чека / референс</Label>
              <Input
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
              />
            </div>

            <div className="border-t border-border pt-4 grid gap-3">
              <div className="text-sm font-medium">Бонусы и сертификаты</div>
              <div className="grid gap-2">
                <Label>Списать баллов (баланс: {clientBalance})</Label>
                <Input
                  type="number"
                  value={paymentForm.use_points}
                  onChange={(e) => setPaymentForm({ ...paymentForm, use_points: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Не более {maxRedeemPercent}% от суммы счёта</p>
              </div>
              <div className="grid gap-2">
                <Label>Код подарочного сертификата</Label>
                <div className="flex gap-2">
                  <Input
                    value={paymentForm.certificate_code}
                    onChange={(e) => setPaymentForm({ ...paymentForm, certificate_code: e.target.value })}
                    placeholder="GC-XXXXXXXXXX"
                  />
                  <Button type="button" variant="outline" onClick={validateCertificate}>Проверить</Button>
                </div>
                {certificatePreview && (
                  <p className="text-xs text-green-500">✓ Будет применён сертификат на {formatCurrency(certificatePreview.amount)}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handlePayment}>
              <Check className="h-4 w-4 mr-2" />
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
