import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle, PawPrint, User, Weight, Thermometer, Heart, Activity,
  Stethoscope, FlaskConical, Pill, ClipboardList, FileText, Syringe, Scissors,
  TrendingUp, TrendingDown, Minus, Calendar, CheckCircle2, Clock,
} from 'lucide-react';
import { format, differenceInDays, differenceInYears, differenceInMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  petId: string;
  onOpenVisit: (visitId: string | null) => void;
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

const VAX_RE = /(вакцин|прививк|ревакцин|vaccin)/i;
const SURG_RE = /(операц|хирург|кастрац|стерилизац|удален|резекц|шов|анестез)/i;
const NEXT_VAX_RE = /(до|до:|до\s|следующ\w*[:\s]+)\s*([0-3]?\d[.\-/][01]?\d[.\-/]\d{2,4})/i;

export function MedicalSummary({ petId, onOpenVisit }: Props) {
  const [loading, setLoading] = useState(false);
  const [pet, setPet] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [detail, setDetail] = useState<{ title: string; items: any[] } | null>(null);

  useEffect(() => {
    if (!petId) return;
    void load();
  }, [petId]);

  const load = async () => {
    setLoading(true);
    const [petRes, visitRes, recRes, diagRes, presRes, filesRes] = await Promise.all([
      supabase.from('pets').select('*, client:clients(id, full_name, phone)').eq('id', petId).maybeSingle(),
      supabase.from('visits')
        .select('*, veterinarian:profiles(full_name)')
        .eq('pet_id', petId).order('visit_date', { ascending: false }),
      supabase.from('medical_records')
        .select('id, visit_date, diagnosis, treatment, prescriptions, lab_results, allergy_notes, vaccination_status, weight_at_visit, temperature, veterinarian:profiles(full_name)')
        .eq('pet_id', petId).order('visit_date', { ascending: false }),
      supabase.from('medical_record_diagnoses')
        .select('id, medical_record_id, custom_diagnosis, notes, disease:diseases(id, name), medical_record:medical_records!inner(id, visit_date, pet_id)')
        .eq('medical_record.pet_id', petId),
      supabase.from('prescriptions')
        .select('id, visit_id, medical_record_id, medication_name, dosage, frequency_per_day, duration_days, instructions, start_date, status, created_at')
        .eq('pet_id', petId).order('created_at', { ascending: false }),
      supabase.from('medical_record_files')
        .select('id, medical_record_id, title, study_type, study_date, file_path, file_name, notes')
        .eq('pet_id', petId).order('study_date', { ascending: false }),
    ]);
    setPet(petRes.data);
    setVisits(visitRes.data || []);
    setRecords(recRes.data || []);
    setDiagnoses(diagRes.data || []);
    setPrescriptions(presRes.data || []);
    setFiles(filesRes.data || []);
    setLoading(false);
  };

  // -- Derive everything
  const alerts = useMemo(() => {
    const list: string[] = [];
    if (pet?.notes) list.push(pet.notes);
    records.forEach((r) => {
      if (r.allergy_notes && r.allergy_notes.trim()) list.push(r.allergy_notes.trim());
    });
    return Array.from(new Set(list));
  }, [pet, records]);

  // Group diagnoses by name; status: active if last occurrence within 90 days, else closed
  const diagnosisGroups = useMemo(() => {
    const map = new Map<string, { name: string; occurrences: any[]; first: Date; last: Date }>();
    const push = (rawName: string | null | undefined, date: Date, payload: any) => {
      if (!rawName) return;
      const name = rawName.trim();
      if (!name) return;
      const key = name.toLowerCase().slice(0, 200);
      const ex = map.get(key);
      if (ex) {
        ex.occurrences.push({ ...payload, date });
        if (date < ex.first) ex.first = date;
        if (date > ex.last) ex.last = date;
      } else {
        map.set(key, { name: name.slice(0, 200), occurrences: [{ ...payload, date }], first: date, last: date });
      }
    };
    // Structured diagnoses
    diagnoses.forEach((d) => {
      const name = d.disease?.name || d.custom_diagnosis;
      const date = new Date(d.medical_record?.visit_date || d.created_at);
      push(name, date, { id: d.id, notes: d.notes });
    });
    // Legacy: medical_records.diagnosis text
    records.forEach((r) => {
      if (!r.diagnosis) return;
      const date = new Date(r.visit_date);
      r.diagnosis.split(/[;\n]+/).forEach((part: string) => {
        push(part, date, { id: r.id, notes: r.treatment });
      });
    });
    // Visits assessment text — capture concrete diagnoses from completed visits
    visits.forEach((v) => {
      if (!v.assessment) return;
      const date = new Date(v.visit_date);
      v.assessment.split(/[;\n]+/).forEach((part: string) => {
        const txt = part.trim();
        if (txt.length < 3 || txt.length > 200) return;
        push(txt, date, { id: v.id, notes: v.plan });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.last.getTime() - a.last.getTime());
  }, [diagnoses, records, visits]);

  const activeDiagnoses = diagnosisGroups.filter((g) => differenceInDays(new Date(), g.last) <= 90);
  const historyDiagnoses = diagnosisGroups;

  // Vaccinations: parse vaccination_status fields + visits assessment with vax keywords
  const vaccinations = useMemo(() => {
    const items: { name: string; date: Date; nextDate?: Date; source: string }[] = [];
    records.forEach((r) => {
      if (r.vaccination_status && r.vaccination_status.trim()) {
        const text = r.vaccination_status.trim();
        const m = text.match(NEXT_VAX_RE);
        let nextDate: Date | undefined;
        if (m) {
          const parts = m[2].split(/[.\-/]/);
          const day = +parts[0], mo = +parts[1] - 1;
          let yr = +parts[2]; if (yr < 100) yr += 2000;
          const dt = new Date(yr, mo, day);
          if (!isNaN(dt.getTime())) nextDate = dt;
        }
        items.push({ name: text, date: new Date(r.visit_date), nextDate, source: r.id });
      }
    });
    visits.forEach((v) => {
      const text = `${v.assessment || ''} ${v.plan || ''}`;
      if (VAX_RE.test(text)) {
        items.push({ name: text.slice(0, 140), date: new Date(v.visit_date), source: v.id });
      }
    });
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [records, visits]);

  // Surgeries: visits or records mentioning surgical keywords
  const surgeries = useMemo(() => {
    const items: any[] = [];
    visits.forEach((v) => {
      const text = `${v.assessment || ''} ${v.plan || ''} ${v.objective || ''}`;
      if (SURG_RE.test(text)) {
        items.push({
          id: v.id, date: new Date(v.visit_date),
          name: (v.assessment || v.plan || '').slice(0, 140) || 'Хирургическое вмешательство',
          vet: v.veterinarian?.full_name,
          outcome: v.status,
          openable: true,
        });
      }
    });
    records.forEach((r) => {
      const text = `${r.diagnosis || ''} ${r.treatment || ''}`;
      if (SURG_RE.test(text)) {
        items.push({
          id: r.id, date: new Date(r.visit_date),
          name: (r.diagnosis || r.treatment || '').slice(0, 140) || 'Хирургическое вмешательство',
          vet: r.veterinarian?.full_name,
          outcome: null, openable: false,
        });
      }
    });
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [visits, records]);

  // Vitals
  const vitals = useMemo(() => {
    const weights = visits.filter(v => v.weight).map(v => ({ d: new Date(v.visit_date), w: Number(v.weight) }));
    const lastWeight = weights[0];
    const prevWeight = weights[1];
    const trend = lastWeight && prevWeight
      ? (lastWeight.w - prevWeight.w)
      : null;
    const lastTemp = visits.find(v => v.temperature);
    const lastPulse = visits.find(v => v.pulse);
    const lastResp = visits.find(v => v.respiratory_rate);
    return {
      lastWeight, prevWeight, trend, lastTemp, lastPulse, lastResp,
      total: visits.length,
      lastVisit: visits[0]?.visit_date,
    };
  }, [visits]);

  // Active prescriptions
  const activePrescriptions = prescriptions.filter(p => p.status === 'active');
  const completedPrescriptions = useMemo(() => {
    const base = prescriptions.filter(p => p.status !== 'active');
    // Legacy free-text prescriptions from medical_records
    const legacy: any[] = [];
    records.forEach((r) => {
      if (!r.prescriptions) return;
      r.prescriptions.split(/[;\n]+/).forEach((part: string, idx: number) => {
        const txt = part.trim();
        if (txt.length < 2) return;
        legacy.push({
          id: `legacy-${r.id}-${idx}`,
          medication_name: txt.slice(0, 140),
          start_date: r.visit_date,
          duration_days: null,
          visit_id: null,
        });
      });
    });
    return [...base, ...legacy].sort((a, b) => {
      const da = new Date(a.start_date || a.created_at || 0).getTime();
      const db = new Date(b.start_date || b.created_at || 0).getTime();
      return db - da;
    });
  }, [prescriptions, records]);

  // Helpers
  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from('medical-record-files').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (!petId) return null;
  if (loading) return <Card className="p-6 text-center text-sm text-muted-foreground">Загрузка медкарты...</Card>;

  return (
    <div className="space-y-4">
      {/* Pet header */}
      {pet && (
        <Card className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {pet.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/30" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/30">
                  <PawPrint className="h-7 w-7 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-semibold">{pet.name}</h2>
                  <Badge variant="outline">{speciesLabels[pet.species] || pet.species}</Badge>
                  {pet.breed && <Badge variant="outline">{pet.breed}</Badge>}
                  {pet.gender && pet.gender !== 'unknown' && <Badge variant="outline">{genderLabels[pet.gender]}</Badge>}
                  {getAge(pet.birth_date) && <Badge variant="outline">{getAge(pet.birth_date)}</Badge>}
                </div>
                {pet.client && (
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {pet.client.full_name}
                    {pet.client.phone && <span className="text-xs">· {pet.client.phone}</span>}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  ID: <span className="font-mono">{pet.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Critical alerts always on top */}
      {alerts.length > 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-destructive uppercase tracking-wider mb-1">
                Аллергии и важные предупреждения
              </div>
              <ul className="space-y-1 text-sm">
                {alerts.map((a, i) => (
                  <li key={i} className="text-foreground">• {a}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Key vitals — compact stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <VitalCard icon={<Weight className="h-4 w-4" />} label="Вес"
          value={vitals.lastWeight ? `${vitals.lastWeight.w} кг` : '—'}
          extra={vitals.trend != null && (
            <span className={cn('text-xs flex items-center gap-0.5',
              vitals.trend > 0 ? 'text-green-500' : vitals.trend < 0 ? 'text-amber-500' : 'text-muted-foreground')}>
              {vitals.trend > 0 ? <TrendingUp className="h-3 w-3" /> : vitals.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {vitals.trend > 0 ? '+' : ''}{vitals.trend.toFixed(1)} кг
            </span>
          )}
        />
        <VitalCard icon={<Thermometer className="h-4 w-4" />} label="Температура"
          value={vitals.lastTemp ? `${vitals.lastTemp.temperature}°C` : '—'} />
        <VitalCard icon={<Heart className="h-4 w-4" />} label="Пульс"
          value={vitals.lastPulse ? `${vitals.lastPulse.pulse} уд/мин` : '—'} />
        <VitalCard icon={<Activity className="h-4 w-4" />} label="Дыхание"
          value={vitals.lastResp ? `${vitals.lastResp.respiratory_rate}/мин` : '—'} />
        <VitalCard icon={<Stethoscope className="h-4 w-4" />} label="Визитов"
          value={String(vitals.total)} />
        <VitalCard icon={<Calendar className="h-4 w-4" />} label="Последний визит"
          value={vitals.lastVisit ? format(new Date(vitals.lastVisit), 'd MMM yyyy', { locale: ru }) : '—'} />
      </div>

      {/* Two-column grid for sections */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Active diagnoses */}
        <SectionCard icon={<ClipboardList className="h-4 w-4 text-primary" />} title="Активные диагнозы" count={activeDiagnoses.length}>
          {activeDiagnoses.length === 0 ? <Empty text="Активных диагнозов нет" /> : (
            <ul className="divide-y">
              {activeDiagnoses.map((g) => (
                <li key={g.name} className="py-2 flex items-center justify-between gap-2 hover:bg-muted/30 -mx-2 px-2 rounded cursor-pointer"
                    onClick={() => setDetail({ title: g.name, items: g.occurrences })}>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Поставлен {format(g.first, 'd MMM yyyy', { locale: ru })}
                      {g.occurrences.length > 1 && ` · ${g.occurrences.length} записей`}
                    </div>
                  </div>
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Активный</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* History of diagnoses */}
        <SectionCard icon={<FileText className="h-4 w-4" />} title="История диагнозов" count={historyDiagnoses.length}>
          {historyDiagnoses.length === 0 ? <Empty text="Диагнозов пока нет" /> : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {historyDiagnoses.map((g) => {
                const isActive = differenceInDays(new Date(), g.last) <= 90;
                return (
                  <li key={g.name} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(g.last, 'd MMM yyyy', { locale: ru })}
                        {g.occurrences.length > 1 && ` · ${g.occurrences.length}×`}
                      </div>
                    </div>
                    <Badge variant={isActive ? 'default' : 'outline'} className="text-[10px]">
                      {isActive ? 'Активный' : 'Закрыт'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Active prescriptions */}
        <SectionCard icon={<Pill className="h-4 w-4 text-blue-500" />} title="Активное лечение" count={activePrescriptions.length}>
          {activePrescriptions.length === 0 ? <Empty text="Нет активных назначений" /> : (
            <ul className="space-y-2">
              {activePrescriptions.map((p) => (
                <li key={p.id} className="rounded-md border bg-muted/30 p-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => p.visit_id && onOpenVisit(p.visit_id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{p.medication_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.dosage && `${p.dosage} · `}
                        {p.frequency_per_day && `${p.frequency_per_day}× в день · `}
                        {p.duration_days && `${p.duration_days} дн.`}
                      </div>
                    </div>
                    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />Активно
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Completed treatments */}
        <SectionCard icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} title="История лечения" count={completedPrescriptions.length}>
          {completedPrescriptions.length === 0 ? <Empty text="Завершённых назначений нет" /> : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {completedPrescriptions.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                    onClick={() => p.visit_id && onOpenVisit(p.visit_id)}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.medication_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.start_date && format(new Date(p.start_date), 'd MMM yyyy', { locale: ru })}
                      {p.duration_days && ` · ${p.duration_days} дн.`}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Завершено</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Labs */}
        <SectionCard icon={<FlaskConical className="h-4 w-4 text-amber-500" />} title="Анализы и исследования" count={files.length}>
          {files.length === 0 ? <Empty text="Файлов исследований нет" /> : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {files.map((f) => (
                <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{f.title || f.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(f.study_date), 'd MMM yyyy', { locale: ru })}
                      {f.notes && ` · ${f.notes.slice(0, 60)}`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openFile(f.file_path)}>
                    <FileText className="h-3 w-3 mr-1" />Открыть
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Vaccinations */}
        <SectionCard icon={<Syringe className="h-4 w-4 text-emerald-500" />} title="Вакцинация" count={vaccinations.length}>
          {vaccinations.length === 0 ? <Empty text="Записей о вакцинации нет" /> : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {vaccinations.map((v, i) => {
                const overdue = v.nextDate && v.nextDate < new Date();
                return (
                  <li key={i} className="py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm">{v.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(v.date, 'd MMM yyyy', { locale: ru })}
                          {v.nextDate && ` · ревакцинация ${format(v.nextDate, 'd MMM yyyy', { locale: ru })}`}
                        </div>
                      </div>
                      {overdue && <Badge variant="destructive" className="text-[10px]">Просрочено</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Surgeries */}
        <SectionCard icon={<Scissors className="h-4 w-4 text-rose-500" />} title="Хирургические вмешательства" count={surgeries.length}>
          {surgeries.length === 0 ? <Empty text="Хирургических вмешательств нет" /> : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {surgeries.map((s, i) => (
                <li key={i} className="py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(s.date, 'd MMM yyyy', { locale: ru })}
                      {s.vet && ` · ${s.vet}`}
                    </div>
                  </div>
                  {s.openable && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onOpenVisit(s.id)}>
                      Открыть
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Diagnosis detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {detail?.items.map((it: any) => (
              <Card key={it.id} className="p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {format(it.date, 'd MMMM yyyy', { locale: ru })}
                </div>
                {it.notes && <div className="text-sm">{it.notes}</div>}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VitalCard({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <Card className="p-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}{label}
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
      {extra}
    </Card>
  );
}

function SectionCard({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
        </div>
        {count != null && <Badge variant="outline" className="text-[10px]">{count}</Badge>}
      </div>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground italic py-2">{text}</p>;
}
