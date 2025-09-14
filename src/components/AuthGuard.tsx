import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

const publicPaths = ['/', '/auth', '/auth/callback', '/privacy', '/terms'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, authReady } = useAuth();
  const location = useLocation();

  // Show loading while auth is initializing
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated and trying to access protected route
  if (!session && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}