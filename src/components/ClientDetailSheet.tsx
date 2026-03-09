import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Phone, Mail, MapPin, PawPrint, FileText, DollarSign,
  Calendar, Plus, Pencil, Hash, Clock, ChevronRight,
  TrendingUp, AlertCircle, CheckCircle2, CircleDot
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { speciesLabels, paymentStatusLabels, appointmentStatusLabels } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';

interface ClientDetailSheetProps {
  client: any;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddAppointment?: (clientId: string, petId?: string) => void;
}

const statusColors: Record<string, string> = {
  pending: 'text-foreground bg-muted',
  partial: 'text-foreground bg-secondary',
  paid: 'text-primary bg-primary/10',
  refunded: 'text-muted-foreground bg-muted',
  cancelled: 'text-muted-foreground bg-muted',
};

const apptStatusColors: Record<string, string> = {
  scheduled: 'text-foreground bg-secondary',
  confirmed: 'text-primary bg-primary/10',
  in_progress: 'text-foreground bg-muted',
  completed: 'text-primary bg-primary/15',
  cancelled: 'text-muted-foreground bg-muted',
  no_show: 'text-destructive bg-destructive/10',
};

export function ClientDetailSheet({ client, open, onClose, onEdit, onAddAppointment }: ClientDetailSheetProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client?.id) {
      fetchClientData(client.id);
    }
  }, [open, client?.id]);

  const fetchClientData = async (clientId: string) => {
    setLoading(true);
    try {
      const [apptRes, invoiceRes] = await Promise.all([
        supabase
          .from('appointments')
          .select(`*, pet:pets(id, name, species, breed), service:services(name), veterinarian:profiles(full_name)`)
          .eq('client_id', clientId)
          .order('scheduled_at', { ascending: false })
          .limit(20),
        supabase
          .from('invoices')
          .select(`*, pet:pets(name), items:invoice_items(*)`)
          .eq('client_id', clientId)
          .order('issued_at', { ascending: false })
          .limit(20),
      ]);
      setAppointments(apptRes.data || []);
      setInvoices(invoiceRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const totalDebt = invoices
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .reduce((sum, i) => sum + (i.total - (i.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0)), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  const upcomingAppts = appointments.filter(a =>
    ['scheduled', 'confirmed'].includes(a.status) && new Date(a.scheduled_at) >= new Date()
  );

  const getSpeciesEmoji = (species: string) => {
    const emojis: Record<string, string> = { dog: '🐕', cat: '🐈', bird: '🐦', rodent: '🐹', reptile: '🦎', fish: '🐟', other: '🐾' };
    return emojis[species] || '🐾';
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-border">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-primary">
                    {client.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <SheetTitle className="text-xl">{client.full_name}</SheetTitle>
                  {client.client_number && (
                    <div className="flex items-center gap-1 mt-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-mono">{client.client_number}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap gap-4 mt-4">
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                {client.phone}
              </a>
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </a>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {client.address}
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-background/60 rounded-xl p-3 text-center">
              <div className="text-lg font-bold">{client.pets?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Питомцев</div>
            </div>
            <div className="bg-background/60 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-primary">{formatCurrency(totalPaid)}</div>
              <div className="text-xs text-muted-foreground">Оплачено</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${totalDebt > 0 ? 'bg-destructive/10' : 'bg-background/60'}`}>
              <div className={`text-lg font-bold ${totalDebt > 0 ? 'text-destructive' : ''}`}>
                {totalDebt > 0 ? formatCurrency(totalDebt) : '—'}
              </div>
              <div className="text-xs text-muted-foreground">Долг</div>
            </div>
          </div>
        </div>

        {/* Upcoming appointments alert */}
        {upcomingAppts.length > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-accent border border-border flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">
              Ближайший приём: {format(new Date(upcomingAppts[0].scheduled_at), 'd MMM, HH:mm', { locale: ru })}
              {upcomingAppts[0].pet && ` — ${upcomingAppts[0].pet.name}`}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="p-4">
          <Tabs defaultValue="pets">
            <TabsList className="w-full">
              <TabsTrigger value="pets" className="flex-1">
                <PawPrint className="h-4 w-4 mr-1.5" />
                Питомцы
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex-1">
                <Calendar className="h-4 w-4 mr-1.5" />
                Визиты
              </TabsTrigger>
              <TabsTrigger value="finances" className="flex-1">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Финансы
              </TabsTrigger>
            </TabsList>

            {/* Pets tab */}
            <TabsContent value="pets" className="mt-4 space-y-2">
              {client.pets?.length > 0 ? (
                client.pets.map((pet: any) => (
                  <Card key={pet.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getSpeciesEmoji(pet.species)}</span>
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {speciesLabels[pet.species as keyof typeof speciesLabels]}
                            {pet.breed && ` • ${pet.breed}`}
                          </p>
                        </div>
                      </div>
                      {onAddAppointment && (
                        <Button size="sm" variant="outline" onClick={() => onAddAppointment(client.id, pet.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Записать
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PawPrint className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет питомцев</p>
                </div>
              )}
            </TabsContent>

            {/* Appointments tab */}
            <TabsContent value="appointments" className="mt-4 space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
              ) : appointments.length > 0 ? (
                appointments.map((appt) => (
                  <Card key={appt.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {appt.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : appt.status === 'cancelled' ? (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <CircleDot className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {appt.pet ? `${getSpeciesEmoji(appt.pet.species)} ${appt.pet.name}` : '—'}
                              </span>
                              {appt.service && (
                                <span className="text-xs text-muted-foreground">• {appt.service.name}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(appt.scheduled_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                              {appt.veterinarian && ` • ${appt.veterinarian.full_name}`}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-xs shrink-0 ${apptStatusColors[appt.status] || ''}`}>
                          {appointmentStatusLabels[appt.status as keyof typeof appointmentStatusLabels]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет визитов</p>
                </div>
              )}

              {onAddAppointment && (
                <Button className="w-full" variant="outline" onClick={() => onAddAppointment(client.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Записать на приём
                </Button>
              )}
            </TabsContent>

            {/* Finances tab */}
            <TabsContent value="finances" className="mt-4 space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Всего оплачено</p>
                      <p className="font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`p-3 flex items-center gap-3 ${totalDebt > 0 ? 'bg-red-50' : ''}`}>
                    <DollarSign className={`h-8 w-8 shrink-0 ${totalDebt > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Задолженность</p>
                      <p className={`font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {totalDebt > 0 ? formatCurrency(totalDebt) : 'Нет'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm font-mono">{inv.invoice_number}</span>
                            {inv.pet && <span className="text-xs text-muted-foreground">• {inv.pet.name}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(inv.issued_at), 'd MMM yyyy', { locale: ru })}
                            {inv.items && ` • ${inv.items.length} позиц.`}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-sm">{formatCurrency(inv.total)}</span>
                          <Badge className={`text-xs ${statusColors[inv.status] || ''}`}>
                            {paymentStatusLabels[inv.status as keyof typeof paymentStatusLabels]}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет счетов</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {client.notes && (
            <div className="mt-4 p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Примечания</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            Зарегистрирован {format(new Date(client.created_at), 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
