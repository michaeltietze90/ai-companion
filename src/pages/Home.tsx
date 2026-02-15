import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Presentation, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/appConfig";

/**
 * Home Page - App Selection
 * When VITE_APP_MODE=frank-keynote: Keynote only
 * When VITE_APP_MODE=frank-chat: Chat only
 * Otherwise: Full platform (Keynote + Pitch)
 */
const Home = () => {
  const { appMode, title, keynoteOnly, chatOnly, keynoteTitle, keynoteSubtitle, chatTitle, chatSubtitle } = appConfig;

  // Redirect to single app when in Frank mode
  if (keynoteOnly) {
    return <Navigate to="/keynote" replace />;
  }
  if (chatOnly) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose your experience
          </p>
        </motion.div>

        {/* App Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Keynote Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/keynote">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                    <Presentation className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {keynoteTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {keynoteSubtitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
                    <span className="px-2 py-1 rounded bg-secondary">Keynote</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Launch Keynote
                  </Button>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Chat to Frank */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: appMode === 'full' ? 0.3 : 0.1 }}
          >
            <Link to="/chat">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/20">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {chatTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {chatSubtitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
                    <span className="px-2 py-1 rounded bg-secondary">Chat</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Chat with Frank
                  </Button>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {appConfig.showProtoM 
            ? "All apps support Proto M (1080x1920) and Proto L (2160x3840) fullscreen modes"
            : "Fullscreen Proto L (2160x3840) available for each app"}
        </motion.p>
      </div>
    </div>
  );
};

export default Home;
