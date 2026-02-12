import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import KeynoteAvatar from "./pages/KeynoteAvatar";
import PitchAvatar from "./pages/PitchAvatar";
import KeynoteProtoM from "./pages/KeynoteProtoM";
import KeynoteProtoL from "./pages/KeynoteProtoL";
import KeynoteProtoLAlwaysListening from "./pages/KeynoteProtoLAlwaysListening";
import PitchProtoM from "./pages/PitchProtoM";
import PitchProtoL from "./pages/PitchProtoL";
import PitchProtoLAlwaysListening from "./pages/PitchProtoLAlwaysListening";
import LogViewer from "./pages/LogViewer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          
          {/* Always Listening Proto L Routes */}
          <Route path="/keynote/alwayslistening" element={<KeynoteProtoLAlwaysListening />} />
          <Route path="/pitch/alwayslistening" element={<PitchProtoLAlwaysListening />} />
          
          {/* Log Viewer (mobile-optimized) */}
          <Route path="/logs" element={<LogViewer />} />
          
          {/* Legacy redirects */}
          <Route path="/proto-m" element={<Navigate to="/keynote/proto-m" replace />} />
          <Route path="/proto-l" element={<Navigate to="/keynote/proto-l" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
