import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit3, Save, RotateCcw, Trash2, GripVertical } from "lucide-react";

// Mock data for demonstration
const mockEntries = [
  {
    id: 1,
    date: "2025-01-09",
    time: "6:30 AM",
    content: "Never ask permission to do what you think is right. Sometimes the hardest decisions are the ones that define your character.",
    category: "Life Lessons"
  },
  {
    id: 2,
    date: "2025-01-09", 
    time: "8:30 AM",
    content: "Time management is the most critical skill you need to master for success in all areas of your life. Start each day with purpose and intention.",
    category: "Advice"
  }
];

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "Life Lessons": "bg-legacy-accent/10 text-legacy-accent",
    "Advice": "bg-legacy-primary/10 text-legacy-primary", 
    "Memories": "bg-amber-100 text-amber-800",
    "Milestones": "bg-emerald-100 text-emerald-800",
    "Family History": "bg-purple-100 text-purple-800"
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

export default function Editor() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-legacy-primary flex items-center gap-3">
              <Edit3 className="w-8 h-8" />
              Editor
            </h1>
            <p className="text-legacy-ink/70 mt-1">Edit, reorder, and refine your legacy journal entries</p>
          </div>
          <Button variant="hero">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Instructions */}
        <Card className="shadow-paper bg-legacy-warm/30 border-legacy-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Edit3 className="w-5 h-5 text-legacy-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-legacy-primary mb-1">Journal Editor</h3>
                <p className="text-sm text-legacy-ink/70">
                  Edit entry text, reorder entries by dragging, delete unwanted entries, or change categories. 
                  All changes will be reflected in your exported journal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries Editor */}
        <div className="space-y-4">
          {mockEntries.map((entry, index) => (
            <Card key={entry.id} className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="text-legacy-ink/40 hover:text-legacy-primary cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="text-sm text-legacy-ink/60">
                      <span className="font-medium">{entry.date}</span> • <span>{entry.time}</span>
                    </div>
                    <Badge variant="secondary" className={getCategoryColor(entry.category)}>
                      {entry.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea 
                  defaultValue={entry.content}
                  className="min-h-24 border-legacy-border focus:border-legacy-primary resize-none"
                  placeholder="Edit your journal entry..."
                />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    Update Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Entry Section */}
        <Card className="shadow-paper border-2 border-dashed border-legacy-border">
          <CardContent className="p-8 text-center">
            <Edit3 className="w-12 h-12 text-legacy-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-legacy-primary mb-2">Add New Entry</h3>
            <p className="text-legacy-ink/70 mb-4">
              Manually add a new journal entry or continue texting to add more entries automatically.
            </p>
            <Button variant="outline">
              <Edit3 className="w-4 h-4 mr-2" />
              Add Manual Entry
            </Button>
          </CardContent>
        </Card>

        {/* Save Changes */}
        <Card className="shadow-paper bg-gradient-warm border-legacy-border">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-legacy-primary mb-2">
              Save Your Changes
            </h3>
            <p className="text-legacy-ink/70 mb-4">
              Your edits will be reflected in all future exports and journal views.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard Changes
              </Button>
              <Button variant="hero">
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}