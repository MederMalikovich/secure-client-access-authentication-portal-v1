import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  FileText, DollarSign, Calendar, Plus, Pencil,
  Clock, Camera, CheckCircle2, AlertCircle, CircleDot,
  TrendingUp, Stethoscope, Weight, Thermometer, User, FlaskConical, Pill
} from 'lucide-react';
import { PrescriptionTimeline } from '@/components/PrescriptionTimeline';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { speciesLabels, genderLabels, paymentStatusLabels, appointmentStatusLabels, PetSpecies, PetGender } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { startQuickReceive } from '@/lib/quickReceive';
import { VisitDialog } from '@/components/VisitDialog';

interface PetDetailSheetProps {
  pet: any;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddAppointment?: (clientId: string, petId: string) => void;
  isClient?: boolean;
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rodent: '🐹', reptile: '🦎', fish: '🐟', other: '🐾',
};

export function PetDetailSheet({ pet, open, onClose, onEdit, onAddAppointment, isClient }: PetDetailSheetProps) {
  const { toast } = useToast();
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [visitsCount, setVisitsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quickVisitId, setQuickVisitId] = useState<string | null>(null);


  useEffect(() => {
    if (open && pet?.id) {
      setPhotoUrl(pet.photo_url || null);
      fetchPetData(pet.id, pet.client_id);
    }
  }, [open, pet?.id]);

  const fetchPetData = async (petId: string, clientId: string) => {
    setLoading(true);
    try {
      const [mrRes, apptRes, invRes, visitsCountRes, mrCountRes, apptCountRes] = await Promise.all([
        supabase
          .from('medical_records')
          .select(`*, veterinarian:profiles(full_name), diagnoses:medical_record_diagnoses(*, disease:diseases(name)), services:medical_record_services(*, service:services(name)), files:medical_record_files(*)`)
          .eq('pet_id', petId)
          .order('visit_date', { ascending: false })
          .limit(20),
        supabase
          .from('appointments')
          .select(`*, service:services(name), veterinarian:profiles(full_name)`)
          .eq('pet_id', petId)
          .order('scheduled_at', { ascending: false })
          .limit(10),
        supabase
          .from('invoices')
          .select(`*, items:invoice_items(*)`)
          .eq('pet_id', petId)
          .order('issued_at', { ascending: false })
          .limit(10),
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('pet_id', petId),
        supabase
          .from('medical_records')
          .select('id', { count: 'exact', head: true })
          .eq('pet_id', petId),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('pet_id', petId)
          .in('status', ['completed', 'scheduled', 'confirmed', 'in_progress']),
      ]);
      setMedicalRecords(mrRes.data || []);
      setAppointments(apptRes.data || []);
      setInvoices(invRes.data || []);
      const totals = [visitsCountRes.count || 0, mrCountRes.count || 0, apptCountRes.count || 0];
      setVisitsCount(Math.max(...totals));
    } finally {
      setLoading(false);
    }
  };


  const openMedicalFile = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('medical-record-files').createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось открыть PDF' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet?.id) return;

    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${pet.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pet-photos').getPublicUrl(path);

      await supabase.from('pets').update({ photo_url: publicUrl }).eq('id', pet.id);
      setPhotoUrl(publicUrl);
      toast({ title: 'Фото обновлено' });
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка загрузки фото' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!pet) return null;

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} мес.`;
    return `${Math.floor(months / 12)} лет`;
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const upcomingAppt = appointments.find(a =>
    ['scheduled', 'confirmed'].includes(a.status) && new Date(a.scheduled_at) >= new Date()
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header with photo */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-border">
          <SheetHeader>
            <div className="flex items-start gap-4">
              {/* Photo */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  {photoUrl ? (
                    <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{SPECIES_EMOJI[pet.species] || '🐾'}</span>
                  )}
                </div>
                {!isClient && (
                  <>
                    <button
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle className="text-xl">{pet.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {speciesLabels[pet.species as PetSpecies]}
                      {pet.breed && ` • ${pet.breed}`}
                      {' • '}{genderLabels[pet.gender as PetGender]}
                    </p>
                    {pet.client && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{pet.client.full_name}</span>
                      </div>
                    )}
                  </div>
                  {!isClient && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Изменить
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Vital stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <div className="text-sm font-bold">{getAge(pet.birth_date) || '—'}</div>
                <div className="text-xs text-muted-foreground">Возраст</div>
              </div>
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <div className="text-sm font-bold">{pet.weight ? `${pet.weight} кг` : '—'}</div>
                <div className="text-xs text-muted-foreground">Вес</div>
              </div>
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <div className="text-sm font-bold">{medicalRecords.length}</div>
                <div className="text-xs text-muted-foreground">Визитов</div>
              </div>
            </div>
          </SheetHeader>

          {/* Upcoming appointment */}
          {upcomingAppt && (
            <div className="mt-3 p-3 rounded-xl bg-accent border border-border flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">
                Ближайший приём: {format(new Date(upcomingAppt.scheduled_at), 'd MMM, HH:mm', { locale: ru })}
                {upcomingAppt.service && ` — ${upcomingAppt.service.name}`}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="p-4">
          {!isClient && onAddAppointment && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button variant="outline" onClick={() => onAddAppointment(pet.client_id, pet.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Записать на приём
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const visitId = await startQuickReceive(pet.id, pet.client_id);
                    setQuickVisitId(visitId);
                    toast({ title: 'Приём начат', description: 'Визит создан со статусом «На приёме»' });
                  } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Ошибка', description: e.message });
                  }
                }}
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                Принять сейчас
              </Button>
            </div>
          )}

          <Tabs defaultValue="history">
            <TabsList className="w-full">
              <TabsTrigger value="history" className="flex-1">
                <Stethoscope className="h-4 w-4 mr-1.5" />
                Медкарта
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex-1">
                <Calendar className="h-4 w-4 mr-1.5" />
                Визиты
              </TabsTrigger>
              <TabsTrigger value="studies" className="flex-1">
                <FlaskConical className="h-4 w-4 mr-1.5" />
                Анализы
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex-1">
                <Pill className="h-4 w-4 mr-1.5" />
                Назначения
              </TabsTrigger>
              <TabsTrigger value="finances" className="flex-1">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Счета
              </TabsTrigger>
            </TabsList>

            {/* Medical records tab */}
            <TabsContent value="history" className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
              ) : medicalRecords.length > 0 ? (
                <div className="relative space-y-0">
                  {medicalRecords.map((mr, index) => (
                    <div key={mr.id} className="relative pb-4 pl-8 last:pb-0">
                      {index < medicalRecords.length - 1 && (
                        <div className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-border" />
                      )}
                      <div className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-background">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 space-y-3">
                      {/* Date & vet */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(mr.visit_date), 'd MMMM yyyy', { locale: ru })}
                            </p>
                            {mr.veterinarian && (
                              <p className="text-xs text-muted-foreground">{mr.veterinarian.full_name}</p>
                            )}
                          </div>
                        </div>
                        {/* Vitals */}
                        {(mr.weight_at_visit || mr.temperature) && (
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {mr.weight_at_visit && (
                              <div className="flex items-center gap-1">
                                <Weight className="h-3 w-3" />
                                {mr.weight_at_visit} кг
                              </div>
                            )}
                            {mr.temperature && (
                              <div className="flex items-center gap-1">
                                <Thermometer className="h-3 w-3" />
                                {mr.temperature}°C
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Complaint */}
                      {mr.chief_complaint && (
                        <div>
                          <p className="text-xs text-muted-foreground">Жалоба</p>
                          <p className="text-sm">{mr.chief_complaint}</p>
                        </div>
                      )}

                      {/* Diagnoses */}
                      {mr.diagnoses?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Диагноз</p>
                          <div className="flex flex-wrap gap-1">
                            {mr.diagnoses.map((d: any) => (
                              <Badge key={d.id} variant="secondary" className="text-xs">
                                {d.disease?.name || d.custom_diagnosis}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {mr.diagnosis && !mr.diagnoses?.length && (
                        <div>
                          <p className="text-xs text-muted-foreground">Диагноз</p>
                          <p className="text-sm">{mr.diagnosis}</p>
                        </div>
                      )}

                      {/* Treatment */}
                      {mr.treatment && (
                        <div>
                          <p className="text-xs text-muted-foreground">Лечение</p>
                          <p className="text-sm">{mr.treatment}</p>
                        </div>
                      )}

                      {/* Services */}
                      {mr.services?.length > 0 && (
                        <div className="pt-1 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Услуги</p>
                          <div className="flex flex-wrap gap-1">
                            {mr.services.map((s: any) => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {s.service?.name || '—'}
                                {s.quantity > 1 && ` ×${s.quantity}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет медицинских записей</p>
                </div>
              )}
            </TabsContent>

            {/* Appointments tab */}
            <TabsContent value="appointments" className="mt-4 space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
              ) : appointments.length > 0 ? (
                appointments.map((appt) => (
                  <Card key={appt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {appt.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : appt.status === 'cancelled' ? (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <CircleDot className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{appt.service?.name || 'Консультация'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appt.scheduled_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                              {appt.veterinarian && ` • ${appt.veterinarian.full_name}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {appointmentStatusLabels[appt.status as keyof typeof appointmentStatusLabels]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет записей</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="studies" className="mt-4 space-y-2">
              {medicalRecords.flatMap((mr) => (mr.files || []).map((file: any) => ({ ...file, visit_date: mr.visit_date }))).length > 0 ? (
                medicalRecords.flatMap((mr) => (mr.files || []).map((file: any) => ({ ...file, visit_date: mr.visit_date }))).map((file: any) => (
                  <Card key={file.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <p className="font-medium text-sm">{file.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(file.study_date), 'd MMM yyyy', { locale: ru })}
                            {file.laboratory_name && ` • ${file.laboratory_name}`}
                          </p>
                          {file.notes && <p className="mt-1 text-sm text-muted-foreground">{file.notes}</p>}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openMedicalFile(file.file_path)}>
                          Открыть PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет PDF исследований</p>
                </div>
              )}
            </TabsContent>

            {/* Finances tab */}
            <TabsContent value="finances" className="mt-4 space-y-3">
              {totalPaid > 0 && (
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Всего потрачено</p>
                      <p className="font-bold text-primary">{formatCurrency(totalPaid)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm font-mono">{inv.invoice_number}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(inv.issued_at), 'd MMM yyyy', { locale: ru })}
                            {inv.items && ` • ${inv.items.length} позиц.`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-sm">{formatCurrency(inv.total)}</span>
                          <Badge variant="outline" className="text-xs">
                            {paymentStatusLabels[inv.status as keyof typeof paymentStatusLabels]}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет счетов</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-4">
              <PrescriptionTimeline petId={pet.id} />
            </TabsContent>
          </Tabs>

          {pet.notes && (
            <div className="mt-4 p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Примечания</p>
              <p className="text-sm">{pet.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
      <VisitDialog
        open={!!quickVisitId}
        visitId={quickVisitId}
        onClose={() => setQuickVisitId(null)}
        onSaved={() => pet?.id && fetchPetData(pet.id, pet.client_id)}
      />
    </Sheet>
  );
}
