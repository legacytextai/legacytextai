import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, Edit3, Save, X, Trash2, RefreshCw } from "lucide-react";
import type { JournalEntry } from "@/hooks/useJournalEntries";
import { useUpdateJournalEntry, useDeleteJournalEntry } from "@/hooks/useJournalEntries";
import { useCategorizeEntry } from "@/hooks/useCategorizeEntry";

interface EntryCardProps {
  entry: JournalEntry;
  className?: string;
  enableInlineEdit?: boolean;
}

// Helper function to get AI category colors - dark theme
function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    "Values": "bg-white/10 text-white border border-white/20",
    "Advice": "bg-white/10 text-white border border-white/20",
    "Memories": "bg-white/10 text-white border border-white/20",
    "Work Ethics": "bg-white/10 text-white border border-white/20",
    "Faith": "bg-white/10 text-white border border-white/20", 
    "Family": "bg-white/10 text-white border border-white/20",
    "Life Lessons": "bg-white/10 text-white border border-white/20",
    "Encouragement": "bg-white/10 text-white border border-white/20",
    "Reflection": "bg-white/10 text-white border border-white/20",
    "Future Hopes": "bg-white/10 text-white border border-white/20"
  };
  return colors[category] || "bg-white/10 text-white border border-white/20";
}

export const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  className = "", 
  enableInlineEdit = true 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(entry.content);
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();
  const categorizeMutation = useCategorizeEntry();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSave = () => {
    if (editedContent.trim() && editedContent !== entry.content) {
      updateMutation.mutate(
        { id: entry.id, content: editedContent.trim() },
        {
          onSuccess: () => {
            setIsEditing(false);
          }
        }
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(entry.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      deleteMutation.mutate(entry.id);
    }
  };

  const handleRecategorize = () => {
    categorizeMutation.mutate({
      entryId: entry.id,
      content: entry.content
    });
  };

  return (
    <Card className={`hover:bg-white/[0.04] transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-wrap">
            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              {formatDate(entry.received_at)}
            </span>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {formatTime(entry.received_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Badge className={`${getCategoryColor(entry.category || 'Uncategorized')} text-xs flex-shrink-0`}>
              {entry.category || 'Uncategorized'}
            </Badge>
            {enableInlineEdit && !isEditing && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRecategorize}
                  disabled={categorizeMutation.isPending}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  title="Re-categorize this entry"
                >
                  <RefreshCw className={`w-4 h-4 ${categorizeMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-none"
              placeholder="Write your journal entry..."
            />
            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !editedContent.trim()}
                className="flex-shrink-0"
              >
                <Save className="w-4 h-4 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-white leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
};