import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, FileText, CreditCard, Plus, PawPrint, Stethoscope, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { appointmentStatusLabels, paymentStatusLabels, speciesLabels } from '@/lib/types';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Working hours config
const WORKING_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null, // Sunday off
  1: { start: 9, end: 18 },
  2: { start: 9, end: 18 },
  3: { start: 9, end: 18 },
  4: { start: 9, end: 18 },
  5: { start: 9, end: 18 },
  6: { start: 9, end: 15 }, // Saturday short
};

export default function ClientPortal() {
  const { profile } = useAuth();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('visits');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPetId, setBookingPetId] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingVetId, setBookingVetId] = useState('any');
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingCustomTime, setBookingCustomTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Invoice detail state
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const clientId = profile?.client_id;

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  useEffect(() => {
    if (bookingDate && bookingVetId) {
      fetchAvailableSlots();
    }
  }, [bookingDate, bookingVetId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, invRes, petsRes, svcRes, vetsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, pets(name, species), services(name), profiles!appointments_veterinarian_id_fkey(full_name)')
          .eq('client_id', clientId!)
          .order('scheduled_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*, pets(name)')
          .eq('client_id', clientId!)
          .order('issued_at', { ascending: false }),
        supabase
          .from('pets')
          .select('*')
          .eq('client_id', clientId!),
        supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', (await supabase.from('user_roles').select('user_id').eq('role', 'veterinarian')).data?.map(r => r.user_id) || []),
      ]);

      setAppointments(apptRes.data || []);
      setInvoices(invRes.data || []);
      setPets(petsRes.data || []);
      setServices(svcRes.data || []);
      setVets(vetsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!bookingDate || !bookingVetId) return;

    const dayOfWeek = bookingDate.getDay();
    const hours = WORKING_HOURS[dayOfWeek];
    if (!hours) {
      setAvailableSlots([]);
      return;
    }

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('appointments')
      .select('scheduled_at, duration_minutes, veterinarian_id')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .not('status', 'eq', 'cancelled');

    if (bookingVetId !== 'any') {
      query = query.eq('veterinarian_id', bookingVetId);
    }

    const { data: existing } = await query;

    if (bookingVetId === 'any') {
      // For "any vet": a slot is available if at least one vet is free
      const vetIds = vets.map(v => v.id);
      const slots: string[] = [];
      for (let h = hours.start; h < hours.end; h++) {
        for (const m of ['00', '30']) {
          const slotKey = `${h}:${m}`;
          const busyVets = new Set(
            (existing || [])
              .filter(a => {
                const d = new Date(a.scheduled_at);
                return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` === slotKey;
              })
              .map(a => a.veterinarian_id)
          );
          if (vetIds.some(id => !busyVets.has(id))) {
            slots.push(`${h.toString().padStart(2, '0')}:${m}`);
          }
        }
      }
      setAvailableSlots(slots);
    } else {
      const bookedTimes = new Set(
        (existing || []).map(a => {
          const d = new Date(a.scheduled_at);
          return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        })
      );
      const slots: string[] = [];
      for (let h = hours.start; h < hours.end; h++) {
        for (const m of ['00', '30']) {
          const slot = `${h}:${m}`;
          if (!bookedTimes.has(slot)) {
            slots.push(`${h.toString().padStart(2, '0')}:${m}`);
          }
        }
      }
      setAvailableSlots(slots);
    }
    setBookingTime('');
    setBookingCustomTime('');
  };

  const handleBooking = async () => {
    if (!bookingPetId || !bookingServiceId || !bookingVetId || !bookingDate || !bookingTime) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setBookingLoading(true);
    try {
      const [hours, minutes] = bookingTime.split(':').map(Number);
      const scheduledAt = new Date(bookingDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      let assignedVetId = bookingVetId;

      if (bookingVetId === 'any') {
        // Find a free vet for this slot
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from('appointments')
          .select('veterinarian_id, scheduled_at')
          .gte('scheduled_at', startOfDay.toISOString())
          .lte('scheduled_at', endOfDay.toISOString())
          .not('status', 'eq', 'cancelled');

        const slotKey = `${hours}:${minutes.toString().padStart(2, '0')}`;
        const busyVets = new Set(
          (existing || [])
            .filter(a => {
              const d = new Date(a.scheduled_at);
              return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` === slotKey;
            })
            .map(a => a.veterinarian_id)
        );

        const freeVet = vets.find(v => !busyVets.has(v.id));
        if (!freeVet) {
          toast({ title: 'Нет свободных врачей на это время', variant: 'destructive' });
          setBookingLoading(false);
          return;
        }
        assignedVetId = freeVet.id;
      }

      const { error } = await supabase.from('appointments').insert({
        client_id: clientId!,
        pet_id: bookingPetId,
        service_id: bookingServiceId,
        veterinarian_id: assignedVetId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
        notes: bookingNotes || null,
        duration_minutes: 30,
      });

      if (error) throw error;

      toast({ title: 'Запись создана!', description: `На ${format(scheduledAt, 'dd MMMM в HH:mm', { locale: ru })}` });
      setBookingOpen(false);
      resetBookingForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBookingForm = () => {
    setBookingPetId('');
    setBookingServiceId('');
    setBookingVetId('any');
    setBookingDate(undefined);
    setBookingTime('');
    setBookingCustomTime('');
    setBookingNotes('');
  };

  const fetchInvoiceDetails = async (invoice: any) => {
    setSelectedInvoice(invoice);
    const { data } = await supabase
      .from('invoice_items')
      .select('*, services(name)')
      .eq('invoice_id', invoice.id);
    setInvoiceItems(data || []);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
      confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      in_progress: 'bg-amber-500/10 text-amber-600 border-amber-200',
      completed: 'bg-green-500/10 text-green-600 border-green-200',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
      no_show: 'bg-muted text-muted-foreground border-border',
    };
    return <Badge variant="outline" className={colors[status] || ''}>{appointmentStatusLabels[status as keyof typeof appointmentStatusLabels] || status}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
      partial: 'bg-blue-500/10 text-blue-600 border-blue-200',
      paid: 'bg-green-500/10 text-green-600 border-green-200',
      refunded: 'bg-muted text-muted-foreground border-border',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return <Badge variant="outline" className={colors[status] || ''}>{paymentStatusLabels[status as keyof typeof paymentStatusLabels] || status}</Badge>;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return WORKING_HOURS[date.getDay()] === null;
  };

  const upcomingAppointments = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled');
  const pastAppointments = appointments.filter(a => new Date(a.scheduled_at) < new Date() || a.status === 'completed');
  const unpaidInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'partial');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мой кабинет"
        description="Визиты, записи и счета"
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
              <p className="text-sm text-muted-foreground">Предстоящих визитов</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <PawPrint className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pets.length}</p>
              <p className="text-sm text-muted-foreground">Питомцев</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unpaidInvoices.length}</p>
              <p className="text-sm text-muted-foreground">Неоплаченных счетов</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visits" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Визиты</span>
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Записаться</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Счета</span>
          </TabsTrigger>
        </TabsList>

        {/* VISITS TAB */}
        <TabsContent value="visits" className="space-y-4">
          {upcomingAppointments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Предстоящие
              </h3>
              {upcomingAppointments.map(appt => (
                <Card key={appt.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {format(new Date(appt.scheduled_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                          </span>
                          {getStatusBadge(appt.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appt.pets?.name} • {appt.services?.name || 'Услуга не указана'}
                        </p>
                        {appt.profiles?.full_name && (
                          <p className="text-sm text-muted-foreground">
                            <Stethoscope className="h-3 w-3 inline mr-1" />
                            Врач: {appt.profiles.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              История визитов
            </h3>
            {pastAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  История визитов пуста
                </CardContent>
              </Card>
            ) : (
              pastAppointments.map(appt => (
                <Card key={appt.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(new Date(appt.scheduled_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                          </span>
                          {getStatusBadge(appt.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appt.pets?.name} • {appt.services?.name || 'Услуга не указана'}
                        </p>
                        {appt.profiles?.full_name && (
                          <p className="text-sm text-muted-foreground">Врач: {appt.profiles.full_name}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* BOOKING TAB */}
        <TabsContent value="booking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Онлайн-запись на приём
              </CardTitle>
              <CardDescription>Выберите питомца, услугу, врача и удобное время</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Питомец *</Label>
                  <Select value={bookingPetId} onValueChange={setBookingPetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите питомца" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map(pet => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({speciesLabels[pet.species as keyof typeof speciesLabels]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Услуга *</Label>
                  <Select value={bookingServiceId} onValueChange={setBookingServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите услугу" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(svc => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name} — {formatCurrency(svc.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Врач *</Label>
                  <Select value={bookingVetId} onValueChange={setBookingVetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите врача" />
                    </SelectTrigger>
                    <SelectContent>
                      {vets.map(vet => (
                        <SelectItem key={vet.id} value={vet.id}>
                          {vet.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Дата *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !bookingDate && 'text-muted-foreground')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {bookingDate ? format(bookingDate, 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={bookingDate}
                        onSelect={setBookingDate}
                        disabled={isDateDisabled}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {bookingDate && bookingVetId && (
                <div className="space-y-2">
                  <Label>Время *</Label>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет доступных слотов на эту дату</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map(slot => (
                        <Button
                          key={slot}
                          variant={bookingTime === slot ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBookingTime(slot)}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Опишите причину визита..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleBooking}
                disabled={bookingLoading || !bookingPetId || !bookingServiceId || !bookingVetId || !bookingDate || !bookingTime}
                className="w-full sm:w-auto"
              >
                {bookingLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Записаться на приём
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          {unpaidInvoices.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                К оплате
              </h3>
              {unpaidInvoices.map(inv => (
                <Card key={inv.id} className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => fetchInvoiceDetails(inv)}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Счёт #{inv.invoice_number}</span>
                          {getPaymentBadge(inv.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(inv.issued_at), 'dd MMMM yyyy', { locale: ru })}
                          {inv.pets?.name && ` • ${inv.pets.name}`}
                        </p>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(inv.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Все счета
            </h3>
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Счетов пока нет
                </CardContent>
              </Card>
            ) : (
              invoices.map(inv => (
                <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => fetchInvoiceDetails(inv)}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Счёт #{inv.invoice_number}</span>
                          {getPaymentBadge(inv.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(inv.issued_at), 'dd MMMM yyyy', { locale: ru })}
                          {inv.pets?.name && ` • ${inv.pets.name}`}
                        </p>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(inv.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice detail dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Счёт #{selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && format(new Date(selectedInvoice.issued_at), 'dd MMMM yyyy', { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {invoiceItems.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            {selectedInvoice && (
              <div className="space-y-1 pt-2 border-t border-border">
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Скидка</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Итого</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="pt-2">
                  {getPaymentBadge(selectedInvoice.status)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
