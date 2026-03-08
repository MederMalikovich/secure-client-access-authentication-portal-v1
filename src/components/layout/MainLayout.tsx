import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from '@/components/GlobalSearch';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <GlobalSearch />
      
      {/* Mobile navigation */}
      <MobileNav />
      
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          'pt-16 md:pt-0',
          'md:ml-64'
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
