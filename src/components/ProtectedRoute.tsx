import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';
import { AppRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  staffOnly?: boolean;
}

export function ProtectedRoute({ children, requiredRoles, staffOnly }: ProtectedRouteProps) {
  const { user, loading, hasAnyRole, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Clients cannot access staff-only routes
  if (staffOnly && hasRole('client')) {
    return <Navigate to="/pets" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Доступ запрещён</h1>
          <p className="text-muted-foreground">
            У вас нет прав для просмотра этой страницы.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
