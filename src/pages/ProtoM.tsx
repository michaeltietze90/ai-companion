import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Volume2, VolumeX, Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";

/**
 * Proto M Fullscreen Page
 * Resolution: 1080x1920 (9:16 portrait)
 * Minimal UI - just avatar with mute/unmute control
 */
const ProtoM = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    startConversation,
    setListening,
  } = useAvatarConversation();

  const { demoMode } = useConversationStore();
  const { activeVisuals } = useVisualOverlayStore();

  const handleStart = () => {
    startConversation(videoRef.current);
  };

  const handleMicToggle = () => {
    const newMuted = !isMicMuted;
    setIsMicMuted(newMuted);
    setListening(!newMuted);
  };

  return (
    <div 
      className="relative overflow-hidden bg-black"
      style={{ 
        width: '1080px', 
        height: '1920px',
        transform: 'scale(var(--proto-scale, 1))',
        transformOrigin: 'top left',
      }}
    >
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Avatar - Full Screen */}
      <main className="absolute inset-0 z-10">
        <HologramAvatar 
          isConnected={isConnected} 
          isSpeaking={isSpeaking}
          videoRef={videoRef}
          isMuted={isMuted}
        />
      </main>

      {/* Mic Mute Button - Top Right */}
      {isConnected && (
        <motion.div
          className="absolute top-8 right-8 z-30"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            size="lg"
            variant="ghost"
            className={`w-16 h-16 rounded-full backdrop-blur-sm ${
              isMicMuted 
                ? 'bg-destructive/50 hover:bg-destructive/70' 
                : 'bg-secondary/50 hover:bg-secondary/80'
            }`}
            onClick={handleMicToggle}
          >
            {isMicMuted ? (
              <MicOff className="w-8 h-8 text-destructive-foreground" />
            ) : (
              <Mic className={`w-8 h-8 ${isListening ? 'text-primary animate-pulse' : 'text-foreground'}`} />
            )}
          </Button>
        </motion.div>
      )}

      {/* Status Indicator - only when not connected */}
      {!isConnected && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-3 h-3 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
            <span className="text-base text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Ready'}
            </span>
          </motion.div>
        </div>
      )}

      {/* Minimal Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-8">
        <motion.div
          className="flex items-center justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected ? (
            <Button
              size="lg"
              className="px-16 py-8 text-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/30 rounded-2xl"
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-3" />
                  Start
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="ghost"
              className="w-20 h-20 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Volume2 className="w-10 h-10 text-foreground" />
              )}
            </Button>
          )}
        </motion.div>
      </footer>
      
      {/* Scale script for responsive display */}
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 1080), calc(100vh / 1920));
        }
      `}</style>
    </div>
  );
};

export default ProtoM;
