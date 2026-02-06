import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Trash2, Eye, FileText } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Pet, Client, PetSpecies, PetGender, speciesLabels, genderLabels } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Pets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
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

  const fetchData = async () => {
    try {
      const [petsRes, clientsRes] = await Promise.all([
        supabase
          .from('pets')
          .select(`
            *,
            client:clients(id, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, full_name').order('full_name'),
      ]);

      if (petsRes.error) throw petsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setPets(petsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    if (!formData.client_id || !formData.name) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
      });
      return;
    }

    const petData = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      birth_date: formData.birth_date || null,
    };

    try {
      if (selectedPet) {
        const { error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', selectedPet.id);
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
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedPet) return;
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', selectedPet.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Питомец удалён' });
      setDeleteDialogOpen(false);
      setSelectedPet(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
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

  const resetForm = () => {
    setSelectedPet(null);
    setFormData({
      client_id: '',
      name: '',
      species: 'dog',
      breed: '',
      gender: 'unknown',
      birth_date: '',
      weight: '',
      color: '',
      notes: '',
    });
  };

  const getSpeciesEmoji = (species: PetSpecies) => {
    const emojis: Record<PetSpecies, string> = {
      dog: '🐕',
      cat: '🐈',
      bird: '🐦',
      rodent: '🐹',
      reptile: '🦎',
      fish: '🐟',
      other: '🐾',
    };
    return emojis[species];
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
              {speciesLabels[pet.species]}
              {pet.breed && ` • ${pet.breed}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Владелец',
      cell: (pet) => (
        <span className="text-muted-foreground">
          {(pet as any).client?.full_name || '—'}
        </span>
      ),
    },
    {
      key: 'gender',
      header: 'Пол',
      cell: (pet) => (
        <Badge variant="outline">{genderLabels[pet.gender]}</Badge>
      ),
    },
    {
      key: 'weight',
      header: 'Вес',
      cell: (pet) => (
        <span className="text-muted-foreground">
          {pet.weight ? `${pet.weight} кг` : '—'}
        </span>
      ),
    },
    {
      key: 'birth_date',
      header: 'Возраст',
      cell: (pet) => {
        if (!pet.birth_date) return <span className="text-muted-foreground">—</span>;
        const birth = new Date(pet.birth_date);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();
        const ageInMonths = years * 12 + months;
        if (ageInMonths < 12) {
          return <span>{ageInMonths} мес.</span>;
        }
        return <span>{Math.floor(ageInMonths / 12)} лет</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (pet) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/pets/${pet.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Карточка
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/pets/${pet.id}/medical`)}>
              <FileText className="h-4 w-4 mr-2" />
              Медкарта
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(pet)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedPet(pet);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
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
        onAdd={() => {
          resetForm();
          setDialogOpen(true);
        }}
        addLabel="Добавить питомца"
        isLoading={loading}
        emptyMessage="Нет питомцев"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPet ? 'Редактировать питомца' : 'Новый питомец'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Владелец *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите владельца" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Кличка *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Барсик"
              />
            </div>
            <div className="grid gap-2">
              <Label>Вид</Label>
              <Select
                value={formData.species}
                onValueChange={(v) => setFormData({ ...formData, species: v as PetSpecies })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(speciesLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {getSpeciesEmoji(key as PetSpecies)} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Порода</Label>
              <Input
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                placeholder="Мейн-кун"
              />
            </div>
            <div className="grid gap-2">
              <Label>Пол</Label>
              <Select
                value={formData.gender}
                onValueChange={(v) => setFormData({ ...formData, gender: v as PetGender })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Дата рождения</Label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Вес (кг)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="5.5"
              />
            </div>
            <div className="grid gap-2">
              <Label>Окрас</Label>
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Рыжий"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Комментарии</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {selectedPet ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить питомца?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Все связанные медкарты и записи будут удалены.
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
