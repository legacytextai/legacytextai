import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useUserData } from './useUserData'
import { toast } from 'sonner'
import { useEffect } from 'react'

export interface JournalEntry {
  id: number
  user_id: string
  content: string
  received_at: string
  source?: string
  message_sid?: string
  name?: string
  category?: string
}

export const useJournalEntries = () => {
  const { user } = useAuth()
  const { userData, loading: userLoading } = useUserData()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['journal-entries', userData?.id],
    queryFn: async () => {
      if (!userData?.id) {
        console.log('❌ No userData.id available for journal entries query')
        return []
      }

      console.log('🔍 Fetching journal entries for user_id:', userData.id)
      console.log('🔍 User auth_user_id:', userData.auth_user_id)
      console.log('🔍 User email:', userData.email)

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userData.id)
        .order('received_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching journal entries:', error)
        throw error
      }

      console.log('✅ Journal entries found:', data?.length || 0)
      console.log('📋 Journal entries data:', data)

      return data || []
    },
    enabled: !!userData?.id && !userLoading,
    staleTime: 30000, // 30 seconds
    retry: 3,
  })

  // Set up real-time subscription for journal entries
  useEffect(() => {
    if (!userData?.id) return

    const channel = supabase
      .channel('journal-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries',
          filter: `user_id=eq.${userData.id}`
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          // Invalidate and refetch the entries
          queryClient.invalidateQueries({ queryKey: ['journal-entries', userData.id] })
          
          // Show toast for new entries
          if (payload.eventType === 'INSERT') {
            toast.success('New journal entry received!')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userData?.id, queryClient])

  return query
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