import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import v2Icon from "@/assets/v2-icon.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Heart, MessageCircle, Star, MessageSquare, Edit3, Sparkles, User } from "lucide-react";
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
      {/* Chronicle-Inspired Black Theme Wrapper */}
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Blurred gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-white/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-white/12 rounded-full blur-[110px]" />
        </div>
        
        {/* Content wrapper with relative positioning */}
        <div className="relative z-10">
        {/* Hero Section */}
        <section className="px-4 pt-8 pb-6 md:pt-12 md:pb-10 lg:pt-16 lg:pb-12">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center space-y-3 md:space-y-4 lg:space-y-5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] max-w-4xl mx-auto animate-fade-in">
                A journal for your children — created by texting your thoughts.
              </h1>
              
              
              
              <p className="text-sm sm:text-base md:text-lg text-white max-w-2xl mx-auto text-center"><span className="font-bold">No app. No downloads.</span><br /><span className="font-light text-left block mx-auto w-fit">1. Create an account.<br />2. Start texting your thoughts.<br />3. Get a journal your kids keep forever.</span></p>
              
              {/* CTA Buttons */}
              <div className="flex flex-row gap-2 pt-3 md:pt-4 lg:pt-6 justify-center">
                <Button className="bg-white text-black hover:bg-gray-100 text-xs sm:text-sm md:text-base font-normal px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4 rounded-lg" onClick={() => navigate('/auth')}>
                  Get started free
                </Button>
                <Button className="bg-transparent text-white hover:bg-white/5 text-xs sm:text-sm md:text-base font-normal px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4 rounded-lg border border-white/20" onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({
                    behavior: 'smooth'
                  });
                }}>
                  Learn More
                </Button>
              </div>
              
              {/* Hero Video */}
              <div className="aspect-[4/3] md:aspect-video rounded-xl md:rounded-2xl border border-white/10 overflow-hidden max-w-sm md:max-w-2xl lg:max-w-4xl mx-auto">
                <video className="w-full h-full object-cover" autoPlay muted loop playsInline>
                  <source src="/assets/videos/automatic.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points / Destination Section */}
        <section className="px-4 py-24 md:py-32" style={{
          background: 'linear-gradient(to bottom, #000000, #0a0a14, #000000)'
        }}>
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
              Imagine your kids discovering the father behind the role.
            </h2>
            
            {/* Three Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {/* Card 1 */}
              <div className="bg-black rounded-2xl p-8 md:p-10 hover:bg-white/[0.02] transition-all">
                <div className="flex justify-center mb-6">
                  <Heart className="w-12 h-12 text-white" />
                </div>
                <p className="text-white text-base md:text-lg leading-relaxed text-center font-light">
                  They open a book filled with your real thoughts — not filtered, not polished — just honest reflections about life, love, work, failure, and purpose.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-black rounded-2xl p-8 md:p-10 hover:bg-white/[0.02] transition-all">
                <div className="flex justify-center mb-6">
                  <MessageCircle className="w-12 h-12 text-white" />
                </div>
                <p className="text-white text-base md:text-lg leading-relaxed text-center font-light">
                  They hear your voice in every sentence, guiding them through their first heartbreak, their career choices, their fears.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-black rounded-2xl p-8 md:p-10 hover:bg-white/[0.02] transition-all md:col-span-2 lg:col-span-1">
                <div className="flex justify-center mb-6">
                  <Star className="w-12 h-12 text-white" />
                </div>
                <p className="text-white text-base md:text-lg leading-relaxed text-center font-light">
                  They feel like they truly know you, not just as 'Dad,' but as a man who lived, tried, failed, and passed on what mattered most.
                </p>
              </div>
            </div>

            {/* Bottom Text */}
            <p className="text-xl md:text-2xl text-white text-center max-w-4xl mx-auto mt-16 font-extralight">This isn't just journaling. <span className="font-bold">It's fatherhood, captured</span> — made effortless with AI and delivered through the medium you already use every day: <span className="font-bold underline">text messaging</span>.</p>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="px-4 py-24 md:py-32 bg-black">
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-center mb-8">
              <img src={v2Icon} alt="LegacyText Logo" className="w-12 h-auto md:w-16 object-contain" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-6">Introducing LegacyText</h2>
            
            <p className="text-xl md:text-2xl text-white font-extralight text-center max-w-3xl mx-auto mb-20">
              A text-based journaling tool that makes it quick and easy for fathers to reflect, organize, and preserve their wisdom — <span className="font-bold">one message at a time.</span>
            </p>

            {/* Three Steps */}
            <div className="grid md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">
                  Receive a daily prompt by text
                </h3>
                <p className="text-base text-gray-400 italic">Gentle questions that spark reflection</p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Edit3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">
                  Reply with your thoughts
                </h3>
                <p className="text-base text-gray-400 italic">In the moment, whenever it works for you</p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">
                  AI organizes and saves everything
                </h3>
                <p className="text-base text-gray-400 italic">Ready to export as a memoir when you're ready</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Empathy / CTA Section */}
        <section className="px-4 py-24 md:py-32 bg-black">
          <div className="container mx-auto max-w-7xl">
            {/* Testimonial Card */}
            <div className="bg-white/[0.05] border border-white/20 rounded-3xl p-10 md:p-12 max-w-3xl mx-auto mb-12" style={{
              boxShadow: '0 0 40px rgba(255, 255, 255, 0.05)'
            }}>
              {/* Avatar */}
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <User className="w-8 h-8 text-white" />
              </div>
              
              {/* Quote */}
              <p className="text-xl md:text-2xl text-gray-200 text-center mb-6 leading-relaxed">"As a father, I was overwhelmed by the fear that one day I wouldn't be around to guide my children through life. LegacyText was built to give fathers a way to show up, long after we're gone."</p>
              
              {/* Attribution */}
              <p className="text-base text-gray-400 text-center italic">
                — Founder, LegacyText
              </p>
            </div>

            {/* Final CTA Button */}
            <div className="text-center">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base px-16 py-7 rounded-xl w-full sm:w-auto" onClick={() => navigate('/auth')}>
                Start Your Legacy Journal Now
              </Button>
            </div>
          </div>
        </section>

        {/* Signup Form Modal - Preserved for Future Use */}
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
    </Layout>;
}