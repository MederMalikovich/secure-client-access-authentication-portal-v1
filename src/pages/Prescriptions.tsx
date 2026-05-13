import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PetSearchSelect } from '@/components/PetSearchSelect';
import { Pill, Plus, Clock, Check, X, Trash2, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ProcessHint } from '@/components/ProcessHint';

type Prescription = any;
type Dose = any;

export default function Prescriptions() {
  const { hasRole, profile } = useAuth();
  const { toast } = useToast();
  const isClient = hasRole('client');
  const canEdit = hasRole('admin') || hasRole('veterinarian');

  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doses, setDoses] = useState<Record<string, Dose[]>>({});
  const [pets, setPets] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pet_id: '',
    medication_name: '',
    dosage: '',
    route: 'внутрь',
    frequency_per_day: 2,
    duration_days: 7,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    times_of_day: ['09:00', '21:00'],
    instructions: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const petsQ = supabase.from('pets').select('id, name, client_id, clients(id, full_name)').order('name');
      const presQ = supabase.from('prescriptions').select('*, pets(name, species), clients(full_name), profiles:veterinarian_id(full_name)').order('created_at', { ascending: false });
      const [petsRes, presRes] = await Promise.all([petsQ, presQ]);
      if (petsRes.error) throw petsRes.error;
      if (presRes.error) throw presRes.error;
      setPets(petsRes.data || []);
      const list = presRes.data || [];
      setPrescriptions(list);

      if (list.length > 0) {
        const ids = list.map((p: any) => p.id);
        const { data: dosesData, error: dErr } = await supabase
          .from('prescription_doses')
          .select('*')
          .in('prescription_id', ids)
          .order('scheduled_at');
        if (dErr) throw dErr;
        const grouped: Record<string, Dose[]> = {};
        (dosesData || []).forEach((d: any) => {
          if (!grouped[d.prescription_id]) grouped[d.prescription_id] = [];
          grouped[d.prescription_id].push(d);
        });
        setDoses(grouped);
      } else {
        setDoses({});
      }
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Auto-update times array when frequency changes
  const handleFrequencyChange = (n: number) => {
    const defaults = ['08:00', '14:00', '20:00', '23:00', '06:00', '12:00'];
    setForm(f => ({
      ...f,
      frequency_per_day: n,
      times_of_day: Array.from({ length: n }, (_, i) => f.times_of_day[i] || defaults[i] || '12:00'),
    }));
  };

  const handleSubmit = async () => {
    if (!form.pet_id || !form.medication_name || !form.dosage) {
      toast({ title: 'Заполните обязательные поля', variant: 'destructive' });
      return;
    }
    const pet = pets.find(p => p.id === form.pet_id);
    if (!pet) return;
    setSaving(true);
    try {
      // Get latest medical record for the pet (or create one)
      const { data: mr } = await supabase
        .from('medical_records')
        .select('id')
        .eq('pet_id', form.pet_id)
        .order('visit_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      let mrId = mr?.id;
      if (!mrId) {
        const { data: newMr, error: mrErr } = await supabase
          .from('medical_records')
          .insert({ pet_id: form.pet_id, visit_date: new Date().toISOString(), chief_complaint: 'Назначения' })
          .select('id')
          .single();
        if (mrErr) throw mrErr;
        mrId = newMr.id;
      }

      const { error } = await supabase.from('prescriptions').insert({
        medical_record_id: mrId,
        pet_id: form.pet_id,
        client_id: pet.client_id,
        veterinarian_id: profile?.id,
        medication_name: form.medication_name,
        dosage: form.dosage,
        route: form.route,
        frequency_per_day: form.frequency_per_day,
        duration_days: form.duration_days,
        start_date: form.start_date,
        times_of_day: form.times_of_day,
        instructions: form.instructions,
        status: 'active',
      });
      if (error) throw error;
      toast({ title: 'Назначение создано', description: 'Расписание приёма автоматически сформировано' });
      setDialogOpen(false);
      setForm({
        pet_id: '', medication_name: '', dosage: '', route: 'внутрь',
        frequency_per_day: 2, duration_days: 7,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        times_of_day: ['09:00', '21:00'], instructions: '',
      });
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const markDose = async (doseId: string, status: 'taken' | 'skipped') => {
    try {
      const { error } = await supabase
        .from('prescription_doses')
        .update({ status, taken_at: status === 'taken' ? new Date().toISOString() : null })
        .eq('id', doseId);
      if (error) throw error;
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const deletePrescription = async (id: string) => {
    if (!confirm('Удалить назначение и все его приёмы?')) return;
    try {
      const { error } = await supabase.from('prescriptions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Удалено' });
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const getProgress = (presId: string) => {
    const list = doses[presId] || [];
    const total = list.length;
    const taken = list.filter(d => d.status === 'taken').length;
    return { taken, total, percent: total ? Math.round((taken / total) * 100) : 0 };
  };

  const getNextDose = (presId: string) => {
    const list = doses[presId] || [];
    return list.find(d => d.status === 'pending' && new Date(d.scheduled_at) >= new Date(Date.now() - 60 * 60 * 1000));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="Назначения и рецепты"
        description={isClient ? 'Расписание приёма лекарств для ваших питомцев' : 'Электронные назначения с автоматическим расписанием'}
        actions={canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" /> Новое назначение
          </Button>
        )}
      />

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Загрузка...</div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Пока нет назначений
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map((p) => {
            const progress = getProgress(p.id);
            const nextDose = getNextDose(p.id);
            const presDoses = doses[p.id] || [];
            return (
              <Card key={p.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Pill className="h-5 w-5 text-primary" />
                        {p.medication_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {p.pets?.name} • {p.dosage} • {p.route} • {p.frequency_per_day}× в день × {p.duration_days} дн.
                      </p>
                      {!isClient && p.clients?.full_name && (
                        <p className="text-xs text-muted-foreground">Клиент: {p.clients.full_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                        {p.status === 'active' ? 'Активно' : p.status === 'completed' ? 'Завершено' : 'Отменено'}
                      </Badge>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => deletePrescription(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.instructions && (
                    <div className="text-sm bg-muted/30 p-3 rounded">
                      <span className="font-medium">Инструкция: </span>{p.instructions}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-primary transition-all" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {progress.taken}/{progress.total} приёмов
                    </span>
                  </div>

                  {nextDose && (
                    <div className="flex items-center gap-2 text-sm bg-primary/10 p-2 rounded">
                      <Clock className="h-4 w-4 text-primary" />
                      Следующий приём: <strong>{format(parseISO(nextDose.scheduled_at), 'd MMM HH:mm', { locale: ru })}</strong>
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Расписание приёмов ({presDoses.length})
                    </summary>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {presDoses.map((d) => {
                        const dt = parseISO(d.scheduled_at);
                        const overdue = d.status === 'pending' && isPast(dt) && !isToday(dt);
                        return (
                          <div
                            key={d.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded border ${
                              d.status === 'taken'
                                ? 'bg-green-500/10 border-green-500/30'
                                : d.status === 'skipped'
                                ? 'bg-red-500/10 border-red-500/30'
                                : overdue
                                ? 'bg-orange-500/10 border-orange-500/30'
                                : 'bg-muted/20 border-border'
                            }`}
                          >
                            <div className="text-xs">
                              <div className="font-medium">{format(dt, 'd MMM', { locale: ru })}</div>
                              <div className="text-muted-foreground">{format(dt, 'HH:mm')}</div>
                            </div>
                            <div className="flex gap-1">
                              {d.status === 'pending' ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markDose(d.id, 'taken')} title="Принято">
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markDose(d.id, 'skipped')} title="Пропущено">
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              ) : d.status === 'taken' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новое назначение</DialogTitle>
            <DialogDescription>Расписание приёмов сформируется автоматически</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Питомец *</Label>
              <PetSearchSelect
                pets={pets}
                value={form.pet_id}
                onChange={(v) => setForm((f) => ({ ...f, pet_id: v }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Препарат *</Label>
                <Input value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} placeholder="Амоксиклав" />
              </div>
              <div>
                <Label>Дозировка *</Label>
                <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="1 табл. / 0.5 мл" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Способ приёма</Label>
                <Select value={form.route} onValueChange={v => setForm(f => ({ ...f, route: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="внутрь">Внутрь</SelectItem>
                    <SelectItem value="подкожно">Подкожно</SelectItem>
                    <SelectItem value="внутримышечно">В/м</SelectItem>
                    <SelectItem value="внутривенно">В/в</SelectItem>
                    <SelectItem value="наружно">Наружно</SelectItem>
                    <SelectItem value="в глаза">В глаза</SelectItem>
                    <SelectItem value="в уши">В уши</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Раз в день</Label>
                <Input type="number" min={1} max={6} value={form.frequency_per_day} onChange={e => handleFrequencyChange(Math.max(1, Math.min(6, +e.target.value || 1)))} />
              </div>
              <div>
                <Label>Дней</Label>
                <Input type="number" min={1} max={60} value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: Math.max(1, +e.target.value || 1) }))} />
              </div>
            </div>
            <div>
              <Label>Дата начала</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Время приёмов</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {form.times_of_day.map((t, i) => (
                  <Input
                    key={i}
                    type="time"
                    value={t}
                    onChange={e => {
                      const arr = [...form.times_of_day];
                      arr[i] = e.target.value;
                      setForm(f => ({ ...f, times_of_day: arr }));
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Инструкция владельцу</Label>
              <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Давать во время еды, не делить таблетку..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gradient-primary">
              {saving ? 'Сохранение...' : 'Создать назначение'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
