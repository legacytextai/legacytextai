import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { afterLoginBootstrap } from '@/hooks/useAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.substring(1));

        // Try token_hash + type first (email confirmation)
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') as any;
        
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          
          if (error) throw error;
          setStatus('success');
          await afterLoginBootstrap(navigate);
          return;
        }

        // Try code (OAuth)
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;
          setStatus('success');
          await afterLoginBootstrap(navigate);
          return;
        }

        // Try legacy hash tokens
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) throw error;
          setStatus('success');
          await afterLoginBootstrap(navigate);
          return;
        }

        // No auth params found
        throw new Error('No authentication parameters found');
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (status === 'verifying') {
    return (
      <Layout showSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">Verifying your account...</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Please wait while we confirm your email and set up your account.
          </p>
        </div>
      </Layout>
    );
  }

  if (status === 'error') {
    return (
      <Layout showSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <Alert className="max-w-md">
            <AlertDescription>
              {error || 'Authentication failed. The link may have expired or already been used.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Go to Login
          </Button>
        </div>
      </Layout>
    );
  }

  // Success state - should not render as we navigate away immediately
  return (
    <Layout showSidebar={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-green-600">✓</div>
        <h1 className="text-xl font-semibold">Success!</h1>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </Layout>
  );
}