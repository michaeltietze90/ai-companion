import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DeliveryBoxDevice from "@/components/PostVan/DeliveryBoxDevice";
import postHorn from "@/assets/post-horn.png";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X, Play, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { ProfileSwitcher } from "@/components/ProfileSwitcher/ProfileSwitcher";
import { useSettingsStore } from "@/stores/settingsStore";

// Available HeyGen Interactive Avatars
// Note: Only avatars specifically enabled for Interactive Streaming in your HeyGen account will work
const AVAILABLE_AVATARS = [
  { id: '26393b8e-e944-4367-98ef-e2bc75c4b792', name: 'Schweizer Post' },
];

// Swiss Post specific Agentforce Agent ID
const SWISS_POST_AGENT_ID = '0XxKZ000000yfDv0AI';

/**
 * Swiss Post Themed Avatar Page
 * Full functionality matching Index.tsx with Post.ch branding
 */
const SwissPost = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  const {
    messages,
    thinkingMessage,
    demoMode,
    setDemoMode,
    error,
    sessionId,
    lastVoiceTranscript,
    streamingSentences,
    lastSpokenText,
  } = useConversationStore();

  const { activeVisuals } = useVisualOverlayStore();
  const { showNameEntry, showLeaderboard } = useQuizOverlayStore();
  
  // Settings store for avatar selection
  const { updateProfile, activeProfileId, getActiveProfile } = useSettingsStore();
  const activeProfile = getActiveProfile();
  const currentAvatarId = activeProfile?.selectedAvatarId || AVAILABLE_AVATARS[0].id;
  
  const handleAvatarChange = useCallback((avatarId: string) => {
    if (activeProfileId) {
      updateProfile(activeProfileId, { selectedAvatarId: avatarId });
    }
  }, [activeProfileId, updateProfile]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[SwissPost] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
    // Use Swiss Post specific Agentforce agent ID
    startConversation(videoRef.current, SWISS_POST_AGENT_ID);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleReconnectAvatar = useCallback(async () => {
    if (isConnected && videoRef.current) {
      await endConversation();
      await new Promise(resolve => setTimeout(resolve, 500));
      // Use Swiss Post specific Agentforce agent ID on reconnect
      await startConversation(videoRef.current, SWISS_POST_AGENT_ID);
    }
  }, [isConnected, endConversation, startConversation]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#F5F5F5' }}>
      {/* Subtle Post horn background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage: `url(${postHorn})`,
          backgroundSize: '80%',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header - Swiss Post branding */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-5 flex items-center justify-between">
        {/* Post Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg"
            style={{ background: '#FFC722' }}
            whileHover={{ scale: 1.02 }}
          >
            <span 
              className="font-black text-xl md:text-2xl"
              style={{ color: '#000000', fontFamily: 'Arial Black, sans-serif' }}
            >
              P
            </span>
            {/* Swiss cross */}
            <div 
              className="relative flex items-center justify-center rounded-sm"
              style={{ width: '24px', height: '24px', background: '#E30613' }}
            >
              <div className="absolute" style={{ width: '14px', height: '4px', background: '#FFFFFF' }} />
              <div className="absolute" style={{ width: '4px', height: '14px', background: '#FFFFFF' }} />
            </div>
          </motion.div>
          <div className="hidden sm:block">
            <span style={{ color: '#333333' }} className="font-semibold">Die Post</span>
            <span style={{ color: '#666666' }} className="text-sm block">KI Assistent</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Avatar Selector */}
          <Select
            value={currentAvatarId}
            onValueChange={handleAvatarChange}
            disabled={isConnected}
          >
            <SelectTrigger 
              className="w-32 md:w-40 h-9 border text-sm"
              style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                borderColor: 'rgba(255, 199, 34, 0.4)',
                color: '#333333',
              }}
            >
              <User className="w-4 h-4 mr-1" style={{ color: '#666666' }} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_AVATARS.map((avatar) => (
                <SelectItem key={avatar.id} value={avatar.id}>
                  {avatar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Agent Profile Switcher */}
          <ProfileSwitcher disabled={isConnected} />
          
          {/* Demo Mode Toggle */}
          <div 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255, 199, 34, 0.2)' }}
          >
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
              disabled={isConnected}
            />
            <Label htmlFor="demo-mode" style={{ color: '#666666' }} className="text-sm">Demo</Label>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-post-yellow/20"
            style={{ color: '#666666' }}
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content - Delivery Box Device */}
      <main className="relative z-10 h-screen">
        <DeliveryBoxDevice isActive={isConnected}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
            isMuted={isMuted}
          />
          <QuizOverlayManager />
        </DeliveryBoxDevice>
      </main>

      {/* Status indicators */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-md border"
          style={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(255, 199, 34, 0.3)',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              background: isConnected ? '#00A650' : isConnecting ? '#FFC722' : '#E30613'
            }}
          />
          <span className="text-sm" style={{ color: '#666666' }}>
            {isConnecting ? 'Verbinden...' : isConnected ? (demoMode ? 'Demo Modus' : 'Verbunden') : 'Bereit'}
          </span>
          {isConnected && !demoMode && (
            <span className="text-xs" style={{ color: '#999999' }}>• Sitzung {String(sessionId).slice(0, 8)}</span>
          )}
        </motion.div>
      </div>

      {/* Debug panel */}
      {isConnected && !demoMode && (
        <div className="hidden lg:flex absolute top-20 right-4 bottom-24 w-72 z-20 flex-col gap-2 overflow-hidden">
          <div className="rounded-xl p-3 flex-shrink-0 border" style={{ background: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 199, 34, 0.3)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Sprache → Agentforce</p>
            <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastVoiceTranscript || '—'}</p>
          </div>
          
          <div className="rounded-xl p-3 flex-1 overflow-hidden flex flex-col border" style={{ background: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 199, 34, 0.3)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#666666' }}>Streaming Sätze</p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {streamingSentences.length === 0 ? (
                <p className="text-xs italic" style={{ color: '#999999' }}>Warten auf Antwort...</p>
              ) : (
                streamingSentences.map((sentence, idx) => (
                  <div 
                    key={idx} 
                    className="text-xs p-2 rounded-lg border-l-2"
                    style={{ background: 'rgba(255, 199, 34, 0.1)', borderColor: '#FFC722', color: '#333333' }}
                  >
                    <span style={{ color: '#999999' }} className="mr-1">{idx + 1}.</span>
                    {sentence}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="rounded-xl p-3 flex-shrink-0 border" style={{ background: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 199, 34, 0.3)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Zuletzt gesprochen</p>
            <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastSpokenText || '—'}</p>
          </div>
        </div>
      )}

      {/* Thinking indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="absolute top-32 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{ background: 'rgba(255, 199, 34, 0.2)', borderColor: 'rgba(255, 199, 34, 0.5)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#B8860B' }} />
              <span className="text-sm" style={{ color: '#8B6914' }}>{thinkingMessage || 'Denke nach...'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute top-32 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="px-4 py-2 rounded-xl border" style={{ background: 'rgba(227, 6, 19, 0.1)', borderColor: 'rgba(227, 6, 19, 0.3)' }}>
              <span className="text-sm" style={{ color: '#E30613' }}>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6">
        {/* Text input */}
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-lg mx-auto mb-3 md:mb-4 px-2 md:px-0">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Stellen Sie mir eine Frage..."
                className="rounded-xl text-sm border"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderColor: 'rgba(255, 199, 34, 0.3)',
                  color: '#333333',
                }}
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="rounded-xl px-4 md:px-6 text-black font-semibold"
                style={{ background: '#FFC722' }}
              >
                Senden
              </Button>
            </div>
          </form>
        )}

        <motion.div
          className="max-w-md mx-auto flex items-center justify-center gap-3 md:gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {!isConnected ? (
            <Button
              size="lg"
              className="px-10 py-6 font-semibold shadow-lg rounded-xl text-black"
              style={{ background: 'linear-gradient(135deg, #FFC722 0%, #E5B31F 100%)' }}
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verbinden...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Gespräch starten
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Mic button */}
              <Button
                size="lg"
                className="w-12 h-12 md:w-14 md:h-14 rounded-full transition-all duration-300 shadow-lg"
                style={{ 
                  background: isListening ? '#FFC722' : '#333333',
                  color: isListening ? '#000000' : '#FFFFFF',
                }}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <MicOff className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </Button>

              {/* Mute button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                style={{ background: 'rgba(255, 255, 255, 0.8)' }}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#666666' }} />
                ) : (
                  <Volume2 className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#666666' }} />
                )}
              </Button>

              {/* History button */}
              <Button
                size="lg"
                variant="ghost"
                className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full"
                style={{ background: 'rgba(255, 255, 255, 0.8)' }}
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#666666' }} />
              </Button>

              {/* End button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                style={{ background: 'rgba(227, 6, 19, 0.15)' }}
                onClick={endConversation}
              >
                <X className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#E30613' }} />
              </Button>
            </>
          )}
        </motion.div>

        {/* Listening indicator */}
        {isListening && (
          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-4 rounded-full"
                  style={{ background: '#FFC722' }}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-sm" style={{ color: '#B8860B' }}>Hört zu...</span>
          </motion.div>
        )}
      </footer>

      {/* Conversation History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-80 border-l z-30"
            style={{ background: 'rgba(255, 255, 255, 0.98)', borderColor: 'rgba(255, 199, 34, 0.3)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255, 199, 34, 0.3)' }}>
              <h2 className="font-semibold" style={{ color: '#333333' }}>Gesprächsverlauf</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(false)}
              >
                <X className="w-4 h-4" style={{ color: '#666666' }} />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-center" style={{ color: '#999999' }}>Noch keine Nachrichten</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-xl border"
                    style={{
                      background: msg.role === 'user' ? 'rgba(255, 199, 34, 0.15)' : 'rgba(245, 245, 245, 1)',
                      borderColor: msg.role === 'user' ? 'rgba(255, 199, 34, 0.4)' : 'transparent',
                      marginLeft: msg.role === 'user' ? '16px' : '0',
                      marginRight: msg.role === 'user' ? '0' : '16px',
                    }}
                  >
                    <p className="text-sm" style={{ color: '#333333' }}>{msg.content}</p>
                    <p className="text-xs mt-1" style={{ color: '#999999' }}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onReconnectAvatar={handleReconnectAvatar}
      />

      {/* Footer attribution */}
      <div className="absolute bottom-2 left-4 z-10">
        <span className="text-xs" style={{ color: 'rgba(102, 102, 102, 0.5)' }}>
          Powered by Agentforce
        </span>
      </div>
    </div>
  );
};

export default SwissPost;
