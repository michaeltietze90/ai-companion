import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { CountdownOverlay } from "@/components/Overlay/CountdownOverlay";
import { ScoreOverlay } from "@/components/Overlay/ScoreOverlay";
import { SlideOverlay } from "@/components/Overlay/SlideOverlay";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { useCountdownStore } from "@/stores/countdownStore";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatConversationStore } from "@/stores/chatConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useDeepgramStreaming } from "@/hooks/useDeepgramStreaming";
import { CHAT_AGENTS, DEFAULT_CHAT_AGENT_ID } from "@/config/agents";
import { preloadTriggerVideos } from "@/lib/hardcodedTriggers";
import { debugLog } from "@/stores/debugStore";

/**
 * Chat to Frank Proto M Fullscreen Page
 * Resolution: 1080x1920 (9:16 portrait)
 */
const ChatProtoM = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceSettings = useAppVoiceSettingsStore(state => state.chat);

  const {
    isConnected,
    isConnecting: isAvatarConnecting,
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
  const { isVisible: countdownActive, setOnExpireCallback } = useCountdownStore();
  const { setOnStartCallback, setOnNameSubmitCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    debugLog('voice-transcript', 'User', `🎤 "${transcript}"`);
    sendMessage(transcript);
  }, [sendMessage]);

  const { isListening, isConnecting: isVoiceConnecting, isProcessing, startListening, stopListening, flushAndSend } = useDeepgramStreaming(
    handleVoiceTranscript,
    { disabled: isSpeaking, utteranceEndMs: countdownActive ? 5000 : 1000, endpointingMs: countdownActive ? 5000 : 500 }
  );

  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (isConnected && wasSpeakingRef.current && !isSpeaking) startListening();
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isConnected, startListening]);

  const wasListeningRef = useRef(false);
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    const wasActive = wasListeningRef.current || wasProcessingRef.current;
    const nowIdle = !isListening && !isProcessing;
    if (isConnected && !isSpeaking && wasActive && nowIdle) {
      const timer = setTimeout(() => startListening(), 300);
      return () => clearTimeout(timer);
    }
    wasListeningRef.current = isListening;
    wasProcessingRef.current = isProcessing;
  }, [isListening, isProcessing, isSpeaking, isConnected, startListening]);

  const handleStart = useCallback(() => startConversation(videoRef.current), [startConversation]);
  useEffect(() => { setOnStartCallback(handleStart); return () => setOnStartCallback(null); }, [handleStart, setOnStartCallback]);
  useEffect(() => { setOnNameSubmitCallback(sendMessage); return () => setOnNameSubmitCallback(null); }, [sendMessage, setOnNameSubmitCallback]);
  useEffect(() => preloadTriggerVideos(), []);
  useEffect(() => {
    const handleCountdownExpire = () => { flushAndSend(); stopListening(); };
    setOnExpireCallback(handleCountdownExpire);
    return () => setOnExpireCallback(null);
  }, [flushAndSend, stopListening, setOnExpireCallback]);

  const isConnectingAny = isAvatarConnecting || isVoiceConnecting;

  return (
    <div className="relative overflow-hidden bg-black" style={{ width: '1080px', height: '1920px', transform: 'scale(var(--proto-scale, 1))', transformOrigin: 'top left' }}>
      <VisualOverlay visuals={activeVisuals} />
      <main className="absolute inset-0 z-10">
        <HologramAvatar isConnected={isConnected} isSpeaking={isSpeaking} videoRef={videoRef} />
        <QuizOverlayManager />
        <CountdownOverlay />
        <ScoreOverlay />
        <SlideOverlay />
      </main>

      {isConnected && (
        <motion.div className="absolute top-1/2 -translate-y-1/2 right-8 z-30" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-sm">
            <motion.div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400' : (isThinking || isProcessing) ? 'bg-amber-400' : isListening ? 'bg-cyan-400' : 'bg-gray-400'}`}
              animate={(isListening || isThinking || isProcessing) ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
            <span className="text-white/80 text-base font-light">{isSpeaking ? 'Speaking' : (isThinking || isProcessing) ? 'Thinking...' : isListening ? 'Listening' : 'Ready'}</span>
          </div>
        </motion.div>
      )}

      {!isConnected && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20">
          <motion.div className="flex items-center gap-3 px-6 py-3 rounded-full bg-secondary/80 backdrop-blur-md border border-border" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`w-3 h-3 rounded-full ${isConnectingAny ? 'bg-amber-400' : 'bg-cyan-500'} animate-pulse`} />
            <span className="text-base text-muted-foreground">{isConnectingAny ? 'Connecting...' : 'Ready'}</span>
          </motion.div>
        </div>
      )}

      <footer className="absolute bottom-0 left-0 right-0 z-20 p-8">
        <motion.div className="flex items-center justify-center gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {!isConnected && (
            <Button size="lg" className="px-16 py-8 text-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-cyan-500/30 rounded-2xl"
              onClick={handleStart} disabled={isConnectingAny}>
              {isConnectingAny ? <><Loader2 className="w-6 h-6 mr-3 animate-spin" />Connecting...</> : <><Play className="w-6 h-6 mr-3" />Chat with Frank</>}
            </Button>
          )}
        </motion.div>
      </footer>
      <style>{`:root { --proto-scale: min(calc(100vw / 1080), calc(100vh / 1920)); }`}</style>
    </div>
  );
};

export default ChatProtoM;
