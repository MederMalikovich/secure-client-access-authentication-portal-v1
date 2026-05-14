import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, PawPrint, User, Clock, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { VisitDialog, VisitStatus, visitStatusLabels, visitStatusColors } from '@/components/VisitDialog';
import { ProcessHint } from '@/components/ProcessHint';
import { cn } from '@/lib/utils';

const COLUMNS: VisitStatus[] = ['waiting', 'in_consultation', 'procedures', 'hospital', 'completed'];

export default function Flowboard() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const { data, error } = await supabase
        .from('visits')
        .select('*, pet:pets(name, species), client:clients(full_name), veterinarian:profiles(full_name)')
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString())
        .order('visit_date', { ascending: true });
      if (error) throw error;
      setVisits(data || []);
    } catch (e) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    void load();
    const ch = supabase.channel('flowboard-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => void load())
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Доска визитов"
        description="Поток клиники сегодня — перетаскивайте карточки между статусами"
        actions={(
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />Обновить</Button>
            <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Новый визит</Button>
          </>
        )}
      />

      <ProcessHint
        storageKey="flowboard-flow"
        title="Как пользоваться Flowboard"
        steps={[
          'Каждая карточка — визит сегодня. Перетащите её в нужную колонку, чтобы сменить статус.',
          'Новые приёмы попадают сюда из календаря или по кнопке «Новый визит».',
          'Когда визит готов к закрытию — переместите в «Завершён»: спишутся материалы и сформируется счёт.',
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map(col => {
          const items = visits.filter(v => v.status === col);
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
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(v.visit_date), 'HH:mm')}</span>
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

      <VisitDialog
        open={dialogOpen}
        visitId={editingId}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
