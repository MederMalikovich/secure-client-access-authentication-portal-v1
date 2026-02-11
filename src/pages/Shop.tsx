import { useEffect, useState } from 'react';
import { ShoppingCart, Package, MoreVertical, Eye, Plus, Minus, Trash2, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShopSale, PaymentStatus, paymentStatusLabels, InventoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export default function Shop() {
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; total_qty: number; total_revenue: number }[]>([]);

  const [formData, setFormData] = useState({
    client_id: '',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, itemsRes, clientsRes, topRes] = await Promise.all([
        supabase
          .from('shop_sales')
          .select(`
            *,
            client:clients(id, full_name),
            items:shop_sale_items(*, item:inventory_items(name))
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory_items')
          .select('*')
          .eq('is_active', true)
          .gt('quantity', 0)
          .gt('sale_price', 0)
          .order('name'),
        supabase.from('clients').select('id, full_name').order('full_name'),
        supabase
          .from('shop_sale_items')
          .select('quantity, total, item:inventory_items(name)'),
      ]);

      if (salesRes.error) throw salesRes.error;
      
      setSales(salesRes.data || []);
      setInventoryItems(itemsRes.data || []);
      setClients(clientsRes.data || []);

      // Calculate top 5 products
      const productMap: Record<string, { name: string; total_qty: number; total_revenue: number }> = {};
      (topRes.data || []).forEach((item: any) => {
        const name = item.item?.name || 'Неизвестно';
        if (!productMap[name]) productMap[name] = { name, total_qty: 0, total_revenue: 0 };
        productMap[name].total_qty += Number(item.quantity);
        productMap[name].total_revenue += Number(item.total);
      });
      setTopProducts(
        Object.values(productMap)
          .sort((a, b) => b.total_qty - a.total_qty)
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: InventoryItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setCart(cart.map(c => 
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        ));
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Недостаточно товара на складе',
        });
      }
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    const cartItem = cart.find(c => c.item.id === itemId);
    if (cartItem && quantity > cartItem.item.quantity) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Недостаточно товара на складе',
      });
      return;
    }
    if (quantity < 1) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c => 
        c.item.id === itemId ? { ...c, quantity } : c
      ));
    }
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.sale_price * c.quantity, 0);

  const handleSale = async () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Корзина пуста',
      });
      return;
    }

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('shop_sales')
        .insert({
          client_id: formData.client_id || null,
          total: cartTotal,
          payment_method: formData.payment_method,
          payment_status: 'paid' as PaymentStatus,
          notes: formData.notes,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update inventory
      for (const cartItem of cart) {
        // Create sale item
        const { error: itemError } = await supabase
          .from('shop_sale_items')
          .insert({
            sale_id: sale.id,
            item_id: cartItem.item.id,
            quantity: cartItem.quantity,
            unit_price: cartItem.item.sale_price,
            total: cartItem.item.sale_price * cartItem.quantity,
          });
        if (itemError) throw itemError;

        // Update inventory
        const newQuantity = cartItem.item.quantity - cartItem.quantity;
        const { error: invError } = await supabase
          .from('inventory_items')
          .update({ quantity: newQuantity })
          .eq('id', cartItem.item.id);
        if (invError) throw invError;

        // Create inventory movement
        const { error: movError } = await supabase
          .from('inventory_movements')
          .insert({
            item_id: cartItem.item.id,
            movement_type: 'sale',
            quantity: cartItem.quantity,
            reference_id: sale.id,
            notes: `Продажа #${sale.id}`,
          });
        if (movError) throw movError;
      }

      toast({ title: 'Успешно', description: 'Продажа оформлена' });
      setSaleDialogOpen(false);
      setCart([]);
      setFormData({ client_id: '', payment_method: 'cash', notes: '' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('kk-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const variants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      partial: 'secondary',
      paid: 'default',
      refunded: 'destructive',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[status]}>
        {paymentStatusLabels[status]}
      </Badge>
    );
  };

  // Stats
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.created_at);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const monthRevenue = sales
    .filter(s => {
      const saleDate = new Date(s.created_at);
      const now = new Date();
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + Number(s.total), 0);

  const columns: Column<ShopSale>[] = [
    {
      key: 'created_at',
      header: 'Дата',
      cell: (sale) => (
        <div className="font-medium">
          {format(new Date(sale.created_at), 'd MMM yyyy', { locale: ru })}
          <div className="text-xs text-muted-foreground">
            {format(new Date(sale.created_at), 'HH:mm')}
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Клиент',
      cell: (sale) => (
        <span className="text-muted-foreground">
          {(sale as any).client?.full_name || 'Розничная продажа'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Товары',
      cell: (sale) => (
        <span className="text-muted-foreground">
          {(sale as any).items?.length || 0} поз.
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Сумма',
      cell: (sale) => (
        <span className="font-semibold">{formatCurrency(sale.total)}</span>
      ),
    },
    {
      key: 'payment_status',
      header: 'Статус',
      cell: (sale) => getStatusBadge(sale.payment_status),
    },
    {
      key: 'payment_method',
      header: 'Оплата',
      cell: (sale) => (
        <Badge variant="outline">
          {sale.payment_method === 'cash' ? 'Наличные' : 
           sale.payment_method === 'card' ? 'Карта' : 'Перевод'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Магазин"
        description="Продажа товаров и история покупок"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Магазин' },
        ]}
        actions={
          <Button onClick={() => setSaleDialogOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Новая продажа
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          title="Продаж сегодня"
          value={todaySales.length}
          icon={<ShoppingCart className="h-5 w-5" />}
          description={format(new Date(), 'd MMMM', { locale: ru })}
        />
        <StatCard
          title="Выручка сегодня"
          value={formatCurrency(todayRevenue)}
          icon={<Package className="h-5 w-5" />}
          description="Оплаченные продажи"
        />
        <StatCard
          title="Выручка за месяц"
          value={formatCurrency(monthRevenue)}
          icon={<Package className="h-5 w-5" />}
          description={format(new Date(), 'LLLL yyyy', { locale: ru })}
        />
      </div>

      {/* Top 5 Products */}
      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Топ 5 продаваемых товаров
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет данных о продажах</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{product.total_qty} шт.</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(product.total_revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DataTable
        data={sales}
        columns={columns}
        searchPlaceholder="Поиск..."
        isLoading={loading}
        emptyMessage="Нет продаж"
      />

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая продажа</DialogTitle>
            <DialogDescription>
              Выберите товары и оформите продажу
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 md:grid-cols-2">
            {/* Products */}
            <div>
              <Label className="mb-2 block">Товары</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {inventoryItems.map((item) => (
                  <Card key={item.id} className="glass">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.sale_price)} • {item.quantity} {item.unit}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToCart(item)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {inventoryItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Нет товаров для продажи
                  </p>
                )}
              </div>
            </div>

            {/* Cart */}
            <div>
              <Label className="mb-2 block">Корзина</Label>
              <Card className="glass">
                <CardContent className="p-3">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Корзина пуста
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((cartItem) => (
                        <div key={cartItem.item.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{cartItem.item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(cartItem.item.sale_price)} × {cartItem.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{cartItem.quantity}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeFromCart(cartItem.item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Итого:</span>
                          <span className="text-primary">{formatCurrency(cartTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Клиент (необязательно)</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиента" />
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
                  <Label>Способ оплаты</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="card">Карта</SelectItem>
                      <SelectItem value="transfer">Перевод</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Комментарий</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация..."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSale} disabled={cart.length === 0}>
              Оформить продажу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
