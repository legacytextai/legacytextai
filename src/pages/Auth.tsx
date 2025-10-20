import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Chrome, RefreshCw } from "lucide-react";
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
import { handleSignUp, resendConfirmationEmail, isE164, formatPhoneDisplay, normalizePhoneToE164, isValidPhone } from "@/utils/auth";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const navigate = useNavigate();

  // Check URL parameters for confirmation status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const confirmed = urlParams.get('confirmed');
    const urlEmail = urlParams.get('email');
    
    if (confirmed === '1') {
      setEmailConfirmed(true);
      if (urlEmail) {
        setEmail(decodeURIComponent(urlEmail));
      }
      // Clean up URL
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

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

    try {
      const normalizedPhone = normalizePhoneToE164(phoneDisplay);
      await handleSignUp(supabase, { 
        email, 
        password, 
        phoneE164: normalizedPhone 
      });
      
      toast.success("Check your email for a confirmation link!");
      setError("");
      setLastEmail(email);
      setShowResend(true);
    } catch (error: any) {
      if (error.message.includes("already registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(error.message);
      }
      toast.error("Sign up failed: " + error.message);
    }

    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!lastEmail) return;
    
    setResendLoading(true);
    try {
      await resendConfirmationEmail(supabase, lastEmail);
      toast.success("Confirmation email re-sent!");
    } catch (error: any) {
      toast.error("Failed to resend: " + error.message);
    }
    setResendLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
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
              <Button variant="ghost" size="sm" className="mb-4 text-white">
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
              {emailConfirmed && (
                <Alert className="mb-4 border-green-500/50 bg-green-50/50">
                  <AlertDescription className="text-green-700">
                    ✓ Email confirmed successfully! Please sign in below to continue.
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert className="mb-4 border-destructive/50">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}


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
                    <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-black/90">
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
                     <div className="space-y-2">
                       <Label htmlFor="signup-phone">Phone Number</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="(123) 456-7890"
                          value={phoneDisplay}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPhoneDisplay(formatPhoneDisplay(value));
                            setPhone(normalizePhoneToE164(value));
                          }}
                          required
                          className={phoneDisplay && !isValidPhone(phoneDisplay) ? "border-destructive" : ""}
                        />
                        {phoneDisplay && !isValidPhone(phoneDisplay) && (
                          <p className="text-sm text-destructive">
                            Please enter a valid US phone number (10 digits)
                          </p>
                        )}
                     </div>
                      <Button 
                        type="submit" 
                        disabled={loading || !isValidPhone(phoneDisplay)} 
                        className="w-full"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {showResend && (
                <div className="mt-4 p-3 bg-legacy-ink/5 rounded-lg border border-legacy-border">
                  <p className="text-sm text-legacy-ink/70 mb-2">
                    Didn't receive the confirmation email?
                  </p>
                  <Button 
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {resendLoading ? "Sending..." : "Resend confirmation email"}
                  </Button>
                </div>
              )}

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