import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, BookOpen, Users, Clock, Phone, Shield, MessageSquare, Search, Filter, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { useJournalEntries, useCreateJournalEntry, type JournalEntry } from "@/hooks/useJournalEntries";
import { useBatchCategorizeEntries } from "@/hooks/useCategorizeEntry";
import { EntryCard } from "@/components/EntryCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";


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

function Dashboard() {
  const { user } = useAuth();
  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();
  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const createMutation = useCreateJournalEntry();
  const batchCategorize = useBatchCategorizeEntries();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntryContent, setNewEntryContent] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !userLoading) {
      navigate('/auth');
    }
  }, [user, userLoading, navigate]);


  // Filter and sort entries
  const filteredEntries = entries
    .filter((entry: JournalEntry) => 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: JournalEntry, b: JournalEntry) => {
      const dateA = new Date(a.received_at).getTime();
      const dateB = new Date(b.received_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Check for pending phone from localStorage (from homepage signup)
  useEffect(() => {
    const pendingPhone = localStorage.getItem('pendingPhone');
    if (pendingPhone && userData && !userData.phone_e164) {
      toast.info('Complete your setup by verifying your phone number', {
        action: {
          label: 'Verify Now',
          onClick: () => navigate('/settings')
        }
      });
      localStorage.removeItem('pendingPhone');
    }
  }, [userData, navigate]);

  const handleAddEntry = () => {
    if (newEntryContent.trim()) {
      createMutation.mutate(
        { content: newEntryContent.trim() },
        {
          onSuccess: () => {
            setNewEntryContent("");
            setShowAddEntry(false);
            toast.success('Entry added successfully!');
          }
        }
      );
    }
  };

  const handleBatchCategorize = () => {
    const uncategorizedEntries = entries.filter(entry => !entry.category);
    if (uncategorizedEntries.length === 0) {
      toast.info("All entries are already categorized!");
      return;
    }
    
    const entriesToCategorize = uncategorizedEntries.map(entry => ({
      id: entry.id,
      content: entry.content
    }));
    
    batchCategorize.mutate(entriesToCategorize);
  };

  if (userLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legacy-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 overflow-x-hidden">
        {/* Phone Verification Banner */}
        {userData && userData.status !== 'active' && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Complete your setup by verifying your phone number to start receiving daily prompts</span>
              <Link to="/settings">
                <Button variant="outline" size="sm" className="ml-4">
                  <Phone className="w-4 h-4 mr-2" />
                  Verify Phone
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Entry History</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
            <Button 
              variant="outline" 
              onClick={() => setShowAddEntry(!showAddEntry)}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
            <Link to="/export" className="flex-shrink-0">
              <Button variant="default" size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-black/90">
                <BookOpen className="w-5 h-5 mr-2" />
                Export Journal
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-legacy-primary">
                {filteredEntries.length}
              </div>
              <p className="text-sm text-legacy-ink/70 mt-1">
                {searchTerm ? `filtered from ${entries.length} total` : 'messages saved'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Phone Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-legacy-primary">
                {userData?.status === 'active' ? 'Active' : 'Pending'}
              </div>
              <p className="text-sm text-legacy-ink/70 mt-1">
                {userData?.status === 'active' ? 'Receiving prompts' : 'Verify to start'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-legacy-primary">
                {filteredEntries.length > 0 ? 'Recent' : 'None'}
              </div>
              <p className="text-sm text-legacy-ink/70 mt-1">
                {filteredEntries.length > 0 ? new Date(filteredEntries[0].received_at).toLocaleDateString() : 'Reply to a prompt to start'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Entry Section */}
        {showAddEntry && (
          <Card className="border-2 border-dashed border-legacy-primary/30">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-legacy-primary">Add New Entry</h3>
                <textarea
                  value={newEntryContent}
                  onChange={(e) => setNewEntryContent(e.target.value)}
                  placeholder="Write your journal entry here..."
                  className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-legacy-primary focus:border-transparent"
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddEntry(false);
                      setNewEntryContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddEntry}
                    disabled={!newEntryContent.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Entry'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter Section */}
        {entries.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search your entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-0"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Your Journal Entries</span>
              {searchTerm && (
                <Badge variant="secondary" className="ml-2">
                  {filteredEntries.length} of {entries.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex justify-between items-center">
              <span>Your journal entries from text messages and manual entries</span>
              {entries.some(entry => !entry.category) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBatchCategorize}
                  disabled={batchCategorize.isPending}
                >
                  {batchCategorize.isPending ? 'Categorizing...' : 'Categorize All Entries'}
                </Button>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legacy-primary"></div>
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="border-2 border-legacy-primary/20 rounded-lg bg-gray-50 shadow-inner p-4">
                <ScrollArea className="h-[500px] w-full">
                  <div className="space-y-6">
                    {filteredEntries.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} enableInlineEdit={true} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : searchTerm ? (
              <Card className="shadow-paper">
                <CardContent className="p-12 text-center">
                  <Search className="w-16 h-16 mx-auto text-legacy-ink/30 mb-4" />
                  <h3 className="text-xl font-semibold text-legacy-primary mb-2">
                    No entries found
                  </h3>
                  <p className="text-legacy-ink/70 mb-6">
                    No entries match your search term "{searchTerm}". Try a different search or clear the filter.
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-paper">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-legacy-ink/30 mb-4" />
                  <h3 className="text-xl font-semibold text-legacy-primary mb-2">
                    No entries yet
                  </h3>
                  <p className="text-legacy-ink/70 mb-6">
                    {userData?.status === 'active' 
                      ? "Reply to any prompt to start your journal. You'll receive your first prompt soon!"
                      : "Verify your phone number to start receiving daily prompts and build your legacy journal."
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-full">
                    <Button onClick={() => setShowAddEntry(true)} className="flex-shrink-0">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manual Entry
                    </Button>
                    {userData?.status !== 'active' && (
                      <Link to="/settings" className="flex-shrink-0">
                        <Button variant="outline" className="w-full sm:w-auto">
                          <Phone className="w-4 h-4 mr-2" />
                          Verify Phone Number
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-accent text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Share Your Legacy?</h2>
            <p className="mb-6 opacity-90">
              Your journal entries are automatically organized and ready to export as a beautiful PDF or premium bound book.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-full">
              <Link to="/export" className="flex-shrink-0">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Export as PDF
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default Dashboard;