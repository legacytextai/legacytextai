import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, Edit3, Save, X, Trash2 } from "lucide-react";
import type { JournalEntry } from "@/hooks/useJournalEntries";
import { useUpdateJournalEntry, useDeleteJournalEntry } from "@/hooks/useJournalEntries";

interface EntryCardProps {
  entry: JournalEntry;
  className?: string;
  enableInlineEdit?: boolean;
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

export const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  className = "", 
  enableInlineEdit = true 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(entry.content);
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

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

  const getSourceBadge = () => {
    if (entry.source === 'manual') {
      return { text: 'Manual Entry', color: 'bg-blue-100 text-blue-800' };
    }
    return { text: 'SMS Entry', color: 'bg-green-100 text-green-800' };
  };

  const sourceBadge = getSourceBadge();

  return (
    <Card className={`shadow-paper hover:shadow-lg transition-shadow ${className}`}>
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
          <div className="flex items-center space-x-2">
            <Badge className={sourceBadge.color}>
              {sourceBadge.text}
            </Badge>
            {enableInlineEdit && !isEditing && (
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !editedContent.trim()}
              >
                <Save className="w-4 h-4 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-legacy-ink leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
};