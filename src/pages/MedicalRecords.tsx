import { useRef, useState, useEffect } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, medicalRecordSchema } from '@/lib/validationSchemas';
import { useNavigate } from 'react-router-dom';
import { FileText, MoreVertical, Pencil, Trash2, Eye, Download, Stethoscope, Weight, Thermometer, Upload, FlaskConical, ClipboardList, CalendarClock, Pill, Plus, Clock as ClockIcon } from 'lucide-react';
import { generateMedicalRecordPdf } from '@/lib/generateMedicalRecordPdf';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAuth } from '@/contexts/AuthContext';
import { MedicalRecord, Pet, Profile } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { VisitTimeline } from '@/components/VisitTimeline';
import { VisitDialog } from '@/components/VisitDialog';

type PetMedicalTimeline = {
  petId: string;
  petName: string;
  clientName?: string;
  visits: any[];
};

type MedicalRecordFile = {
  id: string;
  medical_record_id: string;
  pet_id: string;
  title: string;
  study_type: string;
  study_date: string;
  laboratory_name?: string | null;
  file_path: string;
  file_name: string;
  file_size?: number | null;
  notes?: string | null;
};

export default function MedicalRecords() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isClient = hasRole('client');
  const [records, setRecords] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [petSearch, setPetSearch] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'timeline'>('timeline');
  const [timelinePetId, setTimelinePetId] = useState<string>('');
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitDialogId, setVisitDialogId] = useState<string | null>(null);
  const [fileForm, setFileForm] = useState({
    title: '',
    study_type: 'analysis',
    study_date: new Date().toISOString().slice(0, 10),
    laboratory_name: '',
    notes: '',
  });

  const petTimelines = records.reduce<PetMedicalTimeline[]>((acc, record) => {
    const petId = record.pet_id;
    const existing = acc.find((item) => item.petId === petId);
    if (existing) {
      existing.visits.push(record);
      return acc;
    }

    acc.push({
      petId,
      petName: record.pet?.name || 'Питомец',
      clientName: record.pet?.client?.full_name,
      visits: [record],
    });
    return acc;
  }, []);

  const [formData, setFormData] = useState({
    pet_id: '',
    veterinarian_id: '',
    visit_date: new Date().toISOString().slice(0, 16),
    chief_complaint: '',
    examination_notes: '',
    diagnosis: '',
    treatment: '',
    prescriptions: '',
    lab_results: '',
    anamnesis: '',
    clinical_findings: '',
    vaccination_status: '',
    allergy_notes: '',
    follow_up_plan: '',
    owner_recommendations: '',
    next_visit_date: '',
    materials_used: '',
    doctor_notes: '',
    weight_at_visit: '',
    temperature: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, petsRes, vetsRes] = await Promise.all([
        supabase
          .from('medical_records')
          .select(`
            *,
            pet:pets(id, name, client:clients(full_name)),
            veterinarian:profiles(id, full_name),
            files:medical_record_files(*),
            prescriptions_list:prescriptions(*)
          `)
          .order('visit_date', { ascending: false }),
        supabase.from('pets').select(`
          id, name,
          client:clients(full_name)
        `).order('name'),
        supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
      ]);

      if (recordsRes.error) throw recordsRes.error;
      
      setRecords(recordsRes.data || []);
      setPets(petsRes.data || []);
      setVets(vetsRes.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = getValidationError(medicalRecordSchema, formData);
    if (validationError) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validationError });
      return;
    }

    const data = {
      ...formData,
      veterinarian_id: formData.veterinarian_id || null,
      next_visit_date: formData.next_visit_date ? new Date(formData.next_visit_date).toISOString() : null,
      weight_at_visit: formData.weight_at_visit ? parseFloat(formData.weight_at_visit) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
    };

    try {
      if (selectedRecord) {
        const { error } = await supabase
          .from('medical_records')
          .update(data)
          .eq('id', selectedRecord.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Запись обновлена' });
      } else {
        const { error } = await supabase.from('medical_records').insert(data);
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

  const resetFileForm = () => {
    setFileForm({
      title: '',
      study_type: 'analysis',
      study_date: new Date().toISOString().slice(0, 10),
      laboratory_name: '',
      notes: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!detailRecord || !file) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Выберите PDF файл' });
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Можно загрузить только PDF' });
      return;
    }

    setUploadingFile(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-Я._-]/g, '_');
      const path = `${detailRecord.pet_id}/${detailRecord.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('medical-record-files')
        .upload(path, file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from('medical_record_files').insert({
        medical_record_id: detailRecord.id,
        pet_id: detailRecord.pet_id,
        title: fileForm.title || file.name.replace(/\.pdf$/i, ''),
        study_type: fileForm.study_type,
        study_date: new Date(fileForm.study_date).toISOString(),
        laboratory_name: fileForm.laboratory_name || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        notes: fileForm.notes || null,
        uploaded_by: user?.id || null,
      }).select().single();
      if (error) throw error;

      const updatedRecord = { ...detailRecord, files: [data, ...(detailRecord.files || [])] };
      setDetailRecord(updatedRecord);
      setRecords((items) => items.map((record) => record.id === detailRecord.id ? updatedRecord : record));
      resetFileForm();
      toast({ title: 'PDF добавлен', description: 'Файл исследования сохранён в медкарте' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    } finally {
      setUploadingFile(false);
    }
  };

  const openMedicalFile = async (file: MedicalRecordFile) => {
    const { data, error } = await supabase.storage.from('medical-record-files').createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось открыть PDF' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', selectedRecord.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Запись удалена' });
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const openEditDialog = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setFormData({
      pet_id: record.pet_id,
      veterinarian_id: record.veterinarian_id || '',
      visit_date: record.visit_date.slice(0, 16),
      chief_complaint: record.chief_complaint || '',
      examination_notes: record.examination_notes || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescriptions: record.prescriptions || '',
      lab_results: record.lab_results || '',
      anamnesis: (record as any).anamnesis || '',
      clinical_findings: (record as any).clinical_findings || '',
      vaccination_status: (record as any).vaccination_status || '',
      allergy_notes: (record as any).allergy_notes || '',
      follow_up_plan: (record as any).follow_up_plan || '',
      owner_recommendations: (record as any).owner_recommendations || '',
      next_visit_date: (record as any).next_visit_date?.slice(0, 16) || '',
      materials_used: record.materials_used || '',
      doctor_notes: record.doctor_notes || '',
      weight_at_visit: record.weight_at_visit?.toString() || '',
      temperature: record.temperature?.toString() || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedRecord(null);
    setFormData({
      pet_id: '',
      veterinarian_id: '',
      visit_date: new Date().toISOString().slice(0, 16),
      chief_complaint: '',
      examination_notes: '',
      diagnosis: '',
      treatment: '',
      prescriptions: '',
      lab_results: '',
      anamnesis: '',
      clinical_findings: '',
      vaccination_status: '',
      allergy_notes: '',
      follow_up_plan: '',
      owner_recommendations: '',
      next_visit_date: '',
      materials_used: '',
      doctor_notes: '',
      weight_at_visit: '',
      temperature: '',
    });
  };

  const columns: Column<MedicalRecord>[] = [
    {
      key: 'visit_date',
      header: 'Дата',
      cell: (record) => (
        <div className="font-medium">
          {format(new Date(record.visit_date), 'd MMM yyyy', { locale: ru })}
          <div className="text-xs text-muted-foreground">
            {format(new Date(record.visit_date), 'HH:mm')}
          </div>
        </div>
      ),
    },
    {
      key: 'pet',
      header: 'Питомец',
      cell: (record) => (
        <div>
          <div className="font-medium">{(record as any).pet?.name}</div>
          <div className="text-xs text-muted-foreground">
            {(record as any).pet?.client?.full_name}
          </div>
        </div>
      ),
    },
    {
      key: 'veterinarian',
      header: 'Врач',
      cell: (record) => (
        <span className="text-muted-foreground">
          {(record as any).veterinarian?.full_name || '—'}
        </span>
      ),
    },
    {
      key: 'diagnosis',
      header: 'Диагноз',
      cell: (record) => (
        <span className="text-muted-foreground line-clamp-2">
          {record.diagnosis || '—'}
        </span>
      ),
    },
    {
      key: 'vitals',
      header: 'Показатели',
      cell: (record) => (
        <div className="flex gap-2">
          {record.weight_at_visit && (
            <Badge variant="outline">{record.weight_at_visit} кг</Badge>
          )}
          {record.temperature && (
            <Badge variant="outline">{record.temperature}°C</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (record) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
                  setDetailRecord(record);
                  setDetailDialogOpen(true);
                }}>
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </DropdownMenuItem>
            {!isClient && (
              <>
                <DropdownMenuItem onClick={() => openEditDialog(record)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedRecord(record);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Медицинские карты"
        description="Единая хронологическая история визитов каждого питомца"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Медкарты' },
        ]}
        actions={!isClient && (
          <Button onClick={() => { setVisitDialogId(null); setVisitDialogOpen(true); }}>
            <Stethoscope className="h-4 w-4 mr-1" />
            Новый визит
          </Button>
        )}
      />

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="timeline"><ClockIcon className="h-4 w-4 mr-1" />Timeline визитов</TabsTrigger>
          <TabsTrigger value="classic"><FileText className="h-4 w-4 mr-1" />Классические записи</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label>Питомец</Label>
              <Select value={timelinePetId} onValueChange={setTimelinePetId}>
                <SelectTrigger><SelectValue placeholder="Выберите питомца для просмотра timeline" /></SelectTrigger>
                <SelectContent>
                  {pets.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.client?.full_name ? ` — ${p.client.full_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {timelinePetId && (
                <VisitTimeline
                  petId={timelinePetId}
                  onOpenVisit={(id) => { setVisitDialogId(id); setVisitDialogOpen(true); }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="classic" className="mt-4">
          {/* классическая раскладка ниже */}
        </TabsContent>
      </Tabs>

      <div className="mb-6 space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">Загрузка истории визитов...</CardContent>
          </Card>
        ) : petTimelines.length > 0 ? (
          petTimelines.map((timeline) => (
            <Card key={timeline.petId} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col gap-1 border-b border-border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{timeline.petName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {timeline.clientName ? `Владелец: ${timeline.clientName}` : 'Единая медкарта питомца'}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">{timeline.visits.length} визитов</Badge>
                </div>

                <div className="space-y-0 p-4">
                  {timeline.visits.map((visit, index) => (
                    <div key={visit.id} className="relative grid gap-3 pb-6 pl-8 last:pb-0 sm:grid-cols-[180px_1fr] sm:gap-5">
                      {index < timeline.visits.length - 1 && (
                        <div className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-border" />
                      )}
                      <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-background">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{format(new Date(visit.visit_date), 'd MMMM yyyy', { locale: ru })}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(visit.visit_date), 'HH:mm')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{visit.veterinarian?.full_name || 'Врач не указан'}</p>
                      </div>
                      <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
                        <div className="flex flex-wrap gap-2">
                          {visit.weight_at_visit && <Badge variant="outline"><Weight className="mr-1 h-3 w-3" />{visit.weight_at_visit} кг</Badge>}
                          {visit.temperature && <Badge variant="outline"><Thermometer className="mr-1 h-3 w-3" />{visit.temperature}°C</Badge>}
                        </div>
                        {visit.chief_complaint && <p className="text-sm"><span className="text-muted-foreground">Жалобы: </span>{visit.chief_complaint}</p>}
                        {visit.diagnosis && <p className="text-sm"><span className="text-muted-foreground">Диагноз: </span>{visit.diagnosis}</p>}
                        {visit.treatment && <p className="text-sm"><span className="text-muted-foreground">Лечение: </span>{visit.treatment}</p>}
                        <Button variant="ghost" size="sm" className="px-0" onClick={() => { setDetailRecord(visit); setDetailDialogOpen(true); }}>
                          <Eye className="mr-2 h-4 w-4" />Открыть запись
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">Пока нет медицинских записей</CardContent>
          </Card>
        )}
      </div>

      <DataTable
        data={records}
        columns={columns}
        searchPlaceholder="Поиск..."
        onAdd={isClient ? undefined : () => {
          resetForm();
          setDialogOpen(true);
        }}
        addLabel="Новая запись"
        isLoading={loading}
        emptyMessage="Нет записей"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? 'Редактировать запись' : 'Новая запись в медкарту'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Питомец *</Label>
              <Select
                value={formData.pet_id}
                onValueChange={(v) => setFormData({ ...formData, pet_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите питомца" />
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
                  {(petSearch
                    ? pets.filter(p => p.name.toLowerCase().includes(petSearch.toLowerCase()))
                    : pets
                  ).map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({(pet as any).client?.full_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ветеринар</Label>
              <Select
                value={formData.veterinarian_id}
                onValueChange={(v) => setFormData({ ...formData, veterinarian_id: v })}
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
              <Label>Дата и время *</Label>
              <Input
                type="datetime-local"
                value={formData.visit_date}
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Вес (кг)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight_at_visit}
                onChange={(e) => setFormData({ ...formData, weight_at_visit: e.target.value })}
                placeholder="5.5"
              />
            </div>
            <div className="grid gap-2">
              <Label>Температура (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="38.5"
              />
            </div>
            <div className="grid gap-2">
              <Label>Жалобы</Label>
              <Input
                value={formData.chief_complaint}
                onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                placeholder="Основные жалобы владельца"
              />
            </div>
            <div className="grid gap-2">
              <Label>Анамнез</Label>
              <Textarea value={formData.anamnesis} onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })} placeholder="Когда началось, питание, активность, перенесённые болезни..." />
            </div>
            <div className="grid gap-2">
              <Label>Вакцинация</Label>
              <Input value={formData.vaccination_status} onChange={(e) => setFormData({ ...formData, vaccination_status: e.target.value })} placeholder="Статус вакцинации" />
            </div>
            <div className="grid gap-2">
              <Label>Аллергии / ограничения</Label>
              <Input value={formData.allergy_notes} onChange={(e) => setFormData({ ...formData, allergy_notes: e.target.value })} placeholder="Аллергии, противопоказания" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Осмотр</Label>
              <Textarea
                value={formData.examination_notes}
                onChange={(e) => setFormData({ ...formData, examination_notes: e.target.value })}
                placeholder="Результаты осмотра..."
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Клинические показатели</Label>
              <Textarea value={formData.clinical_findings} onChange={(e) => setFormData({ ...formData, clinical_findings: e.target.value })} placeholder="Пульс, дыхание, слизистые, кожа, ЖКТ, неврология..." />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Диагноз</Label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Диагноз..."
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Лечение</Label>
              <Textarea
                value={formData.treatment}
                onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                placeholder="Назначенное лечение..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Назначения / Рецепты</Label>
              <Textarea
                value={formData.prescriptions}
                onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
                placeholder="Препараты, дозировки..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Результаты анализов</Label>
              <Textarea
                value={formData.lab_results}
                onChange={(e) => setFormData({ ...formData, lab_results: e.target.value })}
                placeholder="Результаты лабораторных исследований..."
              />
            </div>
            <div className="grid gap-2">
              <Label>План наблюдения</Label>
              <Textarea value={formData.follow_up_plan} onChange={(e) => setFormData({ ...formData, follow_up_plan: e.target.value })} placeholder="Контроль, повторные анализы, динамика..." />
            </div>
            <div className="grid gap-2">
              <Label>Рекомендации владельцу</Label>
              <Textarea value={formData.owner_recommendations} onChange={(e) => setFormData({ ...formData, owner_recommendations: e.target.value })} placeholder="Уход дома, кормление, ограничения..." />
            </div>
            <div className="grid gap-2">
              <Label>Следующий контроль</Label>
              <Input type="datetime-local" value={formData.next_visit_date} onChange={(e) => setFormData({ ...formData, next_visit_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Использованные материалы</Label>
              <Textarea
                value={formData.materials_used}
                onChange={(e) => setFormData({ ...formData, materials_used: e.target.value })}
                placeholder="Препараты, расходники..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Комментарии врача</Label>
              <Textarea
                value={formData.doctor_notes}
                onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
                placeholder="Дополнительные заметки..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {selectedRecord ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="glass max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {detailRecord && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 border-b border-border rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Медицинская карта</p>
                    <DialogHeader>
                      <DialogTitle className="text-xl">
                        {detailRecord.pet?.name}
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-1">
                      Владелец: {detailRecord.pet?.client?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(detailRecord.visit_date), 'd MMMM yyyy', { locale: ru })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(detailRecord.visit_date), 'HH:mm')}
                    </p>
                  </div>
                </div>

                {/* Vitals & doctor */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {detailRecord.veterinarian?.full_name && (
                    <div className="bg-background/60 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">Врач: </span>
                      <span className="font-medium">{detailRecord.veterinarian.full_name}</span>
                    </div>
                  )}
                  {detailRecord.weight_at_visit && (
                    <div className="bg-background/60 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">Вес: </span>
                      <span className="font-medium">{detailRecord.weight_at_visit} кг</span>
                    </div>
                  )}
                  {detailRecord.temperature && (
                    <div className="bg-background/60 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">Температура: </span>
                      <span className="font-medium">{detailRecord.temperature}°C</span>
                    </div>
                  )}
                </div>
              </div>

              <Tabs defaultValue="card" className="p-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="card"><ClipboardList className="mr-2 h-4 w-4" />Осмотр</TabsTrigger>
                  <TabsTrigger value="prescriptions"><Pill className="mr-2 h-4 w-4" />Назначения</TabsTrigger>
                  <TabsTrigger value="files"><FlaskConical className="mr-2 h-4 w-4" />Исследования</TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="mt-5 space-y-5">
                  {[
                    { label: 'Жалобы', value: detailRecord.chief_complaint, icon: '💬' },
                    { label: 'Анамнез', value: detailRecord.anamnesis, icon: '📌' },
                    { label: 'Вакцинация', value: detailRecord.vaccination_status, icon: '🛡️' },
                    { label: 'Аллергии / ограничения', value: detailRecord.allergy_notes, icon: '⚠️' },
                    { label: 'Осмотр', value: detailRecord.examination_notes, icon: '🔍' },
                    { label: 'Клинические показатели', value: detailRecord.clinical_findings, icon: '📈' },
                    { label: 'Диагноз', value: detailRecord.diagnosis, icon: '🩺' },
                    { label: 'Лечение', value: detailRecord.treatment, icon: '💊' },
                    { label: 'Назначения', value: detailRecord.prescriptions, icon: '📋' },
                    { label: 'Анализы', value: detailRecord.lab_results, icon: '🧪' },
                    { label: 'План наблюдения', value: detailRecord.follow_up_plan, icon: '🔁' },
                    { label: 'Рекомендации владельцу', value: detailRecord.owner_recommendations, icon: '🏠' },
                    { label: 'Материалы', value: detailRecord.materials_used, icon: '🧰' },
                    { label: 'Комментарии врача', value: detailRecord.doctor_notes, icon: '📝' },
                    { label: 'Следующий контроль', value: detailRecord.next_visit_date ? format(new Date(detailRecord.next_visit_date), 'd MMMM yyyy, HH:mm', { locale: ru }) : '', icon: '📅' },
                  ].filter(s => s.value).map((section) => (
                    <div key={section.label} className="group">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-base">{section.icon}</span>
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</h4>
                      </div>
                      <p className="whitespace-pre-wrap pl-7 text-sm leading-relaxed">{section.value}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-5 space-y-3">
                  {((detailRecord.prescriptions_list as any[]) || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      <Pill className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Нет электронных назначений по этой записи.
                      {!isClient && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => navigate('/prescriptions')}>
                            <Plus className="mr-2 h-4 w-4" /> Создать назначение
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {((detailRecord.prescriptions_list as any[]) || []).map((p: any) => (
                        <div key={p.id} className="rounded-lg border border-border bg-background/60 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Pill className="h-4 w-4 text-primary" />
                                {p.medication_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {p.dosage} · {p.route} · {p.frequency_per_day}× в день × {p.duration_days} дн.
                              </div>
                              {p.instructions && (
                                <div className="text-sm mt-1 text-muted-foreground">{p.instructions}</div>
                              )}
                            </div>
                            <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                              {p.status === 'active' ? 'Активно' : p.status === 'completed' ? 'Завершено' : 'Отменено'}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <ClockIcon className="h-3 w-3" /> Старт: {format(new Date(p.start_date), 'd MMM yyyy', { locale: ru })}
                            {p.times_of_day?.length > 0 && (
                              <span>· Время: {p.times_of_day.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/prescriptions')}>
                        Открыть раздел «Назначения» →
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-5 space-y-4">
                  {!isClient && (
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input placeholder="Название исследования" value={fileForm.title} onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })} />
                        <Select value={fileForm.study_type} onValueChange={(v) => setFileForm({ ...fileForm, study_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="analysis">Анализы</SelectItem>
                            <SelectItem value="ultrasound">УЗИ</SelectItem>
                            <SelectItem value="xray">Рентген</SelectItem>
                            <SelectItem value="cardiology">Кардиология</SelectItem>
                            <SelectItem value="other">Другое исследование</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="date" value={fileForm.study_date} onChange={(e) => setFileForm({ ...fileForm, study_date: e.target.value })} />
                        <Input placeholder="Лаборатория / кабинет" value={fileForm.laboratory_name} onChange={(e) => setFileForm({ ...fileForm, laboratory_name: e.target.value })} />
                        <Input ref={fileInputRef} type="file" accept="application/pdf" className="md:col-span-2" />
                        <Textarea className="md:col-span-2" placeholder="Комментарий к результатам" value={fileForm.notes} onChange={(e) => setFileForm({ ...fileForm, notes: e.target.value })} />
                      </div>
                      <Button className="mt-3" onClick={handleFileUpload} disabled={uploadingFile}>
                        <Upload className="mr-2 h-4 w-4" />{uploadingFile ? 'Загрузка...' : 'Добавить PDF'}
                      </Button>
                    </div>
                  )}

                  {detailRecord.files?.length ? detailRecord.files.map((file: MedicalRecordFile) => (
                    <div key={file.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{file.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(file.study_date), 'd MMM yyyy', { locale: ru })}{file.laboratory_name ? ` • ${file.laboratory_name}` : ''}</p>
                        {file.notes && <p className="mt-1 text-sm text-muted-foreground">{file.notes}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openMedicalFile(file)}>
                        <FileText className="mr-2 h-4 w-4" />Открыть PDF
                      </Button>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-40" />PDF исследований пока не добавлены
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Footer */}
              <div className="flex justify-end gap-2 p-4 border-t border-border">
                <Button variant="outline" onClick={async () => { try { await generateMedicalRecordPdf(detailRecord); } catch { toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сгенерировать PDF' }); } }}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать PDF
                </Button>
                {!isClient && (
                  <Button variant="outline" onClick={() => { setDetailDialogOpen(false); if (detailRecord) openEditDialog(detailRecord); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VisitDialog
        open={visitDialogOpen}
        visitId={visitDialogId}
        onClose={() => setVisitDialogOpen(false)}
        onSaved={() => fetchData()}
      />
    </div>
  );
}
