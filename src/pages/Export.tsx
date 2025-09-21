import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Star, Package } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
export default function Export() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  return <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-legacy-primary mb-2">Export Your Legacy Journal</h1>
          <p className="text-legacy-ink/70 max-w-2xl mx-auto">
            Transform your text messages into a beautiful, lasting legacy for your children
          </p>
        </div>

        {/* Journal Preview */}
        <Card className="shadow-deep max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-24 bg-legacy-primary/10 border border-legacy-border rounded-lg mx-auto flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-legacy-primary" />
              </div>
              <div>
                <h3 className="font-bold text-legacy-primary">John Doe's</h3>
                <p className="text-sm text-legacy-ink/70">Legacy Journal</p>
              </div>
              <div className="space-y-2 text-left bg-legacy-warm/50 p-4 rounded-lg">
                <h4 className="font-semibold text-legacy-primary border-b border-legacy-border pb-1">
                  Dedication
                </h4>
                <p className="text-sm text-legacy-ink/80">
                  This journal is dedicated to my loving wife, Jane Doe, and to amazing children...
                </p>
                <div className="border-l-2 border-legacy-accent/30 pl-3 py-2 bg-white/50 rounded">
                  <p className="text-xs text-legacy-ink/70 font-medium">
                    "Together, they are my sun, my moon, my entire world."
                  </p>
                </div>
              </div>
              <div className="text-left bg-legacy-warm/50 p-4 rounded-lg">
                <h4 className="font-semibold text-legacy-primary border-b border-legacy-border pb-1">
                  Introduction
                </h4>
                <p className="text-xs text-legacy-ink/70">
                  As you grow older, I hope these entries will serve as a guide...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Export */}
          <Card className="shadow-paper border-legacy-border">
            <CardHeader className="text-center pb-4">
              <Badge variant="secondary" className="w-fit mx-auto mb-2">
                Free
              </Badge>
              <CardTitle className="text-legacy-primary">Basic PDF Export</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Simple text-only version of your entries
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-legacy-primary">$0</span>
              </div>
              <ul className="space-y-2 text-sm text-legacy-ink/70">
                <li>• Chronological entry list</li>
                <li>• Basic formatting</li>
                <li>• PDF download</li>
                <li>• Unlimited exports</li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => setIsExportDialogOpen(true)}>
                <Download className="w-4 h-4 mr-2" />
                Export Free PDF
              </Button>
            </CardContent>
          </Card>

          {/* Premium Export */}
          <Card className="shadow-deep border-legacy-accent relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-accent text-white px-3 py-1 text-xs font-medium">
              Most Popular
            </div>
            <CardHeader className="text-center pb-4">
              <Badge variant="default" className="w-fit mx-auto mb-2 bg-legacy-accent">
                Premium
              </Badge>
              <CardTitle className="text-legacy-primary">Formatted Legacy Journal</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Beautiful, professionally formatted journal
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-legacy-primary">$9.99</span>
              </div>
              <ul className="space-y-2 text-sm text-legacy-ink/70">
                <li>• Professional book layout</li>
                <li>• Custom dedication page</li>
                <li>• Photo integration</li>
                <li>• Category organization</li>
                <li>• Premium typography</li>
                <li>• High-quality PDF</li>
              </ul>
              <Button variant="accent" className="w-full" onClick={() => setIsExportDialogOpen(true)}>
                <Star className="w-4 h-4 mr-2" />
                Export Premium Journal
              </Button>
            </CardContent>
          </Card>

          {/* Physical Journal */}
          <Card className="shadow-paper border-legacy-border">
            <CardHeader className="text-center pb-4">
              <Badge variant="secondary" className="w-fit mx-auto mb-2 bg-amber-100 text-amber-800">
                Physical
              </Badge>
              <CardTitle className="text-legacy-primary">Leatherbound Journal</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Heirloom-quality physical journal
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-legacy-primary"></span>
              </div>
              <ul className="space-y-2 text-sm text-legacy-ink/70">
                <li>• Premium leather binding</li>
                <li>• Gold embossed title</li>
                <li>• Archival quality paper</li>
                <li>• Photo printing included</li>
                <li>• Custom gift box</li>
                <li>• Shipped to your door</li>
              </ul>
              <Button variant="warm" className="w-full" onClick={() => setIsExportDialogOpen(true)}>
                <Package className="w-4 h-4 mr-2" />
                Order Physical Journal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sample Pages */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-legacy-primary">What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-legacy-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-legacy-primary" />
                </div>
                <h4 className="font-medium text-legacy-primary">Dedication Page</h4>
                <p className="text-sm text-legacy-ink/70">Personal message to your children</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-legacy-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-legacy-primary font-bold">24</span>
                </div>
                <h4 className="font-medium text-legacy-primary">All Entries</h4>
                <p className="text-sm text-legacy-ink/70">Every message organized chronologically</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-legacy-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-legacy-primary font-bold">6</span>
                </div>
                <h4 className="font-medium text-legacy-primary">Photos</h4>
                <p className="text-sm text-legacy-ink/70">Memories captured in your messages</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-legacy-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Star className="w-6 h-6 text-legacy-primary" />
                </div>
                <h4 className="font-medium text-legacy-primary">Categories</h4>
                <p className="text-sm text-legacy-ink/70">Organized by themes and topics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExportDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} />
    </Layout>;
}