import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import KeynoteAvatar from "./pages/KeynoteAvatar";
import ChatAvatar from "./pages/ChatAvatar";
import PitchAvatar from "./pages/PitchAvatar";
import KeynoteProtoM from "./pages/KeynoteProtoM";
import KeynoteProtoL from "./pages/KeynoteProtoL";
import ChatProtoM from "./pages/ChatProtoM";
import ChatProtoL from "./pages/ChatProtoL";
import PitchProtoM from "./pages/PitchProtoM";
import PitchProtoL from "./pages/PitchProtoL";

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
          
          {/* Chat Avatar Routes */}
          <Route path="/chat" element={<ChatAvatar />}>
            <Route path="proto-m" element={<ChatProtoM />} />
            <Route path="proto-l" element={<ChatProtoL />} />
          </Route>
          
          {/* Pitch Agent Script Routes */}
          <Route path="/pitch" element={<PitchAvatar />}>
            <Route path="proto-m" element={<PitchProtoM />} />
            <Route path="proto-l" element={<PitchProtoL />} />
          </Route>
          
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
