import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { Package, AlertTriangle, MoreVertical, Pencil, Trash2, Plus, Minus, FolderPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { InventoryItem, InventoryCategory, MovementType } from '@/lib/types';

export default function Inventory() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    unit: 'шт',
    quantity: '0',
    min_quantity: '0',
    purchase_price: '0',
    sale_price: '0',
    is_active: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  const [movementForm, setMovementForm] = useState({
    movement_type: 'in' as MovementType,
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select(`*, category:inventory_categories(id, name)`)
          .order('name'),
        supabase.from('inventory_categories').select('*').order('name'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setItems(itemsRes.data || []);
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

  const handleItemSubmit = async () => {
    if (!itemForm.name) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите название товара',
      });
      return;
    }

    const data = {
      ...itemForm,
      category_id: itemForm.category_id || null,
      quantity: parseFloat(itemForm.quantity),
      min_quantity: parseFloat(itemForm.min_quantity),
      purchase_price: parseFloat(itemForm.purchase_price),
      sale_price: parseFloat(itemForm.sale_price),
    };

    try {
      if (selectedItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(data)
          .eq('id', selectedItem.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Товар обновлён' });
      } else {
        const { error } = await supabase.from('inventory_items').insert(data);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Товар добавлен' });
      }
      setItemDialogOpen(false);
      resetItemForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleMovement = async () => {
    if (!selectedItem || !movementForm.quantity) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите количество',
      });
      return;
    }

    const qty = parseFloat(movementForm.quantity);
    const newQuantity = movementForm.movement_type === 'in' || movementForm.movement_type === 'adjustment'
      ? selectedItem.quantity + qty
      : selectedItem.quantity - qty;

    if (newQuantity < 0) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Недостаточно товара на складе',
      });
      return;
    }

    try {
      // Create movement record
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: selectedItem.id,
          movement_type: movementForm.movement_type,
          quantity: qty,
          notes: movementForm.notes,
        });
      if (movementError) throw movementError;

      // Update item quantity
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', selectedItem.id);
      if (updateError) throw updateError;

      toast({ title: 'Успешно', description: 'Движение зафиксировано' });
      setMovementDialogOpen(false);
      setMovementForm({ movement_type: 'in', quantity: '', notes: '' });
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
          .from('inventory_categories')
          .update(categoryForm)
          .eq('id', selectedCategory.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Категория обновлена' });
      } else {
        const { error } = await supabase.from('inventory_categories').insert(categoryForm);
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
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', selectedItem.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Товар удалён' });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const openItemEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || '',
      category_id: item.category_id || '',
      description: item.description || '',
      unit: item.unit,
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      purchase_price: item.purchase_price.toString(),
      sale_price: item.sale_price.toString(),
      is_active: item.is_active,
    });
    setItemDialogOpen(true);
  };

  const resetItemForm = () => {
    setSelectedItem(null);
    setItemForm({
      name: '',
      sku: '',
      category_id: '',
      description: '',
      unit: 'шт',
      quantity: '0',
      min_quantity: '0',
      purchase_price: '0',
      sale_price: '0',
      is_active: true,
    });
  };

  const resetCategoryForm = () => {
    setSelectedCategory(null);
    setCategoryForm({ name: '', description: '' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('kk-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity && i.is_active);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.purchase_price, 0);

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Категория',
      cell: (item) => (
        <Badge variant="outline">
          {(item as any).category?.name || 'Без категории'}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Остаток',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className={item.quantity <= item.min_quantity ? 'text-destructive font-semibold' : ''}>
            {item.quantity} {item.unit}
          </span>
          {item.quantity <= item.min_quantity && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: 'purchase_price',
      header: 'Закупка',
      cell: (item) => (
        <span className="text-muted-foreground">{formatCurrency(item.purchase_price)}</span>
      ),
    },
    {
      key: 'sale_price',
      header: 'Продажа',
      cell: (item) => (
        <span className="font-semibold text-primary">{formatCurrency(item.sale_price)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedItem(item);
              setMovementDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Приход/Расход
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openItemEdit(item)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedItem(item);
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
        title="Склад"
        description="Управление товарами и остатками"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Склад' },
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего позиций</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Мало на складе</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Package className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Стоимость склада</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={items}
        columns={columns}
        searchPlaceholder="Поиск товара..."
        searchKey="name"
        onAdd={() => {
          resetItemForm();
          setItemDialogOpen(true);
        }}
        addLabel="Добавить товар"
        isLoading={loading}
        emptyMessage="Нет товаров"
      />

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? 'Редактировать товар' : 'Новый товар'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Антибиотик"
              />
            </div>
            <div className="grid gap-2">
              <Label>Артикул (SKU)</Label>
              <Input
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                placeholder="AB-001"
              />
            </div>
            <div className="grid gap-2">
              <Label>Категория</Label>
              <Select
                value={itemForm.category_id}
                onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
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
              <Label>Единица измерения</Label>
              <Select
                value={itemForm.unit}
                onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="шт">шт</SelectItem>
                  <SelectItem value="уп">уп</SelectItem>
                  <SelectItem value="мл">мл</SelectItem>
                  <SelectItem value="г">г</SelectItem>
                  <SelectItem value="кг">кг</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Количество</Label>
              <Input
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Мин. остаток</Label>
              <Input
                type="number"
                value={itemForm.min_quantity}
                onChange={(e) => setItemForm({ ...itemForm, min_quantity: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Закупочная цена (₸)</Label>
              <Input
                type="number"
                value={itemForm.purchase_price}
                onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цена продажи (₸)</Label>
              <Input
                type="number"
                value={itemForm.sale_price}
                onChange={(e) => setItemForm({ ...itemForm, sale_price: e.target.value })}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Описание</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Описание товара..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.is_active}
                onCheckedChange={(v) => setItemForm({ ...itemForm, is_active: v })}
              />
              <Label>Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleItemSubmit}>
              {selectedItem ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Движение товара</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} (текущий остаток: {selectedItem?.quantity} {selectedItem?.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Тип операции</Label>
              <Select
                value={movementForm.movement_type}
                onValueChange={(v) => setMovementForm({ ...movementForm, movement_type: v as MovementType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Приход</SelectItem>
                  <SelectItem value="out">Расход</SelectItem>
                  <SelectItem value="adjustment">Корректировка (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Количество</Label>
              <Input
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Комментарий</Label>
              <Textarea
                value={movementForm.notes}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="Причина..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleMovement}>
              Провести
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
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Медикаменты"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Описание категории..."
              />
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
            <DialogTitle>Удалить товар?</DialogTitle>
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
