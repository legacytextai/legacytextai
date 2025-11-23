import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import DebugControls from "@/components/DebugControls";
import { DebugOverlay } from "@/components/DebugOverlay";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Export from "./pages/Export";
import Editor from "./pages/Editor";
import MediaLibrary from "./pages/MediaLibrary";
import Journal from "./pages/Journal";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import DiagAuth from "./pages/DiagAuth";
import TestPhoneVerification from "./pages/TestPhoneVerification";
import QuickVerificationTest from "./pages/QuickVerificationTest";
import FixUser from "./pages/FixUser";
import AdminExport from "./pages/AdminExport";
import AdminPrompts from "./pages/AdminPrompts";
import AdminPromptsView from "./pages/AdminPromptsView";
import AdminBlast from "./pages/AdminBlast";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGuard>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/export" element={<Export />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/diag/auth" element={<DiagAuth />} />
          <Route path="/test/phone-verification" element={<TestPhoneVerification />} />
          <Route path="/test/quick-verification" element={<QuickVerificationTest />} />
          <Route path="/fix-user" element={<FixUser />} />
            <Route path="/admin/export" element={<AdminExport />} />
            <Route path="/admin/prompts" element={<AdminPrompts />} />
            <Route path="/admin/prompts/view" element={<AdminPromptsView />} />
            <Route path="/admin/blast" element={<AdminBlast />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthGuard>
      {import.meta.env.DEV && (
        <>
          <DebugControls />
          <DebugOverlay />
        </>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
