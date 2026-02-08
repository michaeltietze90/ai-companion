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
  const { activeVisuals: storeVisuals, markVisualComplete } = useVisualOverlayStore();
  const [localVisuals, setLocalVisuals] = useState<ActiveVisual[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Filter only avatar-positioned visuals
  const avatarVisuals = storeVisuals.filter(v => v.position === 'avatar');

  // Create a stable key from current avatar visual IDs
  const avatarVisualIds = avatarVisuals.map(v => v.id).join(',');

  // Track and manage avatar visuals lifecycle
  useEffect(() => {
    if (avatarVisuals.length === 0) {
      return;
    }

    // Process each new visual
    avatarVisuals.forEach(visual => {
      // Skip if already processed
      if (processedIds.has(visual.id)) return;
      
      // Mark as processed immediately
      setProcessedIds(prev => new Set([...prev, visual.id]));
      
      // Add to local visuals
      setLocalVisuals(prev => {
        if (prev.find(v => v.id === visual.id)) return prev;
        return [...prev, { ...visual, isVisible: true }];
      });

      // Schedule hide after duration
      const hideTimeout = setTimeout(() => {
        setLocalVisuals(prev => 
          prev.map(v => v.id === visual.id ? { ...v, isVisible: false } : v)
        );
        
        // Remove after fade out and mark complete in store
        setTimeout(() => {
          setLocalVisuals(prev => prev.filter(v => v.id !== visual.id));
          markVisualComplete(visual.id);
          // Clean up processed ID after removal
          setProcessedIds(prev => {
            const next = new Set(prev);
            next.delete(visual.id);
            return next;
          });
        }, 800); // Wait for fade animation to complete
      }, visual.duration);
    });
  }, [avatarVisualIds, processedIds, markVisualComplete]);

  if (localVisuals.length === 0) return null;

  return (
    <AnimatePresence mode="sync">
      {localVisuals.map(visual => (
        <motion.div
          key={visual.id}
          className="absolute inset-0 z-[5] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: visual.isVisible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
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
