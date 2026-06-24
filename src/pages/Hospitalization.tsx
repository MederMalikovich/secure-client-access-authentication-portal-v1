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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PetSearchSelect } from '@/components/PetSearchSelect';
import { BedDouble, Plus, Camera, Thermometer, Weight, Smile, Utensils, MessageSquare, FileText, Eye, EyeOff, ImagePlus, LogOut as DischargeIcon, Download } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { ProcessHint } from '@/components/ProcessHint';

export default function Hospitalization() {
  const { hasRole, profile } = useAuth();
  const { toast } = useToast();
  const isClient = hasRole('client');
  const canEdit = hasRole('admin') || hasRole('veterinarian');

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string, any[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logSheetFor, setLogSheetFor] = useState<any | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [form, setForm] = useState({
    pet_id: '',
    cage_number: '',
    diagnosis: '',
    reason: '',
    daily_rate: 5000,
    notes: '',
  });

  const [logForm, setLogForm] = useState({
    log_type: 'note',
    title: '',
    description: '',
    temperature: '',
    weight: '',
    appetite: 'нормальный',
    mood: 'спокойный',
    photo_url: '',
    is_visible_to_client: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [petsRes, hospRes] = await Promise.all([
        supabase.from('pets').select('id, name, species, client_id, clients(full_name)').order('name'),
        supabase.from('hospitalizations')
          .select('*, pets(name, species), clients(full_name), profiles:veterinarian_id(full_name)')
          .order('admission_at', { ascending: false }),
      ]);
      if (petsRes.error) throw petsRes.error;
      if (hospRes.error) throw hospRes.error;
      setPets(petsRes.data || []);
      const items = hospRes.data || [];
      setList(items);

      if (items.length > 0) {
        const ids = items.map((h: any) => h.id);
        const { data: logsData, error: lErr } = await supabase
          .from('hospitalization_logs')
          .select('*')
          .in('hospitalization_id', ids)
          .order('created_at', { ascending: false });
        if (lErr) throw lErr;
        const grouped: Record<string, any[]> = {};
        (logsData || []).forEach((l: any) => {
          (grouped[l.hospitalization_id] = grouped[l.hospitalization_id] || []).push(l);
        });
        setLogs(grouped);
      } else {
        setLogs({});
      }
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createHosp = async () => {
    if (!form.pet_id) { toast({ title: 'Выберите питомца', variant: 'destructive' }); return; }
    const pet = pets.find(p => p.id === form.pet_id);
    if (!pet) return;
    try {
      const { error } = await supabase.from('hospitalizations').insert({
        pet_id: form.pet_id,
        client_id: pet.client_id,
        veterinarian_id: profile?.id,
        cage_number: form.cage_number,
        diagnosis: form.diagnosis,
        reason: form.reason,
        daily_rate: form.daily_rate,
        notes: form.notes,
        status: 'active',
      });
      if (error) throw error;
      toast({ title: 'Питомец госпитализирован' });
      setDialogOpen(false);
      setForm({ pet_id: '', cage_number: '', diagnosis: '', reason: '', daily_rate: 5000, notes: '' });
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const dischargeHosp = async (h: any) => {
    if (!confirm(`Выписать ${h.pets?.name}?`)) return;
    try {
      const { data: invoiceId, error } = await supabase.rpc('discharge_hospitalization_and_get_invoice', { _hosp_id: h.id });
      if (error) throw error;
      if (invoiceId) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('invoice_number, total')
          .eq('id', invoiceId as string)
          .maybeSingle();
        if (inv) {
          toast({
            title: 'Питомец выписан',
            description: `Счёт ${inv.invoice_number} на ${formatCurrency(Number(inv.total))} создан автоматически`,
          });
        } else {
          toast({ title: 'Питомец выписан' });
        }
      } else {
        toast({ title: 'Питомец выписан' });
      }
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${logSheetFor.pet_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('hospitalization-photos').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('hospitalization-photos').getPublicUrl(path);
      setLogForm(f => ({ ...f, photo_url: data.publicUrl }));
      toast({ title: 'Фото загружено' });
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: getUserFriendlyError(e), variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const downloadPhoto = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = url.split('/').pop() || `photo-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch (e: any) {
      window.open(url, '_blank');
    }
  };

  const addLog = async () => {
    if (!logSheetFor) return;
    try {
      const payload: any = {
        hospitalization_id: logSheetFor.id,
        log_type: logForm.log_type,
        title: logForm.title || null,
        description: logForm.description || null,
        temperature: logForm.temperature ? Number(logForm.temperature) : null,
        weight: logForm.weight ? Number(logForm.weight) : null,
        appetite: logForm.appetite,
        mood: logForm.mood,
        photo_url: logForm.photo_url || null,
        is_visible_to_client: logForm.is_visible_to_client,
        created_by: profile?.id,
      };
      const { error } = await supabase.from('hospitalization_logs').insert(payload);
      if (error) throw error;
      toast({ title: 'Запись добавлена' });
      setLogForm({
        log_type: 'note', title: '', description: '', temperature: '', weight: '',
        appetite: 'нормальный', mood: 'спокойный', photo_url: '', is_visible_to_client: true,
      });
      loadData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: getUserFriendlyError(e), variant: 'destructive' });
    }
  };

  const calcCost = (h: any) => {
    const start = parseISO(h.admission_at);
    const end = h.discharge_at ? parseISO(h.discharge_at) : new Date();
    const days = Math.max(1, differenceInDays(end, start) + 1);
    return { days, total: days * Number(h.daily_rate || 0) };
  };

  const active = list.filter(h => h.status === 'active');
  const archive = list.filter(h => h.status !== 'active');

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="Стационар"
        description={isClient ? 'Состояние ваших питомцев в стационаре клиники' : 'Карта пациентов стационара, наблюдения и фото'}
        actions={canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" /> Госпитализировать
          </Button>
        )}
      />

      {!isClient && (
        <ProcessHint
          storageKey="hospitalization"
          title="Как вести стационарного пациента"
          steps={[
            '«Госпитализировать» — заведите карту: питомец, бокс, диагноз, тариф/сут.',
            '«Журнал» — добавляйте наблюдения (температура, вес, аппетит, фото). Переключатель «Видно клиенту» решает, увидит ли владелец запись.',
            'Сумма за стационар считается автоматически: дни × тариф. Отдельный счёт создайте в «Финансы».',
            'Когда пациент готов — «Выписать»: статус сменится на «Архив», карта останется доступной для просмотра.',
          ]}
        />
      )}
      {isClient && (
        <ProcessHint
          storageKey="hospitalization-client"
          title="Что показывают карточки стационара"
          steps={[
            'Активные карточки — текущее пребывание ваших питомцев.',
            'Кнопка «Все обновления» — наблюдения врача, фото и заметки.',
            'Архив — завершённые госпитализации с итоговой стоимостью.',
          ]}
        />
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Загрузка...</div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" /> Активные ({active.length})
            </h2>
            {active.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Сейчас в стационаре никого нет</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map(h => {
                  const cost = calcCost(h);
                  const recent = (logs[h.id] || []).slice(0, 3);
                  return (
                    <Card key={h.id} className="glass-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {h.pets?.name}
                              {h.cage_number && <Badge variant="outline">Бокс {h.cage_number}</Badge>}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {h.diagnosis || h.reason || '—'}
                            </p>
                            {!isClient && (
                              <p className="text-xs text-muted-foreground">Клиент: {h.clients?.full_name}</p>
                            )}
                          </div>
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Активен</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="bg-muted/30 rounded p-2">
                            <div className="text-xs text-muted-foreground">Дней</div>
                            <div className="font-semibold">{cost.days}</div>
                          </div>
                          <div className="bg-muted/30 rounded p-2">
                            <div className="text-xs text-muted-foreground">Тариф/сут</div>
                            <div className="font-semibold">{formatCurrency(Number(h.daily_rate))}</div>
                          </div>
                          <div className="bg-primary/10 rounded p-2">
                            <div className="text-xs text-muted-foreground">Итого</div>
                            <div className="font-semibold text-primary">{formatCurrency(cost.total)}</div>
                          </div>
                        </div>

                        {recent.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs uppercase text-muted-foreground">Последние наблюдения</p>
                            {recent.map(l => (
                              <div key={l.id} className="text-sm bg-muted/20 rounded p-2 flex gap-2">
                                {l.photo_url && <img src={l.photo_url} alt="" className="w-12 h-12 object-cover rounded" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {format(parseISO(l.created_at), 'd MMM HH:mm', { locale: ru })}
                                    {!isClient && (l.is_visible_to_client
                                      ? <Eye className="h-3 w-3 text-green-500" />
                                      : <EyeOff className="h-3 w-3 text-muted-foreground" />)}
                                  </div>
                                  {l.title && <div className="font-medium">{l.title}</div>}
                                  {l.description && <div className="text-muted-foreground line-clamp-2">{l.description}</div>}
                                  <div className="flex flex-wrap gap-2 text-xs mt-1">
                                    {l.temperature && <span>🌡️ {l.temperature}°</span>}
                                    {l.weight && <span>⚖️ {l.weight} кг</span>}
                                    {l.appetite && <span>🍽 {l.appetite}</span>}
                                    {l.mood && <span>😊 {l.mood}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {canEdit && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setLogSheetFor(h)}>
                                <FileText className="h-4 w-4 mr-1" /> Журнал
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => dischargeHosp(h)}>
                                <DischargeIcon className="h-4 w-4 mr-1" /> Выписать
                              </Button>
                            </>
                          )}
                          {isClient && (
                            <Button size="sm" variant="outline" onClick={() => setLogSheetFor(h)}>
                              <FileText className="h-4 w-4 mr-1" /> Все обновления
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {archive.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Архив ({archive.length})</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {archive.map(h => {
                  const cost = calcCost(h);
                  return (
                    <Card key={h.id} className="opacity-80">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{h.pets?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(h.admission_at), 'd MMM', { locale: ru })}
                              {h.discharge_at && ` — ${format(parseISO(h.discharge_at), 'd MMM yyyy', { locale: ru })}`}
                              • {cost.days} дн. • {formatCurrency(cost.total)}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setLogSheetFor(h)}>Журнал</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Госпитализация питомца</DialogTitle>
            <DialogDescription>Создание карты стационарного пациента</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Питомец *</Label>
              <PetSearchSelect
                pets={pets}
                value={form.pet_id}
                onChange={(v) => setForm((f) => ({ ...f, pet_id: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Бокс / клетка</Label><Input value={form.cage_number} onChange={e => setForm(f => ({ ...f, cage_number: e.target.value }))} placeholder="A-12" /></div>
              <div><Label>Тариф/сут (₸)</Label><Input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: +e.target.value || 0 }))} /></div>
            </div>
            <div><Label>Диагноз</Label><Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} /></div>
            <div><Label>Причина госпитализации</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div><Label>Заметки</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={createHosp} className="gradient-primary">Госпитализировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log sheet */}
      <Sheet open={!!logSheetFor} onOpenChange={(o) => !o && setLogSheetFor(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Журнал — {logSheetFor?.pets?.name}</SheetTitle>
          </SheetHeader>
          {logSheetFor && (
            <div className="mt-4 space-y-4">
              {canEdit && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Новая запись</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Тип</Label>
                        <Select value={logForm.log_type} onValueChange={v => setLogForm(f => ({ ...f, log_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="note">Заметка</SelectItem>
                            <SelectItem value="vitals">Показатели</SelectItem>
                            <SelectItem value="procedure">Процедура</SelectItem>
                            <SelectItem value="feeding">Кормление</SelectItem>
                            <SelectItem value="photo">Фото</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Видно клиенту</Label>
                          <div className="h-10 flex items-center">
                            <Switch checked={logForm.is_visible_to_client} onCheckedChange={v => setLogForm(f => ({ ...f, is_visible_to_client: v }))} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Input placeholder="Заголовок" value={logForm.title} onChange={e => setLogForm(f => ({ ...f, title: e.target.value }))} />
                    <Textarea placeholder="Описание / комментарий..." value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" step="0.1" placeholder="Темп. °C" value={logForm.temperature} onChange={e => setLogForm(f => ({ ...f, temperature: e.target.value }))} />
                      <Input type="number" step="0.01" placeholder="Вес кг" value={logForm.weight} onChange={e => setLogForm(f => ({ ...f, weight: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={logForm.appetite} onValueChange={v => setLogForm(f => ({ ...f, appetite: v }))}>
                        <SelectTrigger><SelectValue placeholder="Аппетит" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="хороший">Хороший</SelectItem>
                          <SelectItem value="нормальный">Нормальный</SelectItem>
                          <SelectItem value="сниженный">Сниженный</SelectItem>
                          <SelectItem value="отсутствует">Отсутствует</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={logForm.mood} onValueChange={v => setLogForm(f => ({ ...f, mood: v }))}>
                        <SelectTrigger><SelectValue placeholder="Состояние" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="активный">Активный</SelectItem>
                          <SelectItem value="спокойный">Спокойный</SelectItem>
                          <SelectItem value="вялый">Вялый</SelectItem>
                          <SelectItem value="беспокойный">Беспокойный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Фото</Label>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} disabled={photoUploading} />
                        {logForm.photo_url && <img src={logForm.photo_url} className="w-12 h-12 object-cover rounded" alt="" />}
                      </div>
                    </div>
                    <Button onClick={addLog} className="w-full gradient-primary">Добавить запись</Button>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {(logs[logSheetFor.id] || []).filter(l => !isClient || l.is_visible_to_client).map(l => (
                  <Card key={l.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        {l.photo_url && <img src={l.photo_url} className="w-20 h-20 object-cover rounded shrink-0" alt="" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {format(parseISO(l.created_at), 'd MMM yyyy HH:mm', { locale: ru })}
                            <Badge variant="outline" className="text-[10px]">{l.log_type}</Badge>
                            {!isClient && (l.is_visible_to_client
                              ? <Eye className="h-3 w-3 text-green-500" />
                              : <EyeOff className="h-3 w-3" />)}
                          </div>
                          {l.title && <div className="font-medium">{l.title}</div>}
                          {l.description && <div className="text-sm text-muted-foreground">{l.description}</div>}
                          <div className="flex flex-wrap gap-3 text-xs mt-1">
                            {l.temperature && <span>🌡️ {l.temperature}°C</span>}
                            {l.weight && <span>⚖️ {l.weight} кг</span>}
                            {l.appetite && <span>🍽 {l.appetite}</span>}
                            {l.mood && <span>😊 {l.mood}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(logs[logSheetFor.id] || []).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">Пока нет записей</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
