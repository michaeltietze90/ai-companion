import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Loader2, User, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCallEscalationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // Auto-close after duration (ms), 0 = manual close only
}

type EscalationPhase = 'connecting' | 'connected' | 'in-call';

export function VideoCallEscalationOverlay({ 
  isVisible, 
  onClose, 
  duration = 0 
}: VideoCallEscalationOverlayProps) {
  const [phase, setPhase] = useState<EscalationPhase>('connecting');
  
  // Reset phase when overlay opens
  useEffect(() => {
    if (isVisible) {
      setPhase('connecting');
      
      // Simulate connection phases
      const connectTimer = setTimeout(() => setPhase('connected'), 2000);
      const inCallTimer = setTimeout(() => setPhase('in-call'), 3500);
      
      return () => {
        clearTimeout(connectTimer);
        clearTimeout(inCallTimer);
      };
    }
  }, [isVisible]);
  
  // Auto-close after duration if specified
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Video Call Card */}
          <motion.div
            className="relative z-10 w-[90vw] max-w-lg aspect-video rounded-2xl overflow-hidden
                       bg-gradient-to-br from-muted/90 to-background/95 
                       border border-primary/30 shadow-2xl shadow-primary/20"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full 
                         bg-background/50 hover:bg-background/80 
                         text-muted-foreground hover:text-foreground
                         transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Content based on phase */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <AnimatePresence mode="wait">
                {phase === 'connecting' && (
                  <motion.div
                    key="connecting"
                    className="flex flex-col items-center gap-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
                      animate={{ 
                        boxShadow: [
                          '0 0 0 0 hsl(var(--primary) / 0.4)',
                          '0 0 0 20px hsl(var(--primary) / 0)',
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Video className="w-10 h-10 text-primary" />
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Verbinde mit Kundenberater...
                      </h3>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Bitte warten</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {phase === 'connected' && (
                  <motion.div
                    key="connected"
                    className="flex flex-col items-center gap-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      <Phone className="w-10 h-10 text-accent-foreground" />
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Berater gefunden!
                      </h3>
                      <p className="text-muted-foreground">
                        Verbindung wird hergestellt...
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {phase === 'in-call' && (
                  <motion.div
                    key="in-call"
                    className="flex flex-col items-center gap-4 w-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Mock video feed */}
                    <div className="relative w-full aspect-video bg-muted/50 rounded-lg overflow-hidden">
                      {/* Agent placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-12 h-12 text-primary/60" />
                        </div>
                      </div>
                      
                      {/* "Live" indicator */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 
                                      bg-destructive/90 rounded-full">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-destructive-foreground"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <span className="text-xs font-medium text-destructive-foreground">LIVE</span>
                      </div>
                      
                      {/* Self-view (small) */}
                      <div className="absolute bottom-3 right-3 w-20 h-14 bg-muted rounded-lg 
                                      border border-border/50 flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    </div>
                    
                    {/* Call controls */}
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="destructive"
                        size="lg"
                        className="rounded-full px-6"
                        onClick={onClose}
                      >
                        <Phone className="w-5 h-5 mr-2 rotate-[135deg]" />
                        Auflegen
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Decorative gradient border */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none
                            bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VideoCallEscalationOverlay;
