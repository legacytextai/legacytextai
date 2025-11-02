import { useState } from 'react'
import { generateBasicPDF, downloadPDF, PDFGenerationOptions } from '@/lib/pdfGenerator'
import { toast } from 'sonner'

export const usePDFExport = () => {
  const [isGenerating, setIsGenerating] = useState(false)

  const exportPDF = async (options: PDFGenerationOptions) => {
    if (options.entries.length === 0) {
      toast.error('No journal entries found to export')
      return false
    }

    setIsGenerating(true)
    try {
      // Reverse entries to chronological order (oldest → newest) for PDF export
      const chronologicalEntries = [...options.entries].reverse()
      
      const pdfBlob = await generateBasicPDF({
        ...options,
        entries: chronologicalEntries
      })
      const filename = `legacy-journal-${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdfBlob, filename)
      
      toast.success('PDF downloaded successfully!')
      return true
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    exportPDF,
    isGenerating
  }
}