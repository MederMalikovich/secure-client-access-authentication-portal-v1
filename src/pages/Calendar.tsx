import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, AppointmentStatus, appointmentStatusLabels, Client, Pet, Service, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export default function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [clientSearch, setClientSearch] = useState('');
  const [petSearch, setPetSearch] = useState('');

  const [formData, setFormData] = useState({
    client_id: '',
    pet_id: '',
    veterinarian_id: '',
    service_id: '',
    scheduled_at: '',
    duration_minutes: '30',
    status: 'scheduled' as AppointmentStatus,
    notes: '',
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    try {
      const weekEnd = addDays(weekStart, 7);
      
      const [appointmentsRes, clientsRes, petsRes, servicesRes, vetsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            client:clients(id, full_name),
            pet:pets(id, name),
            service:services(id, name),
            veterinarian:profiles(id, full_name)
          `)
          .gte('scheduled_at', weekStart.toISOString())
          .lt('scheduled_at', weekEnd.toISOString())
          .order('scheduled_at'),
        supabase.from('clients').select('id, full_name').order('full_name'),
        supabase.from('pets').select('id, name, client_id').order('name'),
        supabase.from('services').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      
      setAppointments(appointmentsRes.data || []);
      setClients(clientsRes.data || []);
      setPets(petsRes.data || []);
      setServices(servicesRes.data || []);
      setVets(vetsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validation = validateForm(appointmentSchema, formData);
    if (!validation.success) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validation.error });
      return;
    }

    const data = {
      ...formData,
      scheduled_at: new Date(formData.scheduled_at).toISOString(),
      duration_minutes: parseInt(formData.duration_minutes),
      veterinarian_id: formData.veterinarian_id || null,
      service_id: formData.service_id || null,
    };

    try {
      if (selectedAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update(data)
          .eq('id', selectedAppointment.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Запись обновлена' });
      } else {
        const { error } = await supabase.from('appointments').insert(data);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Запись создана' });
      }
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

  const handleStatusChange = async (appointment: Appointment, status: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointment.id);
      if (error) throw error;
      toast({ title: 'Статус обновлён' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      client_id: appointment.client_id,
      pet_id: appointment.pet_id,
      veterinarian_id: appointment.veterinarian_id || '',
      service_id: appointment.service_id || '',
      scheduled_at: format(parseISO(appointment.scheduled_at), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: appointment.duration_minutes.toString(),
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAppointment(null);
    setFormData({
      client_id: '',
      pet_id: '',
      veterinarian_id: '',
      service_id: '',
      scheduled_at: '',
      duration_minutes: '30',
      status: 'scheduled',
      notes: '',
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    const colors: Record<AppointmentStatus, string> = {
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-primary/20 text-primary border-primary/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      no_show: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status];
  };

  const getAppointmentsForDayAndHour = (day: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduled_at);
      return isSameDay(aptDate, day) && aptDate.getHours() === hour;
    });
  };

  const filteredPets = formData.client_id
    ? pets.filter((p) => p.client_id === formData.client_id)
    : pets;
  
  const searchedPets = petSearch
    ? filteredPets.filter(p => p.name.toLowerCase().includes(petSearch.toLowerCase()))
    : filteredPets;

  const searchedClients = clientSearch
    ? clients.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', selectedAppointment.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Запись удалена' });
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  return (
    <div>
      <PageHeader
        title="Календарь записей"
        description="Управление расписанием приёмов"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Календарь' },
        ]}
        actions={
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Новая запись
          </Button>
        }
      />

      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(weekStart, 'd MMM', { locale: ru })} —{' '}
            {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
          Сегодня
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-2 text-center text-xs text-muted-foreground">
              <Clock className="h-4 w-4 mx-auto" />
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-2 text-center border-l border-border',
                  isSameDay(day, new Date()) && 'bg-primary/10'
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isSameDay(day, new Date()) && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border">
                <div className="p-2 text-xs text-muted-foreground text-center">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDayAndHour(day, hour);
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        'p-1 min-h-[60px] border-l border-border',
                        isSameDay(day, new Date()) && 'bg-primary/5'
                      )}
                    >
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => openEditDialog(apt)}
                          className={cn(
                            'p-1.5 rounded text-xs cursor-pointer border transition-all hover:scale-[1.02]',
                            getStatusColor(apt.status)
                          )}
                        >
                          <div className="font-medium truncate">
                            {format(parseISO(apt.scheduled_at), 'HH:mm')}
                          </div>
                          <div className="truncate">
                            {(apt as any).pet?.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Редактировать запись' : 'Новая запись'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Клиент *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, client_id: v, pet_id: '' });
                  setClientSearch('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Поиск клиента..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {searchedClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Питомец *</Label>
              <Select
                value={formData.pet_id}
                onValueChange={(v) => {
                  setFormData({ ...formData, pet_id: v });
                  setPetSearch('');
                }}
                disabled={!formData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.client_id ? "Выберите питомца" : "Сначала выберите клиента"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Поиск по кличке..."
                      value={petSearch}
                      onChange={(e) => setPetSearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {searchedPets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name}
                    </SelectItem>
                  ))}
                  {searchedPets.length === 0 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {formData.client_id ? 'Нет питомцев у этого клиента' : 'Выберите клиента'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ветеринар</Label>
              <Select
                value={formData.veterinarian_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, veterinarian_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите врача" />
                </SelectTrigger>
                <SelectContent>
                  {vets.map((vet) => (
                    <SelectItem key={vet.id} value={vet.id}>
                      {vet.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Услуга</Label>
              <Select
                value={formData.service_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, service_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Дата и время *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_at: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Длительность (мин)</Label>
              <Select
                value={formData.duration_minutes}
                onValueChange={(v) =>
                  setFormData({ ...formData, duration_minutes: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 минут</SelectItem>
                  <SelectItem value="30">30 минут</SelectItem>
                  <SelectItem value="45">45 минут</SelectItem>
                  <SelectItem value="60">1 час</SelectItem>
                  <SelectItem value="90">1.5 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedAppointment && (
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData({ ...formData, status: v as AppointmentStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(appointmentStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2 md:col-span-2">
              <Label>Заметки</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedAppointment && (
              <Button
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => {
                  setDialogOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {selectedAppointment ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteAppointment}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
