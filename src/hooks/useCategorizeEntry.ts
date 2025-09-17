import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CategorizeEntryRequest {
  entryId: number;
  content: string;
  batchMode?: boolean;
}

interface CategorizeEntryResponse {
  success: boolean;
  category?: string;
  entryId?: number;
  error?: string;
}

export const useCategorizeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, content, batchMode = false }: CategorizeEntryRequest): Promise<CategorizeEntryResponse> => {
      const { data, error } = await supabase.functions.invoke('categorize-journal-entry', {
        body: { entryId, content, batchMode }
      });

      if (error) {
        throw new Error(error.message || 'Failed to categorize entry');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch journal entries
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      if (!data.success) {
        toast.error('Failed to categorize entry');
      } else {
        toast.success(`Entry categorized as "${data.category}"`);
      }
    },
    onError: (error) => {
      console.error('Error categorizing entry:', error);
      toast.error('Failed to categorize entry');
    },
  });
};

export const useBatchCategorizeEntries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: Array<{ id: number; content: string }>) => {
      const results = await Promise.allSettled(
        entries.map(entry => 
          supabase.functions.invoke('categorize-journal-entry', {
            body: { entryId: entry.id, content: entry.content, batchMode: true }
          })
        )
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: entries.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(`Categorized ${result.successful} of ${result.total} entries`);
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} entries failed to categorize`);
      }
    },
    onError: (error) => {
      console.error('Error in batch categorization:', error);
      toast.error('Failed to categorize entries');
    },
  });
};