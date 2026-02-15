import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeynoteConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useDeepgramStreaming } from "@/hooks/useDeepgramStreaming";
import { KEYNOTE_AGENTS, DEFAULT_KEYNOTE_AGENT_ID } from "@/config/agents";
import { appConfig } from "@/config/appConfig";
import { preloadTriggerVideos } from "@/lib/hardcodedTriggers";
import { debugLog } from "@/stores/debugStore";

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
  const { activeVisuals } = useVisualOverlayStore();
  
  // Must be defined BEFORE useScopedAvatarConversation hook
  const defaultAgentId = (appConfig.appMode === 'frank-keynote' || appConfig.appMode === 'frank-full') ? undefined : DEFAULT_KEYNOTE_AGENT_ID;

  const {
    isConnected,
    isConnecting: isAvatarConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
  } = useScopedAvatarConversation({
    store: useKeynoteConversationStore,
    voiceSettings,
    defaultAgentId,
    availableAgents: KEYNOTE_AGENTS,
    useJsonMode: false,
  });

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[KeynoteProtoL] Voice transcript:', transcript);
    debugLog('voice-transcript', 'User', `🎤 "${transcript}"`);
    sendMessage(transcript);
  }, [sendMessage]);

  // Deepgram streaming with built-in VAD - no barge-in (don't interrupt avatar)
  // Keynote-specific keywords for the 4 expected phrases
  const keynoteKeywords = [
    { word: "UKI", boost: 5 },
    { word: "Are you Miguel", boost: 5 },
    { word: "Miguel", boost: 4 },
    { word: "agentic enterprise", boost: 5 },
    { word: "agentic", boost: 4 },
    { word: "enterprise", boost: 3 },
    { word: "net new AOV", boost: 5 },
    { word: "net new", boost: 4 },
    { word: "AOV", boost: 4 },
    { word: "backflip", boost: 5 },
    { word: "back flip", boost: 5 },
  ];

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
      keywords: keynoteKeywords,
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

  // Preload trigger videos on mount for instant playback
  useEffect(() => {
    preloadTriggerVideos();
  }, []);

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

      {/* Subtle status indicator - mid right */}
      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-16 z-30"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 px-8 py-4 rounded-full bg-black/40 backdrop-blur-sm">
            {/* Subtle animated dot */}
            <motion.div
              className={`w-3 h-3 rounded-full ${
                isSpeaking 
                  ? 'bg-green-400' 
                  : (isThinking || isProcessing)
                    ? 'bg-amber-400' 
                    : isListening 
                      ? 'bg-green-400' 
                      : 'bg-gray-400'
              }`}
              animate={(isListening || isThinking || isProcessing) ? { 
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              } : {}}
              transition={{ 
                duration: (isThinking || isProcessing) ? 0.8 : 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-white/80 text-xl font-light tracking-wide">
              {isSpeaking 
                ? 'Speaking' 
                : (isThinking || isProcessing)
                  ? 'Thinking...' 
                  : isListening 
                    ? 'Listening' 
                    : 'Ready'}
            </span>
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
              {isConnectingAny ? 'Connecting...' : `${appConfig.keynoteTitle} Ready`}
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
                  Start {appConfig.keynoteTitle}
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
