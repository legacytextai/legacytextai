import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoImage from "@/assets/logo.png";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function Layout({ children, showSidebar = true }: LayoutProps) {
  const { user, loading, authReady } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const AuthButtons = () => {
    if (!authReady || loading) {
      return <div className="w-20 h-9 bg-muted animate-pulse rounded" />;
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-legacy-primary text-white">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
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
    );
  };

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-black">
        <header className="bg-black border-b border-white/10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="text-white text-xl font-semibold hover:text-gray-300 transition-colors">
              LegacyText
            </Link>
            <div className="flex items-center gap-3">
              {!authReady || loading ? (
                <div className="w-20 h-9 bg-white/10 animate-pulse rounded" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-white/10">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-white/10 text-white">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10" align="end" forceMount>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center text-white hover:bg-white/10">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center text-white hover:bg-white/10">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-white/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="sm" className="bg-black text-white hover:bg-black/90 rounded-lg px-6">
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm" className="bg-white text-black hover:bg-gray-100 rounded-lg px-6">
                      Try for free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 bg-black py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                © 2025 LegacyText AI. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link 
                  to="/privacy" 
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms" 
                  className="text-sm text-gray-400 hover:text-white transition-colors"
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
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </SidebarProvider>
  );
}

function SidebarLayout({ children }: { children: ReactNode }) {
  const { user, loading, authReady } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const AuthButtons = () => {
    if (!authReady || loading) {
      return <div className="w-20 h-9 bg-muted animate-pulse rounded" />;
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-legacy-primary text-white">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Link to="/auth">
          <Button size="sm" className="bg-black text-white hover:bg-black/90 rounded-lg px-6">
            Login
          </Button>
        </Link>
        <Link to="/auth">
          <Button size="sm" className="bg-white text-black hover:bg-gray-100 rounded-lg px-6">
            Try for free
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-warm">
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <header className="border-b border-legacy-border bg-card/80 backdrop-blur-sm">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col">
            <div className="flex items-center justify-between h-10">
            <button 
              onClick={() => navigate("/dashboard")}
              className="text-2xl font-bold text-legacy-primary hover:text-legacy-accent transition-colors cursor-pointer"
            >
              LegacyText AI
            </button>
              <AuthButtons />
            </div>
            {isMobile && (
              <div className="flex justify-start mt-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden p-2"
                  onClick={toggleSidebar}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 py-4 sm:py-6">
          {children}
        </div>
        <footer className="border-t border-legacy-border bg-card/80 backdrop-blur-sm py-6">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
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
  );
}