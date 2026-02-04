import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, Outlet, useLocation } from "react-router-dom";
import ProtoMDevice from "@/components/ProtoMDevice/ProtoMDevice";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { VideoCallEscalationOverlay } from "@/components/Overlay/VideoCallEscalationOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { useVideoCallEscalationStore } from "@/stores/videoCallEscalationStore";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { Mic, MicOff, Volume2, VolumeX, Settings, X, Play, Loader2, Maximize2 } from "lucide-react";
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
import { useKeynoteConversationStore } from "@/stores/createConversationStore";
import { useAppVoiceSettingsStore } from "@/stores/appVoiceSettingsStore";
import { useScopedAvatarConversation, HEYGEN_VOICES, HeyGenVoiceKey } from "@/hooks/useScopedAvatarConversation";
import { useDeepgramSTT } from "@/hooks/useDeepgramSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { KEYNOTE_AGENTS, DEFAULT_KEYNOTE_AGENT_ID } from "@/config/agents";

/**
 * Miguel Keynote Avatar - Main Page
 * Uses the CKO Keynote Agent
 */
const KeynoteAvatar = () => {
  const location = useLocation();
  const isMainPage = location.pathname === '/keynote' || location.pathname === '/keynote/';
  
  // If on a subpage (proto-m or proto-l), render outlet
  if (!isMainPage) {
    return <Outlet />;
  }

  return <KeynoteAvatarMain />;
};

const KeynoteAvatarMain = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_KEYNOTE_AGENT_ID);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use keynote-specific store and settings
  const voiceSettings = useAppVoiceSettingsStore(state => state.keynote);
  const updateVoiceSettings = useAppVoiceSettingsStore(state => state.updateKeynoteSettings);
  const conversationState = useKeynoteConversationStore();

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isThinking,
    startConversation,
    sendMessage,
    endConversation,
  } = useScopedAvatarConversation({
    store: useKeynoteConversationStore,
    voiceSettings,
    defaultAgentId: selectedAgentId,
    availableAgents: KEYNOTE_AGENTS,
    useJsonMode: true,
  });

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
  } = conversationState;

  const { activeVisuals } = useVisualOverlayStore();
  const { setOnStartCallback } = useQuizOverlayStore();

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('[Keynote] Voice transcript:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting } = useDeepgramSTT(
    handleVoiceTranscript,
    { disabled: isSpeaking || isThinking }
  );

  const handleStart = useCallback(() => {
    startConversation(videoRef.current, selectedAgentId);
  }, [startConversation, selectedAgentId]);

  useEffect(() => {
    setOnStartCallback(handleStart);
    return () => setOnStartCallback(null);
  }, [handleStart, setOnStartCallback]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleVoiceChange = useCallback((voice: HeyGenVoiceKey) => {
    updateVoiceSettings({ heygenVoice: voice });
  }, [updateVoiceSettings]);

  const { isVisible: isVideoCallVisible, hide: hideVideoCall, duration: videoCallDuration } = useVideoCallEscalationStore();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Video Call Escalation Overlay */}
      <VideoCallEscalationOverlay 
        isVisible={isVideoCallVisible} 
        onClose={hideVideoCall} 
        duration={videoCallDuration} 
      />
      
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-white font-bold text-base md:text-lg">K</span>
          </motion.div>
          <div className="hidden sm:block">
            <span className="text-foreground font-semibold">Miguel Keynote Avatar</span>
            <span className="text-muted-foreground text-sm block">CKO Keynote Agent</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Agent Selector */}
          <Select
            value={selectedAgentId}
            onValueChange={setSelectedAgentId}
            disabled={isConnected}
          >
            <SelectTrigger className="hidden lg:flex w-48 h-9 bg-secondary/50 backdrop-blur-sm border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEYNOTE_AGENTS.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Voice Selector */}
          <Select
            value={voiceSettings.heygenVoice}
            onValueChange={(value) => handleVoiceChange(value as HeyGenVoiceKey)}
            disabled={isConnected}
          >
            <SelectTrigger className="hidden lg:flex w-40 h-9 bg-secondary/50 backdrop-blur-sm border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HEYGEN_VOICES).map(([key, voice]) => (
                <SelectItem key={key} value={key}>
                  🎙️ {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Fullscreen Links */}
          <div className="hidden xl:flex items-center gap-1">
            <Link to="/keynote/proto-m">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                <Maximize2 className="w-3 h-3 mr-1" />
                Proto M
              </Button>
            </Link>
            <Link to="/keynote/proto-l">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                <Maximize2 className="w-3 h-3 mr-1" />
                Proto L
              </Button>
            </Link>
          </div>

          {/* Demo Mode Toggle */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 backdrop-blur-sm">
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
              disabled={isConnected}
            />
            <Label htmlFor="demo-mode" className="text-muted-foreground text-sm">Demo</Label>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 h-screen">
        <ProtoMDevice isActive={isConnected}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
            isMuted={isMuted}
          />
          <QuizOverlayManager />
        </ProtoMDevice>
      </main>

      {/* Status indicator */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-md border border-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-amber-400' : 'bg-primary'} animate-pulse`} />
          <span className="text-sm text-muted-foreground">
            {isConnecting ? 'Connecting...' : isConnected ? (demoMode ? 'Demo Mode' : 'Connected') : 'Ready'}
          </span>
        </motion.div>
      </div>

      {/* Debug panel */}
      {isConnected && !demoMode && (
        <div className="hidden lg:flex absolute top-20 right-4 bottom-24 w-72 z-20 flex-col gap-2 overflow-hidden">
          <div className="rounded-xl bg-secondary/70 backdrop-blur-md border border-border p-3 flex-shrink-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">Voice → Agentforce</p>
            <p className="text-sm text-foreground line-clamp-3">{lastVoiceTranscript || '—'}</p>
          </div>
          
          <div className="rounded-xl bg-secondary/70 backdrop-blur-md border border-border p-3 flex-1 overflow-hidden flex flex-col">
            <p className="text-xs text-muted-foreground font-medium mb-2">Streaming Sentences</p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {streamingSentences.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Waiting for response...</p>
              ) : (
                streamingSentences.map((sentence, idx) => (
                  <div 
                    key={idx} 
                    className="text-xs text-foreground p-2 rounded-lg bg-primary/10 border-l-2 border-primary"
                  >
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                    {sentence}
                  </div>
                ))
              )}
            </div>
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-primary">{thinkingMessage || 'Thinking...'}</span>
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
            <div className="px-4 py-2 rounded-xl bg-destructive/20 border border-destructive/30">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6">
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-lg mx-auto mb-3 md:mb-4 px-2 md:px-0">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask me anything..."
                className="bg-secondary/80 backdrop-blur-md border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-4 md:px-6"
              >
                Send
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
              className="px-10 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg shadow-primary/30 rounded-xl"
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Keynote
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className={`rounded-full w-14 h-14 ${
                  isListening 
                    ? 'bg-primary hover:bg-primary/90' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
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

              <Button
                size="lg"
                variant="ghost"
                className="rounded-full w-12 h-12"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>

              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-12 h-12"
                onClick={endConversation}
              >
                <X className="w-5 h-5" />
              </Button>
            </>
          )}
        </motion.div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onReconnectAvatar={() => {}}
      />
    </div>
  );
};

export default KeynoteAvatar;
