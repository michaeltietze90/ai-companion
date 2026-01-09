import { useState } from "react";
import { motion } from "framer-motion";
import ProtoMDevice from "@/components/ProtoMDevice/ProtoMDevice";
import HologramAvatar from "@/components/Avatar/HologramAvatar";
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content - Proto M Device */}
      <main className="relative z-10 h-screen pt-16 pb-24">
        <ProtoMDevice isActive={true}>
          <HologramAvatar isConnected={isConnected} isSpeaking={false} />
        </ProtoMDevice>
      </main>

      {/* Status indicators */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
          <span className="text-sm text-white/70">
            {isConnected ? 'Connected' : 'Demo Mode'}
          </span>
        </motion.div>
      </div>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <motion.div
          className="max-w-md mx-auto flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Mic button */}
          <Button
            size="lg"
            className={`w-14 h-14 rounded-full transition-all duration-300 ${
              isMicActive
                ? 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/30'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
            onClick={() => setIsMicActive(!isMicActive)}
          >
            {isMicActive ? (
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
            onClick={() => setIsConnected(false)}
          >
            <X className="w-5 h-5 text-red-400" />
          </Button>
        </motion.div>

        {/* Listening indicator */}
        {isMicActive && (
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
          <div className="p-4">
            <p className="text-white/50 text-sm text-center">No messages yet</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Index;
