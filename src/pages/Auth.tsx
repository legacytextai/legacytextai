import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Chrome } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      toast.error("Sign in failed: " + error.message);
    } else {
      toast.success("Successfully signed in!");
    }

    setLoading(false);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
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
      toast.success("Check your email for a confirmation link!");
      setError("");
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      setError(error.message);
      toast.error("Google sign in failed: " + error.message);
    }

    setLoading(false);
  };

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <Card className="border-legacy-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-legacy-primary">
                Welcome to LegacyText AI
              </CardTitle>
              <CardDescription className="text-legacy-ink/70">
                Create your account or sign in to start building your legacy journal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-destructive/50">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Continue with Google
                </Button>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-legacy-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-legacy-ink/60">Or continue with email</span>
                </div>
              </div>

              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="text-center text-sm text-legacy-ink/60 mt-4">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-legacy-accent hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-legacy-accent hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;