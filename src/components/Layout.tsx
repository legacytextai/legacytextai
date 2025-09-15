import { ReactNode } from "react";
import { Link } from "react-router-dom";
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
      <div className="min-h-screen bg-gradient-warm">
        <header className="border-b border-legacy-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-legacy-primary">LegacyText AI</h1>
            <AuthButtons />
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
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </SidebarProvider>
  );
}

function SidebarLayout({ children }: { children: ReactNode }) {
  const { user, loading, authReady } = useAuth();
  const isMobile = useIsMobile();
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

  return (
    <div className="min-h-screen flex w-full bg-gradient-warm">
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <header className="border-b border-legacy-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-3 flex flex-col">
            <div className="flex items-center justify-between h-10">
              <h1 className="text-2xl font-bold text-legacy-primary">LegacyText AI</h1>
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
  );
}