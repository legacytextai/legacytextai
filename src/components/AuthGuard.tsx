import { ReactNode, useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthGuardProps {
  children: ReactNode;
}

const publicPaths = ['/', '/auth', '/auth/callback', '/privacy', '/terms'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, authReady } = useAuth();
  const location = useLocation();
  const [loopCount, setLoopCount] = useState(0);
  const [showLoopError, setShowLoopError] = useState(false);

  // Track navigation loops
  useEffect(() => {
    const now = Date.now();
    const loopKey = 'authLoopCount';
    const timeKey = 'authLoopTime';
    
    const storedCount = parseInt(localStorage.getItem(loopKey) || '0');
    const storedTime = parseInt(localStorage.getItem(timeKey) || '0');
    
    // Don't count phone verification redirects as loops
    const isPhoneVerification = location.pathname === '/settings' && 
      new URLSearchParams(location.search).get('verifyPhone') === '1';
    
    // Reset if more than 10 seconds have passed or if this is a phone verification redirect
    if (now - storedTime > 10000 || isPhoneVerification) {
      localStorage.setItem(loopKey, '1');
      localStorage.setItem(timeKey, String(now));
      setLoopCount(1);
    } else {
      const newCount = storedCount + 1;
      localStorage.setItem(loopKey, String(newCount));
      setLoopCount(newCount);
      
      // Show loop error if more than 3 redirects in 10 seconds
      if (newCount > 3 && !publicPaths.includes(location.pathname)) {
        setShowLoopError(true);
      }
    }
  }, [location.pathname, location.search]);

  const clearLoopSentinel = () => {
    localStorage.removeItem('authLoopCount');
    localStorage.removeItem('authLoopTime');
    setLoopCount(0);
    setShowLoopError(false);
  };

  const goToDebugCallback = () => {
    clearLoopSentinel();
    window.location.href = '/auth/callback?debug=1';
  };

  // Show loop error screen
  if (showLoopError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md space-y-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold">Authentication Loop Detected</h1>
          <Alert>
            <AlertDescription>
              You seem to be stuck in an authentication redirect loop. This usually happens when 
              there's an issue with session establishment or verification.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={goToDebugCallback} className="w-full">
              Debug Authentication
            </Button>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              variant="outline" 
              className="w-full"
            >
              Start Over
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Loop count: {loopCount} | Path: {location.pathname}
          </p>
        </div>
      </div>
    );
  }

  // Show loading while auth is initializing
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated and trying to access protected route
  if (!session && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}