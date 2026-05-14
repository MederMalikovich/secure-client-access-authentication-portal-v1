import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PetSearchSelect } from '@/components/PetSearchSelect';
import { ProcessHint } from '@/components/ProcessHint';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { Plus, Trash2, History, Sparkles, FileText, Stethoscope, ClipboardList, Package, Receipt, Save, CheckCircle2 } from 'lucide-react';

export type VisitStatus = 'waiting' | 'in_consultation' | 'procedures' | 'hospital' | 'completed' | 'cancelled';

export const visitStatusLabels: Record<VisitStatus, string> = {
  waiting: 'Ожидает',
  in_consultation: 'На приёме',
  procedures: 'Процедуры',
  hospital: 'Стационар',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const visitStatusColors: Record<VisitStatus, string> = {
  waiting: 'bg-muted text-muted-foreground',
  in_consultation: 'bg-primary/15 text-primary',
  procedures: 'bg-blue-500/15 text-blue-400',
  hospital: 'bg-purple-500/15 text-purple-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-destructive/15 text-destructive',
};

interface VisitDialogProps {
  open: boolean;
  onClose: () => void;
  visitId?: string | null;
  initialPetId?: string;
  initialAppointmentId?: string;
  onSaved?: () => void;
}

interface ServiceLine { id?: string; service_id?: string; description: string; quantity: number; unit_price: number; }
interface MaterialLine { id?: string; inventory_item_id: string; description: string; quantity: number; unit_price: number; charged_to_client: boolean; }

export function VisitDialog({ open, onClose, visitId, initialPetId, initialAppointmentId, onSaved }: VisitDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [form, setForm] = useState({
    pet_id: '',
    client_id: '',
    veterinarian_id: '',
    visit_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    status: 'in_consultation' as VisitStatus,
    chief_complaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    weight: '',
    temperature: '',
    pulse: '',
    respiratory_rate: '',
    notes: '',
    next_visit_date: '',
  });
  const [visitServices, setVisitServices] = useState<ServiceLine[]>([]);
  const [visitMaterials, setVisitMaterials] = useState<MaterialLine[]>([]);
  const [activeTab, setActiveTab] = useState('soap');

  useEffect(() => {
    if (!open) return;
    void loadRefs();
    if (visitId) void loadVisit(visitId);
    else resetForm();
  }, [open, visitId]);

  const loadRefs = async () => {
    const [petsRes, vetsRes, servicesRes, invRes, tplRes] = await Promise.all([
      supabase.from('pets').select('id, name, species, client_id, clients:clients(full_name)').order('name'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('services').select('id, name, price').eq('is_active', true).order('name'),
      supabase.from('inventory_items').select('id, name, sale_price, quantity, unit').eq('is_active', true).order('name'),
      supabase.from('visit_templates').select('*').eq('is_active', true).order('name'),
    ]);
    setPets(petsRes.data || []);
    setVets(vetsRes.data || []);
    setServices(servicesRes.data || []);
    setInventory(invRes.data || []);
    setTemplates(tplRes.data || []);
  };

  const resetForm = () => {
    setForm({
      pet_id: initialPetId || '',
      client_id: '',
      veterinarian_id: '',
      visit_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      status: 'in_consultation',
      chief_complaint: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      weight: '',
      temperature: '',
      pulse: '',
      respiratory_rate: '',
      notes: '',
      next_visit_date: '',
    });
    setVisitServices([]);
    setVisitMaterials([]);
    setActiveTab('soap');
  };

  const loadVisit = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('visits').select('*').eq('id', id).single();
      if (error) throw error;
      setForm({
        pet_id: data.pet_id,
        client_id: data.client_id,
        veterinarian_id: data.veterinarian_id || '',
        visit_date: data.visit_date ? format(new Date(data.visit_date), "yyyy-MM-dd'T'HH:mm") : '',
        status: data.status as VisitStatus,
        chief_complaint: data.chief_complaint || '',
        subjective: data.subjective || '',
        objective: data.objective || '',
        assessment: data.assessment || '',
        plan: data.plan || '',
        weight: data.weight?.toString() || '',
        temperature: data.temperature?.toString() || '',
        pulse: data.pulse?.toString() || '',
        respiratory_rate: data.respiratory_rate?.toString() || '',
        notes: data.notes || '',
        next_visit_date: data.next_visit_date ? format(new Date(data.next_visit_date), "yyyy-MM-dd'T'HH:mm") : '',
      });
      const [svcRes, matRes] = await Promise.all([
        supabase.from('visit_services').select('*').eq('visit_id', id),
        supabase.from('visit_materials').select('*').eq('visit_id', id),
      ]);
      setVisitServices((svcRes.data || []).map((s: any) => ({
        id: s.id, service_id: s.service_id, description: s.description, quantity: Number(s.quantity), unit_price: Number(s.unit_price),
      })));
      setVisitMaterials((matRes.data || []).map((m: any) => ({
        id: m.id, inventory_item_id: m.inventory_item_id, description: m.description, quantity: Number(m.quantity), unit_price: Number(m.unit_price), charged_to_client: m.charged_to_client,
      })));
    } catch (e) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const onPetChange = (pid: string) => {
    const pet = pets.find(p => p.id === pid);
    setForm(f => ({ ...f, pet_id: pid, client_id: pet?.client_id || '' }));
  };

  const loadFromLastVisit = async () => {
    if (!form.pet_id) { toast({ title: 'Сначала выберите питомца', variant: 'destructive' }); return; }
    const { data } = await supabase.from('visits').select('*').eq('pet_id', form.pet_id).eq('status', 'completed').order('visit_date', { ascending: false }).limit(1);
    if (!data || !data[0]) { toast({ title: 'История пуста', description: 'У питомца ещё нет завершённых визитов' }); return; }
    const v = data[0];
    setForm(f => ({
      ...f,
      weight: v.weight?.toString() || f.weight,
      temperature: v.temperature?.toString() || f.temperature,
      pulse: v.pulse?.toString() || f.pulse,
      respiratory_rate: v.respiratory_rate?.toString() || f.respiratory_rate,
      subjective: v.subjective || f.subjective,
      objective: v.objective || f.objective,
      assessment: v.assessment || f.assessment,
      plan: v.plan || f.plan,
    }));
    toast({ title: 'Загружено', description: 'Данные из последнего визита применены' });
  };

  const applyTemplate = (tplId: string) => {
    const t = templates.find(x => x.id === tplId);
    if (!t) return;
    setForm(f => ({
      ...f,
      subjective: t.subjective || f.subjective,
      objective: t.objective || f.objective,
      assessment: t.assessment || f.assessment,
      plan: t.plan || f.plan,
    }));
    if (Array.isArray(t.service_ids) && t.service_ids.length) {
      const lines: ServiceLine[] = t.service_ids
        .map((sid: string) => services.find(s => s.id === sid))
        .filter(Boolean)
        .map((s: any) => ({ service_id: s.id, description: s.name, quantity: 1, unit_price: Number(s.price) || 0 }));
      setVisitServices(prev => [...prev, ...lines]);
    }
    toast({ title: `Шаблон «${t.name}» применён` });
  };

  const addService = () => setVisitServices(s => [...s, { description: '', quantity: 1, unit_price: 0 }]);
  const updateService = (idx: number, patch: Partial<ServiceLine>) => setVisitServices(s => s.map((x, i) => i === idx ? { ...x, ...patch } : x));
  const removeService = (idx: number) => setVisitServices(s => s.filter((_, i) => i !== idx));
  const onPickService = (idx: number, sid: string) => {
    const svc = services.find(s => s.id === sid);
    if (!svc) return;
    updateService(idx, { service_id: sid, description: svc.name, unit_price: Number(svc.price) || 0 });
  };

  const addMaterial = () => setVisitMaterials(s => [...s, { inventory_item_id: '', description: '', quantity: 1, unit_price: 0, charged_to_client: true }]);
  const updateMaterial = (idx: number, patch: Partial<MaterialLine>) => setVisitMaterials(s => s.map((x, i) => i === idx ? { ...x, ...patch } : x));
  const removeMaterial = (idx: number) => setVisitMaterials(s => s.filter((_, i) => i !== idx));
  const onPickMaterial = (idx: number, iid: string) => {
    const it = inventory.find(s => s.id === iid);
    if (!it) return;
    updateMaterial(idx, { inventory_item_id: iid, description: it.name, unit_price: Number(it.sale_price) || 0 });
  };

  const totals = useMemo(() => {
    const svc = visitServices.reduce((a, x) => a + (x.quantity || 0) * (x.unit_price || 0), 0);
    const mat = visitMaterials.filter(m => m.charged_to_client).reduce((a, x) => a + (x.quantity || 0) * (x.unit_price || 0), 0);
    return { svc, mat, total: svc + mat };
  }, [visitServices, visitMaterials]);

  const save = async (markCompleted = false) => {
    if (!form.pet_id) { toast({ title: 'Выберите питомца', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const targetStatus: VisitStatus = markCompleted ? 'completed' : form.status;
      const payload: any = {
        pet_id: form.pet_id,
        client_id: form.client_id,
        veterinarian_id: form.veterinarian_id || null,
        visit_date: new Date(form.visit_date).toISOString(),
        status: targetStatus,
        chief_complaint: form.chief_complaint || null,
        subjective: form.subjective || null,
        objective: form.objective || null,
        assessment: form.assessment || null,
        plan: form.plan || null,
        weight: form.weight ? Number(form.weight) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        pulse: form.pulse ? Number(form.pulse) : null,
        respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
        notes: form.notes || null,
        next_visit_date: form.next_visit_date ? new Date(form.next_visit_date).toISOString() : null,
        appointment_id: initialAppointmentId || null,
      };

      let vid = visitId;
      if (vid) {
        const { error } = await supabase.from('visits').update(payload).eq('id', vid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('visits').insert(payload).select('id').single();
        if (error) throw error;
        vid = data.id;
      }

      await supabase.from('visit_services').delete().eq('visit_id', vid!);
      if (visitServices.length) {
        const rows = visitServices.map(s => ({
          visit_id: vid, service_id: s.service_id || null, description: s.description || 'Услуга',
          quantity: s.quantity, unit_price: s.unit_price, total: s.quantity * s.unit_price,
        }));
        const { error } = await supabase.from('visit_services').insert(rows);
        if (error) throw error;
      }
      await supabase.from('visit_materials').delete().eq('visit_id', vid!).eq('deducted', false);
      const newMats = visitMaterials.filter(m => !m.id);
      if (newMats.length) {
        const rows = newMats.map(m => ({
          visit_id: vid, inventory_item_id: m.inventory_item_id, description: m.description || 'Материал',
          quantity: m.quantity, unit_price: m.unit_price, total: m.quantity * m.unit_price, charged_to_client: m.charged_to_client,
        }));
        const { error } = await supabase.from('visit_materials').insert(rows);
        if (error) throw error;
      }

      toast({
        title: markCompleted ? 'Визит завершён' : 'Сохранено',
        description: markCompleted ? 'Списаны материалы, создан счёт автоматически.' : 'Данные визита обновлены.'
      });
      onSaved?.();
      onClose();
    } catch (e) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {visitId ? 'Редактирование визита' : 'Новый визит'}
            </DialogTitle>
            <Badge className={visitStatusColors[form.status]}>{visitStatusLabels[form.status]}</Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <ProcessHint
            storageKey="visit-dialog-flow"
            title="Как заполнить визит"
            steps={[
              'Выберите питомца и врача (либо «Загрузить из прошлого» / выберите шаблон).',
              'Заполните SOAP: жалобы → осмотр → диагноз → план.',
              'Добавьте услуги и материалы — они попадут в счёт автоматически.',
              'Нажмите «Завершить визит» — спишутся материалы и сформируется счёт.',
            ]}
            footer="Все данные сохраняются в timeline медкарты, ничего не удаляется."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="md:col-span-2">
              <Label>Питомец *</Label>
              <PetSearchSelect pets={pets} value={form.pet_id} onChange={onPetChange} />
            </div>
            <div>
              <Label>Врач</Label>
              <Select value={form.veterinarian_id} onValueChange={(v) => setForm(f => ({ ...f, veterinarian_id: v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {vets.map(v => <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Дата и время</Label>
              <Input type="datetime-local" value={form.visit_date} onChange={(e) => setForm(f => ({ ...f, visit_date: e.target.value }))} />
            </div>
            <div>
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v: VisitStatus) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(visitStatusLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Следующий визит</Label>
              <Input type="datetime-local" value={form.next_visit_date} onChange={(e) => setForm(f => ({ ...f, next_visit_date: e.target.value }))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={loadFromLastVisit}>
              <History className="h-4 w-4 mr-1" /> Загрузить из прошлого
            </Button>
            {templates.length > 0 && (
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="w-auto h-9 gap-2">
                  <Sparkles className="h-4 w-4" /><SelectValue placeholder="Применить шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="my-4" />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="soap"><FileText className="h-4 w-4 mr-1" />SOAP</TabsTrigger>
              <TabsTrigger value="vitals"><ClipboardList className="h-4 w-4 mr-1" />Витальные</TabsTrigger>
              <TabsTrigger value="services"><Stethoscope className="h-4 w-4 mr-1" />Услуги</TabsTrigger>
              <TabsTrigger value="materials"><Package className="h-4 w-4 mr-1" />Материалы</TabsTrigger>
              <TabsTrigger value="invoice"><Receipt className="h-4 w-4 mr-1" />Счёт</TabsTrigger>
            </TabsList>

            <TabsContent value="soap" className="space-y-3 pt-3">
              <div>
                <Label>Жалобы клиента (приоритет)</Label>
                <Input value={form.chief_complaint} onChange={(e) => setForm(f => ({ ...f, chief_complaint: e.target.value }))} placeholder="Кратко: «Кашель 3 дня»" />
              </div>
              <div>
                <Label>S — Subjective (жалобы, анамнез)</Label>
                <Textarea rows={3} value={form.subjective} onChange={(e) => setForm(f => ({ ...f, subjective: e.target.value }))} placeholder="Что рассказал владелец, история..." />
              </div>
              <div>
                <Label>O — Objective (осмотр, наблюдения)</Label>
                <Textarea rows={3} value={form.objective} onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Объективные находки, пальпация, аускультация..." />
              </div>
              <div>
                <Label>A — Assessment (диагноз)</Label>
                <Textarea rows={2} value={form.assessment} onChange={(e) => setForm(f => ({ ...f, assessment: e.target.value }))} placeholder="Диагноз / дифф. диагноз" />
              </div>
              <div>
                <Label>P — Plan (лечение, рекомендации)</Label>
                <Textarea rows={3} value={form.plan} onChange={(e) => setForm(f => ({ ...f, plan: e.target.value }))} placeholder="Препараты, процедуры, рекомендации владельцу" />
              </div>
              <div>
                <Label>Заметки врача</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </TabsContent>

            <TabsContent value="vitals" className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Вес (кг)</Label><Input type="number" step="0.1" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
                <div><Label>Температура (°C)</Label><Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm(f => ({ ...f, temperature: e.target.value }))} /></div>
                <div><Label>Пульс (уд/мин)</Label><Input type="number" value={form.pulse} onChange={(e) => setForm(f => ({ ...f, pulse: e.target.value }))} /></div>
                <div><Label>Дыхание (вд/мин)</Label><Input type="number" value={form.respiratory_rate} onChange={(e) => setForm(f => ({ ...f, respiratory_rate: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="services" className="pt-3 space-y-2">
              {visitServices.map((s, i) => (
                <Card key={i} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <Label className="text-xs">Услуга</Label>
                      <Select value={s.service_id || ''} onValueChange={(v) => onPickService(i, v)}>
                        <SelectTrigger><SelectValue placeholder={s.description || 'Выбрать'} /></SelectTrigger>
                        <SelectContent>
                          {services.map(sv => <SelectItem key={sv.id} value={sv.id}>{sv.name} — {formatCurrency(Number(sv.price))}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-2"><Label className="text-xs">Кол-во</Label><Input type="number" min="1" value={s.quantity} onChange={(e) => updateService(i, { quantity: Number(e.target.value) })} /></div>
                    <div className="col-span-4 md:col-span-2"><Label className="text-xs">Цена</Label><Input type="number" value={s.unit_price} onChange={(e) => updateService(i, { unit_price: Number(e.target.value) })} /></div>
                    <div className="col-span-3 md:col-span-2 text-right text-sm"><Label className="text-xs">Сумма</Label><div className="h-10 flex items-center justify-end font-medium">{formatCurrency(s.quantity * s.unit_price)}</div></div>
                    <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => removeService(i)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={addService} className="w-full"><Plus className="h-4 w-4 mr-1" />Добавить услугу</Button>
            </TabsContent>

            <TabsContent value="materials" className="pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">При завершении визита материалы автоматически списываются со склада.</p>
              {visitMaterials.map((m, i) => (
                <Card key={i} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <Label className="text-xs">Препарат / материал</Label>
                      <Select value={m.inventory_item_id} onValueChange={(v) => onPickMaterial(i, v)} disabled={!!m.id}>
                        <SelectTrigger><SelectValue placeholder={m.description || 'Выбрать'} /></SelectTrigger>
                        <SelectContent>
                          {inventory.map(it => <SelectItem key={it.id} value={it.id}>{it.name} (остаток: {it.quantity} {it.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-2"><Label className="text-xs">Кол-во</Label><Input type="number" min="0.1" step="0.1" value={m.quantity} onChange={(e) => updateMaterial(i, { quantity: Number(e.target.value) })} disabled={!!m.id} /></div>
                    <div className="col-span-4 md:col-span-2"><Label className="text-xs">Цена</Label><Input type="number" value={m.unit_price} onChange={(e) => updateMaterial(i, { unit_price: Number(e.target.value) })} disabled={!!m.id} /></div>
                    <div className="col-span-3 md:col-span-2 flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={m.charged_to_client} onChange={(e) => updateMaterial(i, { charged_to_client: e.target.checked })} disabled={!!m.id} />
                      <span>В счёт</span>
                    </div>
                    <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => removeMaterial(i)} disabled={!!m.id}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={addMaterial} className="w-full"><Plus className="h-4 w-4 mr-1" />Добавить материал</Button>
            </TabsContent>

            <TabsContent value="invoice" className="pt-3">
              <Card className="p-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Услуги</span><span className="font-medium">{formatCurrency(totals.svc)}</span></div>
                <div className="flex justify-between text-sm"><span>Материалы (в счёт)</span><span className="font-medium">{formatCurrency(totals.mat)}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-semibold"><span>Итого к оплате</span><span className="text-primary">{formatCurrency(totals.total)}</span></div>
                <p className="text-xs text-muted-foreground pt-2">Счёт сформируется автоматически после нажатия «Завершить визит». До этого момента изменения остаются в визите.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex-row gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-1" />Сохранить
          </Button>
          <Button onClick={() => save(true)} disabled={saving || loading}>
            <CheckCircle2 className="h-4 w-4 mr-1" />Завершить визит
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
