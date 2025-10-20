import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit3, Save, RotateCcw, Trash2, GripVertical, Plus } from "lucide-react";
import { useJournalEntries, useUpdateJournalEntry, useDeleteJournalEntry, useCreateJournalEntry } from "@/hooks/useJournalEntries";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


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
  const { data: entries = [], isLoading } = useJournalEntries();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const createEntry = useCreateJournalEntry();
  
  const [editingContent, setEditingContent] = useState<{ [key: number]: string }>({});
  const [newEntryContent, setNewEntryContent] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleContentChange = (entryId: number, content: string) => {
    setEditingContent(prev => ({ ...prev, [entryId]: content }));
  };

  const handleUpdateEntry = async (entryId: number) => {
    const content = editingContent[entryId];
    if (!content) return;
    
    try {
      await updateEntry.mutateAsync({ id: entryId, content });
      setEditingContent(prev => {
        const newState = { ...prev };
        delete newState[entryId];
        return newState;
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteEntry.mutateAsync(entryId);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntryContent.trim()) {
      toast.error('Please enter some content for the entry');
      return;
    }
    
    try {
      await createEntry.mutateAsync({ content: newEntryContent.trim() });
      setNewEntryContent("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center gap-3">
              <Edit3 className="w-8 h-8" />
              Editor
            </h1>
            <p className="text-legacy-ink/70 mt-1">Edit, reorder, and refine your legacy journal entries</p>
          </div>
          <Button className="bg-black hover:bg-black/90 text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Instructions */}
        <Card className="shadow-paper bg-legacy-warm/30 border-legacy-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Edit3 className="w-5 h-5 text-black mt-0.5" />
              <div>
                <h3 className="font-medium text-black mb-1">Journal Editor</h3>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <Card key={entry.id} className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="text-legacy-ink/40 hover:text-black cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <div className="text-sm text-legacy-ink/60">
                        <span className="font-medium">{formatDate(entry.received_at)}</span> • <span>{formatTime(entry.received_at)}</span>
                      </div>
                      <Badge variant="secondary" className="bg-black/10 text-black">
                        Entry
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const content = editingContent[entry.id] || entry.content;
                          setEditingContent(prev => ({ ...prev, [entry.id]: entry.content }));
                        }}
                        disabled={editingContent[entry.id] === entry.content}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deleteEntry.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea 
                    value={editingContent[entry.id] ?? entry.content}
                    onChange={(e) => handleContentChange(entry.id, e.target.value)}
                    className="min-h-24 border-legacy-border focus:border-legacy-primary resize-none"
                    placeholder="Edit your journal entry..."
                  />
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateEntry(entry.id)}
                      disabled={
                        updateEntry.isPending || 
                        !editingContent[entry.id] || 
                        editingContent[entry.id] === entry.content
                      }
                    >
                      {updateEntry.isPending ? 'Updating...' : 'Update Entry'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-paper border-legacy-border">
              <CardContent className="p-12 text-center">
                <Edit3 className="w-16 h-16 text-black/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-black mb-2">
                  No entries yet
                </h3>
                <p className="text-legacy-ink/70 mb-6">
                  Start by adding your first journal entry manually, or reply to a text prompt to automatically create entries.
                </p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Journal Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        value={newEntryContent}
                        onChange={(e) => setNewEntryContent(e.target.value)}
                        placeholder="Write your journal entry here..."
                        className="min-h-32"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateEntry} disabled={createEntry.isPending}>
                          {createEntry.isPending ? 'Adding...' : 'Add Entry'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Entry Section */}
        {entries.length > 0 && (
          <Card className="shadow-paper border-2 border-dashed border-legacy-border">
            <CardContent className="p-8 text-center">
              <Edit3 className="w-12 h-12 text-black/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">Add New Entry</h3>
              <p className="text-legacy-ink/70 mb-4">
                Manually add a new journal entry or continue texting to add more entries automatically.
              </p>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Journal Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={newEntryContent}
                      onChange={(e) => setNewEntryContent(e.target.value)}
                      placeholder="Write your journal entry here..."
                      className="min-h-32"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateEntry} disabled={createEntry.isPending}>
                        {createEntry.isPending ? 'Adding...' : 'Add Entry'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Save Changes */}
        <Card className="shadow-paper bg-gradient-warm border-legacy-border">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-black mb-2">
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
              <Button className="bg-black hover:bg-black/90 text-white">
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