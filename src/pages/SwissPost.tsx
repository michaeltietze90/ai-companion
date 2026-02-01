import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import PostVan from "@/components/PostVan/PostVan";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";

/**
 * Swiss Post Themed Avatar Page
 * Authentic Post.ch styling with interactive van
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

  const { activeVisuals } = useVisualOverlayStore();

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
    if (!isVanOpen && !isConnected && !isConnecting) {
      handleStart();
    }
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      style={{ background: '#F5F5F5' }}
    >
      {/* Subtle background pattern - Swiss Post style */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, #FFC722 0%, transparent 25%),
            radial-gradient(circle at 80% 20%, #FFC722 0%, transparent 20%)
          `,
        }}
      />

      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header - Swiss Post branding */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Post logo - authentic design */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{ background: '#FFC722' }}
          >
            {/* P logo with cross */}
            <div className="flex items-center gap-2">
              <span 
                className="font-black text-2xl md:text-3xl"
                style={{ color: '#000000', fontFamily: 'Arial Black, sans-serif' }}
              >
                P
              </span>
              {/* Swiss cross in red square */}
              <div 
                className="relative flex items-center justify-center rounded-sm"
                style={{ 
                  width: '28px', 
                  height: '28px',
                  background: '#E30613',
                }}
              >
                <div 
                  className="absolute"
                  style={{
                    width: '16px',
                    height: '5px',
                    background: '#FFFFFF',
                  }}
                />
                <div 
                  className="absolute"
                  style={{
                    width: '5px',
                    height: '16px',
                    background: '#FFFFFF',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status indicator */}
          {isConnected && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full shadow-md"
              style={{ background: 'rgba(255, 255, 255, 0.95)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: '#00A650' }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: '#333333' }}
              >
                Bereit
              </span>
            </motion.div>
          )}
        </motion.div>
      </header>

      {/* Main content - Van with Avatar */}
      <main className="relative z-10 w-full h-full flex items-center justify-center pt-16">
        <PostVan isOpen={isVanOpen} onToggle={handleVanToggle}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
          />
        </PostVan>
      </main>

      {/* Mic Control */}
      {isConnected && isVanOpen && (
        <motion.div
          className="absolute bottom-6 right-6 z-30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl border-2"
            style={{ 
              background: isListening ? '#FFC722' : '#333333',
              borderColor: isListening ? '#E5B31F' : '#444444',
              color: isListening ? '#000000' : '#FFFFFF',
            }}
            onClick={toggleListening}
          >
            {isListening ? (
              <Mic className="w-6 h-6 md:w-7 md:h-7" />
            ) : (
              <MicOff className="w-6 h-6 md:w-7 md:h-7" />
            )}
          </Button>
        </motion.div>
      )}

      {/* Close button */}
      {isVanOpen && (
        <motion.button
          className="absolute top-20 right-4 md:right-6 z-30 px-4 py-2 rounded-lg shadow-lg font-medium transition-all hover:scale-105"
          style={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#333333',
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setIsVanOpen(false)}
        >
          Schliessen ✕
        </motion.button>
      )}

      {/* Loading overlay */}
      {isConnecting && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div 
            className="flex flex-col items-center gap-4 p-8 rounded-2xl shadow-2xl"
            style={{ background: 'rgba(255, 255, 255, 0.98)' }}
          >
            <Loader2 
              className="w-12 h-12 animate-spin"
              style={{ color: '#FFC722' }}
            />
            <span 
              className="text-lg font-medium"
              style={{ color: '#333333' }}
            >
              Ihr Assistent wird geladen...
            </span>
          </div>
        </motion.div>
      )}

      {/* Footer attribution */}
      <footer className="absolute bottom-4 left-4 z-10">
        <span 
          className="text-xs opacity-50"
          style={{ color: '#666666' }}
        >
          Powered by Post.ch
        </span>
      </footer>
    </div>
  );
};

export default SwissPost;
