import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import diePostLogo from "@/assets/die-post-logo.png";
import salesforceLogo from "@/assets/salesforce-logo.png";
import agentforceLogo from "@/assets/agentforce-logo.png";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { Mic, MicOff, Volume2, VolumeX, Settings, X, Loader2, Eye, EyeOff, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { useSettingsStore } from "@/stores/settingsStore";

// Swiss Post specific Agentforce Agent ID
const SWISS_POST_AGENT_ID = '0XxKZ000000yfDv0AI';

/**
 * Swiss Post Themed Avatar Page
 * Clean, professional design with Post.ch branding
 * Auto-starts session on page load
 */
const SwissPost = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [showConfidential, setShowConfidential] = useState(true);
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
  const getActiveProfile = useSettingsStore((state) => state.getActiveProfile);
  const updateProfile = useSettingsStore((state) => state.updateProfile);

  // Force HeyGen TTS on Swiss Post page to prevent dual audio issues
  // ElevenLabs TTS + HeyGen lip-sync causes two voices playing simultaneously
  useEffect(() => {
    const profile = getActiveProfile();
    if (profile && profile.ttsProvider !== 'heygen') {
      console.log('[SwissPost] Forcing TTS provider to HeyGen for lip-sync');
      updateProfile(profile.id, { ttsProvider: 'heygen' });
    }
  }, [getActiveProfile, updateProfile]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[SwissPost] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting } = useElevenLabsSTT(handleVoiceTranscript);

  // Auto-start session on page load
  useEffect(() => {
    if (!hasAutoStarted && !isConnected && !isConnecting && videoRef.current) {
      console.log('[SwissPost] Auto-starting session...');
      setHasAutoStarted(true);
      // Small delay to ensure video element is ready
      const timer = setTimeout(() => {
        startConversation(videoRef.current, SWISS_POST_AGENT_ID);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasAutoStarted, isConnected, isConnecting, startConversation]);

  const handleRestart = useCallback(() => {
    if (videoRef.current) {
      endConversation();
      setTimeout(() => {
        startConversation(videoRef.current, SWISS_POST_AGENT_ID);
      }, 500);
    }
  }, [endConversation, startConversation]);

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
      {/* Clean white/cream background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: '#FAFAF8',
        }}
      />
      
      {/* Diagonal yellow gradient from bottom-right - doesn't touch header */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(315deg, rgba(255, 199, 34, 0.25) 0%, rgba(255, 213, 79, 0.15) 20%, rgba(255, 235, 153, 0.08) 35%, transparent 50%)',
        }}
      />
      
      {/* Subtle red accent from bottom left */}
      <div 
        className="absolute bottom-0 left-0 w-[40%] h-[40%] z-0"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(227, 6, 19, 0.04) 0%, transparent 60%)',
        }}
      />

      {/* ===== HEADER ===== */}
      <header className="absolute top-0 left-0 right-0 z-30">
        <div 
          className="w-full py-3 px-4 md:px-6 flex items-center justify-between"
          style={{ background: '#FFC722' }}
        >
          {/* Logos */}
          <div className="flex items-center gap-4 md:gap-5">
            <img 
              src={diePostLogo} 
              alt="Die Post" 
              className="h-8 md:h-10 object-contain"
            />
            <div className="w-px h-8 bg-black/20" />
            <img 
              src={salesforceLogo} 
              alt="Salesforce" 
              className="h-7 md:h-8 object-contain"
            />
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Demo Mode Toggle */}
            <AnimatePresence>
              {showUI && (
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(0, 0, 0, 0.1)' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Switch
                    id="demo-mode"
                    checked={demoMode}
                    onCheckedChange={setDemoMode}
                    disabled={isConnected}
                  />
                  <Label htmlFor="demo-mode" className="text-sm font-medium text-black">Demo</Label>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Settings button */}
            <AnimatePresence>
              {showUI && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-black/10 text-black"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Confidential toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-black/10"
              style={{ color: showConfidential ? '#E30613' : '#000000' }}
              onClick={() => setShowConfidential(!showConfidential)}
              title={showConfidential ? "Hide Confidential" : "Show Confidential"}
            >
              <ShieldAlert className="w-5 h-5" />
            </Button>
            
            {/* Toggle UI button */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-black/10 text-black"
              onClick={() => setShowUI(!showUI)}
              title={showUI ? "Hide UI" : "Show UI"}
            >
              {showUI ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT - Modern avatar display ===== */}
      <main className="relative z-10 h-screen pt-16 md:pt-24 pb-16 md:pb-20 flex items-center justify-center overflow-visible">
        <div 
          className="relative w-full h-full max-w-3xl mx-auto flex items-center justify-center px-2 md:px-4"
          style={{ maxHeight: 'calc(100vh - 6rem)' }}
        >
          {/* Avatar container with Post-themed frame */}
          <div 
            className="relative h-full max-w-[90vw] md:max-w-none"
            style={{ aspectRatio: '9/16', overflow: 'visible' }}
          >
            {/* Soft ambient shadow */}
            <div 
              className="absolute inset-0 rounded-[32px] blur-3xl opacity-30 -z-10"
              style={{ 
                background: 'linear-gradient(180deg, rgba(255, 199, 34, 0.6) 0%, rgba(0, 0, 0, 0.2) 100%)',
                transform: 'translateY(30px) scale(0.9)',
              }}
            />
            
            {/* Outer frame - more prominent Post yellow */}
            <div 
              className="relative w-full h-full rounded-[32px] p-[4px]"
              style={{
                background: 'linear-gradient(180deg, #FFC722 0%, rgba(255, 199, 34, 0.7) 40%, rgba(255, 199, 34, 0.3) 70%, rgba(40, 40, 40, 0.5) 100%)',
                boxShadow: '0 0 40px rgba(255, 199, 34, 0.2)',
              }}
            >
              {/* Inner container */}
              <div 
                className="relative w-full h-full rounded-[30px] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0f0f11 0%, #0a0a0c 100%)',
                  boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Top accent bar - Post branding */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 z-20"
                  style={{
                    background: 'linear-gradient(90deg, transparent 5%, #FFC722 30%, #FFC722 70%, transparent 95%)',
                  }}
                />
                
                {/* Subtle inner glow at top */}
                <div 
                  className="absolute top-0 left-0 right-0 h-48 pointer-events-none z-10"
                  style={{
                    background: 'radial-gradient(ellipse at top center, rgba(255, 199, 34, 0.08) 0%, transparent 60%)',
                  }}
                />
                
                {/* Avatar content */}
                <div className="relative w-full h-full">
                  <HologramAvatar 
                    isConnected={isConnected} 
                    isSpeaking={isSpeaking}
                    videoRef={videoRef}
                    isMuted={isMuted}
                  />
                  
                  {/* Confidential watermark overlay */}
                  <AnimatePresence>
                    {showConfidential && (
                      <motion.div
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: 'rotate(-35deg) scale(1.5)',
                          }}
                        >
                          <div className="flex flex-col items-center gap-16 md:gap-24">
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i}
                                className="text-3xl md:text-5xl font-black tracking-widest uppercase whitespace-nowrap"
                                style={{ 
                                  color: 'rgba(227, 6, 19, 0.15)',
                                  textShadow: '0 0 2px rgba(227, 6, 19, 0.1)',
                                }}
                              >
                                CONFIDENTIAL
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Bottom gradient for controls overlay */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
                  style={{
                    background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%)',
                  }}
                />

                {/* ===== CONTROL BUTTONS OVERLAY (inside avatar, lower 20%) ===== */}
                {isConnected && (
                  <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center gap-4">
                    {/* Mic button */}
                    <Button
                      size="lg"
                      className="w-14 h-14 rounded-full transition-all duration-300 shadow-xl"
                      style={{ 
                        background: isListening ? '#FFC722' : 'rgba(28, 28, 30, 0.9)',
                        color: isListening ? '#000000' : '#FFFFFF',
                        backdropFilter: 'blur(8px)',
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
                      style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)' }}
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </Button>

                    {/* End button */}
                    <Button
                      size="lg"
                      variant="ghost"
                      className="w-12 h-12 rounded-full shadow-lg"
                      style={{ background: 'rgba(227, 6, 19, 0.3)', backdropFilter: 'blur(8px)' }}
                      onClick={endConversation}
                    >
                      <X className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                )}

                {/* Listening indicator inside avatar */}
                <AnimatePresence>
                  {isListening && (
                    <motion.div
                      className="absolute bottom-24 left-0 right-0 z-30 flex items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-4 rounded-full"
                            style={{ background: '#FFC722' }}
                            animate={{ scaleY: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                        <span className="text-xs font-medium text-white ml-2">Hört zu...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Status indicator inside avatar - centered */}
                <AnimatePresence>
                  {showUI && (
                    <motion.div 
                      className="absolute top-4 left-0 right-0 z-30 flex justify-center"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full"
                        style={{ 
                          background: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ 
                            background: isConnected ? '#00A650' : isConnecting ? '#FFC722' : '#E30613'
                          }}
                        />
                        <span className="text-sm font-medium text-white">
                          {isConnecting ? 'Verbinden...' : isConnected ? (demoMode ? 'Demo Modus' : 'Verbunden') : 'Bereit'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== QUIZ OVERLAYS ===== */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <QuizOverlayManager />
        </div>
      </div>

      {/* ===== VISUAL OVERLAY ===== */}
      <div className="absolute inset-0 z-15 pointer-events-none">
        <VisualOverlay visuals={activeVisuals} />
      </div>

      {/* Old status indicator removed - now inside avatar */}

      {/* Thinking indicator */}
      <AnimatePresence>
        {isThinking && showUI && (
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
        {error && showUI && (
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

      {/* ===== SIDE PANELS ===== */}
      <AnimatePresence>
        {showUI && isConnected && !demoMode && (
          <motion.div
            className="absolute top-24 right-4 bottom-36 w-72 z-25 flex flex-col gap-2 overflow-hidden"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="rounded-xl p-3 flex-shrink-0 border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Sprache → Agentforce</p>
              <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastVoiceTranscript || '—'}</p>
            </div>
            
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
            
            <div className="rounded-xl p-3 flex-shrink-0 border shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(255, 199, 34, 0.4)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Zuletzt gesprochen</p>
              <p className="text-sm line-clamp-3" style={{ color: '#333333' }}>{lastSpokenText || '—'}</p>
            </div>

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

      {/* ===== FOOTER - Simplified ===== */}
      <footer className="absolute bottom-8 left-0 right-0 z-20 px-4 md:px-6">
        {/* Text input */}
        <AnimatePresence>
          {isConnected && showUI && (
            <motion.form 
              onSubmit={handleSendText} 
              className="max-w-lg mx-auto mb-4 px-2 md:px-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
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
            </motion.form>
          )}
        </AnimatePresence>

        {/* Reconnect button only when disconnected */}
        {!isConnected && !isConnecting && (
          <div className="max-w-md mx-auto flex items-center justify-center">
            <Button
              size="lg"
              className="px-10 py-6 font-bold shadow-xl rounded-xl text-black text-lg hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #FFC722 0%, #E5B31F 100%)' }}
              onClick={handleRestart}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Neu verbinden
            </Button>
          </div>
        )}

        {/* Connecting indicator */}
        {isConnecting && (
          <div className="max-w-md mx-auto flex items-center justify-center">
            <div className="flex items-center gap-2 px-6 py-3 rounded-xl" style={{ background: 'rgba(255, 199, 34, 0.2)' }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#B8860B' }} />
              <span className="font-semibold" style={{ color: '#8B6914' }}>Verbinden...</span>
            </div>
          </div>
        )}
      </footer>

      {/* ===== POWERED BY AGENTFORCE - Bottom Left ===== */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
        <span 
          className="text-sm font-medium leading-none"
          style={{ color: 'rgba(60, 60, 60, 0.7)' }}
        >
          Powered by
        </span>
        <img 
          src={agentforceLogo} 
          alt="Agentforce" 
          className="h-10 object-contain align-middle"
          style={{ opacity: 0.8, marginTop: '-2px' }}
        />
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
