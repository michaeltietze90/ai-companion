import { motion, AnimatePresence } from 'framer-motion';
import { useScoreOverlayStore } from '@/stores/scoreOverlayStore';

/**
 * Salesforce Trailhead Badge-style Score Overlay
 * Displays a score from 0-100 in a hexagonal badge design
 */
export function ScoreOverlay() {
  const { isVisible, score } = useScoreOverlayStore();
  
  // Get color theme based on score (Trailhead-style colors)
  const getScoreTheme = () => {
    if (score >= 80) {
      return {
        primary: '#2E844A', // Trailhead Green
        secondary: '#194E31',
        accent: '#45C65A',
        label: 'Ranger',
        icon: '⭐',
      };
    }
    if (score >= 60) {
      return {
        primary: '#0176D3', // Salesforce Blue
        secondary: '#014486',
        accent: '#1B96FF',
        label: 'Expeditioner',
        icon: '🏔️',
      };
    }
    if (score >= 40) {
      return {
        primary: '#FF9A3C', // Orange
        secondary: '#DD7A00',
        accent: '#FFB75D',
        label: 'Hiker',
        icon: '🥾',
      };
    }
    return {
      primary: '#939393', // Gray for beginners
      secondary: '#6B6B6B',
      accent: '#B0B0B0',
      label: 'Scout',
      icon: '🏕️',
    };
  };
  
  const theme = getScoreTheme();
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-x-[3%] bottom-[6%] z-40 pointer-events-none flex justify-center"
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 40 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Trailhead Badge Container */}
          <div className="relative">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 blur-xl opacity-50 rounded-full"
              style={{ background: theme.primary }}
            />
            
            {/* Badge hexagon shape using clip-path */}
            <div 
              className="relative w-48 h-56 flex flex-col items-center justify-center"
              style={{
                background: `linear-gradient(180deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 ${theme.accent}40`,
              }}
            >
              {/* Inner highlight */}
              <div 
                className="absolute inset-[3px]"
                style={{
                  background: `linear-gradient(180deg, ${theme.accent}20 0%, transparent 50%)`,
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              
              {/* Badge icon */}
              <motion.div
                className="text-4xl mb-1"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              >
                {theme.icon}
              </motion.div>
              
              {/* Score display */}
              <div className="relative text-center">
                <motion.div
                  className="text-5xl font-black text-white tabular-nums leading-none"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  {score}
                </motion.div>
                <motion.div
                  className="text-white/60 text-xs font-semibold uppercase tracking-widest mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Points
                </motion.div>
              </div>
              
              {/* Badge label ribbon */}
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.primary} 100%)`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  {theme.label}
                </span>
              </motion.div>
            </div>
            
            {/* Decorative stars for high scores */}
            {score >= 80 && (
              <>
                <motion.div
                  className="absolute -top-2 -left-4 text-2xl"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  ✨
                </motion.div>
                <motion.div
                  className="absolute -top-2 -right-4 text-2xl"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  ✨
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ScoreOverlay;
