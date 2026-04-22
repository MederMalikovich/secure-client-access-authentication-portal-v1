import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, medicalRecordSchema } from '@/lib/validationSchemas';
import { useNavigate } from 'react-router-dom';
import { FileText, MoreVertical, Pencil, Trash2, Eye, Plus, Download, Stethoscope, Weight, Thermometer } from 'lucide-react';
import { generateMedicalRecordPdf } from '@/lib/generateMedicalRecordPdf';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

type PetMedicalTimeline = {
  petId: string;
  petName: string;
  clientName?: string;
  visits: any[];
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
            veterinarian:profiles(id, full_name)
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
        description="История лечения и приёмов"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Медкарты' },
        ]}
      />

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
            <div className="grid gap-2 md:col-span-2">
              <Label>Осмотр</Label>
              <Textarea
                value={formData.examination_notes}
                onChange={(e) => setFormData({ ...formData, examination_notes: e.target.value })}
                placeholder="Результаты осмотра..."
              />
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

              {/* Body */}
              <div className="p-6 space-y-5">
                {[
                  { label: 'Жалобы', value: detailRecord.chief_complaint, icon: '💬' },
                  { label: 'Осмотр', value: detailRecord.examination_notes, icon: '🔍' },
                  { label: 'Диагноз', value: detailRecord.diagnosis, icon: '🩺' },
                  { label: 'Лечение', value: detailRecord.treatment, icon: '💊' },
                  { label: 'Назначения', value: detailRecord.prescriptions, icon: '📋' },
                  { label: 'Анализы', value: detailRecord.lab_results, icon: '🧪' },
                  { label: 'Материалы', value: detailRecord.materials_used, icon: '🧰' },
                  { label: 'Комментарии врача', value: detailRecord.doctor_notes, icon: '📝' },
                ].filter(s => s.value).map((section) => (
                  <div key={section.label} className="group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{section.icon}</span>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{section.label}</h4>
                    </div>
                    <p className="text-sm leading-relaxed pl-7 whitespace-pre-wrap">{section.value}</p>
                  </div>
                ))}
              </div>

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
    </div>
  );
}
