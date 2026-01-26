import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { VisualOverlay } from "@/components/Overlay/VisualOverlay";
import { useVisualOverlayStore } from "@/stores/visualOverlayStore";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";
import { useElevenLabsSTT } from "@/hooks/useElevenLabsSTT";
import { SettingsModal } from "@/components/Settings/SettingsModal";

const Index = () => {
  // Controls whether the HeyGen video element is muted.
  // NOTE: If this is true, you will not hear HeyGen voice audio.
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
    lastAgentforceResponse,
    lastSpokenText,
    streamingSentences,
  } = useConversationStore();

  const { activeVisuals } = useVisualOverlayStore();

  // Handle voice transcript - send to agent
  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('Voice transcript received:', transcript);
    sendMessage(transcript);
  }, [sendMessage]);

  const { toggleListening, isListening, isConnecting: sttConnecting, partialTranscript } = useElevenLabsSTT(handleVoiceTranscript);

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
      <header className="absolute top-0 left-0 right-0 z-20 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-white font-bold text-lg">A</span>
          </motion.div>
          <div>
            <span className="text-foreground font-semibold">Agentforce</span>
            <span className="text-muted-foreground text-sm block">AI Assistant</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 backdrop-blur-sm">
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

      {/* Main content - Full screen avatar (no device frame for max resolution) */}
      <main className="absolute inset-0 z-10">
        {/* Background gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 120% 80% at 50% 20%, hsl(210 100% 20%) 0%, hsl(220 40% 8%) 50%, hsl(220 50% 4%) 100%)',
          }}
        />
        {/* Subtle ambient glow */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        
        {/* Avatar fills entire viewport */}
        <HologramAvatar 
          isConnected={isConnected} 
          isSpeaking={isSpeaking}
          videoRef={videoRef}
          isMuted={isMuted}
        />
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

      {/* Debug panel - vertical on the right */}
      {isConnected && !demoMode && (
        <div className="absolute top-20 right-4 bottom-24 w-72 z-20 flex flex-col gap-2 overflow-hidden">
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

      {/* Partial transcript display */}
      <AnimatePresence>
        {partialTranscript && (
          <motion.div
            className="absolute top-44 left-1/2 -translate-x-1/2 z-20 max-w-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="px-4 py-2 rounded-xl bg-secondary/90 backdrop-blur-md border border-border">
              <span className="text-sm text-muted-foreground italic">{partialTranscript}</span>
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
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-6">
        {/* Text input for testing */}
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-lg mx-auto mb-4">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask me about products, features, and pricing..."
                className="bg-secondary/80 backdrop-blur-md border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={isThinking || !textInput.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        <motion.div
          className="max-w-md mx-auto flex items-center justify-center gap-4"
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
                className={`w-14 h-14 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={toggleListening}
                disabled={sttConnecting || isThinking}
              >
                {sttConnecting ? (
                  <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                ) : isListening ? (
                  <Mic className="w-6 h-6 text-white" />
                ) : (
                  <MicOff className="w-6 h-6 text-muted-foreground" />
                )}
              </Button>

              {/* Mute button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>

              {/* History button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </Button>

              {/* End button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-destructive/20 hover:bg-destructive/30 backdrop-blur-sm"
                onClick={endConversation}
              >
                <X className="w-5 h-5 text-destructive" />
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
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Index;
