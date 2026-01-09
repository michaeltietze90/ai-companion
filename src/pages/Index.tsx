import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtoMDevice from "@/components/ProtoMDevice/ProtoMDevice";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { useConversationStore } from "@/stores/conversationStore";

const Index = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [textInput, setTextInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isThinking,
    startConversation,
    sendMessage,
    endConversation,
    setListening,
  } = useAvatarConversation();

  const { 
    messages, 
    thinkingMessage, 
    demoMode, 
    setDemoMode,
    error 
  } = useConversationStore();

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

  const toggleMic = () => {
    setListening(!isListening);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background ambient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/3 to-transparent" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-white font-bold text-lg">P</span>
          </motion.div>
          <span className="text-white/80 font-medium">Proto M</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
              disabled={isConnected}
            />
            <Label htmlFor="demo-mode" className="text-white/60 text-sm">Demo</Label>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content - Proto M Device */}
      <main className="relative z-10 h-screen pt-16 pb-32">
        <ProtoMDevice isActive={isConnected}>
          <HologramAvatar 
            isConnected={isConnected} 
            isSpeaking={isSpeaking}
            videoRef={videoRef}
            isMuted={isMuted}
          />
        </ProtoMDevice>
      </main>

      {/* Status indicators */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-amber-400' : 'bg-slate-500'} animate-pulse`} />
          <span className="text-sm text-white/70">
            {isConnecting ? 'Connecting...' : isConnected ? (demoMode ? 'Demo Mode' : 'Connected') : 'Ready'}
          </span>
        </motion.div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="absolute top-32 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm text-cyan-400">{thinkingMessage || 'Thinking...'}</span>
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
            <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <span className="text-sm text-red-400">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-6">
        {/* Text input for testing */}
        {isConnected && (
          <form onSubmit={handleSendText} className="max-w-md mx-auto mb-4">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-white/40"
                disabled={isThinking}
              />
              <Button type="submit" disabled={isThinking || !textInput.trim()}>
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
            /* Start button */
            <Button
              size="lg"
              className="px-8 py-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/30"
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
                    ? 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={toggleMic}
              >
                {isListening ? (
                  <Mic className="w-6 h-6 text-white" />
                ) : (
                  <MicOff className="w-6 h-6 text-white/70" />
                )}
              </Button>

              {/* Mute button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white/60" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white/70" />
                )}
              </Button>

              {/* History button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <MessageSquare className="w-5 h-5 text-white/70" />
              </Button>

              {/* End button */}
              <Button
                size="lg"
                variant="ghost"
                className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm"
                onClick={endConversation}
              >
                <X className="w-5 h-5 text-red-400" />
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
                  className="w-1 h-4 bg-cyan-400 rounded-full"
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
            <span className="text-sm text-cyan-400">Listening...</span>
          </motion.div>
        )}
      </footer>

      {/* Conversation History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-lg border-l border-slate-700/50 z-30"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-white font-medium">Conversation History</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white"
                onClick={() => setShowHistory(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-white/50 text-sm text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 ml-4'
                        : 'bg-slate-800/50 mr-4'
                    }`}
                  >
                    <p className="text-sm text-white/80">{msg.content}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
