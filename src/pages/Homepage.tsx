import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, BookOpen, Smartphone, Heart } from "lucide-react";

export default function Homepage() {
  return (
    <Layout showSidebar={false}>
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
                <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Start Your Free Legacy Journal
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  <BookOpen className="w-5 h-5 mr-2" />
                  See How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-legacy-warm/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-legacy-primary mb-12">
              How LegacyText Works
            </h2>
            
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
            <Button variant="accent" size="lg" className="text-lg px-8 py-6">
              <MessageSquare className="w-5 h-5 mr-2" />
              Begin Your Legacy Journal
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}