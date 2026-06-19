import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, RefreshCw, PawPrint, User, Clock, Stethoscope, Calendar as CalendarIcon, Workflow, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { VisitDialog, VisitStatus, visitStatusLabels, visitStatusColors } from '@/components/VisitDialog';
import { ProcessHint } from '@/components/ProcessHint';
import { DateScopeSelector, DateScope, filterByScope } from '@/components/DateScopeSelector';
import { cn } from '@/lib/utils';
import Calendar from '@/pages/Calendar';

const COLUMNS: VisitStatus[] = ['waiting', 'in_consultation', 'procedures', 'hospital', 'completed'];

export default function Flowboard() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<any[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialAppointmentId, setInitialAppointmentId] = useState<string | null>(null);
  const [initialPetId, setInitialPetId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [scope, setScope] = useState<DateScope>('today');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [view, setView] = useState<'calendar' | 'kanban'>(() => {
    const st = (location.state as any) || {};
    if (st.view === 'kanban' || st.view === 'calendar') return st.view;
    return 'kanban';
  });

  useEffect(() => {
    const st = location.state as any;
    if (st?.openNew) {
      setEditingId(null);
      setDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [visitsRes, aptRes] = await Promise.all([
        supabase
          .from('visits')
          .select('*, pet:pets(name, species), client:clients(full_name), veterinarian:profiles(full_name), appointment_id')
          .order('visit_date', { ascending: false })
          .limit(500),
        supabase
          .from('appointments')
          .select('id, pet_id, client_id, veterinarian_id, scheduled_at, status, notes, service_id, pet:pets(name, species), client:clients(full_name), veterinarian:profiles(full_name), service:services(name)')
          .in('status', ['scheduled', 'confirmed'])
          .order('scheduled_at', { ascending: false })
          .limit(500),
      ]);
      if (visitsRes.error) throw visitsRes.error;
      const vs = visitsRes.data || [];
      setVisits(vs);
      const linkedApt = new Set(vs.map((v: any) => v.appointment_id).filter(Boolean));
      const pending = (aptRes.data || []).filter((a: any) => !linkedApt.has(a.id));
      setPendingAppointments(pending);
    } catch (e) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    void load();
    const ch = supabase.channel('flowboard-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const moveVisit = async (id: string, status: VisitStatus) => {
    try {
      const { error } = await supabase.from('visits').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Статус обновлён', description: visitStatusLabels[status] });
    } catch (e) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const onDrop = (status: VisitStatus) => {
    if (!draggingId) return;
    void moveVisit(draggingId, status);
    setDraggingId(null);
  };

  const visible = filterByScope(visits, scope, customDate, 'visit_date');

  const workload = useMemo(() => {
    const active = visible.filter(v => v.status !== 'completed' && v.status !== 'cancelled');
    const map = new Map<string, { name: string; count: number; minutes: number }>();
    for (const v of active) {
      if (!v.veterinarian_id) continue;
      const name = v.veterinarian?.full_name || 'Врач';
      const ex = map.get(v.veterinarian_id) || { name, count: 0, minutes: 0 };
      ex.count++;
      ex.minutes += 30;
      map.set(v.veterinarian_id, ex);
    }
    const arr = Array.from(map.entries()).map(([id, d]) => ({ id, ...d }));
    const max = Math.max(1, ...arr.map(a => a.minutes));
    return arr.map(a => ({ ...a, loadPercent: Math.round((a.minutes / max) * 100) })).sort((a, b) => b.count - a.count);
  }, [visible]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Доска приёма"
        description="Канбан-поток клиники и календарь записей в одном разделе"
        actions={view === 'kanban' ? (
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />Обновить</Button>
            <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Новый визит</Button>
          </>
        ) : null}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'kanban')} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="kanban" className="gap-2"><Workflow className="h-4 w-4" />Канбан</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4" />Календарь</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-0">
          <Calendar />
        </TabsContent>

        <TabsContent value="kanban" className="mt-0 space-y-4">
          <ProcessHint
            storageKey="flowboard-flow"
            title="Как пользоваться канбан-доской"
            steps={[
              'По умолчанию показаны визиты сегодняшнего дня. Используйте фильтры выше, чтобы посмотреть прошлые визиты.',
              'Перетащите карточку в нужную колонку, чтобы сменить статус приёма.',
              'Когда визит готов к закрытию — переместите в «Завершён»: спишутся материалы, сформируется счёт и запись в календаре станет «Завершено».',
            ]}
          />

          <DateScopeSelector
            scope={scope}
            customDate={customDate}
            onChange={(s, d) => { setScope(s); if (d) setCustomDate(d); }}
          />

          {workload.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Загруженность врачей за выбранный период
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {workload.map(vet => (
                    <div key={vet.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{vet.name}</span>
                        <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                          {vet.count} зап. · {Math.floor(vet.minutes / 60)}ч {vet.minutes % 60}м
                        </span>
                      </div>
                      <Progress
                        value={vet.loadPercent}
                        className={cn(
                          'h-2',
                          vet.loadPercent > 80 && '[&>div]:bg-red-500',
                          vet.loadPercent > 50 && vet.loadPercent <= 80 && '[&>div]:bg-yellow-500',
                          vet.loadPercent <= 50 && '[&>div]:bg-green-500'
                        )}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {COLUMNS.map(col => {
              const items = visible.filter(v => v.status === col);
              return (
                <div
                  key={col}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(col)}
                  className="rounded-xl border bg-card/40 p-3 min-h-[300px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={visitStatusColors[col]}>{visitStatusLabels[col]}</Badge>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {items.map(v => (
                      <Card
                        key={v.id}
                        draggable
                        onDragStart={() => setDraggingId(v.id)}
                        onClick={() => { setEditingId(v.id); setDialogOpen(true); }}
                        className="p-3 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <PawPrint className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{v.pet?.name || 'Питомец'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" /> <span className="truncate">{v.client?.full_name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(v.visit_date), 'd MMM HH:mm')}</span>
                          {v.veterinarian?.full_name && <span className="flex items-center gap-1 truncate"><Stethoscope className="h-3 w-3" />{v.veterinarian.full_name.split(' ')[0]}</span>}
                        </div>
                      </Card>
                    ))}
                    {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Пусто</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <VisitDialog
        open={dialogOpen}
        visitId={editingId}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
