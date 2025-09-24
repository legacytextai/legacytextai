import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, BookOpen, Smartphone, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export default function Homepage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    const redirectUrl = `${window.location.origin}/dashboard`;
    const {
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) {
      if (error.message.includes("already registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(error.message);
      }
      toast.error("Sign up failed: " + error.message);
    } else {
      // Store phone temporarily in localStorage for later verification
      if (phone) {
        localStorage.setItem('pendingPhone', phone);
      }
      toast.success("Check your email for a confirmation link!");
      setError("");
      setEmail("");
      setPassword("");
      setPhone("");
      setShowSignup(false);
    }
    setLoading(false);
  };
  return <Layout showSidebar={false}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold text-legacy-primary mb-6 leading-tight">
                Text Your Way to a 
                <span className="text-legacy-accent"> Lasting Legacy</span>
              </h1>
              <p className="text-xl text-legacy-ink/70 mb-8 max-w-2xl mx-auto">
                Share your values, memories, and life lessons with your children through simple text messages. 
                Our AI organizes your thoughts into a beautiful legacy journal they'll treasure forever.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? <Button variant="hero" size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/dashboard')}>
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Button> : <Button variant="hero" size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Start Your Free Legacy Journal
                  </Button>}
                <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}>
                  <BookOpen className="w-5 h-5 mr-2" />
                  See How It Works
                </Button>
              </div>

              {/* Signup Form Modal */}
              {showSignup && !user && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <Card className="w-full max-w-md border-legacy-border bg-card">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-legacy-primary mb-2">
                          Start Your Legacy Journal
                        </h3>
                        <p className="text-sm text-legacy-ink/70">
                          Create your account to begin documenting your legacy
                        </p>
                      </div>

                      {error && <Alert className="mb-4 border-destructive/50">
                          <AlertDescription className="text-destructive">
                            {error}
                          </AlertDescription>
                        </Alert>}

                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input id="signup-email" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input id="signup-password" type="password" placeholder="Create a password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
                          <Input id="signup-phone" type="tel" placeholder="+1 (555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} />
                          <p className="text-xs text-legacy-ink/60">
                            You can add this later during setup
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creating..." : "Create Account"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowSignup(false)} disabled={loading}>
                            Cancel
                          </Button>
                        </div>
                      </form>

                      <p className="text-center text-xs text-legacy-ink/60 mt-4">
                        Already have an account?{" "}
                        <Button variant="link" className="p-0 h-auto text-legacy-accent" onClick={() => {
                      setShowSignup(false);
                      navigate('/auth');
                    }}>
                          Sign in here
                        </Button>
                      </p>
                    </CardContent>
                  </Card>
                </div>}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="how-it-works" className="py-16 px-4 bg-legacy-warm/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-legacy-primary mb-12">How LegacyText AI Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-legacy-primary mb-4">
                    Just Text
                  </h3>
                  <p className="text-legacy-ink/70">
                    No app to download. Simply text your thoughts, memories, and advice to our dedicated number.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-legacy-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-legacy-primary mb-4">
                    AI Organization
                  </h3>
                  <p className="text-legacy-ink/70">
                    Our AI organizes your messages into a beautiful, chronological journal while preserving your voice.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-paper border-legacy-border hover:shadow-warm transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-legacy-primary mb-4">
                    Lasting Legacy
                  </h3>
                  <p className="text-legacy-ink/70">
                    Export as a PDF or order a premium bound journal that your children will treasure forever.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-legacy-primary mb-6">
              Start Building Your Legacy Today
            </h2>
            <p className="text-xl text-legacy-ink/70 mb-8">
              Join fathers who are already documenting their wisdom for the next generation.
            </p>
            {user ? <Button variant="accent" size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/dashboard')}>
                <MessageSquare className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button> : <Button variant="accent" size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
                <MessageSquare className="w-5 h-5 mr-2" />
                Begin Your Legacy Journal
              </Button>}
          </div>
        </section>
      </div>
    </Layout>;
}