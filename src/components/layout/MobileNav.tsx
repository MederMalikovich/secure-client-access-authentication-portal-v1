import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, PawPrint, Calendar, FileText, DollarSign, Package, ShoppingCart, BarChart3, Settings, Heart, Stethoscope, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { icon: Home, label: 'Дашборд', href: '/dashboard' },
  { icon: Users, label: 'Клиенты', href: '/clients' },
  { icon: PawPrint, label: 'Питомцы', href: '/pets' },
  { icon: Calendar, label: 'Календарь', href: '/calendar' },
  { icon: FileText, label: 'Медкарты', href: '/medical-records' },
  { icon: Stethoscope, label: 'Услуги', href: '/services' },
  { icon: Heart, label: 'Заболевания', href: '/diseases' },
  { icon: DollarSign, label: 'Финансы', href: '/finances' },
  { icon: Package, label: 'Склад', href: '/inventory' },
  { icon: ShoppingCart, label: 'Магазин', href: '/shop' },
  { icon: BarChart3, label: 'Отчёты', href: '/reports' },
  { icon: MessageSquare, label: 'Отзывы', href: '/feedback' },
  { icon: Settings, label: 'Настройки', href: '/settings' },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-sidebar-foreground">VetCRM</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
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
                    <p className="text-xs text-sidebar-foreground/60">Ветеринарная клиника</p>
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
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
