import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ProtoMDevice from "@/components/ProtoMDevice/ProtoMDevice";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { QuizOverlayManager } from "@/components/QuizOverlay/QuizOverlayManager";
import { useQuizOverlayStore } from "@/stores/quizOverlayStore";
import { DebugTerminal } from "@/components/DebugTerminal/DebugTerminal";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X, Play, Loader2, Maximize2, Trophy, UserPlus, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAvatarConversation, HEYGEN_VOICES, HeyGenVoiceKey } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { ProfileSwitcher } from "@/components/ProfileSwitcher/ProfileSwitcher";
import { useSettingsStore, VoiceEmotionType } from "@/stores/settingsStore";

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const activeProfile = useSettingsStore((state) => state.getActiveProfile());

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
  
  const [isChangingEmotion, setIsChangingEmotion] = useState(false);

  const {
    messages,
    thinkingMessage,
    demoMode,
    setDemoMode,
    error,
    sessionId,
    lastVoiceTranscript,
    lastAgentforceResponse,
    lastSpokenText,
    streamingSentences,
  } = useConversationStore();

  const { activeVisuals } = useVisualOverlayStore();
  const { showNameEntry, showLeaderboard, setLeaderboard, setUserRankData } = useQuizOverlayStore();
  
  // Test leaderboard with user at rank 20
  const handleTestLeaderboard = useCallback(() => {
    setLeaderboard([
      { id: '1', firstName: 'Sarah', lastName: 'Chen', country: 'Singapore', score: 980, timestamp: Date.now() },
      { id: '2', firstName: 'Marcus', lastName: 'Johnson', country: 'USA', score: 945, timestamp: Date.now() },
      { id: '3', firstName: 'Yuki', lastName: 'Tanaka', country: 'Japan', score: 920, timestamp: Date.now() },
      { id: '4', firstName: 'Emma', lastName: 'Wilson', country: 'UK', score: 890, timestamp: Date.now() },
      { id: '5', firstName: 'Carlos', lastName: 'Rodriguez', country: 'Spain', score: 875, timestamp: Date.now() },
    ]);
    setUserRankData(20, {
      id: 'user-test',
      firstName: 'Michael',
      lastName: 'Tietze',
      country: 'Switzerland',
      score: 650,
      timestamp: Date.now(),
    });
    showLeaderboard();
  }, [setLeaderboard, setUserRankData, showLeaderboard]);
  
  // Settings store for emotion and voice
  const { updateProfile, activeProfileId } = useSettingsStore();
  const currentEmotion = activeProfile?.selectedEmotion || 'excited';
  const currentVoice = activeProfile?.heygenVoice || 'miguel';
  
  const handleVoiceChange = useCallback((voice: HeyGenVoiceKey) => {
    if (activeProfileId) {
      updateProfile(activeProfileId, { heygenVoice: voice });
    }
  }, [activeProfileId, updateProfile]);
  
  const handleEmotionChange = useCallback(async (emotion: VoiceEmotionType) => {
    if (activeProfileId) {
      updateProfile(activeProfileId, { selectedEmotion: emotion });
      
      // If connected, reinitialize avatar with new emotion
      if (isConnected && videoRef.current) {
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
  }, [activeProfileId, updateProfile, isConnected, reinitializeAvatarWithEmotion]);

  // Reconnect avatar with current settings (used after changing voice tuning)
  const handleReconnectAvatar = useCallback(async () => {
    if (isConnected && videoRef.current) {
      await endConversation();
      // Small delay to ensure clean shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      await startConversation(videoRef.current);
    }
  }, [isConnected, endConversation, startConversation]);

  // Handle voice transcript - send to agent
  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('Voice transcript received:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting, partialTranscript } = useElevenLabsSTT(
    handleVoiceTranscript,
    {
      // Prevent echo loops: don't transcribe while the avatar is speaking.
      disabled: isSpeaking || isThinking,
    }
  );

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
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Visual Overlay Layer */}
      <VisualOverlay visuals={activeVisuals} />

      {/* Header - Agentforce inspired */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 md:p-5 flex items-center justify-between">
        {/* Logo - simplified on mobile */}
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-white font-bold text-base md:text-lg">A</span>
          </motion.div>
          <div className="hidden sm:block">
            <span className="text-foreground font-semibold">Agentforce</span>
            <span className="text-muted-foreground text-sm block">AI Assistant</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Agent Profile Switcher - always visible */}
          <ProfileSwitcher disabled={isConnected} />
          
          {/* HeyGen Voice Selector - Desktop only */}
          <Select
            value={currentVoice}
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
          
          {/* Emotion Selector - Desktop only */}
          <Select
            value={currentEmotion}
            onValueChange={(value) => handleEmotionChange(value as VoiceEmotionType)}
            disabled={isChangingEmotion}
          >
            <SelectTrigger className={`hidden lg:flex w-36 h-9 bg-secondary/50 backdrop-blur-sm border-border ${isChangingEmotion ? 'opacity-50' : ''}`}>
              {isChangingEmotion ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Changing...
                </span>
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excited">🎉 Excited</SelectItem>
              <SelectItem value="friendly">😊 Friendly</SelectItem>
              <SelectItem value="serious">🎯 Serious</SelectItem>
              <SelectItem value="soothing">🧘 Soothing</SelectItem>
              <SelectItem value="broadcaster">📺 Broadcaster</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Fullscreen Display Links - Desktop only */}
          <div className="hidden xl:flex items-center gap-1">
            <Link to="/proto-m">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                <Maximize2 className="w-3 h-3 mr-1" />
                Proto M
              </Button>
            </Link>
            <Link to="/proto-l">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                <Maximize2 className="w-3 h-3 mr-1" />
                Proto L
              </Button>
            </Link>
          </div>

          {/* Quiz Overlay Demo Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-xs"
              onClick={() => showNameEntry(Math.floor(Math.random() * 300) + 800)}
            >
              <UserPlus className="w-3 h-3 mr-1" />
              Name Entry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-xs"
              onClick={handleTestLeaderboard}
            >
              <Trophy className="w-3 h-3 mr-1" />
              Leaderboard
            </Button>
          </div>

          {/* Demo Mode Toggle - Hidden on mobile */}
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

      {/* Main content - Proto M Device */}
      <main className="relative z-10 h-screen">
        <ProtoMDevice isActive={isConnected}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
            isMuted={isMuted}
          />
          {/* Quiz Overlay - integrated in hologram */}
          <QuizOverlayManager />
        </ProtoMDevice>
      </main>

      {/* Status indicators - Agentforce style */}
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
          {isConnected && !demoMode && (
            <span className="text-xs text-muted-foreground/80">• session {String(sessionId).slice(0, 8)}</span>
          )}
        </motion.div>
      </div>


      {/* Debug panel - vertical on the right, hidden on mobile */}
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
          
          <div className="rounded-xl bg-secondary/70 backdrop-blur-md border border-border p-3 flex-shrink-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">Last Spoken</p>
            <p className="text-sm text-foreground line-clamp-3">{lastSpokenText || '—'}</p>
          </div>
        </div>
      )}

      {/* Thinking indicator - Agentforce style */}
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

      {/* Controls - Agentforce style */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6">
        {/* Text input for testing */}
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
            /* Start button - Agentforce style */
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
                  Start Conversation
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Mic button */}
              <Button
                size="lg"
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 text-foreground animate-spin" />
                ) : isListening ? (
                  <Mic className="w-5 h-5 md:w-6 md:h-6 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                )}
              </Button>

              {/* Mute button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                )}
              </Button>

              {/* History button - hidden on mobile */}
              <Button
                size="lg"
                variant="ghost"
                className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </Button>

              {/* End button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-destructive/20 hover:bg-destructive/30 backdrop-blur-sm"
                onClick={endConversation}
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
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
                  className="w-1 h-4 bg-primary rounded-full"
                  animate={{
                    scaleY: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-primary">Listening...</span>
          </motion.div>
        )}
      </footer>

      {/* Conversation History Sidebar - Agentforce style */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border z-30"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-foreground font-semibold">Conversation History</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-primary/20 ml-4 border border-primary/30'
                        : 'bg-secondary mr-4'
                    }`}
                  >
                    <p className="text-sm text-foreground">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
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

      {/* Mobile FAB for Test Overlays */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(310 80% 50%) 100%)',
              }}
            >
              <MoreVertical className="w-6 h-6 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            <DropdownMenuItem onClick={() => showNameEntry(Math.floor(Math.random() * 300) + 800)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Name Entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleTestLeaderboard}>
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Debug Terminal */}
      <DebugTerminal />
    </div>
  );
};

export default Index;
