import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Image, Edit3, Trash2, Download, Camera } from "lucide-react";

// Mock data for demonstration
const mockMedia = [
  {
    id: 1,
    type: "image",
    caption: "Caption: The day you were born",
    date: "2025-01-09",
    thumbnail: "/placeholder.svg"
  },
  {
    id: 2,
    type: "image", 
    caption: "Caption: The day you were born",
    date: "2025-01-09",
    thumbnail: "/placeholder.svg"
  },
  {
    id: 3,
    type: "image",
    caption: "Caption: The day you were born", 
    date: "2025-01-08",
    thumbnail: "/placeholder.svg"
  },
  {
    id: 4,
    type: "image",
    caption: "Caption: The day you were born",
    date: "2025-01-07",
    thumbnail: "/placeholder.svg"
  },
  {
    id: 5,
    type: "image",
    caption: "Caption: The day you were born",
    date: "2025-01-06", 
    thumbnail: "/placeholder.svg"
  },
  {
    id: 6,
    type: "image",
    caption: "Caption: The day you were born",
    date: "2025-01-05",
    thumbnail: "/placeholder.svg"
  }
];

export default function MediaLibrary() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-legacy-primary flex items-center gap-3">
              <Image className="w-8 h-8" />
              Media Library
            </h1>
            <p className="text-legacy-ink/70 mt-1">View and edit photos and videos from your SMS messages</p>
          </div>
          <Button variant="accent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Instructions */}
        <Card className="shadow-paper bg-legacy-warm/30 border-legacy-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-legacy-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-legacy-primary mb-1">Media from SMS Messages</h3>
                <p className="text-sm text-legacy-ink/70">
                  Photos and videos sent via text message are automatically saved here. Edit captions, 
                  reorder, or delete media. These will be included in your Premium Export and Physical Journal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockMedia.map((media) => (
            <Card key={media.id} className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-200 overflow-hidden">
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-legacy-primary/10 to-legacy-accent/10 flex items-center justify-center">
                  <div className="w-16 h-16 bg-legacy-primary/20 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-legacy-primary" />
                  </div>
                </div>
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                  {media.type}
                </Badge>
              </div>
              <CardContent className="p-3 space-y-3">
                <div className="text-xs text-legacy-ink/60">
                  {media.date}
                </div>
                <Input 
                  defaultValue={media.caption}
                  className="text-xs border-legacy-border focus:border-legacy-primary"
                  placeholder="Edit caption..."
                />
                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export Notice */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-legacy-primary">Export Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-legacy-ink/70">
              Your media library photos will be included in:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-legacy-warm/50 rounded-lg">
                <div className="w-8 h-8 bg-legacy-accent/10 rounded flex items-center justify-center">
                  <Download className="w-4 h-4 text-legacy-accent" />
                </div>
                <div>
                  <p className="font-medium text-legacy-primary">Premium Export ($4.99)</p>
                  <p className="text-sm text-legacy-ink/70">High-quality photo integration</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-legacy-warm/50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center">
                  <Image className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-legacy-primary">Physical Journal ($199)</p>
                  <p className="text-sm text-legacy-ink/70">Professional photo printing</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternative Suggestion */}
        <Card className="shadow-paper border-2 border-dashed border-legacy-border">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-legacy-primary mb-2">
              Considering Simplifying?
            </h3>
            <p className="text-legacy-ink/70 mb-4">
              We're thinking about streamlining the experience by having photos appear directly in 
              your journal chronologically instead of in a separate library. What do you think?
            </p>
            <Button variant="outline">Share Feedback</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}