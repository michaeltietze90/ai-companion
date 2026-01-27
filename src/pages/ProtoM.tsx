import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";

/**
 * Proto M Fullscreen Page
 * Resolution: 1080x1920 (9:16 portrait)
 * Minimal UI - just avatar with mic mute/unmute control
 */
const ProtoM = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    startConversation,
    sendMessage,
  } = useAvatarConversation();

  const { demoMode } = useConversationStore();
  const { activeVisuals } = useVisualOverlayStore();

  // Handle voice transcript from STT
  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[ProtoM] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  // Use the actual ElevenLabs STT hook for mic control
  const { isListening, toggleListening, startListening, stopListening } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
    startConversation(videoRef.current);
  };

  // Toggle mic - actually starts/stops the STT
  const handleMicToggle = () => {
    toggleListening();
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
            className={`w-16 h-16 rounded-full ${
              isListening 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            onClick={handleMicToggle}
          >
            {isListening ? (
              <Mic className="w-8 h-8 text-white" />
            ) : (
              <MicOff className="w-8 h-8 text-white" />
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

      {/* Minimal Controls - Start button only */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-8">
        <motion.div
          className="flex items-center justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected && (
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