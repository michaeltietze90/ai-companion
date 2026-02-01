import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DeliveryBoxDevice from "@/components/PostVan/DeliveryBoxDevice";
import diePostLogo from "@/assets/die-post-logo.png";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X, Play, Loader2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";

// Swiss Post specific Agentforce Agent ID
const SWISS_POST_AGENT_ID = '0XxKZ000000yfDv0AI';

/**
 * Swiss Post Themed Avatar Page
 * Clean, professional design with Post.ch branding
 */
const SwissPost = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showPanels, setShowPanels] = useState(false);
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

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[SwissPost] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting } = useElevenLabsSTT(handleVoiceTranscript);

  const handleStart = () => {
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
      await startConversation(videoRef.current, SWISS_POST_AGENT_ID);
    }
  }, [isConnected, endConversation, startConversation]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Professional Swiss Post gradient background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #FFC722 0%, #FFD54F 8%, #FFFDF5 20%, #F8F6F0 100%)',
        }}
      />
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ===== HEADER ===== */}
      <header className="absolute top-0 left-0 right-0 z-30">
        {/* Yellow banner bar */}
        <div 
          className="w-full py-3 px-4 md:px-6 flex items-center justify-between"
          style={{ background: '#FFC722' }}
        >
          {/* Die Post Logo */}
          <img 
            src={diePostLogo} 
            alt="Die Post" 
            className="h-8 md:h-10 object-contain"
          />
          
          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Demo Mode Toggle */}
            <div 
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Switch
                id="demo-mode"
                checked={demoMode}
                onCheckedChange={setDemoMode}
                disabled={isConnected}
              />
              <Label htmlFor="demo-mode" className="text-sm font-medium text-black">Demo</Label>
            </div>
            
            {/* Settings button */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-black/10 text-black"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            {/* Toggle panels button */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-black/10 text-black"
              onClick={() => setShowPanels(!showPanels)}
              title={showPanels ? "Hide panels" : "Show panels"}
            >
              {showPanels ? (
                <PanelRightClose className="w-5 h-5" />
              ) : (
                <PanelRightOpen className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-10 h-screen pt-14 md:pt-16">
        <DeliveryBoxDevice isActive={isConnected}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
            isMuted={isMuted}
          />
        </DeliveryBoxDevice>
      </main>

      {/* ===== QUIZ OVERLAYS - Outside the device ===== */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <QuizOverlayManager />
        </div>
      </div>

      {/* ===== VISUAL OVERLAY - Outside the device ===== */}
      <div className="absolute inset-0 z-15 pointer-events-none">
        <VisualOverlay visuals={activeVisuals} />
      </div>

      {/* Status indicator */}
      <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border"
          style={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(255, 199, 34, 0.4)',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ 
              background: isConnected ? '#00A650' : isConnecting ? '#FFC722' : '#E30613'
            }}
          />
          <span className="text-sm font-medium" style={{ color: '#333333' }}>
            {isConnecting ? 'Verbinden...' : isConnected ? (demoMode ? 'Demo Modus' : 'Verbunden') : 'Bereit'}
          </span>
          {isConnected && !demoMode && sessionId && (
            <span className="text-xs" style={{ color: '#999999' }}>• {String(sessionId).slice(0, 8)}</span>
          )}
        </motion.div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="absolute top-32 md:top-36 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full border shadow-md"
              style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.5)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#B8860B' }} />
              <span className="text-sm font-medium" style={{ color: '#8B6914' }}>{thinkingMessage || 'Denke nach...'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute top-32 md:top-36 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="px-4 py-2 rounded-xl border shadow-md" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(227, 6, 19, 0.4)' }}>
              <span className="text-sm font-medium" style={{ color: '#E30613' }}>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SIDE PANELS (toggled) ===== */}
      <AnimatePresence>
        {showPanels && isConnected && !demoMode && (
          <motion.div
            className="absolute top-20 md:top-24 right-4 bottom-28 w-72 z-25 flex flex-col gap-2 overflow-hidden"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Voice transcript */}
            <div className="rounded-xl p-3 flex-shrink-0 border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Sprache → Agentforce</p>
              <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastVoiceTranscript || '—'}</p>
            </div>
            
            {/* Streaming sentences */}
            <div className="rounded-xl p-3 flex-1 overflow-hidden flex flex-col border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#666666' }}>Streaming Sätze</p>
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
            
            {/* Last spoken */}
            <div className="rounded-xl p-3 flex-shrink-0 border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Zuletzt gesprochen</p>
              <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastSpokenText || '—'}</p>
            </div>

            {/* Chat history */}
            <div className="rounded-xl p-3 flex-1 overflow-hidden flex flex-col border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#666666' }}>Gesprächsverlauf</p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-xs italic" style={{ color: '#999999' }}>Noch keine Nachrichten</p>
                ) : (
                  messages.slice(-10).map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2 rounded-lg text-xs"
                      style={{
                        background: msg.role === 'user' ? 'rgba(255, 199, 34, 0.2)' : 'rgba(240, 240, 240, 1)',
                        color: '#333333',
                      }}
                    >
                      <span className="font-semibold">{msg.role === 'user' ? 'Sie: ' : 'AI: '}</span>
                      {msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FOOTER CONTROLS ===== */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6 pb-12 md:pb-14">
        {/* Text input */}
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-lg mx-auto mb-4 px-2 md:px-0">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Stellen Sie mir eine Frage..."
                className="rounded-xl text-sm border shadow-md"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.98)',
                  borderColor: 'rgba(255, 199, 34, 0.4)',
                  color: '#333333',
                }}
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="rounded-xl px-6 text-black font-semibold shadow-md hover:brightness-105"
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
              className="px-10 py-6 font-bold shadow-xl rounded-xl text-black text-lg hover:brightness-105"
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
                className="w-14 h-14 rounded-full transition-all duration-300 shadow-xl"
                style={{ 
                  background: isListening ? '#FFC722' : '#1C1C1E',
                  color: isListening ? '#000000' : '#FFFFFF',
                }}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </Button>

              {/* Mute button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full shadow-lg"
                style={{ background: 'rgba(255, 255, 255, 0.9)' }}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" style={{ color: '#666666' }} />
                ) : (
                  <Volume2 className="w-5 h-5" style={{ color: '#666666' }} />
                )}
              </Button>

              {/* End button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full shadow-lg"
                style={{ background: 'rgba(227, 6, 19, 0.15)' }}
                onClick={endConversation}
              >
                <X className="w-5 h-5" style={{ color: '#E30613' }} />
              </Button>
            </>
          )}
        </motion.div>

        {/* Listening indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="mt-4 flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-5 rounded-full"
                    style={{ background: '#FFC722' }}
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium" style={{ color: '#8B6914' }}>Hört zu...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* ===== POWERED BY AGENTFORCE ===== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <span 
          className="text-sm font-medium tracking-wide"
          style={{ color: 'rgba(60, 60, 60, 0.6)' }}
        >
          Powered by Agentforce
        </span>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onReconnectAvatar={handleReconnectAvatar}
      />
    </div>
  );
};

export default SwissPost;
