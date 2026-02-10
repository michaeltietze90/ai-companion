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
import { Play, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePitchConversationStore } from "@/stores/pitchConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useSilenceTranscription } from "@/hooks/useSilenceTranscription";
import { PITCH_AGENTS, DEFAULT_PITCH_AGENT_ID } from "@/config/agents";
import { preloadTriggerVideos } from "@/lib/hardcodedTriggers";

/**
 * Pitch Proto L Always Listening Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * 
 * This version is always listening when connected.
 * Use physical mic mute to control when to send.
 */
const PitchProtoLAlwaysListening = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.chat);
  const conversationState = usePitchConversationStore();

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
    interruptAvatar,
  } = useScopedAvatarConversation({
    store: usePitchConversationStore,
    voiceSettings,
    defaultAgentId: DEFAULT_PITCH_AGENT_ID,
    availableAgents: PITCH_AGENTS,
    useJsonMode: true,
  });

  const { activeVisuals } = useVisualOverlayStore();
  const { isVisible: countdownActive, setOnExpireCallback } = useCountdownStore();
  const { setOnStartCallback, setOnNameSubmitCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[PitchProtoL-AlwaysListening] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  // Barge-in handler - interrupt avatar when user speaks
  const handleBargeIn = useCallback(() => {
    console.log('[PitchProtoL-AlwaysListening] Barge-in detected, interrupting avatar');
    interruptAvatar();
  }, [interruptAvatar]);

  // Always listening mode with barge-in support
  // When countdown is active, use normal countdown behavior for silence threshold
  const { isListening, startListening, stopListening, forceCommit } = useSilenceTranscription(
    handleVoiceTranscript,
    { 
      disabled: false, // Never disable - always listen for barge-in
      countdownActive,
      silenceMs: countdownActive ? undefined : 300000, // 5 minutes when not in countdown
      maxRecordMs: countdownActive ? undefined : 600000, // 10 minutes max when not in countdown
      onBargeIn: isSpeaking ? handleBargeIn : undefined, // Only enable barge-in when avatar is speaking
    }
  );

  // Auto-start listening when connected
  useEffect(() => {
    if (isConnected && !isListening) {
      console.log('[PitchProtoL-AlwaysListening] Auto-starting continuous listen');
      startListening();
    }
  }, [isConnected, isListening, startListening]);

  // Wire up countdown expiry to force-commit the STT
  useEffect(() => {
    setOnExpireCallback(forceCommit);
    return () => setOnExpireCallback(null);
  }, [forceCommit, setOnExpireCallback]);

  const handleStart = useCallback(() => {
    startConversation(videoRef.current);
  }, [startConversation]);

  useEffect(() => {
    setOnStartCallback(handleStart);
    return () => setOnStartCallback(null);
  }, [handleStart, setOnStartCallback]);

  useEffect(() => {
    setOnNameSubmitCallback(sendMessage);
    return () => setOnNameSubmitCallback(null);
  }, [sendMessage, setOnNameSubmitCallback]);

  // Manual send - stop listening to trigger transcription
  const handleManualSend = useCallback(() => {
    if (isListening) {
      console.log('[PitchProtoL-AlwaysListening] Manual send triggered');
      stopListening(false);
    }
  }, [isListening, stopListening]);

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
        <QuizOverlayManager />
        <CountdownOverlay />
        <ScoreOverlay />
        <SlideOverlay />
      </main>

      {isConnected && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 right-16 z-30"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            size="lg"
            variant="ghost"
            className={`w-52 h-52 rounded-full ${
              isListening 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
            onClick={handleManualSend}
            title={isListening ? "Click to send now" : "Waiting..."}
          >
            <Mic className={`w-28 h-28 text-white ${isListening ? 'animate-pulse' : ''}`} />
          </Button>
          <div className="text-center mt-4 text-white text-xl">
            {isListening ? 'Always Listening' : 'Processing...'}
          </div>
        </motion.div>
      )}

      {!isConnected && (
        <div className="absolute top-64 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-6 px-12 py-6 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-6 h-6 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-purple-500'} animate-pulse`} />
            <span className="text-2xl text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Pitch Ready (Always Listening)'}
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
              className="px-32 py-16 text-4xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30 rounded-3xl"
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-12 h-12 mr-6 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="w-12 h-12 mr-6" />
                  Start Pitch
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

export default PitchProtoLAlwaysListening;
