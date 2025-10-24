import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Star, Package, List, Camera } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
export default function Export() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  return <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black mb-2">Export Your Legacy Journal</h1>
          <p className="text-legacy-ink/70 max-w-2xl mx-auto">Time to transform your text messages into a beautiful, lasting legacy for your children</p>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Export */}
          <Card className="shadow-paper border-legacy-border">
            <CardHeader className="text-center pb-4">
              <Badge variant="secondary" className="w-fit mx-auto mb-2">
                Free
              </Badge>
              <CardTitle className="text-black">Basic PDF Export</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Simple text-only version of your entries
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-black">$0</span>
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
            <CardHeader className="text-center pb-4">
              <Badge variant="default" className="w-fit mx-auto mb-2 bg-legacy-accent">
                Premium
              </Badge>
              <CardTitle className="text-black">Formatted Legacy Journal</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Beautiful, professionally formatted journal
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-black line-through">$9.99</div>
                <p className="text-lg font-semibold text-legacy-accent">Free for Early Access Users</p>
              </div>
              <ul className="space-y-2 text-sm text-legacy-ink/70">
                <li>• Professional book layout</li>
                <li>• Custom dedication page</li>
                <li>• Photo integration</li>
                <li>• Category organization</li>
                <li>• Premium typography</li>
                <li>• High-quality PDF</li>
              </ul>
              <Button variant="accent" className="w-full" disabled>
                <Star className="w-4 h-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Physical Journal */}
          <Card className="shadow-paper border-legacy-border">
            <CardHeader className="text-center pb-4">
              <Badge variant="secondary" className="w-fit mx-auto mb-2 bg-amber-100 text-amber-800">
                Physical
              </Badge>
              <CardTitle className="text-black">Leatherbound Journal</CardTitle>
              <p className="text-sm text-legacy-ink/70">
                Heirloom-quality physical journal
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-black"></span>
              </div>
              <ul className="space-y-2 text-sm text-legacy-ink/70">
                <li>• Premium leather binding</li>
                <li>• Gold embossed title</li>
                <li>• Archival quality paper</li>
                <li>• Photo printing included</li>
                <li>• Custom gift box</li>
                <li>• Shipped to your door</li>
              </ul>
              <Button variant="warm" className="w-full" disabled>
                <Package className="w-4 h-4 mr-2" />
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sample Pages */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-black">What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-medium text-black">Dedication Page</h4>
                <p className="text-sm text-legacy-ink/70">Personal message to your children</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center mx-auto">
                  <List className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-medium text-black">All Entries</h4>
                <p className="text-sm text-legacy-ink/70">Every message organized chronologically</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExportDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} />
    </Layout>;
}