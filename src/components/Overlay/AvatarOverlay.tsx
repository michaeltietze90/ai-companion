import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualCommand } from '@/lib/richResponseParser';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';

/**
 * AvatarOverlay - Renders visuals with position="avatar" directly over the avatar.
 * This component should be placed INSIDE the avatar container for perfect alignment.
 */

interface ActiveVisual extends VisualCommand {
  isVisible: boolean;
}

export function AvatarOverlay() {
  const { activeVisuals: storeVisuals } = useVisualOverlayStore();
  const [localVisuals, setLocalVisuals] = useState<ActiveVisual[]>([]);

  // Filter only avatar-positioned visuals
  const avatarVisuals = storeVisuals.filter(v => v.position === 'avatar');

  // Track and manage avatar visuals lifecycle
  useEffect(() => {
    if (avatarVisuals.length === 0) {
      setLocalVisuals([]);
      return;
    }

    // Add new visuals
    avatarVisuals.forEach(visual => {
      setLocalVisuals(prev => {
        if (prev.find(v => v.id === visual.id)) return prev;
        return [...prev, { ...visual, isVisible: true }];
      });

      // Schedule hide after duration
      const hideTimeout = setTimeout(() => {
        setLocalVisuals(prev => 
          prev.map(v => v.id === visual.id ? { ...v, isVisible: false } : v)
        );
        
        // Remove after fade out
        setTimeout(() => {
          setLocalVisuals(prev => prev.filter(v => v.id !== visual.id));
        }, 200);
      }, visual.duration);

      return () => clearTimeout(hideTimeout);
    });
  }, [avatarVisuals.length]);

  if (localVisuals.length === 0) return null;

  return (
    <AnimatePresence mode="sync">
      {localVisuals.map(visual => (
        <motion.div
          key={visual.id}
          className="absolute inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: visual.isVisible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
        >
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
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export default AvatarOverlay;
