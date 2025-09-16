import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import type { JournalEntry } from "@/hooks/useJournalEntries";

interface EntryCardProps {
  entry: JournalEntry;
  className?: string;
}

// Helper function to get category colors
function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    "Milestones": "bg-green-100 text-green-800",
    "Values": "bg-blue-100 text-blue-800", 
    "Daily Life": "bg-purple-100 text-purple-800",
    "Memories": "bg-yellow-100 text-yellow-800",
    "Advice": "bg-red-100 text-red-800"
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, className = "" }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className={`shadow-paper ${className}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
            <CalendarDays className="w-5 h-5 text-legacy-ink/50" />
            <span className="text-sm font-medium text-legacy-ink/70">
              {formatDate(entry.received_at)}
            </span>
            <Clock className="w-4 h-4 text-legacy-ink/50" />
            <span className="text-sm text-legacy-ink/70">
              {formatTime(entry.received_at)}
            </span>
          </div>
          <Badge className={getCategoryColor("Daily Life")}>
            Entry
          </Badge>
        </div>
        <p className="text-legacy-ink leading-relaxed">
          {entry.content}
        </p>
      </CardContent>
    </Card>
  );
};