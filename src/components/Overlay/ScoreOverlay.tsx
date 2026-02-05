import { motion, AnimatePresence } from 'framer-motion';
import { useScoreOverlayStore } from '@/stores/scoreOverlayStore';

/**
 * Salesforce Trailhead Badge-style Score Overlay
 * Uses official Salesforce brand colors
 */
export function ScoreOverlay() {
  const { isVisible, score } = useScoreOverlayStore();
  
  // Salesforce-themed colors based on score tiers
  const getScoreTheme = () => {
    if (score >= 80) {
      // Ranger - Salesforce Success Green
      return {
        primary: '#04844B',
        secondary: '#026E3E',
        accent: '#3BA755',
        label: 'Ranger',
        stars: 3,
      };
    }
    if (score >= 60) {
      // Expeditioner - Salesforce Blue
      return {
        primary: '#0176D3',
        secondary: '#014486',
        accent: '#1B96FF',
        label: 'Expeditioner',
        stars: 2,
      };
    }
    if (score >= 40) {
      // Hiker - Salesforce Cloud Blue
      return {
        primary: '#00A1E0',
        secondary: '#0081B8',
        accent: '#4BC3F0',
        label: 'Hiker',
        stars: 1,
      };
    }
    // Scout - Astro Purple
    return {
      primary: '#9050E9',
      secondary: '#6B3DB5',
      accent: '#AD7BEE',
      label: 'Scout',
      stars: 0,
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
          {/* Badge Container */}
          <div className="relative flex flex-col items-center">
            {/* Stars above badge */}
            {theme.stars > 0 && (
              <motion.div
                className="flex gap-1 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {Array.from({ length: theme.stars }).map((_, i) => (
                  <motion.svg
                    key={i}
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="#FFB75D"
                    initial={{ opacity: 0, scale: 0, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </motion.svg>
                ))}
              </motion.div>
            )}
            
            {/* Outer glow */}
            <div 
              className="absolute top-8 left-1/2 -translate-x-1/2 w-40 h-40 blur-2xl opacity-40 rounded-full"
              style={{ background: theme.primary }}
            />
            
            {/* Badge circle */}
            <div 
              className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center"
              style={{
                background: `linear-gradient(180deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 2px 0 ${theme.accent}60, inset 0 -2px 0 rgba(0,0,0,0.2)`,
              }}
            >
              {/* Inner ring */}
              <div 
                className="absolute inset-2 rounded-full border-2"
                style={{ borderColor: `${theme.accent}40` }}
              />
              
              {/* Inner highlight gradient */}
              <div 
                className="absolute inset-3 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${theme.accent}30 0%, transparent 60%)`,
                }}
              />
              
              {/* Salesforce cloud icon */}
              <motion.svg
                className="w-10 h-10 mb-1"
                viewBox="0 0 24 24"
                fill="white"
                fillOpacity={0.9}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              >
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </motion.svg>
              
              {/* Score display */}
              <motion.div
                className="text-5xl font-black text-white tabular-nums leading-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {score}
              </motion.div>
              
              <motion.div
                className="text-white/70 text-xs font-semibold uppercase tracking-widest mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Points
              </motion.div>
            </div>
            
            {/* Label ribbon */}
            <motion.div
              className="relative -mt-4 px-8 py-2 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.primary} 100%)`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span 
                className="text-white font-bold text-base uppercase tracking-wider"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              >
                {theme.label}
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ScoreOverlay;
