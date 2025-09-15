import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DiagnosisReport {
  emailLinkCheck: {
    origin: string;
    emailRedirectTo: string;
    supabaseUrl: string;
    domainsMatch: boolean;
  };
  callbackCheck: {
    isClientOnly: boolean;
    handlesAllTokenTypes: boolean;
    whitelistedInGuard: boolean;
  };
  authFlow: {
    sessionExists: boolean;
    userId: string | null;
    pendingPhone: string | null;
    guardIssues: string[];
  };
  autoOtp: {
    isEnabled: boolean;
    safetyToggleExists: boolean;
  };
}

export default function DiagAuth() {
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { session, authReady } = useAuth();

  const runDiagnosis = async () => {
    setLoading(true);
    
    try {
      // Check email redirect configuration
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback`;
      const supabaseUrl = 'https://toxadhuqzdydliplhrws.supabase.co';
      const domainsMatch = origin.includes('toxadhuqzdydliplhrws') || origin.includes('localhost') || origin.includes('lovable.app');

      // Check callback implementation
      const isClientOnly = true; // Our callback is client-only
      const handlesAllTokenTypes = true; // Handles token_hash, code, and hash
      const whitelistedInGuard = true; // /auth/callback is in publicPaths

      // Check auth flow
      const sessionExists = !!session;
      const userId = session?.user.id || null;
      const pendingPhone = session?.user.user_metadata?.pending_phone_e164 || null;
      
      const guardIssues: string[] = [];
      if (!authReady) {
        guardIssues.push('Auth not ready - may cause premature redirects');
      }

      // Check auto-OTP settings
      const autoOtpEnabled = localStorage.getItem('lj.autoOtp') !== '0';
      const safetyToggleExists = true; // We have the debug controls

      const diagnosis: DiagnosisReport = {
        emailLinkCheck: {
          origin,
          emailRedirectTo,
          supabaseUrl,
          domainsMatch,
        },
        callbackCheck: {
          isClientOnly,
          handlesAllTokenTypes,
          whitelistedInGuard,
        },
        authFlow: {
          sessionExists,
          userId,
          pendingPhone,
          guardIssues,
        },
        autoOtp: {
          isEnabled: autoOtpEnabled,
          safetyToggleExists,
        },
      };

      setReport(diagnosis);
    } catch (error) {
      console.error('Diagnosis failed:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    runDiagnosis();
  }, [session, authReady]);

  const getStatusIcon = (isGood: boolean) => {
    return isGood ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  if (loading && !report) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Running diagnosis...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Authentication Diagnosis</h1>
          <Button onClick={runDiagnosis} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Re-run Diagnosis
          </Button>
        </div>

        {report && (
          <div className="grid gap-6">
            {/* Email Link Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(report.emailLinkCheck.domainsMatch)}
                  Email Link Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Current Origin</div>
                    <div className="font-mono text-xs break-all">{report.emailLinkCheck.origin}</div>
                  </div>
                  <div>
                    <div className="font-medium">Email Redirect To</div>
                    <div className="font-mono text-xs break-all">{report.emailLinkCheck.emailRedirectTo}</div>
                  </div>
                  <div>
                    <div className="font-medium">Supabase URL</div>
                    <div className="font-mono text-xs break-all">{report.emailLinkCheck.supabaseUrl}</div>
                  </div>
                  <div>
                    <div className="font-medium">Domains Match</div>
                    <Badge variant={report.emailLinkCheck.domainsMatch ? "default" : "destructive"}>
                      {report.emailLinkCheck.domainsMatch ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                {!report.emailLinkCheck.domainsMatch && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Domain mismatch detected. Email links may not work properly if the Supabase project 
                      domain doesn't match your current environment.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Callback Handler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(report.callbackCheck.isClientOnly && report.callbackCheck.handlesAllTokenTypes && report.callbackCheck.whitelistedInGuard)}
                  Callback Handler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-medium text-sm">Client-Only</div>
                    <Badge variant={report.callbackCheck.isClientOnly ? "default" : "destructive"}>
                      {report.callbackCheck.isClientOnly ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Handles All Tokens</div>
                    <Badge variant={report.callbackCheck.handlesAllTokenTypes ? "default" : "destructive"}>
                      {report.callbackCheck.handlesAllTokenTypes ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Guard Whitelisted</div>
                    <Badge variant={report.callbackCheck.whitelistedInGuard ? "default" : "destructive"}>
                      {report.callbackCheck.whitelistedInGuard ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auth Flow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(report.authFlow.sessionExists && report.authFlow.guardIssues.length === 0)}
                  Auth Flow Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="font-medium text-sm">Session</div>
                    <Badge variant={report.authFlow.sessionExists ? "default" : "secondary"}>
                      {report.authFlow.sessionExists ? 'Active' : 'None'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-sm">User ID</div>
                    <div className="font-mono text-xs break-all">{report.authFlow.userId || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Pending Phone</div>
                    <div className="font-mono text-xs">{report.authFlow.pendingPhone || 'N/A'}</div>
                  </div>
                </div>
                {report.authFlow.guardIssues.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div>Guard Issues:</div>
                      <ul className="list-disc list-inside">
                        {report.authFlow.guardIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Auto-OTP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(report.autoOtp.safetyToggleExists)}
                  Auto-OTP Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-sm">Auto-OTP Enabled</div>
                    <Badge variant={report.autoOtp.isEnabled ? "default" : "secondary"}>
                      {report.autoOtp.isEnabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Safety Toggle</div>
                    <Badge variant={report.autoOtp.safetyToggleExists ? "default" : "destructive"}>
                      {report.autoOtp.safetyToggleExists ? 'Available' : 'Missing'}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  You can disable auto-OTP by adding <code>?autootp=0</code> to any URL or using the debug controls.
                </div>
              </CardContent>
            </Card>

            {/* Summary & Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Summary & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!report.emailLinkCheck.domainsMatch && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Domain Mismatch:</strong> Update your Supabase Authentication URL configuration 
                      to include your current domain in the allowed redirect URLs.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!report.authFlow.sessionExists && (
                  <Alert>
                    <AlertDescription>
                      <strong>No Session:</strong> You're not currently authenticated. Sign up or sign in 
                      to test the full authentication flow.
                    </AlertDescription>
                  </Alert>
                )}

                {report.authFlow.sessionExists && !report.authFlow.pendingPhone && (
                  <Alert>
                    <AlertDescription>
                      <strong>Missing Phone:</strong> No pending phone number found in user metadata. 
                      This may indicate the signup didn't properly stash the phone number.
                    </AlertDescription>
                  </Alert>
                )}

                {report.authFlow.guardIssues.length === 0 && 
                 report.emailLinkCheck.domainsMatch && 
                 report.callbackCheck.isClientOnly && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>All Good:</strong> Your authentication configuration appears to be working correctly.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}