import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { getValidationError, clientSchema } from '@/lib/validationSchemas';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';

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
  const [referralCode, setReferralCode] = useState('');

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
        // Resolve referral code (optional)
        let referred_by_client_id: string | null = null;
        const code = referralCode.trim().toUpperCase();
        if (code) {
          const { data: ref } = await supabase
            .from('clients')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle();
          if (!ref) {
            toast({ variant: 'destructive', title: 'Реферальный код не найден', description: 'Проверьте код или оставьте поле пустым.' });
            return;
          }
          referred_by_client_id = ref.id;
        }
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert({ ...formData, referred_by_client_id })
          .select()
          .single();
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
        toast({ title: 'Успешно', description: referred_by_client_id ? 'Клиент добавлен. Реферальные бонусы начислены обоим клиентам.' : 'Клиент добавлен' });
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

      <ClientDetailSheet
        client={detailClient}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onEdit={() => {
          setDetailDialogOpen(false);
          if (detailClient) openEditDialog(detailClient);
        }}
        onAddAppointment={(clientId, petId) => {
          navigate('/calendar', {
            state: {
              openNew: true,
              prefilledClientId: clientId,
              prefilledPetId: petId,
            },
          });
        }}
      />

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