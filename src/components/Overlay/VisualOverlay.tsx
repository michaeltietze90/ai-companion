import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualCommand, VisualPosition } from '@/lib/richResponseParser';

interface VisualOverlayProps {
  visuals: VisualCommand[];
  onVisualComplete?: (id: string) => void;
  onAllComplete?: () => void;
}

// Map position to Tailwind classes
const positionClasses: Record<VisualPosition, string> = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-24',
  bottom: 'items-end justify-center pb-24',
  left: 'items-center justify-start pl-12',
  right: 'items-center justify-end pr-12',
  topleft: 'items-start justify-start pt-24 pl-12',
  topright: 'items-start justify-end pt-24 pr-12',
  bottomleft: 'items-end justify-start pb-24 pl-12',
  bottomright: 'items-end justify-end pb-24 pr-12',
  avatar: 'items-center justify-center', // Handled specially below
};

interface ActiveVisual extends VisualCommand {
  isVisible: boolean;
  timeoutId?: NodeJS.Timeout;
}

export function VisualOverlay({ visuals, onVisualComplete, onAllComplete }: VisualOverlayProps) {
  const [activeVisuals, setActiveVisuals] = useState<ActiveVisual[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  // Start a visual with its offset
  const startVisual = useCallback((visual: VisualCommand) => {
    setActiveVisuals(prev => {
      // Don't add if already active
      if (prev.find(v => v.id === visual.id)) return prev;
      return [...prev, { ...visual, isVisible: true }];
    });

    // Schedule hide
    const hideTimeout = setTimeout(() => {
      setActiveVisuals(prev => 
        prev.map(v => v.id === visual.id ? { ...v, isVisible: false } : v)
      );
      
      // Schedule removal after animation
      setTimeout(() => {
        setActiveVisuals(prev => prev.filter(v => v.id !== visual.id));
        setCompletedCount(c => c + 1);
        onVisualComplete?.(visual.id);
      }, 500); // exit animation duration
    }, visual.duration);

    return hideTimeout;
  }, [onVisualComplete]);

  // Process incoming visuals
  useEffect(() => {
    if (!visuals.length) return;

    const timeouts: NodeJS.Timeout[] = [];

    visuals.forEach(visual => {
      if (visual.startOffset > 0) {
        // Delayed start
        const startTimeout = setTimeout(() => {
          startVisual(visual);
        }, visual.startOffset);
        timeouts.push(startTimeout);
      } else {
        // Immediate start
        startVisual(visual);
      }
    });

    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [visuals, startVisual]);

  // Check if all complete
  useEffect(() => {
    if (visuals.length > 0 && completedCount >= visuals.length) {
      onAllComplete?.();
      setCompletedCount(0);
    }
  }, [completedCount, visuals.length, onAllComplete]);

  if (activeVisuals.length === 0) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <AnimatePresence mode="sync">
        {activeVisuals.map(visual => {
          const isAvatarOverlay = visual.position === 'avatar';
          
          return (
            <motion.div
              key={visual.id}
              className={`absolute inset-0 flex ${positionClasses[visual.position]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: visual.isVisible ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: isAvatarOverlay ? 0.15 : 0.4, ease: 'easeInOut' }}
            >
              {isAvatarOverlay ? (
                // Avatar overlay: fullscreen, no styling, seamless blend
                <div className="w-full h-full flex items-center justify-center">
                  {visual.type === 'video' ? (
                    <video
                      src={visual.src}
                      autoPlay
                      muted
                      loop={false}
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ background: 'transparent' }}
                    />
                  ) : (
                    <img
                      src={visual.src}
                      alt={visual.alt || 'Avatar overlay'}
                      className="w-full h-full object-cover"
                      style={{ background: 'transparent' }}
                    />
                  )}
                </div>
              ) : (
                // Regular overlay with animations and styling
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ 
                    scale: visual.isVisible ? 1 : 0.95, 
                    opacity: visual.isVisible ? 1 : 0 
                  }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="max-w-[80vw] max-h-[80vh]"
                >
                  {visual.type === 'video' ? (
                    <video
                      src={visual.src}
                      autoPlay
                      muted
                      loop={false}
                      playsInline
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      style={{ background: 'transparent' }}
                    />
                  ) : (
                    <img
                      src={visual.src}
                      alt={visual.alt || 'Visual overlay'}
                      className="max-w-full max-h-full object-contain"
                      style={{ background: 'transparent' }}
                      onError={(e) => {
                        console.error('Failed to load visual:', visual.src);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default VisualOverlay;
