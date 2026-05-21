import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { UserCheck, Trophy, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subDays } from 'date-fns';

type PeriodKey = '7d' | '30d' | '90d' | '365d';

const periodLabels: Record<PeriodKey, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  '90d': '90 дней',
  '365d': 'Год',
};

interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_active: boolean | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Doctors() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [topDoctors, setTopDoctors] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchTopDoctors();
  }, [period]);

  const fetchDoctors = async () => {
    try {
      // Get all profiles and user_roles with veterinarian role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'veterinarian');
      if (rolesError) throw rolesError;

      const vetUserIds = (roles || []).map(r => r.user_id);

      if (vetUserIds.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', vetUserIds)
        .order('full_name');
      if (error) throw error;
      setDoctors((data || []) as DoctorProfile[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchTopDoctors = async () => {
    const days = parseInt(period);
    const dateFrom = subDays(new Date(), days).toISOString();
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('veterinarian_id, veterinarian:profiles(full_name)')
        .gte('scheduled_at', dateFrom)
        .not('veterinarian_id', 'is', null);
      if (error) throw error;

      const counts: Record<string, { name: string; count: number }> = {};
      (data || []).forEach((apt: any) => {
        const id = apt.veterinarian_id;
        const name = apt.veterinarian?.full_name || 'Неизвестно';
        if (!counts[id]) counts[id] = { name, count: 0 };
        counts[id].count += 1;
      });
      setTopDoctors(
        Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    } catch (error) {
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Введите ФИО врача' });
      return;
    }

    try {
      if (selectedDoctor) {
        // Update existing
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: form.full_name,
            email: form.email || null,
            phone: form.phone || null,
            position: form.position || null,
            is_active: form.is_active,
          })
          .eq('id', selectedDoctor.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Данные врача обновлены' });
      } else {
        // For adding a new doctor, we update an existing profile's position and assign vet role
        // Since profiles are auto-created on signup, we can't create profiles without auth users
        // Instead, show a message
        toast({
          variant: 'destructive',
          title: 'Информация',
          description: 'Для добавления нового врача зарегистрируйте пользователя и назначьте ему роль "Ветеринар" в Настройках → Пользователи',
        });
        setDialogOpen(false);
        return;
      }
      setDialogOpen(false);
      fetchDoctors();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const handleDelete = async () => {
    if (!selectedDoctor) return;
    try {
      // Remove veterinarian role instead of deleting profile
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedDoctor.user_id)
        .eq('role', 'veterinarian');
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Врач удалён из списка' });
      setDeleteDialogOpen(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const openEdit = (doc: DoctorProfile) => {
    setSelectedDoctor(doc);
    setForm({
      full_name: doc.full_name,
      email: doc.email || '',
      phone: doc.phone || '',
      position: doc.position || '',
      is_active: doc.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setSelectedDoctor(null);
    setForm({ full_name: '', email: '', phone: '', position: '', is_active: true });
    setDialogOpen(true);
  };

  // Filter by search
  const filtered = doctors.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.email || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by position/specialty
  const grouped = filtered.reduce<Record<string, DoctorProfile[]>>((acc, doc) => {
    const key = doc.position || 'Без специальности';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Врачи"
        description="Специалисты клиники и загруженность"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Врачи' },
        ]}
      />

      {/* Top 5 busiest doctors */}
      <Card className="glass mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Топ 5 загруженных врачей
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                <Button
                  key={key}
                  variant={period === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(key)}
                >
                  {periodLabels[key]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topDoctors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет данных за выбранный период</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doc, index) => (
                <div key={doc.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <Badge variant="secondary">{doc.count} приёмов</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск врача..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить врача
        </Button>
      </div>

      {/* Doctors by specialty */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {search ? 'Врачи не найдены' : 'Нет врачей. Назначьте роль «Ветеринар» сотруднику в Настройках → Пользователи.'}
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([specialty, docs]) => (
            <Card key={specialty} className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {specialty}
                  <Badge variant="outline" className="ml-2">{docs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {docs.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{doc.full_name}</p>
                          {doc.email && <p className="text-sm text-muted-foreground">{doc.email}</p>}
                          {doc.phone && <p className="text-sm text-muted-foreground">{doc.phone}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(doc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {!(doc.is_active ?? true) && (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDoctor ? 'Редактировать врача' : 'Добавить врача'}</DialogTitle>
            <DialogDescription>
              {selectedDoctor
                ? 'Измените данные врача'
                : 'Для добавления нового врача назначьте роль «Ветеринар» в Настройках → Пользователи'}
            </DialogDescription>
          </DialogHeader>
          {selectedDoctor && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>ФИО</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Телефон</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Специальность</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                  <Label>Активен</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSave}>Сохранить</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить врача из списка?</AlertDialogTitle>
            <AlertDialogDescription>
              Роль «Ветеринар» будет снята с {selectedDoctor?.full_name}. Профиль пользователя сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
