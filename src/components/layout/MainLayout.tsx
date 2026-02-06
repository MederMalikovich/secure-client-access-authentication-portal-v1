import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          'ml-64' // Default expanded sidebar width
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
