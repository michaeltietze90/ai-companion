import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { appConfig } from "@/config/appConfig";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import KeynoteAvatar from "./pages/KeynoteAvatar";
import PitchAvatar from "./pages/PitchAvatar";
import ChatAvatar from "./pages/ChatAvatar";
import KeynoteProtoM from "./pages/KeynoteProtoM";
import KeynoteProtoL from "./pages/KeynoteProtoL";
import KeynoteProtoLAlwaysListening from "./pages/KeynoteProtoLAlwaysListening";
import PitchProtoM from "./pages/PitchProtoM";
import PitchProtoL from "./pages/PitchProtoL";
import PitchProtoLAlwaysListening from "./pages/PitchProtoLAlwaysListening";
import ChatProtoM from "./pages/ChatProtoM";
import ChatProtoL from "./pages/ChatProtoL";
import LogViewer from "./pages/LogViewer";
import AdminSettings from "./pages/AdminSettings";

const queryClient = new QueryClient();

/** Redirect /chat to /keynote when keynote-only, and /keynote to /chat when chat-only */
function AppModeRedirect({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (appConfig.keynoteOnly && loc.pathname.startsWith('/chat')) {
    return <Navigate to="/keynote" replace />;
  }
  if (appConfig.chatOnly && loc.pathname.startsWith('/keynote')) {
    return <Navigate to="/chat" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppModeRedirect>
        <Routes>
          {/* Home - App Selection */}
          <Route path="/" element={<Home />} />
          
          {/* Keynote Avatar Routes */}
          <Route path="/keynote" element={<KeynoteAvatar />}>
            <Route path="proto-m" element={<KeynoteProtoM />} />
            <Route path="proto-l" element={<KeynoteProtoL />} />
          </Route>
          
          {/* Pitch Agent Script Routes */}
          <Route path="/pitch" element={<PitchAvatar />}>
            <Route path="proto-m" element={<PitchProtoM />} />
            <Route path="proto-l" element={<PitchProtoL />} />
          </Route>
          
          {/* Chat to Frank Routes */}
          <Route path="/chat" element={<ChatAvatar />}>
            <Route path="proto-m" element={<ChatProtoM />} />
            <Route path="proto-l" element={<ChatProtoL />} />
          </Route>
          
          {/* Always Listening Proto L Routes */}
          <Route path="/keynote/alwayslistening" element={<KeynoteProtoLAlwaysListening />} />
          <Route path="/pitch/alwayslistening" element={<PitchProtoLAlwaysListening />} />
          
          {/* Log Viewer (mobile-optimized) */}
          <Route path="/logs" element={<LogViewer />} />
          
          {/* Admin Settings */}
          <Route path="/admin" element={<AdminSettings />} />
          
          {/* Legacy redirects */}
          <Route path="/proto-m" element={<Navigate to="/keynote/proto-m" replace />} />
          <Route path="/proto-l" element={<Navigate to="/keynote/proto-l" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AppModeRedirect>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
