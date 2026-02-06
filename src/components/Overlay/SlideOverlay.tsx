import { motion, AnimatePresence } from 'framer-motion';
import { useSlideOverlayStore } from '@/stores/slideOverlayStore';

/**
 * Slide Overlay - Shows a specific PDF page as an image overlay
 * Positioned in the lower portion of the avatar screen area.
 * Triggered via: { type: 'slide', data: { page: 4 } }
 */
export function SlideOverlay() {
  const { isVisible, currentSlide } = useSlideOverlayStore();

  const slideSrc = `/slides/page_${currentSlide}.jpg`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-x-[3%] bottom-[10%] z-40 pointer-events-none flex justify-center"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
        >
          <div className="relative w-full max-w-[85%] overflow-hidden rounded-2xl shadow-2xl">
            {/* Glow effect behind */}
            <div 
              className="absolute -inset-2 blur-xl opacity-30 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #0176D3, #1B96FF)' }}
            />
            
            {/* Slide image */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
              <img
                src={slideSrc}
                alt={`Slide ${currentSlide}`}
                className="w-full h-auto object-contain"
                style={{ maxHeight: '45vh' }}
              />
              
              {/* Slide number badge */}
              <div 
                className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #0176D3 0%, #014486 100%)',
                  boxShadow: '0 2px 8px rgba(1, 118, 211, 0.4)',
                }}
              >
                Slide {currentSlide}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SlideOverlay;
