import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlastResult {
  success: boolean;
  sent: number;
  errors: number;
  totalUsers: number;
  details?: string[];
}

export default function AdminBlast() {
  const [message, setMessage] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [targetCount, setTargetCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<BlastResult | null>(null);

  const handlePreview = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-blast', {
        body: { message, dryRun: true }
      });

      if (error) throw error;

      setTargetCount(data.totalUsers);
      setShowConfirm(true);
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error.message || 'Failed to preview blast');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setShowConfirm(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-blast', {
        body: { message, dryRun: false }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.errors === 0) {
        toast.success(`Successfully sent to ${data.sent} users!`);
      } else {
        toast.warning(`Sent to ${data.sent} users with ${data.errors} errors`);
      }

      // Clear message after successful send
      setMessage('');
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send blast');
    } finally {
      setSending(false);
    }
  };

  const formattedMessage = message.trim() 
    ? `${message.trim()}\n\n(LegacyText Admin Message)\nReply STOP to unsubscribe.`
    : '';

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📢 Send SMS Blast</h1>
          <p className="text-muted-foreground">
            Send a manual message to all active users. This will not interfere with scheduled daily prompts.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Message Composer</CardTitle>
            <CardDescription>
              Write your message below. Keep it concise and meaningful.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{message.length}/160 characters</span>
                {message.length > 160 && (
                  <span className="text-amber-500">⚠️ Message exceeds SMS length</span>
                )}
              </div>
            </div>

            {formattedMessage && (
              <div className="space-y-2">
                <Label>Preview (with footer)</Label>
                <div className="p-4 bg-muted rounded-md border text-sm whitespace-pre-wrap">
                  {formattedMessage}
                </div>
              </div>
            )}

            <Button
              onClick={handlePreview}
              disabled={!message.trim() || previewing || sending}
              className="w-full"
            >
              {previewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Preview & Send
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.errors === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                Blast Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.sent}
                  </div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-md">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.errors}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.totalUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </div>

              {result.details && result.details.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Error Details:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm SMS Blast</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap text-foreground">
                  {formattedMessage}
                </div>
                <div className="font-medium">
                  This will be sent to <span className="text-primary font-bold">{targetCount}</span> active users.
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ This action cannot be undone. Users will receive this message immediately.
                  </AlertDescription>
                </Alert>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSend}
                disabled={sending}
                className="bg-primary"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Confirm & Send'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
