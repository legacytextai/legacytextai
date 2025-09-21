import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, BookOpen, Printer, Check, FileText, ArrowRight, ArrowLeft, Eye, ExternalLink, Copy, Crown, Sparkles, X } from 'lucide-react';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useUserData } from '@/hooks/useUserData';
import { usePDFExport } from '@/hooks/usePDFExport';
import { usePremiumExport } from '@/hooks/usePremiumExport';
import { useDedication } from '@/hooks/useDedication';
import { toast } from 'sonner';
import { THEME_KEY } from '@/lib/constants';
interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dedication?: string;
}
type WizardStep = 'selection' | 'theme' | 'dedication' | 'preview' | 'generate' | 'complete';
export function ExportDialog({
  open,
  onOpenChange,
  dedication: propDedication
}: ExportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('selection');
  const [selectedTheme, setSelectedTheme] = useState('stillness');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const {
    data: entries = []
  } = useJournalEntries();
  const {
    userData
  } = useUserData();
  const {
    exportPDF
  } = usePDFExport();
  const {
    exportStatus,
    startExport,
    generatePreview,
    resetExport
  } = usePremiumExport();
  const {
    dedication,
    setDedication,
    saveDedication,
    loadDedication,
    isSaving
  } = useDedication();

  // Load dedication when dialog opens
  useEffect(() => {
    if (open) {
      loadDedication();
    }
  }, [open, loadDedication]);

  // Reset wizard when dialog closes
  useEffect(() => {
    if (!open) {
      setWizardStep('selection');
      resetExport();
      // Clean up preview
      setPreviewBlob(null);
      setShowPreviewModal(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [open, resetExport, previewUrl]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  const handleFreeExport = async () => {
    if (entries.length === 0) {
      toast.error('No journal entries found to export');
      return;
    }
    setIsGenerating(true);
    try {
      const userTitle = userData?.name ? `${userData.name}'s Legacy Journal` : "My Legacy Journal";
      await exportPDF({
        entries,
        dedication: userData?.dedication,
        userTitle,
        includeDedication: true
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  const handlePremiumExportStart = () => {
    setWizardStep('theme');
  };
  const handlePhysicalOrder = () => {
    toast.info('Physical journal ordering coming soon!');
  };
  const handleNextStep = () => {
    switch (wizardStep) {
      case 'theme':
        setWizardStep('dedication');
        break;
      case 'dedication':
        setWizardStep('preview');
        break;
      case 'preview':
        setWizardStep('generate');
        break;
      default:
        break;
    }
  };
  const handlePrevStep = () => {
    switch (wizardStep) {
      case 'dedication':
        setWizardStep('theme');
        break;
      case 'preview':
        setWizardStep('dedication');
        break;
      case 'generate':
        setWizardStep('preview');
        break;
      default:
        setWizardStep('selection');
        break;
    }
  };
  const handleSaveDedication = async () => {
    await saveDedication(dedication);
  };
  const handleGeneratePDF = async () => {
    const success = await startExport();
    if (success) {
      setWizardStep('complete');
    }
  };
  const handleCopyLink = async () => {
    if (exportStatus.url) {
      await navigator.clipboard.writeText(exportStatus.url);
      toast.success('Download link copied to clipboard!');
    }
  };
  const handleGeneratePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const blob = await generatePreview();
      if (blob) {
        setPreviewBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
      toast.error('Failed to generate preview. Please try again.');
    } finally {
      setIsPreviewLoading(false);
    }
  };
  const downloadFromBlob = async (signedUrl: string, filename: string) => {
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };
  const handleDownloadPDF = () => {
    if (exportStatus.url) {
      const filename = `legacy-journal-premium-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadFromBlob(exportStatus.url, filename);
    }
  };
  const renderSelectionStep = () => <div className="grid md:grid-cols-3 gap-6 mt-6">
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
            <li>• Custom dedication page</li>
            <li>• Chronological order</li>
            <li>• Simple formatting</li>
          </ul>
          <Button onClick={handleFreeExport} className="w-full" disabled={isGenerating || entries.length === 0}>
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
            Premium E-Book PDF
          </CardTitle>
          <CardDescription>Elegant minimal theme with enhanced design</CardDescription>
          <div>
            <div className="text-2xl font-bold text-primary line-through">$9.99</div>
            <p className="text-lg font-semibold text-accent">Free for Early Access Users</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm space-y-1">
            <li>• 6×9" premium formatting</li>
            <li>• Elegant theme + typography </li>
            <li>• Category organization</li>
            <li>• One entry per page</li>
            <li>• Running headers & footers</li>
            <li>• Professional layout</li>
          </ul>
          <Button onClick={handlePremiumExportStart} variant="outline" className="w-full" disabled={entries.length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Premium E-Book
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
          
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm space-y-1">
            <li>• Premium leather binding</li>
            <li>• Gold foil embossing</li>
            <li>• Archival quality paper</li>
            <li>• Custom dedication</li>
            <li>• Gift-ready presentation</li>
          </ul>
          <Button onClick={handlePhysicalOrder} variant="outline" className="w-full" disabled>
            <BookOpen className="h-4 w-4 mr-2" />
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    </div>;
  const renderThemeStep = () => <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Choose Your Theme</h3>
        <p className="text-muted-foreground">Select the design theme for your premium journal</p>
      </div>
      
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Minimal Theme
          </CardTitle>
          <CardDescription>
            Minimalist design focused on readability and elegance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            <li>• Clean serif typography (EB Garamond)</li>
            <li>• Generous whitespace</li>
            <li>• 6×9" professional format</li>
            <li>• Subtle ornamental elements</li>
            <li>• One entry per page</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevStep}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>;
  const renderDedicationStep = () => <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Personal Dedication</h3>
        <p className="text-muted-foreground">Add a heartfelt message to open your journal</p>
      </div>

      <div className="space-y-4">
        <Label htmlFor="dedication">Dedication Message</Label>
        <Textarea id="dedication" placeholder="To my beloved children, may these words guide you through life's journey..." value={dedication} onChange={e => setDedication(e.target.value)} rows={6} className="resize-none" />
        <Button onClick={handleSaveDedication} variant="outline" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Dedication'}
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevStep}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep}>
          Preview
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>;
  const renderPreviewStep = () => <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Preview Your Journal</h3>
        <p className="text-muted-foreground">Here's how your journal will look</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h4 className="font-semibold mb-2">
              {userData?.name ? `${userData.name}'s Legacy Journal` : 'My Legacy Journal'}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {entries.length} entries • {THEME_KEY} theme
            </p>
            <Button variant="outline" onClick={handleGeneratePreview} disabled={isPreviewLoading}>
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewLoading ? 'Generating...' : 'Generate Preview Pages'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreviewModal && previewUrl && <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                PDF Preview
                <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-[60vh]">
              <iframe src={previewUrl} className="w-full h-full border rounded-lg" title="PDF Preview" />
            </div>
          </DialogContent>
        </Dialog>}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevStep}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep}>
          Generate PDF
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>;
  const renderGenerateStep = () => <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Generating Your Premium Journal</h3>
        <p className="text-muted-foreground">Please wait while we create your beautiful PDF</p>
      </div>

      <div className="space-y-4">
        <Progress value={exportStatus.progress} className="w-full" />
        <div className="text-center text-sm text-muted-foreground">
          {exportStatus.status === 'formatting' && 'Preparing manuscript...'}
          {exportStatus.status === 'rendering' && `Rendering PDF with ${THEME_KEY} theme...`}
          {exportStatus.status === 'ready' && 'Complete!'}
          {exportStatus.status === 'error' && 'Error occurred'}
        </div>
      </div>

      {exportStatus.status === 'idle' && <div className="text-center">
          <Button onClick={handleGeneratePDF} size="lg">
            <Sparkles className="h-5 w-5 mr-2" />
            Start Generation
          </Button>
        </div>}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevStep} disabled={exportStatus.status !== 'idle'}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>;
  const renderCompleteStep = () => <div className="space-y-6">
      <div className="text-center">
        <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-semibold mb-2">Your Premium Journal is Ready!</h3>
        <p className="text-muted-foreground">
          {exportStatus.page_count} pages • {THEME_KEY} theme • Professional formatting
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} className="flex-1" disabled={!exportStatus.url}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Download link expires in 24 hours
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </div>;
  const renderWizardContent = () => {
    switch (wizardStep) {
      case 'selection':
        return renderSelectionStep();
      case 'theme':
        return renderThemeStep();
      case 'dedication':
        return renderDedicationStep();
      case 'preview':
        return renderPreviewStep();
      case 'generate':
        return renderGenerateStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderSelectionStep();
    }
  };
  const getDialogTitle = () => {
    switch (wizardStep) {
      case 'selection':
        return 'Export Your Legacy Journal';
      case 'theme':
        return 'Premium Export - Theme Selection';
      case 'dedication':
        return 'Premium Export - Dedication';
      case 'preview':
        return 'Premium Export - Preview';
      case 'generate':
        return 'Premium Export - Generation';
      case 'complete':
        return 'Premium Export - Complete';
      default:
        return 'Export Your Legacy Journal';
    }
  };
  const getDialogDescription = () => {
    if (wizardStep === 'selection') {
      return 'Choose how you\'d like to preserve your memories and wisdom for future generations.';
    }
    return 'Create a beautifully formatted premium journal with professional design.';
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {renderWizardContent()}

        {wizardStep === 'selection' && entries.length === 0 && <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No journal entries found. Start writing to create your legacy journal!</p>
          </div>}
      </DialogContent>
    </Dialog>;
}