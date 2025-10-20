import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Download, Star } from "lucide-react";
import { useDedication } from "@/hooks/useDedication";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserData } from "@/hooks/useUserData";
import { EntryCard } from "@/components/EntryCard";
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
  
  const { userData } = useUserData();
  const { data: entries = [] } = useJournalEntries();
  
  // Sort entries chronologically (oldest first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.received_at || '').getTime() - new Date(b.received_at || '').getTime()
  );
  useEffect(() => {
    loadDedication();
  }, [loadDedication]);
  const handleDedicationChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDedication(e.target.value);
  }, [setDedication]);
  const handleSaveDedication = useCallback(async () => {
    console.log('Save button clicked, dedication value:', dedication)
    const success = await saveDedication(dedication);
    console.log('Save result:', success)
  }, [saveDedication, dedication]);
  const handleExportClick = useCallback(() => {
    navigate('/export');
  }, [navigate]);
  return <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center gap-3">
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
            <h2 className="text-xl font-semibold text-black">Journal Preview</h2>
            
            <Card className="shadow-deep max-w-2xl mx-auto">
              <CardContent className="p-0">
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-6 p-6">
                    {/* Journal Title */}
                    <div className="text-center border-b border-legacy-border pb-4">
                      <h1 className="text-2xl font-bold text-black">
                        {userData?.name || 'My'}'s Legacy Journal
                      </h1>
                    </div>
                    
                    {/* Dedication */}
                    {dedication && (
                      <Card className="shadow-warm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-black text-center">
                            Dedication
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-legacy-ink/80 text-center italic leading-relaxed">
                            {dedication}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Journal Entries */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-black text-center border-b border-legacy-border pb-2">
                        Journal Entries
                      </h2>
                      {sortedEntries.length > 0 ? (
                        sortedEntries.map((entry) => (
                          <EntryCard 
                            key={entry.id} 
                            entry={entry} 
                            enableInlineEdit={false}
                            className="shadow-paper"
                          />
                        ))
                      ) : (
                        <Card className="shadow-paper">
                          <CardContent className="p-6 text-center">
                            <p className="text-legacy-ink/60">
                              No journal entries yet. Start by sending your first text message!
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Dedication Page Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-black">Dedication Page</h2>
              
              <Card className="shadow-paper">
                <CardContent className="p-6 space-y-4">
                  <p className="text-legacy-ink/70 text-sm">
                    Write a few sentences about who you'd like to dedicate your Legacy Journal to.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dedication" className="text-sm font-medium text-black">
                      Your Dedication
                    </Label>
                    <Textarea id="dedication" value={dedication} onChange={handleDedicationChange} placeholder="To my loving wife and children..." className="min-h-[120px] resize-none bg-legacy-warm/50 border-legacy-border focus:border-legacy-primary" disabled={isLoading} />
                    {isSaving && <p className="text-xs text-legacy-ink/50">Saving...</p>}
                  </div>
                  
                  <Button onClick={handleSaveDedication} disabled={isSaving || isLoading} className="w-full bg-black hover:bg-black/90 text-white">
                    {isSaving ? 'Saving...' : 'Save Dedication'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Export Options</h2>
            
            <div className="space-y-4">
              {/* Premium Export */}
              <Card className="shadow-warm border-legacy-accent/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-accent text-white px-3 py-1 text-xs font-medium">
                  Recommended
                </div>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-black flex items-center gap-2">
                     <Star className="w-5 h-5 text-legacy-accent" />
                     Premium E-Book Export
                   </CardTitle>
                   <div className="flex flex-col gap-1">
                     <span className="text-lg font-semibold text-legacy-ink/70 line-through">$9.99</span>
                     <span className="text-sm text-legacy-accent font-medium">Free for Early Access Users</span>
                   </div>
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
                    Export Premium Journal E-Book
                  </Button>
                </CardContent>
              </Card>

              {/* Free Export */}
              <Card className="shadow-paper">
                <CardHeader className="pb-3">
                   <CardTitle className="text-black flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Free Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-legacy-ink/70">
                    Basic PDF export with all your journal entries in chronological order.
                  </p>
                  <ul className="text-sm text-legacy-ink/70 space-y-1">
                    <li>Physical Journal </li>
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
                   <CardTitle className="text-black flex items-center gap-2">
                     <BookOpen className="w-5 h-5" />
                     Physical Journal
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
                  <Button variant="warm" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>;
}