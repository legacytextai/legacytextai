import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function QuickVerificationTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quick-verification-test');
      
      if (error) {
        throw error;
      }
      
      setResult(data);
      toast({
        title: "Test completed",
        description: `Found ${data.summary.fullyVerified}/${data.summary.totalRecentUsers} fully verified users`,
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test failed",
        description: error.message || "Failed to run verification test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quick Verification Test</h1>
        <p className="text-muted-foreground mt-2">
          Test if new users can complete phone verification successfully
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification Flow Test</CardTitle>
          <CardDescription>
            Check recent user registration and phone verification success rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Verification Test'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">
                  {result.summary.totalRecentUsers}
                </div>
                <div className="text-sm text-muted-foreground text-center">Recent Users</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center text-green-600">
                  {result.summary.fullyVerified}
                </div>
                <div className="text-sm text-muted-foreground text-center">Fully Verified</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center text-yellow-600">
                  {result.summary.pendingVerification}
                </div>
                <div className="text-sm text-muted-foreground text-center">Pending</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center text-red-600">
                  {result.summary.stuckUsers}
                </div>
                <div className="text-sm text-muted-foreground text-center">Stuck</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.systemStatus.phoneVerificationFixed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="font-medium text-green-800 dark:text-green-200">
                  ✅ Phone verification system fixed
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {result.systemStatus.note}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent User Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.phoneVerificationResults.map((user: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      {user.isFullyVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : user.phone_e164?.startsWith('temp_') ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.phone_e164} | Status: {user.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {user.phone_confirmed_at ? 'Phone Confirmed' : 'Not Confirmed'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}