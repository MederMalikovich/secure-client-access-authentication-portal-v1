import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Stethoscope,
  Calendar,
  FileText,
  DollarSign,
  Package,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Heart,
  Syringe,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AppRole } from '@/lib/types';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: AppRole[];
}

const mainNavItems: NavItem[] = [
  { title: 'Дашборд', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Клиенты', url: '/clients', icon: Users },
  { title: 'Питомцы', url: '/pets', icon: PawPrint },
  { title: 'Медкарты', url: '/medical-records', icon: FileText, roles: ['admin', 'veterinarian', 'registrar', 'manager'] },
  { title: 'Календарь', url: '/calendar', icon: Calendar },
  { title: 'Услуги', url: '/services', icon: Stethoscope },
  { title: 'Заболевания', url: '/diseases', icon: Syringe, roles: ['admin', 'veterinarian'] },
];

const businessNavItems: NavItem[] = [
  { title: 'Финансы', url: '/finances', icon: DollarSign, roles: ['admin', 'accountant', 'manager'] },
  { title: 'Склад', url: '/inventory', icon: Package, roles: ['admin', 'manager', 'veterinarian'] },
  { title: 'Магазин', url: '/shop', icon: ShoppingCart, roles: ['admin', 'manager', 'registrar'] },
  { title: 'Отчёты', url: '/reports', icon: BarChart3, roles: ['admin', 'manager', 'accountant'] },
];

const systemNavItems: NavItem[] = [
  { title: 'Отзывы', url: '/feedback', icon: MessageSquare, roles: ['admin', 'manager'] },
  { title: 'Настройки', url: '/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, roles, signOut, hasAnyRole } = useAuth();

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return hasAnyRole(item.roles);
  };

  const renderNavItems = (items: NavItem[], label: string) => {
    const accessibleItems = items.filter(canAccess);
    if (accessibleItems.length === 0) return null;

    return (
      <div className="space-y-1">
        {!collapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        )}
        {accessibleItems.map((item) => (
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
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-sidebar-background border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg gradient-text">VetCRM</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {renderNavItems(mainNavItems, 'Основное')}
        {renderNavItems(businessNavItems, 'Бизнес')}
        {renderNavItems(systemNavItems, 'Система')}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            collapsed ? 'px-0 justify-center' : 'justify-start gap-3'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Выйти</span>}
        </Button>
      </div>
    </aside>
  );
}
