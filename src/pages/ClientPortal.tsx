import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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
import { Calendar, Clock, FileText, CreditCard, Plus, PawPrint, Stethoscope, CheckCircle2, AlertCircle, Loader2, Gift, Sparkles, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { appointmentStatusLabels, paymentStatusLabels, speciesLabels } from '@/lib/types';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { useWorkingHours, generateDaySlots, isDayWorking } from '@/hooks/useWorkingHours';
import { getUserFriendlyError } from '@/lib/errorHandler';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
type PetRow = Database['public']['Tables']['pets']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];

type ClientPortalAppointment = AppointmentRow & {
  pets: Pick<PetRow, 'name' | 'species'> | null;
  services: Pick<ServiceRow, 'name'> | null;
  profiles: { full_name: string } | null;
};

type ClientPortalInvoice = InvoiceRow & {
  pets: Pick<PetRow, 'name'> | null;
};

type ClientPortalInvoiceItem = InvoiceItemRow & {
  services: Pick<ServiceRow, 'name'> | null;
};

type VeterinarianOption = {
  id: string;
  full_name: string;
};

export default function ClientPortal() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { workingHours } = useWorkingHours();

  // State
  const [activeTab, setActiveTab] = useState('visits');
  const [appointments, setAppointments] = useState<ClientPortalAppointment[]>([]);
  const [invoices, setInvoices] = useState<ClientPortalInvoice[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [vets, setVets] = useState<VeterinarianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loyaltyTxns, setLoyaltyTxns] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);

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
  const [selectedInvoice, setSelectedInvoice] = useState<ClientPortalInvoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<ClientPortalInvoiceItem[]>([]);

  const clientId = profile?.client_id;

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  useEffect(() => {
    if (bookingDate && bookingVetId && workingHours) {
      fetchAvailableSlots();
    }
  }, [bookingDate, bookingVetId, workingHours, vets]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, invRes, petsRes, svcRes, vetsRes, clientRes, txnsRes, certsRes] = await Promise.all([
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
        supabase.rpc('list_public_veterinarians'),
        supabase.from('clients').select('loyalty_balance, referral_code').eq('id', clientId!).maybeSingle(),
        supabase.from('loyalty_transactions').select('*').eq('client_id', clientId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('gift_certificates').select('*').eq('redeemed_by_client_id', clientId!).order('redeemed_at', { ascending: false }),
      ]);

      setAppointments((apptRes.data || []) as ClientPortalAppointment[]);
      setInvoices((invRes.data || []) as ClientPortalInvoice[]);
      setPets((petsRes.data || []) as PetRow[]);
      setServices((svcRes.data || []) as ServiceRow[]);
      setVets((vetsRes.data || []) as VeterinarianOption[]);
      setLoyaltyBalance(Number(clientRes.data?.loyalty_balance || 0));
      setReferralCode(clientRes.data?.referral_code || '');
      setLoyaltyTxns(txnsRes.data || []);
      setMyCertificates(certsRes.data || []);
    } catch {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные личного кабинета',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!bookingDate || !bookingVetId || !workingHours) return;

    const allSlots = generateDaySlots(workingHours, bookingDate);
    if (allSlots.length === 0) {
      setAvailableSlots([]);
      setBookingTime('');
      setBookingCustomTime('');
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
    const existingAppointments = (existing || []) as Pick<AppointmentRow, 'scheduled_at' | 'duration_minutes' | 'veterinarian_id'>[];

    const slotKeyOf = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const daySchedule = workingHours[bookingDate.getDay()];
    const slotDurationMinutes = daySchedule?.slot_duration_minutes || 30;

    const getSlotRange = (slot: string) => {
      const [hours, minutes] = slot.split(':').map(Number);
      const start = new Date(bookingDate);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + slotDurationMinutes);
      return { start, end };
    };

    const overlapsSlot = (appointment: Pick<AppointmentRow, 'scheduled_at' | 'duration_minutes' | 'veterinarian_id'>, slot: string) => {
      const appointmentStart = new Date(appointment.scheduled_at);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (appointment.duration_minutes || slotDurationMinutes));
      const { start, end } = getSlotRange(slot);
      return appointmentStart < end && appointmentEnd > start;
    };

    if (bookingVetId === 'any') {
      const vetIds = vets.map((v) => v.id);
      const slots = allSlots.filter((slot) => {
        const busyVets = new Set(
          (existing || [])
            .filter((a): a is Pick<AppointmentRow, 'scheduled_at' | 'duration_minutes' | 'veterinarian_id'> => !!a)
            .filter((a) => overlapsSlot(a, slot))
            .map((a) => a.veterinarian_id)
        );
        return vetIds.some((id) => !busyVets.has(id));
      });
      setAvailableSlots(slots);
    } else {
      const slots = allSlots.filter((slot) => !existingAppointments.some((a) => overlapsSlot(a, slot)));
      setAvailableSlots(slots);
    }
    setBookingTime('');
    setBookingCustomTime('');
  }, [bookingDate, bookingVetId, vets, workingHours]);

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

      const daySchedule = workingHours?.[bookingDate.getDay()];
      const slotDurationMinutes = daySchedule?.slot_duration_minutes || 30;

      if (!daySchedule?.is_working) {
        toast({ title: 'Клиника не работает в этот день', variant: 'destructive' });
        return;
      }

      const slotStart = new Date(scheduledAt);
      const slotEnd = new Date(scheduledAt);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);
      const [startHour, startMinute] = daySchedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = daySchedule.end_time.split(':').map(Number);
      const workStart = new Date(bookingDate);
      workStart.setHours(startHour, startMinute, 0, 0);
      const workEnd = new Date(bookingDate);
      workEnd.setHours(endHour, endMinute, 0, 0);

      if (slotStart < workStart || slotEnd > workEnd) {
        toast({ title: 'Время вне графика работы клиники', variant: 'destructive' });
        return;
      }

      let assignedVetId = bookingVetId;

      if (bookingVetId === 'any') {
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from('appointments')
          .select('veterinarian_id, scheduled_at, duration_minutes')
          .gte('scheduled_at', startOfDay.toISOString())
          .lte('scheduled_at', endOfDay.toISOString())
          .not('status', 'eq', 'cancelled');

        if (vets.length === 0) {
          toast({ title: 'Нет доступных врачей', variant: 'destructive' });
          return;
        }

        const busyVets = new Set(
          (existing || [])
            .filter((a) => {
              const appointmentStart = new Date(a.scheduled_at);
              const appointmentEnd = new Date(appointmentStart);
              appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (a.duration_minutes || slotDurationMinutes));
              return appointmentStart < slotEnd && appointmentEnd > slotStart;
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
      } else if (!availableSlots.includes(bookingTime)) {
        toast({ title: 'Это время уже занято', description: 'Выберите свободный слот из списка', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('appointments').insert({
        client_id: clientId!,
        pet_id: bookingPetId,
        service_id: bookingServiceId,
        veterinarian_id: assignedVetId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
        notes: bookingNotes || null,
        duration_minutes: slotDurationMinutes,
      });

      if (error) throw error;

      toast({ title: 'Запись создана!', description: `На ${format(scheduledAt, 'dd MMMM в HH:mm', { locale: ru })}` });
      setBookingOpen(false);
      resetBookingForm();
      fetchData();
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(err), variant: 'destructive' });
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

  const fetchInvoiceDetails = async (invoice: ClientPortalInvoice) => {
    setSelectedInvoice(invoice);
    const { data } = await supabase
      .from('invoice_items')
      .select('*, services(name)')
      .eq('invoice_id', invoice.id);
    setInvoiceItems((data || []) as ClientPortalInvoiceItem[]);
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
    return !isDayWorking(workingHours, date);
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
        <Card className="border-primary/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loyaltyBalance}</p>
              <p className="text-sm text-muted-foreground">Бонусных баллов</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
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
          <TabsTrigger value="loyalty" className="gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Бонусы</span>
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
                      <SelectItem value="any">🔄 Любой свободный врач</SelectItem>
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
                     <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={bookingDate}
                        onSelect={setBookingDate}
                        disabled={isDateDisabled}
                        locale={ru}
                         className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {bookingDate && bookingVetId && (
                <div className="space-y-3">
                  <Label>Время *</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Указать вручную</Label>
                      <TimePicker
                        value={bookingCustomTime}
                        onChange={(v) => {
                          setBookingCustomTime(v);
                          setBookingTime(v);
                        }}
                        startHour={6}
                        endHour={22}
                        minuteStep={5}
                      />
                    </div>
                  </div>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      На эту дату нет свободных слотов. Попробуйте выбрать другой день или укажите время вручную.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Или выберите из свободных:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.map(slot => (
                          <Button
                            key={slot}
                            variant={bookingTime === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setBookingTime(slot); setBookingCustomTime(slot); }}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
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
