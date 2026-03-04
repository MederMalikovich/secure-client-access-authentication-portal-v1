import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Disease } from '@/lib/types';

export default function Diseases() {
  const { toast } = useToast();
  const [diseases, setDiseases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symptoms: '',
    treatment_guidelines: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    try {
      const { data, error } = await supabase
        .from('diseases')
        .select('*')
        .order('name');

      if (error) throw error;
      setDiseases(data || []);
    } catch (error) {
      console.error('Error fetching diseases:', error);
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
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите название заболевания',
      });
      return;
    }

    try {
      if (selectedDisease) {
        const { error } = await supabase
          .from('diseases')
          .update(formData)
          .eq('id', selectedDisease.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Заболевание обновлено' });
      } else {
        const { error } = await supabase.from('diseases').insert(formData);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Заболевание добавлено' });
      }
      setDialogOpen(false);
      resetForm();
      fetchDiseases();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDisease) return;
    try {
      const { error } = await supabase
        .from('diseases')
        .delete()
        .eq('id', selectedDisease.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Заболевание удалено' });
      setDeleteDialogOpen(false);
      setSelectedDisease(null);
      fetchDiseases();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const openEditDialog = (disease: Disease) => {
    setSelectedDisease(disease);
    setFormData({
      name: disease.name,
      description: disease.description || '',
      symptoms: disease.symptoms || '',
      treatment_guidelines: disease.treatment_guidelines || '',
      is_active: disease.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedDisease(null);
    setFormData({
      name: '',
      description: '',
      symptoms: '',
      treatment_guidelines: '',
      is_active: true,
    });
  };

  const columns: Column<Disease>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (disease) => <div className="font-medium">{disease.name}</div>,
    },
    {
      key: 'description',
      header: 'Описание',
      cell: (disease) => (
        <span className="text-muted-foreground line-clamp-2">
          {disease.description || '—'}
        </span>
      ),
    },
    {
      key: 'symptoms',
      header: 'Симптомы',
      cell: (disease) => (
        <span className="text-muted-foreground line-clamp-2">
          {disease.symptoms || '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Статус',
      cell: (disease) => (
        <Badge variant={disease.is_active ? 'default' : 'secondary'}>
          {disease.is_active ? 'Активно' : 'Неактивно'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (disease) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(disease)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedDisease(disease);
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
        title="Справочник заболеваний"
        description="Управление базой заболеваний и методов лечения"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Заболевания' },
        ]}
      />

      <DataTable
        data={diseases}
        columns={columns}
        searchPlaceholder="Поиск заболевания..."
        searchKey="name"
        onAdd={() => {
          resetForm();
          setDialogOpen(true);
        }}
        addLabel="Добавить заболевание"
        isLoading={loading}
        emptyMessage="Нет заболеваний в справочнике"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDisease ? 'Редактировать заболевание' : 'Новое заболевание'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о заболевании
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Название заболевания"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание заболевания..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Симптомы</Label>
              <Textarea
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                placeholder="Характерные симптомы..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Рекомендации по лечению</Label>
              <Textarea
                value={formData.treatment_guidelines}
                onChange={(e) => setFormData({ ...formData, treatment_guidelines: e.target.value })}
                placeholder="Методы лечения, препараты..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Активно</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {selectedDisease ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить заболевание?</DialogTitle>
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
