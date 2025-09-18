import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export const useDedication = () => {
  const { user } = useAuth()
  const [dedication, setDedication] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadDedication = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users_app')
        .select('dedication')
        .eq('auth_user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading dedication:', error)
        return
      }

      if (data?.dedication) {
        setDedication(data.dedication)
      }
    } catch (error) {
      console.error('Error loading dedication:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const saveDedication = useCallback(async (text: string) => {
    if (!user?.id) return false

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users_app')
        .update({ dedication: text })
        .eq('auth_user_id', user.id)

      if (error) {
        console.error('Error saving dedication:', error)
        toast.error('Failed to save dedication')
        return false
      }

      setDedication(text)
      return true
    } catch (error) {
      console.error('Error saving dedication:', error)
      toast.error('Failed to save dedication')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [user?.id])

  return {
    dedication,
    setDedication,
    loadDedication,
    saveDedication,
    isLoading,
    isSaving
  }
}