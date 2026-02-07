import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeynoteConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useDeepgramStreaming } from "@/hooks/useDeepgramStreaming";
import { KEYNOTE_AGENTS, DEFAULT_KEYNOTE_AGENT_ID } from "@/config/agents";

/**
 * Keynote Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * 
 * Uses Deepgram Streaming with built-in VAD:
 * 1. Streams audio continuously to Deepgram
 * 2. Deepgram's endpointing detects speech end
 * 3. speech_final triggers transcript send
 * 4. While agent speaks: streaming paused, but can trigger barge-in
 */
const KeynoteProtoL = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.keynote);

  const {
    isConnected,
    isConnecting: isAvatarConnecting,
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

  // Deepgram streaming with built-in VAD - no barge-in (don't interrupt avatar)
  const { 
    isListening, 
    isConnecting: isVoiceConnecting, 
    isProcessing, 
    startListening, 
    stopListening 
  } = useDeepgramStreaming(
    handleVoiceTranscript,
    { 
      disabled: isSpeaking,
      utteranceEndMs: 1000, // 1 second silence = end of utterance
    }
  );

  // Track previous speaking state for auto-listen
  const wasSpeakingRef = useRef(false);

  // Auto-start streaming when avatar finishes speaking
  useEffect(() => {
    if (isConnected && wasSpeakingRef.current && !isSpeaking) {
      console.log('[KeynoteProtoL] Avatar stopped speaking, starting Deepgram stream');
      startListening();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isConnected, startListening]);

  // Stop streaming when avatar starts speaking (but keep connection for barge-in)
  // Actually, we'll keep streaming for barge-in detection - just won't send transcripts

  const handleStart = () => {
    startConversation(videoRef.current);
  };
  
  const isConnectingAny = isAvatarConnecting || isVoiceConnecting;

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

      {/* Status indicator - Deepgram streaming */}
      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-16 z-30"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-colors ${
              isSpeaking 
                ? 'bg-amber-500' 
                : isProcessing
                  ? 'bg-blue-500'
                  : isListening 
                    ? 'bg-green-500' 
                    : isVoiceConnecting
                      ? 'bg-gray-500 animate-pulse'
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
            {isSpeaking 
              ? 'Agent Speaking' 
              : isProcessing 
                ? 'Processing...'
                : isListening 
                  ? 'Listening' 
                  : isVoiceConnecting
                    ? 'Connecting...'
                    : 'Ready'}
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
            <div className={`w-6 h-6 rounded-full ${isConnectingAny ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
            <span className="text-2xl text-muted-foreground">
              {isConnectingAny ? 'Connecting...' : 'Keynote Ready'}
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
              disabled={isConnectingAny}
            >
              {isConnectingAny ? (
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
