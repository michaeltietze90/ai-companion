import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import PostVan from "@/components/PostVan/PostVan";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Loader2, Mic, MicOff, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";

/**
 * Swiss Post Themed Avatar Page
 * Features an interactive Post van that opens to reveal the avatar
 */
const SwissPost = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVanOpen, setIsVanOpen] = useState(false);

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
    console.log('[SwissPost] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { isListening, toggleListening } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
    startConversation(videoRef.current);
  };

  const handleVanToggle = () => {
    setIsVanOpen(!isVanOpen);
    // Auto-start conversation when van opens for first time
    if (!isVanOpen && !isConnected && !isConnecting) {
      handleStart();
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-post-background">
      {/* Swiss cityscape background */}
      <div className="absolute inset-0">
        {/* Sky gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, hsl(200 60% 75%) 0%, hsl(200 50% 85%) 40%, hsl(40 30% 90%) 100%)',
          }}
        />
        
        {/* Distant mountains */}
        <div 
          className="absolute bottom-[30%] left-0 right-0 h-[200px]"
          style={{
            background: 'linear-gradient(180deg, hsl(220 20% 70%) 0%, hsl(220 15% 80%) 100%)',
            clipPath: 'polygon(0% 100%, 5% 60%, 15% 80%, 25% 40%, 35% 70%, 45% 30%, 55% 60%, 65% 20%, 75% 50%, 85% 35%, 95% 55%, 100% 45%, 100% 100%)',
          }}
        />

        {/* Buildings silhouette */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[35%]"
          style={{
            background: 'hsl(220 15% 85%)',
          }}
        />
        
        {/* Cobblestone street */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[18%]"
          style={{
            background: 'linear-gradient(180deg, hsl(25 15% 55%) 0%, hsl(25 10% 45%) 100%)',
          }}
        />

        {/* Street pattern overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[18%] opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 20px, hsl(25 10% 40%) 20px, hsl(25 10% 40%) 22px),
              repeating-linear-gradient(0deg, transparent, transparent 15px, hsl(25 10% 40%) 15px, hsl(25 10% 40%) 17px)
            `,
          }}
        />
      </div>

      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Post Van with Avatar inside */}
      <main className="relative z-10 w-full h-full flex items-center justify-center">
        <PostVan isOpen={isVanOpen} onToggle={handleVanToggle}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
          />
        </PostVan>
      </main>

      {/* Header - Post branding */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Post logo */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-post-yellow shadow-lg">
            <Package className="w-6 h-6 text-post-dark" />
            <span className="text-xl font-bold text-post-dark tracking-tight">
              DIE POST
            </span>
            {/* Swiss cross */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute w-5 h-[5px] bg-post-red rounded-sm" />
              <div className="absolute w-[5px] h-5 bg-post-red rounded-sm" />
            </div>
          </div>

          {/* Status */}
          {isConnected && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-md"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Bereit zu helfen</span>
            </motion.div>
          )}
        </motion.div>
      </header>

      {/* Mic Control - visible when connected and van is open */}
      {isConnected && isVanOpen && (
        <motion.div
          className="absolute bottom-8 right-8 z-30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className={`w-16 h-16 rounded-full shadow-xl ${
              isListening 
                ? 'bg-post-yellow hover:bg-post-yellow/90 text-post-dark' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            onClick={toggleListening}
          >
            {isListening ? (
              <Mic className="w-7 h-7" />
            ) : (
              <MicOff className="w-7 h-7" />
            )}
          </Button>
        </motion.div>
      )}

      {/* Loading overlay when connecting */}
      {isConnecting && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/95 shadow-2xl">
            <Loader2 className="w-12 h-12 text-post-yellow animate-spin" />
            <span className="text-lg font-medium text-gray-800">
              Ihr Paketassistent wird geladen...
            </span>
          </div>
        </motion.div>
      )}

      {/* Close button when van is open */}
      {isVanOpen && (
        <motion.button
          className="absolute top-6 right-6 z-30 px-4 py-2 rounded-lg bg-white/90 hover:bg-white shadow-lg text-gray-700 font-medium transition-colors"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setIsVanOpen(false)}
        >
          Schliessen ✕
        </motion.button>
      )}
    </div>
  );
};

export default SwissPost;
