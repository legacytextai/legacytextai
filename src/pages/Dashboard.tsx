import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, BookOpen, Users, Clock, Phone, Shield, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JournalEntry {
  id: number;
  content: string;
  received_at: string;
  user_id: string;
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

function Dashboard() {
  const { user } = useAuth();
  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !userLoading) {
      navigate('/auth');
    }
  }, [user, userLoading, navigate]);

  // Load user's journal entries
  useEffect(() => {
    const loadEntries = async () => {
      if (!userData?.id) return;

      try {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("id, content, received_at, user_id")
          .eq("user_id", userData.id)
          .order("received_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error loading entries:', error);
          toast.error('Failed to load journal entries');
          return;
        }

        setEntries(data || []);
      } catch (error) {
        console.error('Error loading entries:', error);
      } finally {
        setEntriesLoading(false);
      }
    };

    if (userData?.id) {
      loadEntries();
    }
  }, [userData?.id]);

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
      <div className="space-y-8">
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

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-legacy-primary">Entry History</h1>
          <Link to="/export">
            <Button variant="default" size="lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Export Journal
            </Button>
          </Link>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-legacy-primary">
                {entries.length}
              </div>
              <p className="text-sm text-legacy-ink/70 mt-1">
                messages saved
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
                {entries.length > 0 ? 'Recent' : 'None'}
              </div>
              <p className="text-sm text-legacy-ink/70 mt-1">
                {entries.length > 0 ? new Date(entries[0].received_at).toLocaleDateString() : 'Reply to a prompt to start'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Entries Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Recent Entries</span>
            </CardTitle>
            <CardDescription>
              Your latest journal entries from text messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {entriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legacy-primary"></div>
                </div>
              ) : entries.length > 0 ? (
                entries.map((entry) => (
                  <Card key={entry.id} className="shadow-paper">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-4">
                          <CalendarDays className="w-5 h-5 text-legacy-ink/50" />
                          <span className="text-sm font-medium text-legacy-ink/70">
                            {new Date(entry.received_at).toLocaleDateString()}
                          </span>
                          <Clock className="w-4 h-4 text-legacy-ink/50" />
                          <span className="text-sm text-legacy-ink/70">
                            {new Date(entry.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                ))
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
                    {userData?.status !== 'active' && (
                      <Link to="/settings">
                        <Button variant="default">
                          <Phone className="w-4 h-4 mr-2" />
                          Verify Phone Number
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-accent text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Share Your Legacy?</h2>
            <p className="mb-6 opacity-90">
              Your journal entries are automatically organized and ready to export as a beautiful PDF or premium bound book.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/export">
                <Button variant="secondary" size="lg">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Export as PDF
                </Button>
              </Link>
              <Link to="/export">
                <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-legacy-accent">
                  Order Bound Journal
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