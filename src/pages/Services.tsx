import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { MoreVertical, Pencil, Trash2, FolderPlus, Trophy } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Service, ServiceCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays } from 'date-fns';

type PeriodKey = '7d' | '30d' | '90d' | '365d';
const periodLabels: Record<PeriodKey, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  '90d': '90 дней',
  '365d': 'Год',
};

export default function Services() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [deleteType, setDeleteType] = useState<'service' | 'category'>('service');
  const [topServices, setTopServices] = useState<{ name: string; count: number }[]>([]);
  const [topPeriod, setTopPeriod] = useState<PeriodKey>('30d');

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    is_active: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTopServices();
  }, [topPeriod]);

  const fetchTopServices = async () => {
    const days = parseInt(topPeriod);
    const dateFrom = subDays(new Date(), days).toISOString();
    try {
      const [aptRes, mrRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('service_id, service:services(name)')
          .gte('scheduled_at', dateFrom)
          .not('service_id', 'is', null),
        supabase
          .from('medical_record_services')
          .select('service_id, service:services(name)')
          .not('service_id', 'is', null),
      ]);
      const counts: Record<string, { name: string; count: number }> = {};
      [...(aptRes.data || []), ...(mrRes.data || [])].forEach((item: any) => {
        const id = item.service_id;
        const name = item.service?.name || 'Неизвестно';
        if (!counts[id]) counts[id] = { name, count: 0 };
        counts[id].count += 1;
      });
      setTopServices(
        Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
      );
    } catch (error) {
      console.error('Error fetching top services:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        supabase
          .from('services')
          .select(`*, category:service_categories(id, name)`)
          .order('name'),
        supabase.from('service_categories').select('*').order('name'),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setServices(servicesRes.data || []);
      setCategories(categoriesRes.data || []);
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

  const handleServiceSubmit = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
      });
      return;
    }

    const data = {
      ...serviceForm,
      price: parseFloat(serviceForm.price),
      category_id: serviceForm.category_id || null,
    };

    try {
      if (selectedService) {
        const { error } = await supabase
          .from('services')
          .update(data)
          .eq('id', selectedService.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Услуга обновлена' });
      } else {
        const { error } = await supabase.from('services').insert(data);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Услуга добавлена' });
      }
      setServiceDialogOpen(false);
      resetServiceForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryForm.name) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите название категории',
      });
      return;
    }

    try {
      if (selectedCategory) {
        const { error } = await supabase
          .from('service_categories')
          .update(categoryForm)
          .eq('id', selectedCategory.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Категория обновлена' });
      } else {
        const { error } = await supabase.from('service_categories').insert(categoryForm);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Категория добавлена' });
      }
      setCategoryDialogOpen(false);
      resetCategoryForm();
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
    try {
      if (deleteType === 'service' && selectedService) {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', selectedService.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Услуга удалена' });
      } else if (deleteType === 'category' && selectedCategory) {
        const { error } = await supabase
          .from('service_categories')
          .delete()
          .eq('id', selectedCategory.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Категория удалена' });
      }
      setDeleteDialogOpen(false);
      setSelectedService(null);
      setSelectedCategory(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const openServiceEdit = (service: Service) => {
    setSelectedService(service);
    setServiceForm({
      name: service.name,
      category_id: service.category_id || '',
      description: service.description || '',
      price: service.price.toString(),
      is_active: service.is_active,
    });
    setServiceDialogOpen(true);
  };

  const openCategoryEdit = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
    });
    setCategoryDialogOpen(true);
  };

  const resetServiceForm = () => {
    setSelectedService(null);
    setServiceForm({
      name: '',
      category_id: '',
      description: '',
      price: '',
      is_active: true,
    });
  };

  const resetCategoryForm = () => {
    setSelectedCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      is_active: true,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('kk-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const serviceColumns: Column<Service>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (service) => <div className="font-medium">{service.name}</div>,
    },
    {
      key: 'category',
      header: 'Категория',
      cell: (service) => (
        <Badge variant="outline">
          {(service as any).category?.name || 'Без категории'}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Цена',
      cell: (service) => (
        <span className="font-semibold text-primary">
          {formatCurrency(service.price)}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Статус',
      cell: (service) => (
        <Badge variant={service.is_active ? 'default' : 'secondary'}>
          {service.is_active ? 'Активна' : 'Неактивна'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (service) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openServiceEdit(service)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedService(service);
                setDeleteType('service');
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

  const categoryColumns: Column<ServiceCategory>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (cat) => <div className="font-medium">{cat.name}</div>,
    },
    {
      key: 'description',
      header: 'Описание',
      cell: (cat) => (
        <span className="text-muted-foreground">{cat.description || '—'}</span>
      ),
    },
    {
      key: 'services_count',
      header: 'Услуг',
      cell: (cat) => (
        <Badge variant="secondary">
          {services.filter((s) => s.category_id === cat.id).length}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Статус',
      cell: (cat) => (
        <Badge variant={cat.is_active ? 'default' : 'secondary'}>
          {cat.is_active ? 'Активна' : 'Неактивна'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (cat) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openCategoryEdit(cat)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedCategory(cat);
                setDeleteType('category');
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
        title="Услуги"
        description="Управление услугами и категориями"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Услуги' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              resetCategoryForm();
              setCategoryDialogOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Категория
          </Button>
        }
      />

      {/* Top 5 Services */}
      <Card className="glass mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Топ 5 популярных услуг
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                <Button
                  key={key}
                  variant={topPeriod === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopPeriod(key)}
                >
                  {periodLabels[key]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topServices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет данных за выбранный период</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((svc, index) => (
                <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{svc.name}</span>
                  </div>
                  <Badge variant="secondary">{svc.count} раз</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Услуги</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <DataTable
            data={services}
            columns={serviceColumns}
            searchPlaceholder="Поиск услуги..."
            searchKey="name"
            onAdd={() => {
              resetServiceForm();
              setServiceDialogOpen(true);
            }}
            addLabel="Добавить услугу"
            isLoading={loading}
            emptyMessage="Нет услуг"
          />
        </TabsContent>

        <TabsContent value="categories">
          <DataTable
            data={categories}
            columns={categoryColumns}
            searchPlaceholder="Поиск категории..."
            searchKey="name"
            onAdd={() => {
              resetCategoryForm();
              setCategoryDialogOpen(true);
            }}
            addLabel="Добавить категорию"
            isLoading={loading}
            emptyMessage="Нет категорий"
          />
        </TabsContent>
      </Tabs>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? 'Редактировать услугу' : 'Новая услуга'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name: e.target.value })
                }
                placeholder="Первичный осмотр"
              />
            </div>
            <div className="grid gap-2">
              <Label>Категория</Label>
              <Select
                value={serviceForm.category_id}
                onValueChange={(v) =>
                  setServiceForm({ ...serviceForm, category_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Цена (₸) *</Label>
              <Input
                type="number"
                value={serviceForm.price}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, price: e.target.value })
                }
                placeholder="1000"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, description: e.target.value })
                }
                placeholder="Описание услуги..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={serviceForm.is_active}
                onCheckedChange={(v) =>
                  setServiceForm({ ...serviceForm, is_active: v })
                }
              />
              <Label>Активна</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleServiceSubmit}>
              {selectedService ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Редактировать категорию' : 'Новая категория'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="Диагностика"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="Описание категории..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(v) =>
                  setCategoryForm({ ...categoryForm, is_active: v })
                }
              />
              <Label>Активна</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCategorySubmit}>
              {selectedCategory ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              Удалить {deleteType === 'service' ? 'услугу' : 'категорию'}?
            </DialogTitle>
            <DialogDescription>Это действие нельзя отменить.</DialogDescription>
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
