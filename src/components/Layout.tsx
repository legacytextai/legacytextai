import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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
              <Button variant="ghost" size="sm">
                Login
              </Button>
              <Button variant="default" size="sm">
                Sign Up
              </Button>
            </div>
          </div>
        </header>
        <main>{children}</main>
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
                <Button variant="ghost" size="sm">
                  Login
                </Button>
                <Button variant="default" size="sm">
                  Sign Up
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}