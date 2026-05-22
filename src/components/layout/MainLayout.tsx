import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { hasRole } = useAuth();
  const isClient = hasRole('client');

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <GlobalSearch />
      
      {/* Mobile navigation */}
      <MobileNav />
      
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen w-full max-w-full',
          'pt-16 md:pt-0',
          'md:ml-64',
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        {/* Desktop notification bell */}
        {!isClient && (
          <div className="hidden md:flex justify-end p-4 pb-0">
            <NotificationBell />
          </div>
        )}
        <div className="p-3 sm:p-4 md:p-6 md:pt-2 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
