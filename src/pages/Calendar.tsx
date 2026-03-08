import { useEffect, useState, useCallback, useRef, DragEvent } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { getValidationError, appointmentSchema } from '@/lib/validationSchemas';
import { format, startOfWeek, addDays, isSameDay, parseISO, isWeekend } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Ban } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, AppointmentStatus, appointmentStatusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

// Working hours config (Пн-Пт 9:00-18:00, Сб 9:00-15:00, Вс — выходной)
const WORK_START = 9;
const WORK_END_WEEKDAY = 18;
const WORK_END_SATURDAY = 15;
const SUNDAY = 0;
const SATURDAY = 6;

const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

function isWorkingSlot(day: Date, hour: number): boolean {
  const dayOfWeek = day.getDay();
  if (dayOfWeek === SUNDAY) return false;
  if (dayOfWeek === SATURDAY) return hour >= WORK_START && hour < WORK_END_SATURDAY;
  return hour >= WORK_START && hour < WORK_END_WEEKDAY;
}

function isNonWorkingDay(day: Date): boolean {
  return day.getDay() === SUNDAY;
}

export default function Calendar() {
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'veterinarian', 'registrar', 'manager']);
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
  const [clientSearch, setClientSearch] = useState('');
  const [petSearch, setPetSearch] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [showWorkload, setShowWorkload] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = getValidationError(appointmentSchema, formData);
    if (validationError) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validationError });
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

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      client_id: appointment.client_id,
      pet_id: appointment.pet_id,
      veterinarian_id: appointment.veterinarian_id || '',
      service_id: appointment.service_id || '',
      scheduled_at: format(parseISO(appointment.scheduled_at), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: (appointment.duration_minutes ?? 30).toString(),
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

  // --- Drag and Drop ---
  const handleDragStart = (e: DragEvent, appointment: any) => {
    if (!canManage) return;
    e.dataTransfer.setData('appointmentId', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    if (!isWorkingSlot(day, hour)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(`${day.toISOString()}-${hour}`);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e: DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!canManage || !isWorkingSlot(day, hour)) return;

    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (!appointmentId) return;

    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return;

    // Build new scheduled_at preserving minutes from original
    const originalDate = parseISO(apt.scheduled_at);
    const newDate = new Date(day);
    newDate.setHours(hour, originalDate.getMinutes(), 0, 0);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', appointmentId);
      if (error) throw error;
      toast({ title: 'Запись перенесена', description: `${(apt as any).pet?.name || 'Приём'} → ${format(newDate, 'EEE d MMM, HH:mm', { locale: ru })}` });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка переноса', description: getUserFriendlyError(error) });
    }
  };

  // --- Workload calculation ---
  const getVetWorkload = () => {
    const activeAppointments = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show');
    
    // Count working slots this week (for capacity)
    let totalWorkSlots = 0;
    weekDays.forEach(day => {
      hours.forEach(hour => {
        if (isWorkingSlot(day, hour)) totalWorkSlots++;
      });
    });

    const vetMap = new Map<string, { name: string; count: number; totalMinutes: number }>();

    activeAppointments.forEach(apt => {
      if (apt.veterinarian_id && (apt as any).veterinarian) {
        const vetId = apt.veterinarian_id;
        const existing = vetMap.get(vetId) || { name: (apt as any).veterinarian.full_name, count: 0, totalMinutes: 0 };
        existing.count++;
        existing.totalMinutes += apt.duration_minutes || 30;
        vetMap.set(vetId, existing);
      }
    });

    // Also include vets with 0 appointments
    vets.forEach(v => {
      if (!vetMap.has(v.id)) {
        vetMap.set(v.id, { name: v.full_name, count: 0, totalMinutes: 0 });
      }
    });

    const maxCapacityMinutes = totalWorkSlots * 60; // 1 hour per slot

    return Array.from(vetMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      count: data.count,
      totalMinutes: data.totalMinutes,
      loadPercent: maxCapacityMinutes > 0 ? Math.min(100, Math.round((data.totalMinutes / (maxCapacityMinutes / Math.max(vetMap.size, 1))) * 100)) : 0,
    })).sort((a, b) => b.count - a.count);
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

  const vetWorkload = getVetWorkload();

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkload(!showWorkload)}
            >
              <Users className="h-4 w-4 mr-2" />
              Загруженность
            </Button>
            {canManage && (
              <Button
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Новая запись
              </Button>
            )}
          </div>
        }
      />

      {/* Vet Workload Panel */}
      {showWorkload && vetWorkload.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Загруженность врачей на неделю
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vetWorkload.map((vet) => (
                <div key={vet.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{vet.name}</span>
                    <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                      {vet.count} зап. · {Math.floor(vet.totalMinutes / 60)}ч {vet.totalMinutes % 60}м
                    </span>
                  </div>
                  <Progress
                    value={vet.loadPercent}
                    className={cn(
                      "h-2",
                      vet.loadPercent > 80 && "[&>div]:bg-red-500",
                      vet.loadPercent > 50 && vet.loadPercent <= 80 && "[&>div]:bg-yellow-500",
                      vet.loadPercent <= 50 && "[&>div]:bg-green-500"
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-4">
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
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <div className="w-3 h-3 rounded bg-muted-foreground/10 border border-dashed border-muted-foreground/30" />
            <span>Нерабочее время</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Сегодня
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
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
                  isSameDay(day, new Date()) && 'bg-primary/10',
                  isNonWorkingDay(day) && 'bg-muted/50'
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isSameDay(day, new Date()) && 'text-primary',
                    isNonWorkingDay(day) && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
                {isNonWorkingDay(day) && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5 text-muted-foreground border-muted-foreground/30">
                    Выходной
                  </Badge>
                )}
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
                  const working = isWorkingSlot(day, hour);
                  const slotKey = `${day.toISOString()}-${hour}`;
                  const isDragOver = dragOverSlot === slotKey;
                  
                  return (
                    <div
                      key={slotKey}
                      className={cn(
                        'p-1 min-h-[60px] border-l border-border transition-colors relative',
                        isSameDay(day, new Date()) && working && 'bg-primary/5',
                        !working && 'bg-muted/30',
                        isDragOver && working && 'bg-primary/20 ring-1 ring-primary/40 ring-inset',
                        isDragOver && !working && 'bg-destructive/10'
                      )}
                      onDragOver={(e) => handleDragOver(e, day, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    >
                      {!working && dayAppointments.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                          <Ban className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {dayAppointments.map((apt) => (
                        <Tooltip key={apt.id}>
                          <TooltipTrigger asChild>
                            <div
                              draggable={canManage}
                              onDragStart={(e) => handleDragStart(e, apt)}
                              onClick={() => openEditDialog(apt)}
                              className={cn(
                                'p-1.5 rounded text-xs border transition-all hover:scale-[1.02] mb-0.5',
                                canManage && 'cursor-grab active:cursor-grabbing',
                                !canManage && 'cursor-pointer',
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
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[200px]">
                            <div className="text-xs space-y-1">
                              <div className="font-semibold">{(apt as any).pet?.name}</div>
                              <div>Клиент: {(apt as any).client?.full_name}</div>
                              {(apt as any).veterinarian && <div>Врач: {(apt as any).veterinarian.full_name}</div>}
                              {(apt as any).service && <div>Услуга: {(apt as any).service.name}</div>}
                              <div>Статус: {appointmentStatusLabels[apt.status as AppointmentStatus]}</div>
                              {canManage && <div className="text-muted-foreground italic mt-1">Перетащите для переноса</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {selectedAppointment && canManage && (
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
        <DialogContent>
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
