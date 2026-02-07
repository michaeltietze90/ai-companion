import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Play, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeynoteConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useSilenceTranscription } from "@/hooks/useSilenceTranscription";
import { KEYNOTE_AGENTS, DEFAULT_KEYNOTE_AGENT_ID } from "@/config/agents";

/**
 * Keynote Proto L Always Listening Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * 
 * This version is always listening when connected.
 * Use physical mic mute to control when to send.
 * Silence detection uses very long timeout (5 minutes) so it effectively
 * only sends when you manually stop or the physical mic goes silent.
 */
const KeynoteProtoLAlwaysListening = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.keynote);
  const conversationState = useKeynoteConversationStore();

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
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
    console.log('[KeynoteProtoL-AlwaysListening] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  // Use very long silence threshold (5 minutes = 300000ms) so it effectively never auto-stops
  // Also use very long max recording time (10 minutes)
  const { isListening, startListening, stopListening } = useSilenceTranscription(
    handleVoiceTranscript,
    { 
      disabled: isSpeaking,
      silenceMs: 300000, // 5 minutes - effectively infinite
      maxRecordMs: 600000, // 10 minutes max
    }
  );

  // Auto-start listening when connected
  useEffect(() => {
    if (isConnected && !isSpeaking && !isListening) {
      console.log('[KeynoteProtoL-AlwaysListening] Auto-starting continuous listen');
      startListening();
    }
  }, [isConnected, isSpeaking, isListening, startListening]);

  // Re-start listening after avatar stops speaking
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (isConnected && wasSpeakingRef.current && !isSpeaking) {
      console.log('[KeynoteProtoL-AlwaysListening] Avatar stopped speaking, resuming listen');
      startListening();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isConnected, startListening]);

  const handleStart = () => {
    startConversation(videoRef.current);
  };

  // Manual send - stop listening to trigger transcription, then restart
  const handleManualSend = useCallback(() => {
    if (isListening) {
      console.log('[KeynoteProtoL-AlwaysListening] Manual send triggered');
      stopListening(false); // false = don't discard, transcribe and send
    }
  }, [isListening, stopListening]);

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

      {/* Always listening indicator - no toggle button, just status */}
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
            className={`w-48 h-48 rounded-full ${
              isListening 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
            onClick={handleManualSend}
            title={isListening ? "Click to send now" : "Waiting..."}
          >
            <Mic className={`w-24 h-24 text-white ${isListening ? 'animate-pulse' : ''}`} />
          </Button>
          <div className="text-center mt-4 text-white text-lg">
            {isListening ? 'Always Listening' : 'Processing...'}
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
              {isConnecting ? 'Connecting...' : 'Keynote Ready (Always Listening)'}
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

export default KeynoteProtoLAlwaysListening;
