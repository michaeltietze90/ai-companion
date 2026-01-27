import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Mic, MicOff, Volume2, VolumeX, Play, Loader2, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { useSettingsStore, VoiceEmotionType } from "@/stores/settingsStore";
import { Link } from "react-router-dom";

/**
 * Proto M Fullscreen Page
 * Resolution: 1080x1920 (9:16 portrait)
 * Designed for Proto M holographic displays
 */
const ProtoM = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
    endConversation,
  } = useAvatarConversation();

  const { demoMode, setDemoMode, thinkingMessage } = useConversationStore();
  const { activeVisuals } = useVisualOverlayStore();
  
  const { getActiveProfile, updateProfile, activeProfileId } = useSettingsStore();
  const activeProfile = getActiveProfile();
  const currentEmotion = activeProfile?.selectedEmotion || 'excited';
  
  const handleEmotionChange = (emotion: VoiceEmotionType) => {
    if (activeProfileId) {
      updateProfile(activeProfileId, { selectedEmotion: emotion });
    }
  };

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('Voice transcript received:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
    startConversation(videoRef.current);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  return (
    <div 
      className="relative overflow-hidden bg-black"
      style={{ 
        width: '1080px', 
        height: '1920px',
        // Scale down to fit in viewport if needed
        transform: 'scale(var(--proto-scale, 1))',
        transformOrigin: 'top left',
      }}
    >
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-xl">A</span>
            </motion.div>
            <div>
              <span className="text-foreground font-semibold text-lg">Proto M</span>
              <span className="text-muted-foreground text-sm block">1080 × 1920</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Select
            value={currentEmotion}
            onValueChange={(value) => handleEmotionChange(value as VoiceEmotionType)}
            disabled={isConnected}
          >
            <SelectTrigger className="w-40 h-10 bg-secondary/50 backdrop-blur-sm border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excited">🎉 Excited</SelectItem>
              <SelectItem value="friendly">😊 Friendly</SelectItem>
              <SelectItem value="serious">🎯 Serious</SelectItem>
              <SelectItem value="soothing">🧘 Soothing</SelectItem>
              <SelectItem value="broadcaster">📺 Broadcaster</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Avatar - Full Screen */}
      <main className="absolute inset-0 z-10">
        <HologramAvatar 
          isConnected={isConnected} 
          isSpeaking={isSpeaking}
          videoRef={videoRef}
          isMuted={isMuted}
        />
      </main>

      {/* Status Indicator */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
          <span className="text-base text-muted-foreground">
            {isConnecting ? 'Connecting...' : isConnected ? (demoMode ? 'Demo Mode' : 'Connected') : 'Ready'}
          </span>
        </motion.div>
      </div>

      {/* Thinking Indicator */}
      {isThinking && (
        <motion.div
          className="absolute top-48 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-base text-primary">{thinkingMessage || 'Thinking...'}</span>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-8">
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-3">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="bg-secondary/80 backdrop-blur-md border-border text-foreground text-lg h-14 rounded-xl"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-14 text-lg"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        <motion.div
          className="max-w-2xl mx-auto flex items-center justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected ? (
            <Button
              size="lg"
              className="px-16 py-8 text-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/30 rounded-2xl"
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
                  Start Conversation
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className={`w-20 h-20 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-8 h-8 text-foreground animate-spin" />
                ) : isListening ? (
                  <Mic className="w-8 h-8 text-white" />
                ) : (
                  <MicOff className="w-8 h-8 text-muted-foreground" />
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="w-16 h-16 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-7 h-7 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-7 h-7 text-muted-foreground" />
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="w-16 h-16 rounded-full bg-destructive/20 hover:bg-destructive/30 backdrop-blur-sm"
                onClick={endConversation}
              >
                <X className="w-7 h-7 text-destructive" />
              </Button>
            </>
          )}
        </motion.div>

        {isListening && (
          <motion.div
            className="mt-6 flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-6 bg-primary rounded-full"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-lg text-primary">Listening...</span>
          </motion.div>
        )}
      </footer>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Scale script for responsive display */}
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 1080), calc(100vh / 1920));
        }
      `}</style>
    </div>
  );
};

export default ProtoM;
