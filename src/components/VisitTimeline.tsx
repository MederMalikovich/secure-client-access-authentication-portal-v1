import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, Stethoscope, Filter, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { VisitStatus, visitStatusLabels, visitStatusColors } from '@/components/VisitDialog';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Props {
  petId: string;
  onOpenVisit: (visitId: string | null) => void;
}

export function VisitTimeline({ petId, onOpenVisit }: Props) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVet, setFilterVet] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [vets, setVets] = useState<any[]>([]);

  useEffect(() => {
    if (!petId) return;
    void load();
  }, [petId]);

  const load = async () => {
    setLoading(true);
    const [visitRes, vetRes] = await Promise.all([
      supabase.from('visits')
        .select('*, veterinarian:profiles(full_name), services:visit_services(*), materials:visit_materials(*), invoice:invoices(id, invoice_number, total, status)')
        .eq('pet_id', petId)
        .order('visit_date', { ascending: false }),
      supabase.rpc('list_public_veterinarians'),
    ]);
    setVisits(visitRes.data || []);
    setVets(vetRes.data || []);
    setLoading(false);
  };

  const toggle = (id: string) => {
    const ns = new Set(expanded);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setExpanded(ns);
  };

  const filtered = visits.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (filterVet !== 'all' && v.veterinarian_id !== filterVet) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${v.assessment || ''} ${v.chief_complaint || ''} ${v.subjective || ''} ${v.plan || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по диагнозу/жалобе..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(visitStatusLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVet} onValueChange={setFilterVet}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все врачи</SelectItem>
            {vets.map(v => <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto" onClick={() => onOpenVisit(null)}>
          <Plus className="h-4 w-4 mr-1" />Новый визит
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Визитов пока нет
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((v, idx) => {
          const isOpen = expanded.has(v.id);
          return (
            <div key={v.id} className="relative pl-6">
              <div className="absolute left-2 top-3 bottom-0 w-px bg-border" />
              <div className={cn('absolute left-0 top-3 w-4 h-4 rounded-full border-2 border-background',
                v.status === 'completed' ? 'bg-green-500' : v.status === 'cancelled' ? 'bg-destructive' : 'bg-primary')} />
              <Card className="p-3 hover:border-primary/40 transition-colors">
                <Collapsible open={isOpen} onOpenChange={() => toggle(v.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <CollapsibleTrigger className="flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-sm">{format(new Date(v.visit_date), 'd MMMM yyyy, HH:mm', { locale: ru })}</span>
                        <Badge className={visitStatusColors[v.status as VisitStatus]}>{visitStatusLabels[v.status as VisitStatus]}</Badge>
                        {v.veterinarian?.full_name && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Stethoscope className="h-3 w-3" />{v.veterinarian.full_name}</span>
                        )}
                      </div>
                      {(v.chief_complaint || v.assessment) && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {v.chief_complaint && <span>«{v.chief_complaint}»</span>}
                          {v.assessment && <span className="ml-2">→ <span className="text-foreground">{v.assessment}</span></span>}
                        </div>
                      )}
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="sm" onClick={() => onOpenVisit(v.id)}>Открыть</Button>
                  </div>
                  <CollapsibleContent className="mt-3 space-y-2 text-sm">
                    {v.subjective && <div><span className="text-xs uppercase text-muted-foreground">S — Жалобы:</span> {v.subjective}</div>}
                    {v.objective && <div><span className="text-xs uppercase text-muted-foreground">O — Осмотр:</span> {v.objective}</div>}
                    {v.assessment && <div><span className="text-xs uppercase text-muted-foreground">A — Диагноз:</span> {v.assessment}</div>}
                    {v.plan && <div><span className="text-xs uppercase text-muted-foreground">P — План:</span> {v.plan}</div>}
                    {(v.weight || v.temperature || v.pulse) && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {v.weight && <span>Вес: {v.weight} кг</span>}
                        {v.temperature && <span>T°: {v.temperature}</span>}
                        {v.pulse && <span>Пульс: {v.pulse}</span>}
                        {v.respiratory_rate && <span>ЧД: {v.respiratory_rate}</span>}
                      </div>
                    )}
                    {v.services?.length > 0 && (
                      <div className="text-xs"><span className="text-muted-foreground">Услуги:</span> {v.services.map((s: any) => s.description).join(', ')}</div>
                    )}
                    {v.invoice?.[0] && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Счёт:</span> {v.invoice[0].invoice_number} — {formatCurrency(Number(v.invoice[0].total))} ({v.invoice[0].status})
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
