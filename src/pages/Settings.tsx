import { useEffect, useState } from 'react';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { Users, Shield, MoreVertical, Pencil, UserPlus, Sun, Moon, Palette, Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisitTemplatesManager } from '@/components/VisitTemplatesManager';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole, roleLabels } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationChannelsTab } from '@/components/settings/NotificationChannelsTab';
import { WorkingHoursTab } from '@/components/settings/WorkingHoursTab';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('viewer');

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    is_active: true,
  });

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
      const existingRole = profiles
        .find(p => p.id === selectedProfile.id)
        ?.roles.find((r: any) => r.role === selectedRole);

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
        description: getUserFriendlyError(error),
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
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          email: profileForm.email,
          phone: profileForm.phone,
          position: profileForm.position,
          is_active: profileForm.is_active,
        })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      toast({ title: 'Успешно', description: 'Профиль обновлён' });
      setProfileDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: getUserFriendlyError(error),
      });
    }
  };

  const openProfileEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setProfileForm({
      full_name: profile.full_name,
      email: profile.email || '',
      phone: profile.phone || '',
      position: profile.position || '',
      is_active: profile.is_active,
    });
    setProfileDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<AppRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      veterinarian: 'default',
      registrar: 'secondary',
      accountant: 'outline',
      manager: 'default',
      viewer: 'outline',
      client: 'secondary',
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
      key: 'phone',
      header: 'Телефон',
      cell: (profile) => (
        <span className="text-muted-foreground">{profile.phone || '—'}</span>
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
            <DropdownMenuItem onClick={() => openProfileEdit(profile)}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="appearance">Оформление</TabsTrigger>
          <TabsTrigger value="schedule">График работы</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
          <TabsTrigger value="visit-templates">Шаблоны визитов</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <WorkingHoursTab />
        </TabsContent>

        <TabsContent value="appearance">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Тема оформления
                </CardTitle>
                <CardDescription>
                  Выберите цветовую схему интерфейса
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="flex-1 h-20 flex-col gap-2"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-6 w-6" />
                    <span>Тёмная</span>
                  </Button>
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="flex-1 h-20 flex-col gap-2"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-6 w-6" />
                    <span>Светлая</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Текущая тема: <span className="font-medium text-foreground">{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationChannelsTab />
        </TabsContent>

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
            {Object.entries(roleLabels).map(([key, label]) => {
              const roleUsers = profiles.filter(p => p.roles.some((r: any) => r.role === key));
              const nonRoleUsers = profiles.filter(p => !p.roles.some((r: any) => r.role === key));
              return (
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
                  <CardContent className="space-y-3">
                    {roleUsers.length > 0 ? (
                      <div className="space-y-2">
                        {roleUsers.map(u => {
                          const roleRecord = u.roles.find((r: any) => r.role === key);
                          return (
                            <div key={u.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                              <span className="text-sm font-medium">{u.full_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive hover:text-destructive"
                                onClick={() => roleRecord && handleRemoveRole(u, roleRecord.id)}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет пользователей</p>
                    )}
                    {nonRoleUsers.length > 0 && (
                      <Select
                        value=""
                        onValueChange={async (userId) => {
                          try {
                            const { error } = await supabase.from('user_roles').insert({
                              user_id: userId,
                              role: key as AppRole,
                            });
                            if (error) throw error;
                            toast({ title: 'Успешно', description: `Роль «${label}» назначена` });
                            fetchData();
                          } catch (error: any) {
                            toast({ variant: 'destructive', title: 'Ошибка', description: getUserFriendlyError(error) });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="+ Добавить пользователя" />
                        </SelectTrigger>
                        <SelectContent>
                          {nonRoleUsers.map(u => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="visit-templates">
          <VisitTemplatesManager />
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

      {/* Edit Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Редактировать профиль</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ФИО</Label>
              <Input
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Телефон</Label>
              <Input
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Должность</Label>
              <Input
                value={profileForm.position}
                onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={profileForm.is_active}
                onCheckedChange={(checked) => setProfileForm({ ...profileForm, is_active: checked })}
              />
              <Label>Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateProfile}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
