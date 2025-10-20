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

// Helper function to get AI category colors
function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    "Values": "bg-purple-100 text-purple-800",
    "Advice": "bg-blue-100 text-blue-800",
    "Memories": "bg-green-100 text-green-800",
    "Work Ethics": "bg-orange-100 text-orange-800",
    "Faith": "bg-yellow-100 text-yellow-800", 
    "Family": "bg-pink-100 text-pink-800",
    "Life Lessons": "bg-indigo-100 text-indigo-800",
    "Encouragement": "bg-emerald-100 text-emerald-800",
    "Reflection": "bg-slate-100 text-slate-800",
    "Future Hopes": "bg-sky-100 text-sky-800"
  };
  return colors[category] || "bg-gray-100 text-gray-800";
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
    <Card className={`shadow-paper hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-wrap">
            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-legacy-ink/50 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-legacy-ink/70 whitespace-nowrap">
              {formatDate(entry.received_at)}
            </span>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-legacy-ink/50 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-legacy-ink/70 whitespace-nowrap">
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
          <p className="text-black leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
};