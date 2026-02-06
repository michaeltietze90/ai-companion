import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { VideoCallEscalationOverlay } from "@/components/Overlay/VideoCallEscalationOverlay";
import { CountdownOverlay } from "@/components/Overlay/CountdownOverlay";
import { ScoreOverlay } from "@/components/Overlay/ScoreOverlay";
import { SlideOverlay } from "@/components/Overlay/SlideOverlay";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { useVideoCallEscalationStore } from "@/stores/videoCallEscalationStore";
import { useCountdownStore } from "@/stores/countdownStore";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePitchConversationStore } from "@/stores/pitchConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useSilenceTranscription } from "@/hooks/useSilenceTranscription";
import { PITCH_AGENTS, DEFAULT_PITCH_AGENT_ID } from "@/config/agents";

/**
 * Pitch Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 */
const PitchProtoL = () => {
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
  } = useScopedAvatarConversation({
    store: usePitchConversationStore,
    voiceSettings,
    defaultAgentId: DEFAULT_PITCH_AGENT_ID,
    availableAgents: PITCH_AGENTS,
    useJsonMode: true,
  });

  const { activeVisuals } = useVisualOverlayStore();
  const { isVisible: isVideoCallVisible, hide: hideVideoCall, duration: videoCallDuration } = useVideoCallEscalationStore();
  const { isVisible: countdownActive, setOnExpireCallback } = useCountdownStore();
  const { setOnStartCallback, setOnNameSubmitCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[PitchProtoL] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { isListening, toggleListening, forceCommit } = useSilenceTranscription(
    handleVoiceTranscript,
    { disabled: isSpeaking, countdownActive }
  );

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

  // Register callback to send message when user edits their name entry
  useEffect(() => {
    setOnNameSubmitCallback(sendMessage);
    return () => setOnNameSubmitCallback(null);
  }, [sendMessage, setOnNameSubmitCallback]);

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
      <VideoCallEscalationOverlay isVisible={isVideoCallVisible} onClose={hideVideoCall} duration={videoCallDuration} />
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
            className={`w-32 h-32 rounded-full ${
              isListening 
                ? 'bg-purple-500 hover:bg-purple-600' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            onClick={toggleListening}
          >
            {isListening ? (
              <Mic className="w-16 h-16 text-white" />
            ) : (
              <MicOff className="w-16 h-16 text-white" />
            )}
          </Button>
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
              {isConnecting ? 'Connecting...' : 'Pitch Ready'}
            </span>
          </motion.div>
        </div>
      )}

      <footer className="absolute bottom-0 left-0 right-0 z-20 p-16">
        <motion.div
          className="flex items-center justify-center gap-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected && (
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
          )}
        </motion.div>
      </footer>
      
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 2160), calc(100vh / 3840));
        }
      `}</style>
    </div>
  );
};

export default PitchProtoL;
