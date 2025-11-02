import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ParsedPrompt {
  text: string;
  hash: string;
}

interface ParsedResult {
  success: boolean;
  total: number;
  new: number;
  duplicates: number;
  newPrompts: ParsedPrompt[];
  duplicatePrompts: ParsedPrompt[];
  inserted?: number;
  error?: string;
}

const AdminPrompts = () => {
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    setParsing(true);
    setParsed(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-handwritten-prompts', {
        body: { rawText, dryRun: true }
      });

      if (error) throw error;

      if (data.success) {
        setParsed(data);
        toast.success(`Parsed ${data.total} prompts (${data.new} new, ${data.duplicates} duplicates)`);
      } else {
        throw new Error(data.error || 'Failed to parse prompts');
      }
    } catch (error: any) {
      console.error('Error parsing prompts:', error);
      toast.error(`Failed to parse: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSync = async () => {
    if (!parsed || parsed.new === 0) {
      toast.error('No new prompts to sync');
      return;
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-handwritten-prompts', {
        body: { rawText, dryRun: false }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Successfully synced ${data.inserted} new prompts to database!`);
        
        // Reset form
        setRawText('');
        setParsed(null);
      } else {
        throw new Error(data.error || 'Failed to sync prompts');
      }
    } catch (error: any) {
      console.error('Error syncing prompts:', error);
      toast.error(`Failed to sync: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🖊️ Manage Handwritten Prompts</h1>
          <p className="text-muted-foreground">
            Paste your iPhone Notes containing journal prompts. The system will parse, deduplicate,
            and sync new prompts to the database.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Paste iPhone Notes</CardTitle>
            <CardDescription>
              Paste the full contents of your Notes. Each blank line separates a new prompt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your prompts here (blank line separated)..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleParse} 
                disabled={!rawText.trim() || parsing}
                className="flex-1"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse & Preview
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {parsed && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Parse Results</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-base">
                    Total: {parsed.total}
                  </Badge>
                  <Badge variant="default" className="text-base bg-green-600">
                    New: {parsed.new}
                  </Badge>
                  <Badge variant="secondary" className="text-base">
                    Duplicates: {parsed.duplicates}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsed.new > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">New Prompts ({parsed.new})</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-2">
                      {parsed.newPrompts.map((prompt, idx) => (
                        <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                            {idx + 1}.
                          </div>
                          <div className="text-sm">{prompt.text}</div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {parsed.duplicates > 0 && (
                  <>
                    <Separator />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold">Duplicates Skipped ({parsed.duplicates})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4 space-y-2">
                        {parsed.duplicatePrompts.map((prompt, idx) => (
                          <div key={idx} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                            <div className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                              Already exists
                            </div>
                            <div className="text-sm opacity-70">{prompt.text}</div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {parsed.new > 0 && (
                  <>
                    <Separator />
                    <Button 
                      onClick={handleSync} 
                      disabled={syncing}
                      className="w-full"
                      size="lg"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Syncing to Database...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Sync {parsed.new} New Prompt{parsed.new !== 1 ? 's' : ''} to Database
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminPrompts;
