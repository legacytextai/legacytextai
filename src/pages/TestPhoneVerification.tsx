import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  timestamp: string;
  tests: {
    stuckUsers: { count: number; users: any[] };
    recentOtps: { count: number; codes: any[] };
    recovery: { attempted: number; successful: number; results: any[] };
    cleanup: { expiredOtpsRemoved: number };
  };
  recommendations: string[];
}

export default function TestPhoneVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const runTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-phone-verification');
      
      if (error) {
        throw error;
      }
      
      setResult(data);
      toast({
        title: "Test completed",
        description: "Phone verification system test completed successfully",
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test failed",
        description: error.message || "Failed to run phone verification test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Phone Verification Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the phone verification system for issues and stuck users
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Test</CardTitle>
          <CardDescription>
            Run comprehensive tests on the phone verification system
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
                Running tests...
              </>
            ) : (
              'Run Phone Verification Test'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Test Results
              </CardTitle>
              <CardDescription>
                Test completed at {new Date(result.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {result.tests.stuckUsers.count}
                  </div>
                  <div className="text-sm text-muted-foreground">Stuck Users</div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {result.tests.recentOtps.count}
                  </div>
                  <div className="text-sm text-muted-foreground">Recent OTPs</div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {result.tests.recovery.successful}/{result.tests.recovery.attempted}
                  </div>
                  <div className="text-sm text-muted-foreground">Recoveries</div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {result.tests.cleanup.expiredOtpsRemoved}
                  </div>
                  <div className="text-sm text-muted-foreground">Cleaned OTPs</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.tests.stuckUsers.count > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Stuck Users Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.tests.stuckUsers.users.map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Status: {user.status} | Phone: {user.phone_e164}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.tests.recovery.attempted > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recovery Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.tests.recovery.results.map((recovery, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        {recovery.recovered ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>{recovery.email}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {recovery.recovered ? 'Recovered' : `Failed: ${recovery.error}`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}