import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Download, Star } from "lucide-react";
import { useDedication } from "@/hooks/useDedication";
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
export default function Journal() {
  const navigate = useNavigate();
  const {
    dedication,
    setDedication,
    loadDedication,
    saveDedication,
    isLoading,
    isSaving
  } = useDedication();
  useEffect(() => {
    loadDedication();
  }, [loadDedication]);
  const handleDedicationChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDedication(e.target.value);
  }, [setDedication]);
  const handleSaveDedication = useCallback(async () => {
    await saveDedication(dedication);
  }, [saveDedication, dedication]);
  const handleExportClick = useCallback(() => {
    navigate('/export');
  }, [navigate]);
  return <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-legacy-primary flex items-center gap-3">
              <BookOpen className="w-8 h-8" />
              View / Export
            </h1>
            <p className="text-legacy-ink/70 mt-1">Preview your legacy journal and export options</p>
          </div>
          <Button variant="accent" onClick={handleExportClick}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Journal Preview */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-legacy-primary">Journal Preview</h2>
            
            <Card className="shadow-deep max-w-sm mx-auto lg:mx-0">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Cover */}
                  <div className="w-32 h-40 bg-legacy-primary/10 border-2 border-legacy-border rounded-lg mx-auto flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-legacy-primary/5 to-legacy-accent/5"></div>
                    <div className="relative z-10 text-center">
                      <div className="w-8 h-8 border-2 border-legacy-primary/30 rounded-full mb-2 mx-auto"></div>
                      <h3 className="font-bold text-legacy-primary text-sm">John Doe's</h3>
                      <p className="text-xs text-legacy-ink/70">Legacy Journal</p>
                    </div>
                  </div>

                  {/* Dedication Section */}
                  <div className="w-32 h-20 bg-legacy-warm border border-legacy-border rounded mx-auto p-3">
                    <h4 className="text-xs font-semibold text-legacy-primary mb-1 border-b border-legacy-border/50 pb-1">
                      Dedication
                    </h4>
                    <p className="text-[8px] text-legacy-ink/60 leading-tight">
                      {dedication || "This journal is dedicated to my loving wife, Jane Doe, and to amazing children, Matt Doe and Alex Doe."}
                    </p>
                  </div>

                  {/* Introduction Section */}
                  <div className="w-32 h-20 bg-legacy-warm border border-legacy-border rounded mx-auto p-3">
                    <h4 className="text-xs font-semibold text-legacy-primary mb-1 border-b border-legacy-border/50 pb-1">
                      Introduction
                    </h4>
                    <p className="text-[8px] text-legacy-ink/60 leading-tight">
                      As you read this, I hope these words will guide you through life's journey...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Dedication Page Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-legacy-primary">Dedication Page</h2>
              
              <Card className="shadow-paper">
                <CardContent className="p-6 space-y-4">
                  <p className="text-legacy-ink/70 text-sm">
                    Write a few sentences about who you'd like to dedicate your Legacy Journal to.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dedication" className="text-sm font-medium text-legacy-primary">
                      Your Dedication
                    </Label>
                    <Textarea id="dedication" value={dedication} onChange={handleDedicationChange} placeholder="To my loving wife and children..." className="min-h-[120px] resize-none bg-legacy-warm/50 border-legacy-border focus:border-legacy-primary" disabled={isLoading} />
                    {isSaving && <p className="text-xs text-legacy-ink/50">Saving...</p>}
                  </div>
                  
                  <Button onClick={handleSaveDedication} disabled={isSaving || isLoading} className="w-full">
                    {isSaving ? 'Saving...' : 'Save Dedication'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-legacy-primary">Export Options</h2>
            
            <div className="space-y-4">
              {/* Premium Export */}
              <Card className="shadow-warm border-legacy-accent/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-accent text-white px-3 py-1 text-xs font-medium">
                  Recommended
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-legacy-primary flex items-center gap-2">
                    <Star className="w-5 h-5 text-legacy-accent" />
                    Premium Export - $9.99
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-legacy-ink/70">
                    Beautifully formatted legacy journal with professional layout, photos, and premium typography.
                  </p>
                  <ul className="text-sm text-legacy-ink/70 space-y-1">
                    <li>• Professional book design</li>
                    
                    <li>• Custom dedication page</li>
                    <li>• Category organization</li>
                  </ul>
                  <Button variant="accent" className="w-full" onClick={handleExportClick}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Premium Journal
                  </Button>
                </CardContent>
              </Card>

              {/* Free Export */}
              <Card className="shadow-paper">
                <CardHeader className="pb-3">
                  <CardTitle className="text-legacy-primary flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Free Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-legacy-ink/70">
                    Basic PDF export with all your journal entries in chronological order.
                  </p>
                  <ul className="text-sm text-legacy-ink/70 space-y-1">
                    <li>• Text-only entries</li>
                    <li>• Basic formatting</li>
                    <li>• Chronological order</li>
                  </ul>
                  <Button variant="outline" className="w-full" onClick={handleExportClick}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Free PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Physical Journal */}
              <Card className="shadow-paper">
                <CardHeader className="pb-3">
                  <CardTitle className="text-legacy-primary flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Physical Journal - $199
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-legacy-ink/70">
                    Heirloom-quality leatherbound journal shipped to your door.
                  </p>
                  <ul className="text-sm text-legacy-ink/70 space-y-1">
                    <li>• Premium leather binding</li>
                    <li>• Archival quality paper</li>
                    <li>• Gold embossed personalization</li>
                  </ul>
                  <Button variant="warm" className="w-full" onClick={handleExportClick}>
                    Order Physical Journal
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>;
}