import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Stethoscope, Filter, Plus, FileText, PawPrint, User, Weight, Thermometer,
  Activity, Pill, FlaskConical, ClipboardList, Heart, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { VisitStatus, visitStatusLabels, visitStatusColors } from '@/components/VisitDialog';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Props {
  petId: string;
  onOpenVisit: (visitId: string | null) => void;
  hideHeader?: boolean;
}


const speciesLabels: Record<string, string> = {
  dog: 'Собака', cat: 'Кошка', bird: 'Птица', rodent: 'Грызун',
  reptile: 'Рептилия', fish: 'Рыба', other: 'Другое',
};
const genderLabels: Record<string, string> = { male: 'Самец', female: 'Самка', unknown: '—' };

function getAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  const years = differenceInYears(new Date(), d);
  if (years >= 1) return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
  const months = differenceInMonths(new Date(), d);
  return `${months} мес.`;
}

export function VisitTimeline({ petId, onOpenVisit }: Props) {
  const [pet, setPet] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVet, setFilterVet] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [vets, setVets] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!petId) return;
    void load();
  }, [petId]);

  const load = async () => {
    setLoading(true);
    const [petRes, visitRes, vetRes, presRes, filesRes] = await Promise.all([
      supabase.from('pets').select('*, client:clients(id, full_name, phone)').eq('id', petId).maybeSingle(),
      supabase.from('visits')
        .select(`*,
          veterinarian:profiles(full_name),
          services:visit_services(*),
          materials:visit_materials(*),
          invoice:invoices(id, invoice_number, total, status)
        `)
        .eq('pet_id', petId)
        .order('visit_date', { ascending: false }),
      supabase.rpc('list_public_veterinarians'),
      supabase.from('prescriptions')
        .select('id, visit_id, medical_record_id, medication_name, dosage, frequency_per_day, duration_days, instructions, start_date')
        .eq('pet_id', petId),
      supabase.from('medical_record_files')
        .select('id, medical_record_id, title, study_type, study_date, file_path, file_name')
        .eq('pet_id', petId),
    ]);
    const allPres = presRes.data || [];
    const allFiles = filesRes.data || [];
    const enriched = (visitRes.data || []).map((v: any) => ({
      ...v,
      prescriptions: allPres.filter(p => p.visit_id === v.id),
      files: allFiles.filter(f => f.medical_record_id === v.medical_record_id),
    }));
    setPet(petRes.data);
    setVisits(enriched);
    setVets(vetRes.data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => visits.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (filterVet !== 'all' && v.veterinarian_id !== filterVet) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${v.assessment || ''} ${v.chief_complaint || ''} ${v.subjective || ''} ${v.objective || ''} ${v.plan || ''} ${v.recommendations || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [visits, filterStatus, filterVet, search]);

  const stats = useMemo(() => {
    const total = visits.length;
    const completed = visits.filter(v => v.status === 'completed').length;
    const lastVisit = visits[0]?.visit_date;
    const lastWeight = visits.find(v => v.weight)?.weight;
    return { total, completed, lastVisit, lastWeight };
  }, [visits]);

  const toggleCollapse = (id: string) => {
    const ns = new Set(collapsed);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setCollapsed(ns);
  };

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from('medical-record-files').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Pet header card */}
      {pet && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PawPrint className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold">{pet.name}</h2>
                  <Badge variant="outline">{speciesLabels[pet.species] || pet.species}</Badge>
                  {pet.breed && <Badge variant="outline">{pet.breed}</Badge>}
                  {pet.gender && pet.gender !== 'unknown' && (
                    <Badge variant="outline">{genderLabels[pet.gender]}</Badge>
                  )}
                  {getAge(pet.birth_date) && <Badge variant="outline">{getAge(pet.birth_date)}</Badge>}
                </div>
                {pet.client && (
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {pet.client.full_name}
                    {pet.client.phone && <span className="text-xs">· {pet.client.phone}</span>}
                  </div>
                )}
                {pet.notes && (
                  <div className="text-sm mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-xs">{pet.notes}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-primary">{stats.total}</div>
                <div className="text-xs text-muted-foreground">визитов</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">завершено</div>
              </div>
              {stats.lastWeight && (
                <div>
                  <div className="text-2xl font-semibold">{stats.lastWeight}<span className="text-sm text-muted-foreground">кг</span></div>
                  <div className="text-xs text-muted-foreground">посл. вес</div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по диагнозу/жалобе/назначению..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9" />
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

      {loading && <p className="text-sm text-muted-foreground">Загрузка истории...</p>}
      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Визитов пока нет</p>
          <Button size="sm" className="mt-3" onClick={() => onOpenVisit(null)}>
            <Plus className="h-4 w-4 mr-1" />Создать первый визит
          </Button>
        </Card>
      )}

      {/* Timeline — all expanded by default */}
      <div className="space-y-3">
        {filtered.map((v) => {
          const isCollapsed = collapsed.has(v.id);
          const hasDetails = v.subjective || v.objective || v.assessment || v.plan ||
            v.recommendations || v.services?.length || v.materials?.length ||
            v.prescriptions?.length || v.files?.length;
          return (
            <div key={v.id} className="relative pl-7">
              <div className="absolute left-2.5 top-5 bottom-0 w-px bg-border" />
              <div className={cn(
                'absolute left-0 top-3 w-5 h-5 rounded-full border-2 border-background ring-2',
                v.status === 'completed' ? 'bg-green-500 ring-green-500/30' :
                v.status === 'cancelled' ? 'bg-destructive ring-destructive/30' :
                'bg-primary ring-primary/30'
              )} />
              <Card className="overflow-hidden hover:border-primary/40 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 p-3 border-b bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">
                        {format(new Date(v.visit_date), 'd MMMM yyyy, HH:mm', { locale: ru })}
                      </span>
                      <Badge className={visitStatusColors[v.status as VisitStatus]}>
                        {visitStatusLabels[v.status as VisitStatus]}
                      </Badge>
                      {v.veterinarian?.full_name && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />{v.veterinarian.full_name}
                        </span>
                      )}
                    </div>
                    {(v.weight || v.temperature || v.pulse || v.respiratory_rate) && (
                      <div className="flex gap-3 mt-2 text-xs flex-wrap">
                        {v.weight && <span className="inline-flex items-center gap-1"><Weight className="h-3 w-3 text-muted-foreground" />{v.weight} кг</span>}
                        {v.temperature && <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3 text-muted-foreground" />{v.temperature}°C</span>}
                        {v.pulse && <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-muted-foreground" />{v.pulse} уд/мин</span>}
                        {v.respiratory_rate && <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3 text-muted-foreground" />ЧД {v.respiratory_rate}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => onOpenVisit(v.id)}>Открыть</Button>
                    {hasDetails && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCollapse(v.id)}>
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* All visit content visible by default */}
                {!isCollapsed && hasDetails && (
                  <div className="p-3 space-y-3 text-sm">
                    {v.chief_complaint && (
                      <Section icon={<FileText className="h-4 w-4" />} label="Жалобы при обращении">
                        {v.chief_complaint}
                      </Section>
                    )}
                    {v.subjective && <Section label="Анамнез (Subjective)">{v.subjective}</Section>}
                    {v.objective && <Section label="Осмотр (Objective)">{v.objective}</Section>}
                    {v.assessment && (
                      <Section icon={<ClipboardList className="h-4 w-4 text-primary" />} label="Диагноз" highlight>
                        {v.assessment}
                      </Section>
                    )}
                    {v.plan && <Section label="План лечения">{v.plan}</Section>}

                    {v.services?.length > 0 && (
                      <Section icon={<Stethoscope className="h-4 w-4" />} label="Услуги">
                        <ul className="list-disc pl-5 space-y-0.5">
                          {v.services.map((s: any) => (
                            <li key={s.id}>
                              {s.description} <span className="text-muted-foreground">×{s.quantity}</span>
                              {s.total != null && <span className="text-muted-foreground"> — {formatCurrency(Number(s.total))}</span>}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {v.materials?.length > 0 && (
                      <Section icon={<FlaskConical className="h-4 w-4" />} label="Использованные препараты/материалы">
                        <ul className="list-disc pl-5 space-y-0.5">
                          {v.materials.map((m: any) => (
                            <li key={m.id}>
                              {m.description} <span className="text-muted-foreground">×{m.quantity}</span>
                              {m.shortage && <Badge variant="destructive" className="ml-1 text-[10px]">Дефицит</Badge>}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {v.prescriptions?.length > 0 && (
                      <Section icon={<Pill className="h-4 w-4 text-blue-500" />} label="Назначения">
                        <ul className="space-y-1">
                          {v.prescriptions.map((p: any) => (
                            <li key={p.id} className="text-sm">
                              <span className="font-medium">{p.medication_name}</span>
                              {p.dosage && <span className="text-muted-foreground"> — {p.dosage}</span>}
                              {p.frequency_per_day && <span className="text-muted-foreground">, {p.frequency_per_day}× в день</span>}
                              {p.duration_days && <span className="text-muted-foreground">, {p.duration_days} дн.</span>}
                              {p.instructions && <div className="text-xs text-muted-foreground pl-2">{p.instructions}</div>}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {v.files?.length > 0 && (
                      <Section icon={<FlaskConical className="h-4 w-4 text-amber-500" />} label="Анализы и исследования">
                        <div className="flex flex-wrap gap-2">
                          {v.files.map((f: any) => (
                            <Button key={f.id} variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => openFile(f.file_path)}>
                              <FileText className="h-3 w-3 mr-1" />{f.title || f.file_name}
                            </Button>
                          ))}
                        </div>
                      </Section>
                    )}

                    {v.recommendations && (
                      <Section icon={<Heart className="h-4 w-4 text-pink-500" />} label="Рекомендации владельцу">
                        {v.recommendations}
                      </Section>
                    )}

                    {v.invoice?.[0] && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t">
                        <span className="text-muted-foreground">
                          Счёт {v.invoice[0].invoice_number} · {v.invoice[0].status}
                        </span>
                        <span className="font-semibold">{formatCurrency(Number(v.invoice[0].total))}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ icon, label, children, highlight }: { icon?: React.ReactNode; label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn('rounded-md', highlight && 'bg-primary/5 border border-primary/20 p-2')}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-0.5">
        {icon}{label}
      </div>
      <div className={cn('text-sm', highlight && 'font-medium')}>{children}</div>
    </div>
  );
}
