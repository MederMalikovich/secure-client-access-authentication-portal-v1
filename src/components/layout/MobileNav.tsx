import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, PawPrint, Calendar, FileText, DollarSign, Package, ShoppingCart, BarChart3, Settings, Heart, Stethoscope, UserCheck, LogOut, Search, GraduationCap, Pill, BedDouble, Gift, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';

const staffNavItems = [
  { icon: Home, label: 'Дашборд', href: '/dashboard' },
  { icon: Users, label: 'Клиенты', href: '/clients' },
  { icon: PawPrint, label: 'Питомцы', href: '/pets' },
  { icon: FileText, label: 'Медкарты', href: '/medical-records' },
  { icon: Calendar, label: 'Доска приёма', href: '/flowboard' },
  { icon: Pill, label: 'Назначения', href: '/prescriptions' },
  { icon: BedDouble, label: 'Стационар', href: '/hospitalization' },
  { icon: Stethoscope, label: 'Услуги', href: '/services' },
  { icon: Heart, label: 'Заболевания', href: '/diseases' },
  { icon: UserCheck, label: 'Врачи', href: '/doctors' },
  { icon: DollarSign, label: 'Финансы', href: '/finances' },
  { icon: Package, label: 'Склад', href: '/inventory' },
  { icon: ShoppingCart, label: 'Магазин', href: '/shop' },
  { icon: Gift, label: 'Лояльность', href: '/loyalty' },
  { icon: BarChart3, label: 'Отчёты', href: '/reports' },
  { icon: GraduationCap, label: 'Обучение', href: '/training' },
  { icon: Settings, label: 'Настройки', href: '/settings' },
];

const clientNavItems = [
  { icon: Home, label: 'Мой кабинет', href: '/my-cabinet' },
  { icon: PawPrint, label: 'Мои питомцы', href: '/pets' },
  { icon: FileText, label: 'Медкарты', href: '/medical-records' },
  { icon: Pill, label: 'Назначения', href: '/prescriptions' },
  { icon: BedDouble, label: 'Стационар', href: '/hospitalization' },
  { icon: GraduationCap, label: 'Обучение', href: '/client-training' },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { hasRole, signOut, profile } = useAuth();
  const isClient = hasRole('client');
  const navItems = isClient ? clientNavItems : staffNavItems;

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <PawPrint className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-sidebar-foreground truncate">VetCRM</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isClient && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground h-11 w-11"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            aria-label="Поиск"
          >
            <Search className="h-5 w-5" />
          </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground h-11 w-11" aria-label="Меню">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <PawPrint className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-sidebar-foreground">VetCRM</h1>
                    <p className="text-xs text-sidebar-foreground/60">
                      {isClient ? 'Мой кабинет' : 'Ветеринарная клиника'}
                    </p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-lg mb-1 transition-all active:scale-[0.98]',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                      data-nav
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-sidebar-border">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {(profile?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || 'Пользователь'}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {isClient ? 'Клиент' : profile?.email || ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { setOpen(false); signOut(); }}
                >
                  <LogOut className="h-5 w-5" />
                  Выйти
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </div>
  );
}
