import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Download, Loader2, ShieldAlert } from 'lucide-react';

export default function AdminExport() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [range, setRange] = useState('all');
  const [dateEnd, setDateEnd] = useState('');
  const [filter, setFilter] = useState('');

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-legacy-accent" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const params: Record<string, string> = { range };
      if (dateEnd) params.date_end = dateEnd;
      if (filter) params.filter = filter;

      const queryString = new URLSearchParams(params).toString();
      
      const { data, error } = await supabase.functions.invoke('export-all-pdfs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error('Export error:', error);
        toast.error('Failed to export PDFs. Check console for details.');
        return;
      }

      if (data?.zipUrl) {
        toast.success(`Export complete! ${data.totalUsers} user PDFs created.`);
        
        // Download the ZIP file
        window.open(data.zipUrl, '_blank');
      } else {
        toast.error('Export completed but no download link received.');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('An unexpected error occurred during export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Admin: Export All PDFs
            </CardTitle>
            <CardDescription>
              Generate and download a ZIP file containing PDF exports for all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="range">Date Range</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger id="range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date (Optional)</Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-muted-foreground">
                Only include entries before this date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter">Filter by Email (Optional)</Label>
              <Input
                id="filter"
                type="email"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="user@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Export only for a specific user
              </p>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="w-full"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export All PDFs
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              <p className="font-semibold mb-2">Export Details:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Individual PDFs will be generated for each user</li>
                <li>All PDFs will be bundled into a single ZIP file</li>
                <li>The ZIP file will be available for download</li>
                <li>This may take several minutes for large exports</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
