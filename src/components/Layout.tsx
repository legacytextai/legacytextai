import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function Layout({ children, showSidebar = true }: LayoutProps) {
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <header className="border-b border-legacy-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-legacy-primary">LegacyText AI</h1>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-legacy-border bg-card/80 backdrop-blur-sm py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-legacy-ink/60">
                © 2025 LegacyText AI. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link 
                  to="/privacy" 
                  className="text-sm text-legacy-ink/60 hover:text-legacy-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms" 
                  className="text-sm text-legacy-ink/60 hover:text-legacy-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-warm">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="border-b border-legacy-border bg-card/80 backdrop-blur-sm">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-legacy-primary">LegacyText AI</h1>
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
          <footer className="border-t border-legacy-border bg-card/80 backdrop-blur-sm py-6">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-legacy-ink/60">
                  © 2025 LegacyText AI. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                  <Link 
                    to="/privacy" 
                    className="text-sm text-legacy-ink/60 hover:text-legacy-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link 
                    to="/terms" 
                    className="text-sm text-legacy-ink/60 hover:text-legacy-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}