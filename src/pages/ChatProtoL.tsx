import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { VideoCallEscalationOverlay } from "@/components/Overlay/VideoCallEscalationOverlay";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { SlideOverlay } from "@/components/Overlay/SlideOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { useVideoCallEscalationStore } from "@/stores/videoCallEscalationStore";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Play, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation } from "@/hooks/useScopedAvatarConversation";
import { useSilenceTranscription } from "@/hooks/useSilenceTranscription";
import { CHAT_AGENTS, DEFAULT_CHAT_AGENT_ID } from "@/config/agents";

/**
 * Chat Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 */
const ChatProtoL = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const voiceSettings = useAppVoiceSettingsStore(state => state.chat);
  const conversationState = useChatConversationStore();

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
  const { isVisible: isVideoCallVisible, hide: hideVideoCall, duration: videoCallDuration } = useVideoCallEscalationStore();
  const { setOnStartCallback, setOnNameSubmitCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[ChatProtoL] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { isListening, toggleListening } = useSilenceTranscription(
    handleVoiceTranscript,
    { disabled: isSpeaking }
  );

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
        <SlideOverlay />
      </main>

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

      {!isConnected && (
        <div className="absolute top-64 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="flex items-center gap-6 px-12 py-6 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`w-6 h-6 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-blue-500'} animate-pulse`} />
            <span className="text-2xl text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'Chat Ready'}
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
              className="px-24 py-12 text-3xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 rounded-3xl"
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
                  Start Chat
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

export default ChatProtoL;
