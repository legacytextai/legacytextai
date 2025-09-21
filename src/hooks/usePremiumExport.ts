import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useUserData } from '@/hooks/useUserData'
import { toast } from 'sonner'
import { THEME_KEY } from '@/lib/constants'

export interface ExportStatus {
  export_id: string | null
  status: 'idle' | 'formatting' | 'rendering' | 'ready' | 'error'
  url: string | null
  page_count: number | null
  progress: number
}

export const usePremiumExport = () => {
  const { user } = useAuth()
  const { userData } = useUserData()
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    export_id: null,
    status: 'idle',
    url: null,
    page_count: null,
    progress: 0
  })

  const startExport = async () => {
    if (!user?.id || !userData?.id) {
      toast.error('Authentication required')
      return false
    }

    try {
      setExportStatus({
        export_id: null,
        status: 'formatting',
        url: null,
        page_count: null,
        progress: 25
      })

      // Call build-ebook-manuscript function
      const { data: manuscriptResult, error: manuscriptError } = await supabase.functions
        .invoke('build-ebook-manuscript', {
          body: {
            user_id: userData.id,
            theme: THEME_KEY
          }
        })

      if (manuscriptError) {
        console.error('Manuscript generation error:', manuscriptError)
        throw new Error('Failed to build manuscript')
      }

      const exportId = manuscriptResult.export_id

      setExportStatus(prev => ({
        ...prev,
        export_id: exportId,
        status: 'rendering',
        progress: 50
      }))

      // If status is already ready (existing export), return immediately
      if (manuscriptResult.status === 'ready') {
        setExportStatus({
          export_id: exportId,
          status: 'ready',
          url: manuscriptResult.url,
          page_count: manuscriptResult.page_count,
          progress: 100
        })
        
        toast.success('PDF ready for download!')
        return true
      }

      // Call render-ebook-pdf-v2 function
      const { data: renderResult, error: renderError } = await supabase.functions
        .invoke('render-ebook-pdf-v2', {
          body: {
            export_id: exportId
          }
        })

      if (renderError) {
        console.error('PDF rendering error:', renderError)
        throw new Error('Failed to render PDF')
      }

      setExportStatus({
        export_id: exportId,
        status: 'ready',
        url: renderResult.url,
        page_count: renderResult.page_count,
        progress: 100
      })

      toast.success('Premium PDF generated successfully!')
      return true

    } catch (error: any) {
      console.error('Export error:', error)
      setExportStatus(prev => ({
        ...prev,
        status: 'error',
        progress: 0
      }))
      toast.error(error.message || 'Failed to generate PDF')
      return false
    }
  }

  const generatePreview = async () => {
    if (!user?.id || !userData?.id) {
      toast.error('Authentication required')
      return null
    }

    try {
      // Call build-ebook-manuscript function
      const { data: manuscriptResult, error: manuscriptError } = await supabase.functions
        .invoke('build-ebook-manuscript', {
          body: {
            user_id: userData.id,
            theme: THEME_KEY
          }
        })

      if (manuscriptError) {
        console.error('Manuscript generation error:', manuscriptError)
        throw new Error('Failed to build manuscript for preview')
      }

      // Call render-ebook-pdf-v2 function with preview flag
      const { data: pdfBlob, error: renderError } = await supabase.functions
        .invoke('render-ebook-pdf-v2', {
          body: {
            export_id: manuscriptResult.export_id,
            preview_only: true
          }
        })

      if (renderError) {
        console.error('PDF preview error:', renderError)
        throw new Error('Failed to generate preview')
      }

      return pdfBlob

    } catch (error: any) {
      console.error('Preview error:', error)
      toast.error(error.message || 'Failed to generate preview')
      return null
    }
  }

  const resetExport = () => {
    setExportStatus({
      export_id: null,
      status: 'idle',
      url: null,
      page_count: null,
      progress: 0
    })
  }

  return {
    exportStatus,
    startExport,
    generatePreview,
    resetExport
  }
}