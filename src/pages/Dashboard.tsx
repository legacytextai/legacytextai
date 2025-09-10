import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, MessageCircle, Calendar } from "lucide-react";

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
  },
  {
    id: 3,
    date: "2025-01-09",
    time: "9:30 AM", 
    content: "I cherish being able to pick you up and carry you around. I know you're going to grow up too soon and I'm going to miss it. These moments are precious.",
    category: "Memories"
  },
  {
    id: 4,
    date: "2025-01-08",
    time: "7:15 PM",
    content: "Watched you take your first steps today. Your determination reminds me that every challenge is just practice for the next victory.",
    category: "Milestones"
  },
  {
    id: 5,
    date: "2025-01-07",
    time: "10:45 AM",
    content: "Your mother and I chose your name because it means 'strength.' Remember that you carry the strength of generations before you.",
    category: "Family History"
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

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-legacy-primary">Entry History</h1>
            <p className="text-legacy-ink/70 mt-1">Your legacy journal entries, organized chronologically</p>
          </div>
          <Button variant="accent">
            <Download className="w-4 h-4 mr-2" />
            Export Journal
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="shadow-paper">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold text-legacy-primary">24</p>
                </div>
                <MessageCircle className="w-8 h-8 text-legacy-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-paper">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Days Active</p>
                  <p className="text-2xl font-bold text-legacy-primary">12</p>
                </div>
                <Calendar className="w-8 h-8 text-legacy-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-paper">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last Entry</p>
                  <p className="text-2xl font-bold text-legacy-primary">Today</p>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entries Timeline */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-legacy-primary flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockEntries.map((entry) => (
              <div key={entry.id} className="border-l-4 border-legacy-accent/20 pl-4 py-3 hover:bg-legacy-warm/30 rounded-r-lg transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-legacy-ink/60">
                      <span className="font-medium">{entry.date}</span> • <span>{entry.time}</span>
                    </div>
                    <Badge variant="secondary" className={getCategoryColor(entry.category)}>
                      {entry.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-legacy-ink leading-relaxed">{entry.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export CTA */}
        <Card className="shadow-paper bg-gradient-warm border-legacy-border">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-legacy-primary mb-2">
              Ready to create your legacy journal?
            </h3>
            <p className="text-legacy-ink/70 mb-6">
              Export your entries as a beautiful PDF or order a premium bound journal
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Free PDF Export
              </Button>
              <Button variant="accent">
                Premium Journal Export - $4.99
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}