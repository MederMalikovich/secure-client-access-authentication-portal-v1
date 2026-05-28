import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Banknote, LockOpen, Lock, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CashShift {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opened_by: string;
  closed_by: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  cash_sales: number;
  card_sales: number;
  other_sales: number;
  total_sales: number;
  status: 'open' | 'closed';
  notes: string | null;
}

export default function CashRegister({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const canOpen = hasAnyRole(['admin', 'manager', 'accountant', 'registrar']);
  const canClose = hasAnyRole(['admin', 'manager', 'accountant']);

  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openShift, setOpenShift] = useState<CashShift | null>(null);

  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [actDialog, setActDialog] = useState<CashShift | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [openForm, setOpenForm] = useState({ opening_cash: '0', notes: '' });
  const [closeForm, setCloseForm] = useState({ closing_cash: '', notes: '' });
  const [expected, setExpected] = useState<{ cash: number; card: number; other: number; total: number }>({ cash: 0, card: 0, other: 0, total: 0 });

  const fetchShifts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      setShifts(data as any);
      setOpenShift((data as any[]).find((s) => s.status === 'open') || null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchShifts(); }, []);

  const calcExpected = async (shift: CashShift) => {
    const { data } = await supabase
      .from('payments')
      .select('amount, payment_method, paid_at')
      .gte('paid_at', shift.opened_at);
    let cash = 0, card = 0, other = 0;
    (data || []).forEach((p: any) => {
      const m = (p.payment_method || '').toLowerCase();
      if (m === 'cash') cash += Number(p.amount) || 0;
      else if (m === 'card') card += Number(p.amount) || 0;
      else other += Number(p.amount) || 0;
    });
    const total = cash + card + other;
    setExpected({ cash, card, other, total });
    return { cash, card, other, total };
  };

  const handleOpen = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('cash_shifts').insert({
      opened_by: user.id,
      opening_cash: Number(openForm.opening_cash) || 0,
      notes: openForm.notes || null,
      status: 'open',
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Смена открыта' });
    setOpenDialogOpen(false);
    setOpenForm({ opening_cash: '0', notes: '' });
    fetchShifts();
  };

  const prepareClose = async () => {
    if (!openShift) return;
    await calcExpected(openShift);
    setCloseForm({ closing_cash: '', notes: '' });
    setCloseDialogOpen(true);
  };

  const handleClose = async () => {
    if (!openShift || !user) return;
    setSubmitting(true);
    const expectedCash = (openShift.opening_cash || 0) + expected.cash;
    const closingCash = Number(closeForm.closing_cash) || 0;
    const diff = closingCash - expectedCash;
    const { error } = await supabase.from('cash_shifts').update({
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      closing_cash: closingCash,
      expected_cash: expectedCash,
      difference: diff,
      cash_sales: expected.cash,
      card_sales: expected.card,
      other_sales: expected.other,
      total_sales: expected.total,
      status: 'closed',
      notes: closeForm.notes || openShift.notes,
    } as any).eq('id', openShift.id);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Смена закрыта', description: diff === 0 ? 'Расхождений нет' : `Расхождение: ${formatCurrency(diff)}` });
    setCloseDialogOpen(false);
    fetchShifts();
  };

  const printAct = (shift: CashShift) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const fmt = (n: number | null | undefined) => formatCurrency(Number(n || 0));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Акт смены</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:680px;margin:24px auto;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 8px;text-align:center}
        h2{font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        td{padding:6px 0}
        td.r{text-align:right;font-variant-numeric:tabular-nums}
        .row{display:flex;justify-content:space-between;padding:4px 0}
        .total{font-weight:700;border-top:1px solid #000;margin-top:8px;padding-top:6px}
        .sig{margin-top:48px;display:flex;justify-content:space-between;gap:32px}
        .sig div{flex:1;border-top:1px solid #000;padding-top:4px;font-size:11px;text-align:center}
        @media print{.noprint{display:none}}
        button{margin:8px 4px;padding:8px 16px}
      </style></head><body>
      <div class="noprint" style="text-align:right">
        <button onclick="window.print()">Печать</button>
        <button onclick="window.close()">Закрыть</button>
      </div>
      <h1>АКТ ЗАКРЫТИЯ КАССОВОЙ СМЕНЫ</h1>
      <div style="text-align:center;font-size:12px;color:#555">№ ${shift.id.slice(0,8).toUpperCase()} от ${format(new Date(shift.closed_at || shift.opened_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</div>

      <h2>Период смены</h2>
      <div class="row"><span>Открыта:</span><span>${format(new Date(shift.opened_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span></div>
      <div class="row"><span>Закрыта:</span><span>${shift.closed_at ? format(new Date(shift.closed_at), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}</span></div>

      <h2>Денежные средства</h2>
      <div class="row"><span>Начальный остаток в кассе:</span><span>${fmt(shift.opening_cash)}</span></div>
      <div class="row"><span>Продажи наличными:</span><span>${fmt(shift.cash_sales)}</span></div>
      <div class="row"><span>Продажи картой:</span><span>${fmt(shift.card_sales)}</span></div>
      <div class="row"><span>Прочее (бонусы, сертификаты):</span><span>${fmt(shift.other_sales)}</span></div>
      <div class="row total"><span>Итого продаж за смену:</span><span>${fmt(shift.total_sales)}</span></div>

      <h2>Сверка кассы</h2>
      <div class="row"><span>Ожидаемая наличность (нач. + продажи нал.):</span><span>${fmt(shift.expected_cash)}</span></div>
      <div class="row"><span>Фактическая наличность:</span><span>${fmt(shift.closing_cash)}</span></div>
      <div class="row total"><span>Расхождение:</span><span>${fmt(shift.difference)}</span></div>

      ${shift.notes ? `<h2>Примечания</h2><div style="font-size:13px;white-space:pre-wrap">${shift.notes.replace(/</g,'&lt;')}</div>` : ''}

      <div class="sig">
        <div>Кассир<br/>(подпись)</div>
        <div>Старший смены<br/>(подпись)</div>
      </div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const columns: Column<CashShift>[] = [
    { key: 'opened_at', header: 'Открыта', cell: (s) => format(new Date(s.opened_at), 'dd.MM.yyyy HH:mm', { locale: ru }) },
    { key: 'closed_at', header: 'Закрыта', cell: (s) => s.closed_at ? format(new Date(s.closed_at), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—' },
    { key: 'total_sales', header: 'Продажи', cell: (s) => formatCurrency(Number(s.total_sales || 0)) },
    { key: 'difference', header: 'Расхождение', cell: (s) => s.difference === null ? '—' : (
      <span className={Number(s.difference) === 0 ? '' : Number(s.difference) < 0 ? 'text-destructive' : 'text-yellow-500'}>
        {formatCurrency(Number(s.difference))}
      </span>
    )},
    { key: 'status', header: 'Статус', cell: (s) => s.status === 'open'
        ? <Badge className="bg-green-500/20 text-green-500">Открыта</Badge>
        : <Badge variant="secondary">Закрыта</Badge> },
    { key: 'actions', header: '', cell: (s) => s.status === 'closed' ? (
      <Button size="sm" variant="ghost" onClick={() => printAct(s)} className="gap-1">
        <FileText className="h-4 w-4" />Акт
      </Button>
    ) : null },
  ];

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Кассовая смена"
          description="Открытие и закрытие кассы с актом сверки"
          breadcrumbs={[{ label: 'Финансы', href: '/finances' }, { label: 'Касса' }]}
        />
      )}
      <div className="flex justify-end">
        {openShift
          ? canClose && (
              <Button onClick={prepareClose} variant="destructive" className="gap-2">
                <Lock className="h-4 w-4" /> Закрыть смену
              </Button>
            )
          : canOpen && (
              <Button onClick={() => setOpenDialogOpen(true)} className="gap-2">
                <LockOpen className="h-4 w-4" /> Открыть смену
              </Button>
            )}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Текущая смена
          </CardTitle>
          <CardDescription>
            {openShift
              ? `Открыта ${format(new Date(openShift.opened_at), 'dd.MM.yyyy в HH:mm', { locale: ru })}`
              : 'Смена закрыта. Откройте новую, чтобы начать приём оплат.'}
          </CardDescription>
        </CardHeader>
        {openShift && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Начальная наличность</div>
                <div className="text-lg font-semibold">{formatCurrency(Number(openShift.opening_cash))}</div>
              </div>
              {openShift.notes && (
                <div className="col-span-full">
                  <div className="text-xs text-muted-foreground">Примечание при открытии</div>
                  <div className="text-sm">{openShift.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>История смен</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={shifts} columns={columns} isLoading={loading} emptyMessage="Смен пока нет" />
        </CardContent>
      </Card>

      {/* Open dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Открытие смены</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Начальная наличность в кассе (₸)</Label>
              <Input type="number" value={openForm.opening_cash} onChange={(e) => setOpenForm({ ...openForm, opening_cash: e.target.value })} />
            </div>
            <div>
              <Label>Примечание</Label>
              <Textarea value={openForm.notes} onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleOpen} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Открыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Закрытие смены — сверка</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <div className="flex justify-between"><span>Начальная наличность:</span><span>{formatCurrency(Number(openShift?.opening_cash || 0))}</span></div>
              <div className="flex justify-between"><span>Продажи наличными:</span><span>{formatCurrency(expected.cash)}</span></div>
              <div className="flex justify-between"><span>Продажи картой:</span><span>{formatCurrency(expected.card)}</span></div>
              <div className="flex justify-between"><span>Прочее:</span><span>{formatCurrency(expected.other)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Ожидаемая наличность:</span>
                <span>{formatCurrency((openShift?.opening_cash || 0) + expected.cash)}</span>
              </div>
            </div>
            <div>
              <Label>Фактическая наличность по итогам смены (₸)</Label>
              <Input type="number" autoFocus value={closeForm.closing_cash} onChange={(e) => setCloseForm({ ...closeForm, closing_cash: e.target.value })} />
            </div>
            <div>
              <Label>Примечание</Label>
              <Textarea value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
            </div>
            {closeForm.closing_cash !== '' && (() => {
              const diff = Number(closeForm.closing_cash) - ((openShift?.opening_cash || 0) + expected.cash);
              return (
                <div className={`text-sm font-semibold ${diff === 0 ? 'text-muted-foreground' : diff < 0 ? 'text-destructive' : 'text-yellow-500'}`}>
                  Расхождение: {formatCurrency(diff)}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleClose} disabled={submitting || closeForm.closing_cash === ''}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Закрыть и сформировать акт
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
