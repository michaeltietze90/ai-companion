import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualCommand } from '@/lib/richResponseParser';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';

/**
 * AvatarOverlay - Renders visuals with position="avatar" directly over the avatar.
 * This component should be placed INSIDE the avatar container for perfect alignment.
 */

interface ActiveVisual extends VisualCommand {
  isVisible: boolean;
  hasEnded?: boolean; // Track if video has finished playing
}

export function AvatarOverlay() {
  const { activeVisuals: storeVisuals, markVisualComplete } = useVisualOverlayStore();
  const [localVisuals, setLocalVisuals] = useState<ActiveVisual[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Filter only avatar-positioned visuals
  const avatarVisuals = storeVisuals.filter(v => v.position === 'avatar');

  // Create a stable key from current avatar visual IDs
  const avatarVisualIds = avatarVisuals.map(v => v.id).join(',');

  // Handle video end - hide overlay when video finishes
  const handleVideoEnded = useCallback((visualId: string) => {
    console.log(`[AvatarOverlay] Video ended: ${visualId}`);
    
    // Clear any existing timeout since video finished naturally
    const existingTimeout = timeoutRefs.current.get(visualId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(visualId);
    }
    
    // Mark video as ended and start fade out
    setLocalVisuals(prev => 
      prev.map(v => v.id === visualId ? { ...v, isVisible: false, hasEnded: true } : v)
    );
    
    // Remove after fade out and mark complete in store
    setTimeout(() => {
      setLocalVisuals(prev => prev.filter(v => v.id !== visualId));
      markVisualComplete(visualId);
      setProcessedIds(prev => {
        const next = new Set(prev);
        next.delete(visualId);
        return next;
      });
    }, 800); // Wait for fade animation to complete
  }, [markVisualComplete]);

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
        return [...prev, { ...visual, isVisible: true, hasEnded: false }];
      });

      // Schedule fallback hide after duration (in case onEnded doesn't fire)
      const hideTimeout = setTimeout(() => {
        console.log(`[AvatarOverlay] Fallback timeout for: ${visual.id}`);
        setLocalVisuals(prev => 
          prev.map(v => v.id === visual.id && !v.hasEnded ? { ...v, isVisible: false } : v)
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
      
      timeoutRefs.current.set(visual.id, hideTimeout);
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
              loop={false}
              playsInline
              preload="auto"
              onEnded={() => handleVideoEnded(visual.id)}
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
