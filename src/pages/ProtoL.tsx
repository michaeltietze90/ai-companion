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
 * Proto L Fullscreen Page
 * Resolution: 2160x3840 (9:16 portrait, 4K)
 * Designed for Proto L holographic displays
 */
const ProtoL = () => {
  const [manualMute, setManualMute] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isChangingEmotion, setIsChangingEmotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get TTS provider to determine auto-mute
  const activeProfile = useSettingsStore((state) => state.getActiveProfile());
  const isElevenLabsTTS = activeProfile?.ttsProvider === 'elevenlabs';
  
  // Video is muted if: manual mute OR using ElevenLabs
  const isMuted = manualMute || isElevenLabsTTS;

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
    endConversation,
    reinitializeAvatarWithEmotion,
  } = useAvatarConversation();

  const { demoMode, setDemoMode, thinkingMessage } = useConversationStore();
  const { activeVisuals } = useVisualOverlayStore();
  
  // activeProfile already retrieved above
  const { updateProfile, activeProfileId } = useSettingsStore();
  const currentEmotion = activeProfile?.selectedEmotion || 'excited';
  
  const handleEmotionChange = useCallback(async (emotion: VoiceEmotionType) => {
    if (activeProfileId) {
      updateProfile(activeProfileId, { selectedEmotion: emotion });
      
      // If connected and HeyGen TTS is active, reinitialize avatar with new emotion
      if (isConnected && videoRef.current && activeProfile?.ttsProvider !== 'elevenlabs') {
        setIsChangingEmotion(true);
        try {
          await reinitializeAvatarWithEmotion(videoRef.current, emotion);
        } catch (error) {
          console.error('Failed to change emotion:', error);
        } finally {
          setIsChangingEmotion(false);
        }
      }
    }
  }, [activeProfileId, updateProfile, isConnected, activeProfile?.ttsProvider, reinitializeAvatarWithEmotion]);

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
        width: '2160px', 
        height: '3840px',
        // Scale down to fit in viewport if needed
        transform: 'scale(var(--proto-scale, 1))',
        transformOrigin: 'top left',
      }}
    >
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors text-2xl">
            ← Back
          </Link>
          <div className="flex items-center gap-6">
            <motion.div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-4xl">A</span>
            </motion.div>
            <div>
              <span className="text-foreground font-semibold text-3xl">Proto L</span>
              <span className="text-muted-foreground text-xl block">2160 × 3840 (4K)</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <Select
            value={currentEmotion}
            onValueChange={(value) => handleEmotionChange(value as VoiceEmotionType)}
            disabled={isChangingEmotion}
          >
            <SelectTrigger className={`w-72 h-16 text-xl bg-secondary/50 backdrop-blur-sm border-border ${isChangingEmotion ? 'opacity-50' : ''}`}>
              {isChangingEmotion ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing...
                </span>
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excited" className="text-xl py-3">🎉 Excited</SelectItem>
              <SelectItem value="friendly" className="text-xl py-3">😊 Friendly</SelectItem>
              <SelectItem value="serious" className="text-xl py-3">🎯 Serious</SelectItem>
              <SelectItem value="soothing" className="text-xl py-3">🧘 Soothing</SelectItem>
              <SelectItem value="broadcaster" className="text-xl py-3">📺 Broadcaster</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-10 h-10" />
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
      <div className="absolute top-64 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-6 px-12 py-6 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`w-6 h-6 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
          <span className="text-2xl text-muted-foreground">
            {isConnecting ? 'Connecting...' : isConnected ? (demoMode ? 'Demo Mode' : 'Connected') : 'Ready'}
          </span>
        </motion.div>
      </div>

      {/* Thinking Indicator */}
      {isThinking && (
        <motion.div
          className="absolute top-96 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-6 px-12 py-6 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-2xl text-primary">{thinkingMessage || 'Thinking...'}</span>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-16">
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-4xl mx-auto mb-12">
            <div className="flex gap-6">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="bg-secondary/80 backdrop-blur-md border-border text-foreground text-2xl h-20 rounded-2xl"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-16 h-20 text-2xl"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        <motion.div
          className="max-w-4xl mx-auto flex items-center justify-center gap-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected ? (
            <Button
              size="lg"
              className="px-24 py-12 text-3xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/30 rounded-3xl"
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
                  Start Conversation
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className={`w-32 h-32 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-12 h-12 text-foreground animate-spin" />
                ) : isListening ? (
                  <Mic className="w-12 h-12 text-white" />
                ) : (
                  <MicOff className="w-12 h-12 text-muted-foreground" />
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="w-24 h-24 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setManualMute(!manualMute)}
              >
                {isMuted ? (
                  <VolumeX className="w-10 h-10 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-10 h-10 text-muted-foreground" />
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="w-24 h-24 rounded-full bg-destructive/20 hover:bg-destructive/30 backdrop-blur-sm"
                onClick={endConversation}
              >
                <X className="w-10 h-10 text-destructive" />
              </Button>
            </>
          )}
        </motion.div>

        {isListening && (
          <motion.div
            className="mt-12 flex items-center justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-12 bg-primary rounded-full"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-2xl text-primary">Listening...</span>
          </motion.div>
        )}
      </footer>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Scale script for responsive display */}
      <style>{`
        :root {
          --proto-scale: min(calc(100vw / 2160), calc(100vh / 3840));
        }
      `}</style>
    </div>
  );
};

export default ProtoL;
