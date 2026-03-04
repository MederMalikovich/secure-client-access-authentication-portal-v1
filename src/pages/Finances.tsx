import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, invoiceSchema } from '@/lib/validationSchemas';
import { DollarSign, TrendingUp, CreditCard, MoreVertical, Eye, Plus, Check } from 'lucide-react';
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    subtotal: '',
    discount: '0',
    tax: '0',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

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
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${year}-${random}`;
  };

  const handleSubmit = async () => {
    const validation = validateForm(invoiceSchema, formData);
    if (!validation.success) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validation.error });
      return;
    }

    const subtotal = parseFloat(formData.subtotal);
    const discount = parseFloat(formData.discount) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal - discount + tax;

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
      const { error } = await supabase.from('invoices').insert(data);
      if (error) throw error;
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
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите сумму платежа',
      });
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    const totalPaid = ((selectedInvoice as any).payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0) + amount;
    const newStatus: PaymentStatus = totalPaid >= selectedInvoice.total ? 'paid' : 'partial';

    try {
      // Create payment
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: selectedInvoice.id,
        amount,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
      });
      if (paymentError) throw paymentError;

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', selectedInvoice.id);
      if (updateError) throw updateError;

      toast({ title: 'Успешно', description: 'Платёж зафиксирован' });
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: '', payment_method: 'cash', reference_number: '', notes: '' });
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
    });
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
      cell: (invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedInvoice(invoice);
              setPaymentForm({ 
                amount: (invoice.total - ((invoice as any).payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)).toString(),
                payment_method: 'cash',
                reference_number: '',
                notes: '',
              });
              setPaymentDialogOpen(true);
            }}>
              <CreditCard className="h-4 w-4 mr-2" />
              Принять оплату
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
        onAdd={() => {
          resetForm();
          setDialogOpen(true);
        }}
        addLabel="Создать счёт"
        isLoading={loading}
        emptyMessage="Нет счетов"
      />

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Новый счёт</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Клиент *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
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
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Принять оплату</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Сумма (₸)</Label>
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
