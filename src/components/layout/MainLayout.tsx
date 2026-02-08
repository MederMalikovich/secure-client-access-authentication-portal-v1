import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile navigation */}
      <MobileNav />
      
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          'pt-16 md:pt-0', // Add top padding for mobile nav
          'md:ml-64' // Sidebar width on desktop
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
