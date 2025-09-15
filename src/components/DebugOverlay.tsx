import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Bug, Loader2 } from 'lucide-react';

import { getDebugAuth } from '@/utils/debugConfig';

interface UserAppData {
  status: string;
  phone_e164: string;
}

interface DiagResult {
  ok: boolean;
  auth_header_seen: boolean;
  user_id_from_jwt: string | null;
  claims_present: boolean;
  now: string;
  error?: string;
}

interface OTPStatus {
  url: string;
  status: number;
  response: any;
  timestamp: number;
}

export function DebugOverlay() {
  const { session, authReady, user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [userAppData, setUserAppData] = useState<UserAppData | null>(null);
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [otpStatus, setOTPStatus] = useState<OTPStatus | null>(null);

  // Don't render if debug is disabled
  if (!getDebugAuth()) return null;

  // Load user app data
  useEffect(() => {
    if (session?.user) {
      const loadUserData = async () => {
        try {
          const { data } = await supabase
            .from('users_app')
            .select('status, phone_e164')
            .limit(1);
          setUserAppData(data?.[0] || null);
        } catch (error) {
          console.error('[DebugOverlay] Failed to load user data:', error);
        }
      };
      loadUserData();
    }
  }, [session]);

  // Intercept fetch calls to OTP functions if network debugging is enabled
  useEffect(() => {
    // Always enable network debugging in the debug overlay
    const debugNetworkEnabled = true;
    if (!debugNetworkEnabled) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Only intercept OTP-related calls
      if (urlString.includes('phone-change-initiate') || urlString.includes('phone-change-confirm')) {
        console.log('[DebugOverlay] OTP Request:', {
          url: urlString,
          method: options?.method,
          headers: options?.headers,
          body: options?.body,
        });

        try {
          const response = await originalFetch(...args);
          const clonedResponse = response.clone();
          const responseData = await clonedResponse.json().catch(() => ({}));
          
          console.log('[DebugOverlay] OTP Response:', {
            status: response.status,
            data: responseData,
          });

          // Store for overlay display
          setOTPStatus({
            url: urlString,
            status: response.status,
            response: responseData,
            timestamp: Date.now(),
          });

          return response;
        } catch (error) {
          console.error('[DebugOverlay] OTP Request failed:', error);
          return Promise.reject(error);
        }
      }

      return originalFetch(...args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const testAuth = async () => {
    setDiagLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/diag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      setDiagResult(result);
    } catch (error) {
      setDiagResult({
        ok: false,
        auth_header_seen: false,
        user_id_from_jwt: null,
        claims_present: false,
        now: new Date().toISOString(),
        error: String(error),
      });
    } finally {
      setDiagLoading(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
        >
          <Bug className="h-4 w-4 mr-1" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono text-yellow-800">
              🐛 Debug Overlay
            </CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs font-mono">
          {/* Auth Status */}
          <div>
            <strong>Auth State:</strong>
            <div className="mt-1 space-y-1">
              <div>authReady: <Badge variant={authReady ? "default" : "destructive"}>{String(authReady)}</Badge></div>
              <div>session.user.id: {session?.user?.id || 'null'}</div>
              <div>user.email: {user?.email || 'null'}</div>
              <div>pending_phone: {user?.user_metadata?.pending_phone_e164 || 'null'}</div>
            </div>
          </div>

          {/* User App Data */}
          <div>
            <strong>users_app:</strong>
            {userAppData ? (
              <div className="mt-1 space-y-1">
                <div>status: {userAppData.status}</div>
                <div>phone_e164: {userAppData.phone_e164 || 'empty'}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">Loading...</div>
            )}
          </div>

          {/* OTP Status */}
          {otpStatus && (
            <div>
              <strong>Last OTP Call:</strong>
              <div className="mt-1 space-y-1">
                <div>URL: {new URL(otpStatus.url).pathname}</div>
                <div>Status: <Badge variant={otpStatus.status === 200 ? "default" : "destructive"}>{otpStatus.status}</Badge></div>
                <div>Response: {JSON.stringify(otpStatus.response, null, 2)}</div>
                <div>Age: {Math.round((Date.now() - otpStatus.timestamp) / 1000)}s ago</div>
              </div>
            </div>
          )}

          {/* Diag Test */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <strong>Auth Test:</strong>
              <Button 
                onClick={testAuth} 
                size="sm" 
                disabled={diagLoading}
                className="h-6 text-xs"
              >
                {diagLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
              </Button>
            </div>
            {diagResult && (
              <div className="space-y-1">
                <div>Header seen: <Badge variant={diagResult.auth_header_seen ? "default" : "destructive"}>{String(diagResult.auth_header_seen)}</Badge></div>
                <div>Claims present: <Badge variant={diagResult.claims_present ? "default" : "destructive"}>{String(diagResult.claims_present)}</Badge></div>
                <div>JWT user_id: {diagResult.user_id_from_jwt || 'null'}</div>
                {diagResult.error && <div className="text-red-600">Error: {diagResult.error}</div>}
              </div>
            )}
          </div>

          {/* Debug Controls */}
          <div className="pt-2 border-t border-yellow-200">
            <div className="text-xs text-yellow-700">
              DEBUG_AUTH: {String(getDebugAuth())}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}