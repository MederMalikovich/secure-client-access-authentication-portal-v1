import { useEffect, useState } from 'react';
import { Users, Shield, MoreVertical, Pencil, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole, roleLabels } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Settings() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('viewer');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const profilesWithRoles = profilesData?.map(profile => ({
        ...profile,
        roles: rolesData?.filter(r => r.user_id === profile.user_id) || [],
      })) || [];

      setProfiles(profilesWithRoles);
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

  const handleAssignRole = async () => {
    if (!selectedProfile) return;

    try {
      // Check if role already exists
      const existingRole = profiles
        .find(p => p.id === selectedProfile.id)
        ?.roles.find(r => r.role === selectedRole);

      if (existingRole) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Эта роль уже назначена',
        });
        return;
      }

      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedProfile.user_id,
        role: selectedRole,
      });

      if (error) throw error;

      toast({ title: 'Успешно', description: 'Роль назначена' });
      setRoleDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleRemoveRole = async (profile: Profile, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({ title: 'Успешно', description: 'Роль удалена' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const getRoleBadgeVariant = (role: AppRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<AppRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      veterinarian: 'default',
      registrar: 'secondary',
      accountant: 'outline',
      manager: 'default',
      viewer: 'outline',
    };
    return variants[role];
  };

  const columns: Column<Profile & { roles: UserRole[] }>[] = [
    {
      key: 'full_name',
      header: 'Сотрудник',
      cell: (profile) => (
        <div>
          <div className="font-medium">{profile.full_name}</div>
          <div className="text-xs text-muted-foreground">{profile.email}</div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Должность',
      cell: (profile) => (
        <span className="text-muted-foreground">{profile.position || '—'}</span>
      ),
    },
    {
      key: 'roles',
      header: 'Роли',
      cell: (profile) => (
        <div className="flex flex-wrap gap-1">
          {profile.roles.map((role) => (
            <Badge
              key={role.id}
              variant={getRoleBadgeVariant(role.role)}
              className="cursor-pointer"
              onClick={() => handleRemoveRole(profile, role.id)}
            >
              {roleLabels[role.role]} ×
            </Badge>
          ))}
          {profile.roles.length === 0 && (
            <span className="text-muted-foreground">Нет ролей</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Статус',
      cell: (profile) => (
        <Badge variant={profile.is_active ? 'default' : 'secondary'}>
          {profile.is_active ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Регистрация',
      cell: (profile) => (
        <span className="text-muted-foreground">
          {format(new Date(profile.created_at), 'd MMM yyyy', { locale: ru })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (profile) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedProfile(profile);
                setRoleDialogOpen(true);
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Назначить роль
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!hasRole('admin')) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="glass p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Доступ запрещён</h2>
          <p className="text-muted-foreground">
            Только администраторы могут просматривать настройки
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Управление пользователями и системой"
        breadcrumbs={[
          { label: 'Дашборд', href: '/dashboard' },
          { label: 'Настройки' },
        ]}
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable
            data={profiles}
            columns={columns}
            searchPlaceholder="Поиск сотрудника..."
            searchKey="full_name"
            isLoading={loading}
            emptyMessage="Нет пользователей"
          />
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(roleLabels).map(([key, label]) => (
              <Card key={key} className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {label}
                  </CardTitle>
                  <CardDescription>
                    {key === 'admin' && 'Полный доступ ко всем функциям системы'}
                    {key === 'veterinarian' && 'Приёмы, медкарты, лечение, склад'}
                    {key === 'registrar' && 'Клиенты, питомцы, записи, продажи'}
                    {key === 'accountant' && 'Финансы, счета, платежи, отчёты'}
                    {key === 'manager' && 'Управление персоналом и отчётность'}
                    {key === 'viewer' && 'Только просмотр данных'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Пользователей с этой ролью:{' '}
                    <span className="font-semibold text-foreground">
                      {profiles.filter(p => p.roles.some(r => r.role === key)).length}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Назначить роль</DialogTitle>
            <DialogDescription>
              Выберите роль для {selectedProfile?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Роль</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAssignRole}>Назначить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
