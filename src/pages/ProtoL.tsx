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
 * Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * Minimal UI - just avatar with mic mute/unmute control
 */
const ProtoL = () => {
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
    console.log('[ProtoL] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  // Use the actual ElevenLabs STT hook for mic control
  const { isListening, toggleListening, startListening, stopListening } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
    startConversation(videoRef.current);
  };


  return (
    <div 
      className="relative overflow-hidden bg-black"
      style={{ 
        width: '2160px', 
        height: '3840px',
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

      {/* Mic Mute Button - Middle Right */}
      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-16 z-30"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            size="lg"
            variant="ghost"
            className={`w-28 h-28 rounded-full ${
              isListening 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            onClick={toggleListening}
          >
            {isListening ? (
              <Mic className="w-14 h-14 text-white" />
            ) : (
              <MicOff className="w-14 h-14 text-white" />
            )}
          </Button>
        </motion.div>
      )}

      {/* Status Indicator - only when not connected */}
      {!isConnected && (
        <div className="absolute top-64 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-6 px-12 py-6 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-6 h-6 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
            <span className="text-2xl text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Ready'}
            </span>
          </motion.div>
        </div>
      )}

      {/* Minimal Controls - Start button only */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-16">
        <motion.div
          className="flex items-center justify-center gap-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected && (
            <Button
              size="lg"
              className="px-24 py-12 text-3xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/30 rounded-3xl"
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-10 h-10 mr-6 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="w-10 h-10 mr-6" />
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
          --proto-scale: min(calc(100vw / 2160), calc(100vh / 3840));
        }
      `}</style>
    </div>
  );
};

export default ProtoL;