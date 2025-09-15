import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { afterLoginBootstrap } from '@/hooks/useAuth';
import { getDebugAuth } from '@/utils/debugConfig';

interface AuthState {
  status: 'verifying' | 'success' | 'error';
  handlerPath: string | null;
  parsedUrl: {
    token_hash?: string;
    type?: string;
    code?: string;
    access_token?: string;
    refresh_token?: string;
  };
  sessionSnapshot: {
    userId?: string;
    email?: string;
  } | null;
  error: string | null;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({
    status: 'verifying',
    handlerPath: null,
    parsedUrl: {},
    sessionSnapshot: null,
    error: null,
  });

  const isDebugMode = getDebugAuth() || searchParams.get('debug') === '1';

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.substring(1));

        // Parse URL parameters (success and error cases)
        const parsedUrl = {
          token_hash: searchParams.get('token_hash') || undefined,
          type: searchParams.get('type') || undefined,
          code: searchParams.get('code') || undefined,
          access_token: hashParams.get('access_token') || undefined,
          refresh_token: hashParams.get('refresh_token') || undefined,
          // Error parameters (can be in query or hash)
          error: searchParams.get('error') || hashParams.get('error') || undefined,
          error_code: searchParams.get('error_code') || hashParams.get('error_code') || undefined,
          error_description: searchParams.get('error_description') || hashParams.get('error_description') || undefined,
        };

        setAuthState(prev => ({ ...prev, parsedUrl }));

        let handlerPath: string | null = null;
        let sessionSet = false;

        // Check for error parameters first
        if (parsedUrl.error) {
          const errorMsg = parsedUrl.error_description 
            ? decodeURIComponent(parsedUrl.error_description.replace(/\+/g, ' '))
            : `Authentication error: ${parsedUrl.error}`;
          
          // Handle specific error cases
          if (parsedUrl.error_code === 'otp_expired' || parsedUrl.error === 'access_denied') {
            throw new Error(`Email verification link has expired. Please request a new confirmation email.`);
          } else {
            throw new Error(errorMsg);
          }
        }

        // Try token_hash + type first (email confirmation)
        if (parsedUrl.token_hash && parsedUrl.type) {
          handlerPath = 'verifyOtp';
          console.log('[AuthCallback] Using verifyOtp handler', { type: parsedUrl.type });
          
          const { error } = await supabase.auth.verifyOtp({
            type: parsedUrl.type as any,
            token_hash: parsedUrl.token_hash,
          });
          
          if (error) throw error;
          sessionSet = true;
        }
        // Try code (OAuth)
        else if (parsedUrl.code) {
          handlerPath = 'exchangeCodeForSession';
          console.log('[AuthCallback] Using exchangeCodeForSession handler');
          
          const { error } = await supabase.auth.exchangeCodeForSession(parsedUrl.code);
          
          if (error) throw error;
          sessionSet = true;
        }
        // Try legacy hash tokens
        else if (parsedUrl.access_token && parsedUrl.refresh_token) {
          handlerPath = 'setSession (legacy hash)';
          console.log('[AuthCallback] Using setSession handler (legacy)');
          
          const { error } = await supabase.auth.setSession({
            access_token: parsedUrl.access_token,
            refresh_token: parsedUrl.refresh_token,
          });
          
          if (error) throw error;
          sessionSet = true;
        }
        
        if (!sessionSet) {
          throw new Error('No authentication parameters found. This may be a confirmation-only link that requires you to log in separately.');
        }

        console.log('[AuthCallback] Session set successfully');

        // Get session snapshot
        const { data: { session } } = await supabase.auth.getSession();
        const sessionSnapshot = session ? {
          userId: session.user.id,
          email: session.user.email || 'No email',
        } : null;

        setAuthState({
          status: 'success',
          handlerPath,
          parsedUrl,
          sessionSnapshot,
          error: null,
        });

        // If debug mode, stay on page. Otherwise bootstrap and navigate
        if (!isDebugMode) {
          await afterLoginBootstrap(navigate);
        }
        
      } catch (err) {
        console.error('[AuthCallback] Auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        
        setAuthState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
      }
    };

    handleAuthCallback();
  }, [navigate, isDebugMode]);

  const handleManualNavigation = (path: string) => {
    navigate(path);
  };

  if (authState.status === 'verifying') {
    return (
      <Layout showSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">Verifying your account...</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Please wait while we confirm your email and set up your account.
          </p>
          
          {isDebugMode && (
            <Card className="mt-8 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-mono">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono">
                <div><strong>Current URL:</strong> {window.location.href}</div>
                <div><strong>Origin:</strong> {window.location.origin}</div>
                <div><strong>Supabase URL:</strong> https://toxadhuqzdydliplhrws.supabase.co</div>
                <div><strong>Parsed URL:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(authState.parsedUrl, null, 2)}</pre></div>
                <div><strong>Handler Path:</strong> {authState.handlerPath || 'None detected'}</div>
                <div><strong>Domain Match:</strong> {window.location.origin.includes('toxadhuqzdydliplhrws') || window.location.origin.includes('localhost') || window.location.origin.includes('lovable.app') ? '✅ Yes' : '❌ No'}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  if (authState.status === 'error') {
    return (
      <Layout showSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <XCircle className="h-12 w-12 text-destructive" />
          <Alert className="max-w-md">
            <AlertDescription>
              {authState.error || 'Authentication failed. The link may have expired or already been used.'}
            </AlertDescription>
          </Alert>
          
          {isDebugMode && (
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-mono">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono">
                <div><strong>Current URL:</strong> {window.location.href}</div>
                <div><strong>Origin:</strong> {window.location.origin}</div>
                <div><strong>Supabase URL:</strong> https://toxadhuqzdydliplhrws.supabase.co</div>
                <div><strong>Parsed URL:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(authState.parsedUrl, null, 2)}</pre></div>
                <div><strong>Handler Path:</strong> {authState.handlerPath || 'None detected'}</div>
                <div><strong>Error:</strong> {authState.error}</div>
                <div><strong>Domain Match:</strong> {window.location.origin.includes('toxadhuqzdydliplhrws') || window.location.origin.includes('localhost') || window.location.origin.includes('lovable.app') ? '✅ Yes' : '❌ No'}</div>
              </CardContent>
            </Card>
          )}
          
          <Button onClick={() => navigate('/auth')} variant="outline">
            Go to Login
          </Button>
        </div>
      </Layout>
    );
  }

  // Success state
  return (
    <Layout showSidebar={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <CheckCircle className="h-12 w-12 text-green-600" />
        <h1 className="text-xl font-semibold">Authentication Successful!</h1>
        
        {authState.sessionSnapshot && (
          <div className="text-center space-y-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Session OK
            </Badge>
            <p className="text-sm text-muted-foreground">
              User ID: {authState.sessionSnapshot.userId}
            </p>
            <p className="text-sm text-muted-foreground">
              Email: {authState.sessionSnapshot.email}
            </p>
          </div>
        )}

        {isDebugMode ? (
          <div className="space-y-4 w-full max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-mono">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono">
                <div><strong>Current URL:</strong> {window.location.href}</div>
                <div><strong>Origin:</strong> {window.location.origin}</div>
                <div><strong>Supabase URL:</strong> https://toxadhuqzdydliplhrws.supabase.co</div>
                <div><strong>Handler Path:</strong> {authState.handlerPath}</div>
                <div><strong>Parsed URL:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(authState.parsedUrl, null, 2)}</pre></div>
                <div><strong>Session:</strong> <pre className="whitespace-pre-wrap">{JSON.stringify(authState.sessionSnapshot, null, 2)}</pre></div>
                <div><strong>Domain Match:</strong> {window.location.origin.includes('toxadhuqzdydliplhrws') || window.location.origin.includes('localhost') || window.location.origin.includes('lovable.app') ? '✅ Yes' : '❌ No'}</div>
              </CardContent>
            </Card>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => handleManualNavigation('/settings')}>
                Go to Settings
              </Button>
              <Button onClick={() => handleManualNavigation('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        )}
      </div>
    </Layout>
  );
}