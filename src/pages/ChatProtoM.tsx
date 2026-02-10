import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { SlideOverlay } from "@/components/Overlay/SlideOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useDeepgramStreaming } from "@/hooks/useDeepgramStreaming";
import { CHAT_AGENTS, DEFAULT_CHAT_AGENT_ID } from "@/config/agents";
import { preloadTriggerVideos } from "@/lib/hardcodedTriggers";

/**
 * Chat Proto M Fullscreen Page
 * Resolution: 1080x1920 (9:16 portrait)
 * 
 * Simple flow:
 * 1. Agent greets
 * 2. Auto-start listening
 * 3. Only send if speech detected + 500ms silence
 * 4. While agent speaks: don't listen
 * 5. When agent finishes: go back to step 2
 */
const ChatProtoM = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.chat);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
  } = useScopedAvatarConversation({
    store: useChatConversationStore,
    voiceSettings,
    defaultAgentId: DEFAULT_CHAT_AGENT_ID,
    availableAgents: CHAT_AGENTS,
    useJsonMode: true,
  });

  const { activeVisuals } = useVisualOverlayStore();
  const { setOnStartCallback, setOnNameSubmitCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[ChatProtoM] Voice transcript:', transcript);
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

  // Auto-listen when avatar finishes speaking
  useEffect(() => {
    if (isConnected && wasSpeakingRef.current && !isSpeaking) {
      console.log('[ChatProtoM] Avatar stopped speaking, auto-starting listen');
      startListening();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isConnected, startListening]);

  // Re-start listening if recording stopped but no message was sent
  const wasListeningRef = useRef(false);
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    const wasActive = wasListeningRef.current || wasProcessingRef.current;
    const nowIdle = !isListening && !isProcessing;
    
    if (isConnected && !isSpeaking && wasActive && nowIdle) {
      console.log('[ChatProtoM] Recording/processing ended, restarting listen in 300ms');
      const timer = setTimeout(() => startListening(), 300);
      return () => clearTimeout(timer);
    }
    
    wasListeningRef.current = isListening;
    wasProcessingRef.current = isProcessing;
  }, [isListening, isProcessing, isSpeaking, isConnected, startListening]);

  const handleStart = useCallback(() => {
    startConversation(videoRef.current);
  }, [startConversation]);

  useEffect(() => {
    setOnStartCallback(handleStart);
    return () => setOnStartCallback(null);
  }, [handleStart, setOnStartCallback]);

  // Register callback to send message when user edits their name entry
  useEffect(() => {
    setOnNameSubmitCallback(sendMessage);
    return () => setOnNameSubmitCallback(null);
  }, [sendMessage, setOnNameSubmitCallback]);

  // Preload trigger videos on mount for instant playback
  useEffect(() => {
    preloadTriggerVideos();
  }, []);

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
      <VisualOverlay visuals={activeVisuals} />

      <main className="absolute inset-0 z-10">
        <HologramAvatar 
          isConnected={isConnected} 
          isSpeaking={isSpeaking}
          videoRef={videoRef}
        />
        <QuizOverlayManager />
        <SlideOverlay />
      </main>

      {/* Subtle status indicator - mid right */}
      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-8 z-30"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-sm">
            {/* Subtle animated dot */}
            <motion.div
              className={`w-2 h-2 rounded-full ${
                isSpeaking 
                  ? 'bg-blue-400' 
                  : (isThinking || isProcessing)
                    ? 'bg-amber-400' 
                    : isListening 
                      ? 'bg-blue-400' 
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
            <span className="text-white/80 text-base font-light tracking-wide">
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
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-3 h-3 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-blue-500'} animate-pulse`} />
            <span className="text-base text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Chat Ready'}
            </span>
          </motion.div>
        </div>
      )}

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
              className="px-16 py-8 text-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 rounded-2xl"
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
                  Start Chat
                </>
              )}
            </Button>
          )}
        </motion.div>
      </footer>
      
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 1080), calc(100vh / 1920));
        }
      `}</style>
    </div>
  );
};

export default ChatProtoM;
