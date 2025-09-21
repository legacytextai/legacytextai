import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, BookOpen, Crown } from 'lucide-react'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { useUserData } from '@/hooks/useUserData'
import { generateBasicPDF, downloadPDF } from '@/lib/pdfGenerator'
import { toast } from 'sonner'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dedication?: string
}

export function ExportDialog({ open, onOpenChange, dedication }: ExportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { data: entries = [] } = useJournalEntries()
  const { userData } = useUserData()

  const handleFreeExport = async () => {
    if (entries.length === 0) {
      toast.error('No journal entries found to export')
      return
    }

    setIsGenerating(true)
    try {
      const userTitle = userData?.name ? `${userData.name}'s Legacy Journal` : "My Legacy Journal"
      
      const pdfBlob = await generateBasicPDF({
        entries,
        userTitle,
        includeDedication: false // Free export doesn't include dedication
      })
      
      const filename = `legacy-journal-${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdfBlob, filename)
      
      toast.success('PDF downloaded successfully!')
      onOpenChange(false)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePremiumExport = async () => {
    if (entries.length === 0) {
      toast.error('No journal entries found to export')
      return
    }

    setIsGenerating(true)
    try {
      const userTitle = userData?.name ? `${userData.name}'s Legacy Journal` : "My Legacy Journal"
      
      const pdfBlob = await generateBasicPDF({
        entries,
        dedication: userData?.dedication,
        userTitle,
        includeDedication: true // Premium export includes dedication
      })
      
      const filename = `legacy-journal-premium-${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdfBlob, filename)
      
      toast.success('Premium PDF downloaded successfully!')
      onOpenChange(false)
    } catch (error) {
      console.error('Error generating premium PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePhysicalOrder = () => {
    toast.info('Physical journal ordering coming soon!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Your Legacy Journal</DialogTitle>
          <DialogDescription>
            Choose how you'd like to preserve your memories and wisdom for future generations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Free Basic PDF */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic PDF
              </CardTitle>
              <CardDescription>
                Simple, clean format perfect for sharing
              </CardDescription>
              <div className="text-2xl font-bold text-primary">Free</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm space-y-1">
                <li>• All your journal entries</li>
                <li>• Chronological order</li>
                <li>• Simple formatting</li>
              </ul>
              <Button 
                onClick={handleFreeExport} 
                className="w-full"
                disabled={isGenerating || entries.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Formatted PDF */}
          <Card className="relative border-primary">
            <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
              Recommended
            </Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Formatted Legacy Journal
              </CardTitle>
              <CardDescription>
                Professional design with enhanced features
              </CardDescription>
              <div className="text-2xl font-bold text-primary">$1.99</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm space-y-1">
                <li>• Everything in Basic PDF</li>
                <li>• Professional formatting</li>
                <li>• Category organization</li>
                <li>• Enhanced typography</li>
                <li>• Custom dedication page</li>
                <li>• Custom cover design</li>
              </ul>
              <Button 
                onClick={handlePremiumExport} 
                variant="outline" 
                className="w-full"
                disabled={isGenerating || entries.length === 0}
              >
                <Crown className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Get Premium PDF'}
              </Button>
            </CardContent>
          </Card>

          {/* Physical Journal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Leatherbound Journal
              </CardTitle>
              <CardDescription>
                Heirloom-quality physical book
              </CardDescription>
              <div className="text-2xl font-bold text-primary">$199</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm space-y-1">
                <li>• Premium leather binding</li>
                <li>• Gold foil embossing</li>
                <li>• Archival quality paper</li>
                <li>• Custom dedication</li>
                <li>• Gift-ready presentation</li>
              </ul>
              <Button 
                disabled 
                className="w-full bg-muted text-muted-foreground cursor-not-allowed"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No journal entries found. Start writing to create your legacy journal!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}