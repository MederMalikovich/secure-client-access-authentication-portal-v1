import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Export invoices+payments to 1C-compatible CSV (UTF-8 with BOM, semicolon-separated).
 */
export async function exportTo1C(opts?: { from?: Date; to?: Date }): Promise<void> {
  let q = supabase
    .from('invoices')
    .select(
      'id, invoice_number, issued_at, status, subtotal, discount, total, notes, client_id, clients(full_name, client_number, phone), invoice_items(description, quantity, unit_price, total), payments(amount, payment_method, paid_at)'
    )
    .order('issued_at', { ascending: true });

  if (opts?.from) q = q.gte('issued_at', opts.from.toISOString());
  if (opts?.to) q = q.lte('issued_at', opts.to.toISOString());

  const { data, error } = await q;
  if (error) throw error;

  const sep = ';';
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    const needs = /[";\n\r]/.test(s);
    const safe = s.replace(/"/g, '""');
    return needs ? `"${safe}"` : safe;
  };

  const header = [
    'Номер счёта', 'Дата', 'Дата оплаты', 'Статус',
    'Клиент', 'Код клиента', 'Телефон',
    'Наименование', 'Кол-во', 'Цена', 'Сумма',
    'Скидка по счёту', 'Итого по счёту', 'Оплачено', 'Способ оплаты',
  ];

  const rows: string[] = [header.map(esc).join(sep)];

  for (const inv of (data || []) as any[]) {
    const items: any[] = inv.invoice_items || [];
    const payments: any[] = inv.payments || [];
    const paidSum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const lastPaidAt = payments
      .map((p: any) => p.paid_at)
      .filter(Boolean)
      .sort()
      .pop();
    const methods = Array.from(new Set(payments.map((p: any) => p.payment_method))).join(', ');
    const client = inv.clients || {};
    const baseCols = [
      inv.invoice_number,
      inv.issued_at ? format(new Date(inv.issued_at), 'yyyy-MM-dd HH:mm') : '',
      lastPaidAt ? format(new Date(lastPaidAt), 'yyyy-MM-dd HH:mm') : '',
      inv.status,
      client.full_name || '',
      client.client_number || '',
      client.phone || '',
    ];
    if (items.length === 0) {
      rows.push([
        ...baseCols, '', '', '', '',
        inv.discount ?? 0, inv.total ?? 0, paidSum, methods,
      ].map(esc).join(sep));
    } else {
      items.forEach((it: any, idx: number) => {
        rows.push([
          ...baseCols,
          it.description, it.quantity, it.unit_price, it.total,
          idx === 0 ? (inv.discount ?? 0) : '',
          idx === 0 ? (inv.total ?? 0) : '',
          idx === 0 ? paidSum : '',
          idx === 0 ? methods : '',
        ].map(esc).join(sep));
      });
    }
  }

  const csv = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `1c-export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
