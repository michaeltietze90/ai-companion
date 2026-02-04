import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, MessageCircle, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Home Page - App Selection
 * Allows users to choose between Keynote Avatar and Chat Avatar
 */
const Home = () => {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Miguel Avatar Platform
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose your experience
          </p>
        </motion.div>

        {/* App Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Keynote Avatar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/keynote">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                    <Presentation className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Miguel Keynote Avatar
                  </h2>
                  
                  <p className="text-muted-foreground mb-6">
                    CKO Keynote Agent for presentations and demonstrations
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <span className="px-2 py-1 rounded bg-secondary">Agent: CKO Keynote</span>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Launch Keynote
                  </Button>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Chat Avatar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/chat">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Chat with Miguel Avatar
                  </h2>
                  
                  <p className="text-muted-foreground mb-6">
                    Interactive chat experience with multiple agent options
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
                    <span className="px-2 py-1 rounded bg-secondary">Chat with Miguel</span>
                    <span className="px-2 py-1 rounded bg-secondary">Script Based</span>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Launch Chat
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
          transition={{ delay: 0.4 }}
        >
          Both apps support Proto M (1080x1920) and Proto L (2160x3840) fullscreen modes
        </motion.p>
      </div>
    </div>
  );
};

export default Home;
