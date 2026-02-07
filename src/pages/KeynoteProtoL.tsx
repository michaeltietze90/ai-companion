import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
// Note: Mic button is now status-only (no toggle) - listening is automatic
import { useKeynoteConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useSilenceTranscription } from "@/hooks/useSilenceTranscription";
import { KEYNOTE_AGENTS, DEFAULT_KEYNOTE_AGENT_ID } from "@/config/agents";

/**
 * Keynote Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * 
 * Simple flow:
 * 1. Agent greets
 * 2. Auto-start listening
 * 3. Only send if speech detected + 500ms silence
 * 4. While agent speaks: don't listen
 * 5. When agent finishes: go back to step 2
 */
const KeynoteProtoL = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.keynote);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    startConversation,
    sendMessage,
  } = useScopedAvatarConversation({
    store: useKeynoteConversationStore,
    voiceSettings,
    defaultAgentId: DEFAULT_KEYNOTE_AGENT_ID,
    availableAgents: KEYNOTE_AGENTS,
    useJsonMode: true,
  });

  const { activeVisuals } = useVisualOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[KeynoteProtoL] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  // Simple voice input: disabled while speaking, 500ms silence threshold
  const { isListening, startListening, isProcessing } = useSilenceTranscription(
    handleVoiceTranscript,
    { disabled: isSpeaking }
  );

  // Track previous speaking state for auto-listen
  const wasSpeakingRef = useRef(false);

  // Auto-listen when avatar finishes speaking
  useEffect(() => {
    if (isConnected && wasSpeakingRef.current && !isSpeaking) {
      console.log('[KeynoteProtoL] Avatar stopped speaking, auto-starting listen');
      startListening();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isConnected, startListening]);

  // Re-start listening if recording stopped but no message was sent
  // (e.g., empty transcription, filtered recording, or error)
  const wasListeningRef = useRef(false);
  useEffect(() => {
    // If we were listening, stopped, finished processing, and avatar isn't speaking - restart
    if (isConnected && !isSpeaking && wasListeningRef.current && !isListening && !isProcessing) {
      console.log('[KeynoteProtoL] Recording ended without sending, restarting listen');
      const timer = setTimeout(() => startListening(), 300); // Small delay to avoid rapid restarts
      return () => clearTimeout(timer);
    }
    wasListeningRef.current = isListening;
  }, [isListening, isProcessing, isSpeaking, isConnected, startListening]);

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
      <VisualOverlay visuals={activeVisuals} />

      <main className="absolute inset-0 z-10">
        <HologramAvatar 
          isConnected={isConnected} 
          isSpeaking={isSpeaking}
          videoRef={videoRef}
        />
      </main>

      {/* Status indicator - listening is automatic */}
      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-16 z-30"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`w-48 h-48 rounded-full flex items-center justify-center ${
              isSpeaking 
                ? 'bg-amber-500' 
                : isListening 
                  ? 'bg-green-500' 
                  : 'bg-gray-600'
            }`}
          >
            {isSpeaking ? (
              <MicOff className="w-24 h-24 text-white" />
            ) : (
              <Mic className={`w-24 h-24 text-white ${isListening ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div className="text-center mt-4 text-white text-lg">
            {isSpeaking ? 'Agent Speaking' : isListening ? 'Listening...' : 'Ready'}
          </div>
        </motion.div>
      )}

      {!isConnected && (
        <div className="absolute top-64 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-6 px-12 py-6 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-6 h-6 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
            <span className="text-2xl text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Keynote Ready'}
            </span>
          </motion.div>
        </div>
      )}

      {!isConnected && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
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
                  Start Keynote
                </>
              )}
            </Button>
          </motion.div>
        </div>
      )}
      
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 2160), calc(100vh / 3840));
        }
      `}</style>
    </div>
  );
};

export default KeynoteProtoL;
