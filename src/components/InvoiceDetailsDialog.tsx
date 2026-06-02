import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Receipt, User, PawPrint, Calendar, CreditCard, Gift, Sparkles,
  Wallet, Banknote, ArrowRightLeft, FileText, Hash, Stethoscope, Package, Briefcase,
} from 'lucide-react';
import { paymentStatusLabels, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

const methodLabels: Record<string, { label: string; icon: any; cls: string }> = {
  cash: { label: 'Наличные', icon: Banknote, cls: 'text-green-400' },
  card: { label: 'Карта', icon: CreditCard, cls: 'text-blue-400' },
  transfer: { label: 'Перевод', icon: ArrowRightLeft, cls: 'text-cyan-400' },
  loyalty_points: { label: 'Бонусы', icon: Sparkles, cls: 'text-purple-400' },
  gift_certificate: { label: 'Сертификат', icon: Gift, cls: 'text-pink-400' },
};

const statusVariant: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline', partial: 'secondary', paid: 'default', refunded: 'destructive', cancelled: 'destructive',
};

const fmt = (v: number) => new Intl.NumberFormat('kk-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(v || 0);

export function InvoiceDetailsDialog({ invoiceId, open, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!open || !invoiceId) { setData(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: inv, error } = await supabase
          .from('invoices')
          .select(`
            *,
            client:clients(id, full_name, phone, email, loyalty_tier, client_number),
            pet:pets(id, name, species, breed),
            visit:visits(id, visit_date, veterinarian:profiles(full_name)),
            items:invoice_items(*, service:services(name), inventory:inventory_items(name, unit)),
            payments(*, creator:profiles!payments_created_by_fkey(full_name))
          `)
          .eq('id', invoiceId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setData(inv);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, invoiceId, toast]);

  const payments: any[] = data?.payments || [];
  const items: any[] = data?.items || [];

  const services = items.filter(i => i.service_id || (!i.inventory_item_id && !/стационар/i.test(i.description || '')));
  const materials = items.filter(i => i.inventory_item_id);
  const other = items.filter(i => !services.includes(i) && !materials.includes(i));

  const paidTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pointsUsed = payments.filter(p => p.payment_method === 'loyalty_points').reduce((s, p) => s + Number(p.amount || 0), 0);
  const certUsed = payments.filter(p => p.payment_method === 'gift_certificate').reduce((s, p) => s + Number(p.amount || 0), 0);
  const cashTotal = payments.filter(p => !['loyalty_points', 'gift_certificate'].includes(p.payment_method)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const due = Math.max(0, Number(data?.total || 0) - paidTotal);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Счёт {data?.invoice_number || '...'}
            {data && <Badge variant={statusVariant[data.status as PaymentStatus]} className="ml-2">{paymentStatusLabels[data.status as PaymentStatus]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading && <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && !data && <div className="py-12 text-center text-sm text-muted-foreground">Счёт не найден</div>}

        {data && (
          <div className="space-y-5 py-2">
            {/* Шапка: клиент, питомец, дата, врач */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Клиент
                </div>
                <div className="font-medium">{data.client?.full_name || '—'}</div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {data.client?.client_number && <div className="flex items-center gap-1"><Hash className="h-3 w-3" />{data.client.client_number}</div>}
                  {data.client?.phone && <div>{data.client.phone}</div>}
                  {data.client?.email && <div>{data.client.email}</div>}
                  {data.client?.loyalty_tier && (
                    <Badge variant="secondary" className="mt-1 capitalize">{data.client.loyalty_tier}</Badge>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <PawPrint className="h-3.5 w-3.5" /> Питомец
                </div>
                <div className="font-medium">{data.pet?.name || '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {[data.pet?.species, data.pet?.breed].filter(Boolean).join(' · ') || '—'}
                </div>
                {data.visit?.veterinarian?.full_name && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Stethoscope className="h-3 w-3" /> {data.visit.veterinarian.full_name}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />Выставлен</div>
                <div className="font-medium">{format(new Date(data.issued_at), 'd MMM yyyy, HH:mm', { locale: ru })}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><FileText className="h-3 w-3" />Визит</div>
                <div className="font-medium">{data.visit?.visit_date ? format(new Date(data.visit.visit_date), 'd MMM yyyy', { locale: ru }) : '—'}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Wallet className="h-3 w-3" />Остаток к оплате</div>
                <div className={cn('font-semibold', due > 0 ? 'text-orange-400' : 'text-green-400')}>{fmt(due)}</div>
              </div>
            </div>

            {/* Услуги */}
            <Section icon={<Briefcase className="h-4 w-4" />} title="Услуги" count={services.length}>
              <ItemTable items={services} kind="service" />
            </Section>

            {/* Материалы */}
            <Section icon={<Package className="h-4 w-4" />} title="Материалы" count={materials.length}>
              <ItemTable items={materials} kind="material" />
            </Section>

            {/* Прочее */}
            {other.length > 0 && (
              <Section icon={<FileText className="h-4 w-4" />} title="Прочее" count={other.length}>
                <ItemTable items={other} kind="other" />
              </Section>
            )}

            {/* Итоги */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/5 p-4 space-y-2">
              <Row label="Подытог" value={fmt(Number(data.subtotal || 0))} />
              {Number(data.discount || 0) > 0 && <Row label="Скидка" value={`− ${fmt(Number(data.discount))}`} cls="text-orange-400" />}
              {Number(data.tax || 0) > 0 && <Row label="Налог" value={fmt(Number(data.tax))} />}
              <Separator className="my-1" />
              <Row label="Итого к оплате" value={fmt(Number(data.total))} big />
            </div>

            {/* Платежи */}
            <Section icon={<CreditCard className="h-4 w-4" />} title="Платежи" count={payments.length}>
              {payments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Платежей пока нет</div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => {
                    const m = methodLabels[p.payment_method] || { label: p.payment_method, icon: CreditCard, cls: '' };
                    const Icon = m.icon;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0', m.cls)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{m.label}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {format(new Date(p.paid_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                              {p.creator?.full_name && ` · ${p.creator.full_name}`}
                              {p.reference_number && ` · №${p.reference_number}`}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold whitespace-nowrap">{fmt(Number(p.amount))}</div>
                      </div>
                    );
                  })}

                  <div className="grid gap-2 sm:grid-cols-3 pt-2">
                    <SumChip icon={<Banknote className="h-3.5 w-3.5" />} label="Деньги (нал/карта)" value={fmt(cashTotal)} />
                    <SumChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Бонусы" value={fmt(pointsUsed)} accent="purple" />
                    <SumChip icon={<Gift className="h-3.5 w-3.5" />} label="Сертификат" value={fmt(certUsed)} accent="pink" />
                  </div>
                </div>
              )}
            </Section>

            {data.notes && (
              <div className="rounded-lg border border-border bg-card/40 p-3 text-sm">
                <div className="text-xs uppercase text-muted-foreground mb-1">Примечание</div>
                <div className="whitespace-pre-wrap">{data.notes}</div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
        {typeof count === 'number' && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      {children}
    </div>
  );
}

function ItemTable({ items, kind }: { items: any[]; kind: 'service' | 'material' | 'other' }) {
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">Нет позиций</div>;
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-card/60 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Название</th>
            <th className="text-right px-3 py-2 font-medium w-20">Кол-во</th>
            <th className="text-right px-3 py-2 font-medium w-28">Цена</th>
            <th className="text-right px-3 py-2 font-medium w-28">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-border/50">
              <td className="px-3 py-2">
                {it.description}
                {kind === 'material' && it.inventory?.unit && <span className="text-xs text-muted-foreground ml-1">({it.inventory.unit})</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{Number(it.quantity)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(Number(it.unit_price))}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(it.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value, cls, big }: { label: string; value: string; cls?: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', big && 'font-semibold')}>{label}</span>
      <span className={cn('tabular-nums', big ? 'text-xl font-bold text-primary' : 'font-medium', cls)}>{value}</span>
    </div>
  );
}

function SumChip({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: 'purple' | 'pink' }) {
  return (
    <div className={cn(
      'rounded-lg border bg-card/40 p-2.5',
      accent === 'purple' && 'border-purple-500/30',
      accent === 'pink' && 'border-pink-500/30',
      !accent && 'border-border',
    )}>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
