import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, clientSchema } from '@/lib/validationSchemas';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, MoreVertical, Pencil, Trash2, Eye, PawPrint } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if ((location.state as any)?.openNew) {
      resetForm();
      setDialogOpen(true);
      // Clear the state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          pets:pets(id, name, species, breed)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить клиентов',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = getValidationError(clientSchema, formData);
    if (validationError) {
      toast({ variant: 'destructive', title: 'Ошибка', description: validationError });
      return;
    }

    try {
      if (selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', selectedClient.id);
        if (error) throw error;
        toast({ title: 'Успешно', description: 'Клиент обновлён' });
      } else {
        const { data: newClient, error } = await supabase.from('clients').insert(formData).select().single();
        if (error) throw error;
        
        // Auto-create client auth account
        if (newClient?.client_number) {
          try {
            await supabase.functions.invoke('create-client-account', {
              body: {
                client_id: newClient.id,
                client_number: newClient.client_number,
                full_name: newClient.full_name,
              },
            });
          } catch (e) {
            console.error('Failed to create client account:', e);
          }
        }
        toast({ title: 'Успешно', description: 'Клиент добавлен' });
      }
      setDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', selectedClient.id);
      if (error) throw error;
      toast({ title: 'Успешно', description: 'Клиент удалён' });
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      full_name: client.full_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
    });
    setDialogOpen(true);
  };

  const openDetailDialog = (client: any) => {
    setDetailClient(client);
    setDetailDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
  };

  const columns: Column<Client>[] = [
    {
      key: 'client_number',
      header: 'ID',
      cell: (client) => (
        <Badge variant="outline" className="font-mono">
          {(client as any).client_number || '—'}
        </Badge>
      ),
    },
    {
      key: 'full_name',
      header: 'ФИО',
      cell: (client) => (
        <div className="font-medium">{client.full_name}</div>
      ),
    },
    {
      key: 'phone',
      header: 'Телефон',
      cell: (client) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          {client.phone}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (client) =>
        client.email ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            {client.email}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'pets',
      header: 'Питомцы',
      cell: (client) => (
        <Badge variant="secondary">
          {(client as any).pets?.length || 0}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Дата регистрации',
      cell: (client) => (
        <span className="text-muted-foreground">
          {format(new Date(client.created_at), 'd MMM yyyy', { locale: ru })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (client) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDetailDialog(client)}>
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(client)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedClient(client);
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
        title="Клиенты"
        description="Управление базой клиентов клиники"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Клиенты' },
        ]}
      />

      <DataTable
        data={clients}
        columns={columns}
        searchPlaceholder="Поиск по имени..."
        searchKey="full_name"
        onAdd={() => {
          resetForm();
          setDialogOpen(true);
        }}
        addLabel="Добавить клиента"
        onRowClick={(client) => openDetailDialog(client)}
        isLoading={loading}
        emptyMessage="Нет клиентов"
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{detailClient?.full_name}</span>
              {detailClient?.client_number && (
                <Badge variant="outline" className="font-mono">ID: {detailClient.client_number}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailClient && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{detailClient.phone}</span>
                </div>
                {detailClient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{detailClient.email}</span>
                  </div>
                )}
                {detailClient.address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{detailClient.address}</span>
                  </div>
                )}
              </div>
              
              {detailClient.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Комментарии</p>
                    <p className="text-sm text-muted-foreground">{detailClient.notes}</p>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <PawPrint className="h-4 w-4" />
                  Питомцы ({detailClient.pets?.length || 0})
                </h4>
                {detailClient.pets?.length > 0 ? (
                  <div className="space-y-2">
                    {detailClient.pets.map((pet: any) => (
                      <Card key={pet.id} className="glass">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{pet.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pet.species} {pet.breed && `• ${pet.breed}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет питомцев</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Зарегистрирован: {format(new Date(detailClient.created_at), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDetailDialogOpen(false);
              if (detailClient) openEditDialog(detailClient);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? 'Редактировать клиента' : 'Новый клиент'}
            </DialogTitle>
            <DialogDescription>
              {selectedClient
                ? 'Измените данные клиента'
                : 'Заполните данные нового клиента. ID будет присвоен автоматически.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">ФИО *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Комментарии</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {selectedClient ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Удалить клиента?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Все связанные данные (питомцы,
              записи, медкарты) будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
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