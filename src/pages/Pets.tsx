import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, petSchema } from '@/lib/validationSchemas';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MoreVertical, Pencil, Trash2, Eye, Phone, Bell, Plus, CalendarIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Pet, PetSpecies, PetGender, speciesLabels, genderLabels } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Pets() {
  const location = useLocation();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isClient = hasRole('client');
  const [pets, setPets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [detailPet, setDetailPet] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Notification state
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', scheduled_for: '' });

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    species: 'dog' as PetSpecies,
    breed: '',
    gender: 'unknown' as PetGender,
    birth_date: '',
    weight: '',
    color: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if ((location.state as any)?.openNew) {
      resetForm();
      setDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      const [petsRes, clientsRes] = await Promise.all([
        supabase
          .from('pets')
          .select(`*, client:clients(id, full_name, phone, client_number)`)
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, full_name, client_number').order('full_name'),
      ]);
      if (petsRes.error) throw petsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      setPets(petsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить данные' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPetNotifications = async (petId: string, clientId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)
      .eq('type', 'pet_reminder')
      .order('scheduled_for', { ascending: true });
    // Filter by pet - we store pet_id in the message or title
    setNotifications((data || []).filter((n: any) => n.title?.includes(petId) || n.message?.includes(petId)));
  };

  const handleSubmit = async () => {
    const validationError = getValidationError(petSchema, formData);
    if (validationError) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validationError });
      return;
    }
    const petData = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      birth_date: formData.birth_date || null,
    };
    try {
      if (selectedPet) {
        const { error } = await supabase.from('pets').update(petData).eq('id', selectedPet.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Питомец обновлён' });
      } else {
        const { error } = await supabase.from('pets').insert(petData);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Питомец добавлен' });
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const handleDelete = async () => {
    if (!selectedPet) return;
    try {
      const { error } = await supabase.from('pets').delete().eq('id', selectedPet.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Питомец удалён' });
      setDeleteDialogOpen(false);
      setSelectedPet(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const handleAddNotification = async () => {
    if (!detailPet || !notifForm.title || !notifForm.scheduled_for) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Заполните название и дату' });
      return;
    }
    try {
      const { error } = await supabase.from('notifications').insert({
        client_id: detailPet.client_id,
        type: 'pet_reminder',
        title: `[${detailPet.id}] ${notifForm.title}`,
        message: `Питомец: ${detailPet.name}. ${notifForm.message || ''}`,
        scheduled_for: new Date(notifForm.scheduled_for).toISOString(),
        channel: 'system',
      });
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Уведомление добавлено' });
      setNotifForm({ title: '', message: '', scheduled_for: '' });
      setNotifDialogOpen(false);
      fetchPetNotifications(detailPet.id, detailPet.client_id);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      if (detailPet) fetchPetNotifications(detailPet.id, detailPet.client_id);
      toast({ title: 'Удалено' });
    } catch (e) {}
  };

  const openEditDialog = (pet: Pet) => {
    setSelectedPet(pet);
    setFormData({
      client_id: pet.client_id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      gender: pet.gender,
      birth_date: pet.birth_date || '',
      weight: pet.weight?.toString() || '',
      color: pet.color || '',
      notes: pet.notes || '',
    });
    setDialogOpen(true);
  };

  const openDetailDialog = (pet: any) => {
    setDetailPet(pet);
    setDetailDialogOpen(true);
    fetchPetNotifications(pet.id, pet.client_id);
  };

  const resetForm = () => {
    setSelectedPet(null);
    setClientSearch('');
    setFormData({
      client_id: '', name: '', species: 'dog', breed: '', gender: 'unknown',
      birth_date: '', weight: '', color: '', notes: '',
    });
  };

  const getSpeciesEmoji = (species: PetSpecies) => {
    const emojis: Record<PetSpecies, string> = {
      dog: '🐕', cat: '🐈', bird: '🐦', rodent: '🐹', reptile: '🦎', fish: '🐟', other: '🐾',
    };
    return emojis[species];
  };

  const getAge = (birthDate: string | null | undefined) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const ageInMonths = years * 12 + months;
    if (ageInMonths < 12) return `${ageInMonths} мес.`;
    return `${Math.floor(ageInMonths / 12)} лет`;
  };

  const filteredClients = clientSearch
    ? clients.filter(c =>
        c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.client_number?.includes(clientSearch)
      )
    : clients;

  const extractNotifTitle = (raw: string) => {
    // Remove [pet_id] prefix
    return raw.replace(/^\[.*?\]\s*/, '');
  };

  const columns: Column<Pet>[] = [
    {
      key: 'name',
      header: 'Кличка',
      cell: (pet) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{getSpeciesEmoji(pet.species)}</span>
          <div>
            <div className="font-medium">{pet.name}</div>
            <div className="text-xs text-muted-foreground">
              {speciesLabels[pet.species]}{pet.breed && ` • ${pet.breed}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Владелец',
      cell: (pet) => <span className="text-muted-foreground">{(pet as any).client?.full_name || '—'}</span>,
    },
    {
      key: 'gender',
      header: 'Пол',
      cell: (pet) => <Badge variant="outline">{genderLabels[pet.gender]}</Badge>,
    },
    {
      key: 'weight',
      header: 'Вес',
      cell: (pet) => <span className="text-muted-foreground">{pet.weight ? `${pet.weight} кг` : '—'}</span>,
    },
    {
      key: 'birth_date',
      header: 'Возраст',
      cell: (pet) => <span className="text-muted-foreground">{getAge(pet.birth_date) || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (pet) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDetailDialog(pet)}>
              <Eye className="h-4 w-4 mr-2" />Карточка
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(pet)}>
              <Pencil className="h-4 w-4 mr-2" />Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedPet(pet); setDeleteDialogOpen(true); }}>
              <Trash2 className="h-4 w-4 mr-2" />Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Питомцы"
        description="Управление базой питомцев клиники"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Питомцы' },
        ]}
      />

      <DataTable
        data={pets}
        columns={columns}
        searchPlaceholder="Поиск по кличке..."
        searchKey="name"
        onAdd={() => { resetForm(); setDialogOpen(true); }}
        addLabel="Добавить питомца"
        onRowClick={(pet) => openDetailDialog(pet)}
        isLoading={loading}
        emptyMessage="Нет питомцев"
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{detailPet && getSpeciesEmoji(detailPet.species)}</span>
              {detailPet?.name}
            </DialogTitle>
          </DialogHeader>
          {detailPet && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Вид</p>
                  <p>{speciesLabels[detailPet.species as PetSpecies]}</p>
                </div>
                {detailPet.breed && <div><p className="text-sm text-muted-foreground">Порода</p><p>{detailPet.breed}</p></div>}
                <div>
                  <p className="text-sm text-muted-foreground">Пол</p>
                  <p>{genderLabels[detailPet.gender as PetGender]}</p>
                </div>
                {detailPet.weight && <div><p className="text-sm text-muted-foreground">Вес</p><p>{detailPet.weight} кг</p></div>}
                {detailPet.birth_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Возраст</p>
                    <p>{getAge(detailPet.birth_date)} ({format(new Date(detailPet.birth_date), 'd MMM yyyy', { locale: ru })})</p>
                  </div>
                )}
                {detailPet.color && <div><p className="text-sm text-muted-foreground">Окрас</p><p>{detailPet.color}</p></div>}
              </div>

              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Владелец</p>
                <div className="flex items-center gap-2">
                  <span>{detailPet.client?.full_name}</span>
                  {detailPet.client?.phone && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {detailPet.client.phone}
                    </span>
                  )}
                </div>
              </div>

              {detailPet.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Комментарии</p>
                    <p className="text-sm text-muted-foreground">{detailPet.notes}</p>
                  </div>
                </>
              )}

              {/* Notifications section */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Уведомления / Напоминания
                  </p>
                  <Button size="sm" variant="outline" onClick={() => {
                    setNotifForm({ title: '', message: '', scheduled_for: '' });
                    setNotifDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />Добавить
                  </Button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Нет уведомлений</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{extractNotifTitle(n.title)}</p>
                          <p className="text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            {n.scheduled_for ? format(new Date(n.scheduled_for), 'd MMM yyyy', { locale: ru }) : '—'}
                          </p>
                          {n.message && <p className="text-xs text-muted-foreground mt-1">{n.message.replace(`Питомец: ${detailPet.name}. `, '')}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteNotification(n.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDetailDialogOpen(false);
              if (detailPet) openEditDialog(detailPet);
            }}>
              <Pencil className="h-4 w-4 mr-2" />Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Новое уведомление</DialogTitle>
            <DialogDescription>
              Напоминание для {detailPet?.name}. Появится на дашборде за день до указанной даты.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                placeholder="Вакцинация, осмотр..."
                value={notifForm.title}
                onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Дата *</Label>
              <Input
                type="date"
                value={notifForm.scheduled_for}
                onChange={(e) => setNotifForm({ ...notifForm, scheduled_for: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Дополнительная информация..."
                value={notifForm.message}
                onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddNotification}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPet ? 'Редактировать питомца' : 'Новый питомец'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Владелец *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Выберите владельца" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input placeholder="Поиск клиента..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="mb-2" />
                  </div>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} {client.client_number && `(${client.client_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Кличка *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Барсик" />
            </div>
            <div className="grid gap-2">
              <Label>Вид</Label>
              <Select value={formData.species} onValueChange={(v) => setFormData({ ...formData, species: v as PetSpecies })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(speciesLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{getSpeciesEmoji(key as PetSpecies)} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Порода</Label>
              <Input value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} placeholder="Мейн-кун" />
            </div>
            <div className="grid gap-2">
              <Label>Пол</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v as PetGender })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Дата рождения</Label>
              <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Вес (кг)</Label>
              <Input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="5.5" />
            </div>
            <div className="grid gap-2">
              <Label>Окрас</Label>
              <Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="Рыжий" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Комментарии</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Дополнительная информация..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit}>{selectedPet ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить питомца?</DialogTitle>
            <DialogDescription>Это действие нельзя отменить. Все связанные медкарты и записи будут удалены.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
