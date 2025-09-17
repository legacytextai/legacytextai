import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function FixUser() {
  const [loading, setLoading] = useState(false);

  const createMissingUser = async () => {
    setLoading(true);
    try {
      console.log('Calling create-missing-user function...');
      
      const { data, error } = await supabase.functions.invoke('create-missing-user', {
        body: {
          auth_user_id: '25139c2e-d660-4252-9655-fc29ae79f0bc',
          email: 'tsaidi05@hotmail.com'
        }
      });

      if (error) {
        console.error('Error:', error);
        toast.error(`Error: ${error.message}`);
        return;
      }

      console.log('Success:', data);
      toast.success('User record created successfully!');
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Fix Missing User Record</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Create missing users_app record for user: tsaidi05@hotmail.com
          </p>
          <Button 
            onClick={createMissingUser} 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Missing User Record'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}