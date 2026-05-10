import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PawPrint, Stethoscope, Calendar, FileText, DollarSign, Package, ShoppingCart, BarChart3, Settings, ChevronLeft, ChevronRight, Heart, Syringe, UserCheck, Search, LogOut, GraduationCap, Pill, BedDouble, Gift } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: 'Дашборд', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Клиенты', url: '/clients', icon: Users },
  { title: 'Питомцы', url: '/pets', icon: PawPrint },
  { title: 'Медкарты', url: '/medical-records', icon: FileText },
  { title: 'Назначения', url: '/prescriptions', icon: Pill },
  { title: 'Стационар', url: '/hospitalization', icon: BedDouble },
  { title: 'Календарь', url: '/calendar', icon: Calendar },
  { title: 'Услуги', url: '/services', icon: Stethoscope },
  { title: 'Заболевания', url: '/diseases', icon: Syringe },
  { title: 'Врачи', url: '/doctors', icon: UserCheck },
];

const clientNavItems: NavItem[] = [
  { title: 'Мой кабинет', url: '/my-cabinet', icon: LayoutDashboard },
  { title: 'Мои питомцы', url: '/pets', icon: PawPrint },
  { title: 'Медкарты', url: '/medical-records', icon: FileText },
  { title: 'Назначения', url: '/prescriptions', icon: Pill },
  { title: 'Стационар', url: '/hospitalization', icon: BedDouble },
  { title: 'Обучение', url: '/client-training', icon: GraduationCap },
];

const businessNavItems: NavItem[] = [
  { title: 'Финансы', url: '/finances', icon: DollarSign },
  { title: 'Склад', url: '/inventory', icon: Package },
  { title: 'Магазин', url: '/shop', icon: ShoppingCart },
  { title: 'Отчёты', url: '/reports', icon: BarChart3 },
];

const systemNavItems: NavItem[] = [
  { title: 'Обучение', url: '/training', icon: GraduationCap },
  { title: 'Настройки', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { hasRole, profile, signOut } = useAuth();
  const isClient = hasRole('client');

  const renderNavItems = (items: NavItem[], label: string) => {
    return (
      <div className="space-y-1">
        {!collapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        )}
        {items.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              collapsed && 'justify-center'
            )}
            activeClassName="bg-primary/10 text-primary border-l-2 border-primary glow-sm"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </div>
    );
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen flex flex-col',
      'bg-sidebar-background border-r border-sidebar-border',
      'transition-all duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg gradient-text">VetCRM</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!isClient && (
        <div className="px-3 pt-2">
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-9',
              collapsed && 'justify-center px-0'
            )}
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm">Поиск...</span>
                <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </>
            )}
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {isClient ? (
          renderNavItems(clientNavItems, 'Мой кабинет')
        ) : (
          <>
            {renderNavItems(mainNavItems, 'Основное')}
            {renderNavItems(businessNavItems, 'Бизнес')}
            {renderNavItems(systemNavItems, 'Система')}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {(profile?.full_name || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'Пользователь'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {isClient ? 'Клиент' : profile?.email || ''}
              </p>
            </div>
          </div>
        ) : null}
        <Button
          variant="ghost"
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
            collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3'
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Выйти</span>}
        </Button>
      </div>
    </aside>
  );
}
