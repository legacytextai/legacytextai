import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useUserData } from './useUserData'
import { toast } from 'sonner'

export interface JournalEntry {
  id: number
  user_id: string
  content: string
  received_at: string
  phone_e164: string
  source?: string
  message_sid?: string
  name?: string
}

export const useJournalEntries = () => {
  const { user } = useAuth()
  const { userData } = useUserData()

  return useQuery({
    queryKey: ['journal-entries', userData?.id],
    queryFn: async () => {
      if (!userData?.id) {
        return []
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userData.id)
        .order('received_at', { ascending: false })

      if (error) {
        console.error('Error fetching journal entries:', error)
        throw error
      }

      return data || []
    },
    enabled: !!userData?.id,
  })
}

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient()
  const { userData } = useUserData()

  return useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({ content })
        .eq('id', id)
        .eq('user_id', userData?.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Entry updated successfully')
    },
    onError: (error) => {
      console.error('Error updating entry:', error)
      toast.error('Failed to update entry')
    },
  })
}

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient()
  const { userData } = useUserData()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userData?.id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Entry deleted successfully')
    },
    onError: (error) => {
      console.error('Error deleting entry:', error)
      toast.error('Failed to delete entry')
    },
  })
}

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient()
  const { userData } = useUserData()

  return useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userData?.id,
          content,
          phone_e164: userData?.phone_e164 || '',
          source: 'manual',
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Entry created successfully')
    },
    onError: (error) => {
      console.error('Error creating entry:', error)
      toast.error('Failed to create entry')
    },
  })
}