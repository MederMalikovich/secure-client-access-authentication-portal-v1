import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, QrCode, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { getUserFriendlyError } from '@/lib/errorHandler';

interface OnlinePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: { id: string; invoice_number: string; total: number } | null;
  onPaid?: () => void;
}

export function OnlinePaymentDialog({ open, onOpenChange, invoice, onPaid }: OnlinePaymentDialogProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  if (!invoice) return null;

  const qrPayload = `INVOICE:${invoice.invoice_number};AMOUNT:${invoice.total};CUR:KZT`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(qrPayload)}`;

  const handlePay = async (method: 'card_online' | 'qr_online') => {
    if (!invoice) return;
    setProcessing(true);
    try {
      // Demo: simulate gateway delay
      await new Promise((r) => setTimeout(r, 1200));

      const { error: payErr } = await supabase.from('payments').insert({
        invoice_id: invoice.id,
        amount: invoice.total,
        payment_method: method,
        notes: method === 'qr_online' ? 'Демо: оплата по QR компании' : 'Демо: оплата картой онлайн',
      });
      if (payErr) throw payErr;

      const { error: invErr } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id);
      if (invErr) throw invErr;

      setSuccess(true);
      toast({ title: 'Оплата прошла успешно', description: `Счёт #${invoice.invoice_number} оплачен` });
      onPaid?.();
      setTimeout(() => {
        setSuccess(false);
        setCard({ number: '', name: '', expiry: '', cvv: '' });
        onOpenChange(false);
      }, 1600);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка оплаты', description: getUserFriendlyError(e) });
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Онлайн-оплата счёта
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>Счёт #{invoice.invoice_number}</span>
            <Badge variant="secondary">Демо-режим</Badge>
            <span className="ml-auto font-semibold text-foreground">{formatCurrency(invoice.total)}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <p className="text-lg font-semibold">Оплата подтверждена</p>
            <p className="text-sm text-muted-foreground">Спасибо! Чек отправлен на ваш контакт.</p>
          </div>
        ) : (
          <Tabs defaultValue="qr">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr" className="gap-2"><QrCode className="h-4 w-4" />QR компании</TabsTrigger>
              <TabsTrigger value="card" className="gap-2"><CreditCard className="h-4 w-4" />Картой</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-3 pt-3">
              <div className="rounded-lg border border-border bg-background p-4 flex flex-col items-center gap-3">
                <img src={qrUrl} alt="QR оплаты" className="rounded-md" width={220} height={220} />
                <p className="text-xs text-muted-foreground text-center">
                  Отсканируйте QR-код в приложении банка (Kaspi / Halyk / любой банк KZ),
                  подтвердите сумму и завершите оплату.
                </p>
              </div>
              <Button className="w-full" onClick={() => handlePay('qr_online')} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Я оплатил(а) — подтвердить
              </Button>
            </TabsContent>

            <TabsContent value="card" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label className="text-xs">Номер карты</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Имя держателя</Label>
                <Input
                  placeholder="IVAN IVANOV"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Срок (ММ/ГГ)</Label>
                  <Input
                    placeholder="12/27"
                    maxLength={5}
                    value={card.expiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCard({ ...card, expiry: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CVV</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="•••"
                    value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={processing || card.number.replace(/\s/g, '').length < 16 || card.cvv.length < 3 || card.expiry.length < 5}
                onClick={() => handlePay('card_online')}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Оплатить {formatCurrency(invoice.total)}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Демо-режим. Реальные списания произойдут после подключения виртуального POS-терминала банка.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
