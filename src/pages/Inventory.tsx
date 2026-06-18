import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
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
import { ExcelImporter } from '@/components/ExcelImporter';

export default function Inventory() {
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'manager']);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stockListDialog, setStockListDialog] = useState<null | 'low' | 'expiring'>(null);
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
    expiry_date: '',
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
      expiry_date: itemForm.expiry_date || null,
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
      expiry_date: (item as any).expiry_date || '',
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
      expiry_date: '',
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

  const isExpired = (i: any) => {
    if (!i.is_active || !i.expiry_date) return false;
    return new Date(i.expiry_date).getTime() < Date.now();
  };
  const isExpiring = (i: any) => {
    if (!i.is_active || !i.expiry_date) return false;
    const days = Math.floor((new Date(i.expiry_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  };
  const isLowStock = (i: any) => i.quantity <= i.min_quantity && i.is_active;
  const isCritical = (i: any) => isExpired(i) || i.quantity === 0 || isLowStock(i);

  const lowStockItems = items.filter(isLowStock);
  const expiringItems = items.filter(isExpiring);
  const expiredItems = items.filter(isExpired);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.purchase_price, 0);

  const sortedItems = [...items].sort((a, b) => {
    const aCrit = isCritical(a) ? 0 : 1;
    const bCrit = isCritical(b) ? 0 : 1;
    if (aCrit !== bCrit) return aCrit - bCrit;
    return a.name.localeCompare(b.name);
  });

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
      key: 'expiry_date',
      header: 'Срок годности',
      cell: (item) => {
        const exp = (item as any).expiry_date as string | null;
        if (!exp) return <span className="text-muted-foreground text-sm">—</span>;
        const d = new Date(exp);
        const days = Math.floor((d.getTime() - Date.now()) / 86400000);
        const cls = days < 0
          ? 'text-destructive font-semibold'
          : days <= 30
            ? 'text-yellow-500 font-medium'
            : '';
        const label = days < 0 ? ' (просрочен)' : days <= 30 ? ` (${days} дн.)` : '';
        return <span className={cls}>{new Intl.DateTimeFormat('ru-RU').format(d)}{label}</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => canManage ? (
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
      ) : null,
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
        actions={canManage ? (
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
        ) : undefined}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
        <Card
          className="glass cursor-pointer transition hover:bg-muted/30"
          onClick={() => lowStockItems.length > 0 && setStockListDialog('low')}
          role="button"
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Мало на складе</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems.length}</p>
                {lowStockItems.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Нажмите для списка</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="glass cursor-pointer transition hover:bg-muted/30"
          onClick={() => (expiringItems.length + expiredItems.length) > 0 && setStockListDialog('expiring')}
          role="button"
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Истекает срок (≤30 дн.)</p>
                <p className="text-2xl font-bold text-yellow-500">{expiringItems.length}</p>
                {expiredItems.length > 0 && (
                  <p className="text-xs text-destructive mt-0.5">+ {expiredItems.length} просрочено</p>
                )}
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

      {/* Stock list dialog */}
      <Dialog open={stockListDialog !== null} onOpenChange={(o) => !o && setStockListDialog(null)}>
        <DialogContent className="glass max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {stockListDialog === 'low' ? 'Товары с низким остатком' : 'Товары с истекающим сроком годности'}
            </DialogTitle>
            <DialogDescription>
              {stockListDialog === 'low'
                ? 'Остаток ниже или равен минимальному. Нажмите на товар, чтобы оформить приход.'
                : 'Просроченные и те, у которых срок истекает в ближайшие 30 дней.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(stockListDialog === 'low' ? lowStockItems : [...expiredItems, ...expiringItems]).map((it: any) => {
              const exp = it.expiry_date ? new Date(it.expiry_date) : null;
              const days = exp ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setStockListDialog(null);
                    if (canManage) {
                      setSelectedItem(it);
                      setMovementDialogOpen(true);
                    }
                  }}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.category?.name || 'Без категории'}
                      {exp && (
                        <> · Срок: {new Intl.DateTimeFormat('ru-RU').format(exp)}
                          {days !== null && days < 0 && <span className="text-destructive"> (просрочен)</span>}
                          {days !== null && days >= 0 && days <= 30 && <span className="text-yellow-500"> ({days} дн.)</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${it.quantity <= it.min_quantity ? 'text-destructive' : ''}`}>
                      {it.quantity} {it.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">мин. {it.min_quantity}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {canManage && (
        <ExcelImporter
          title="Импорт товаров склада из Excel"
          description="Загрузите .xlsx файл, чтобы массово добавить позиции склада. Столбец «Срок годности» — дата в формате ГГГГ-ММ-ДД (например, 2027-03-15). Оставьте пустым, если срок годности неприменим."
          expectedColumns={['Название', 'Категория', 'Остаток', 'Закупка', 'Продажа', 'Срок годности']}
          exampleRow={{ 'Название': 'Амоксициллин 500мг', 'Категория': 'Антибиотики', 'Остаток': 50, 'Закупка': 200, 'Продажа': 350, 'Срок годности': '2027-03-15' }}
          onParsed={async (rows) => {
            let inserted = 0, failed = 0;
            const catMap: Record<string, string> = {};
            categories.forEach((c: any) => { catMap[c.name.toLowerCase()] = c.id; });
            for (const r of rows) {
              const name = String(r['Название'] || '').trim();
              if (!name) { failed++; continue; }
              const catName = String(r['Категория'] || '').trim();
              let category_id = catMap[catName.toLowerCase()] || null;
              if (catName && !category_id) {
                const { data: nc } = await supabase.from('inventory_categories').insert({ name: catName }).select('id').single();
                if (nc) { category_id = nc.id; catMap[catName.toLowerCase()] = nc.id; }
              }
              const rawExp = r['Срок годности'];
              let expiry_date: string | null = null;
              if (rawExp) {
                const d = rawExp instanceof Date ? rawExp : new Date(String(rawExp));
                if (!isNaN(d.getTime())) expiry_date = d.toISOString().slice(0, 10);
              }
              const { error } = await supabase.from('inventory_items').insert({
                name, category_id, expiry_date,
                quantity: Number(r['Остаток']) || 0,
                purchase_price: Number(r['Закупка']) || 0,
                sale_price: Number(r['Продажа']) || 0,
                unit: 'шт', min_quantity: 0, is_active: true,
              });
              if (error) failed++; else inserted++;
            }
            fetchData();
            return { inserted, failed };
          }}
        />
      )}

      <DataTable
        data={items}
        columns={columns}
        searchPlaceholder="Поиск товара..."
        searchKey="name"
        onAdd={canManage ? () => {
          resetItemForm();
          setItemDialogOpen(true);
        } : undefined}
        addLabel="Добавить товар"
        isLoading={loading}
        emptyMessage="Нет товаров"
      />

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid gap-2">
              <Label>Срок годности</Label>
              <Input
                type="date"
                value={itemForm.expiry_date}
                onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })}
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
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
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
