import { motion, AnimatePresence } from 'framer-motion';
import { useScoreOverlayStore } from '@/stores/scoreOverlayStore';

/**
 * Salesforce Badge-style Score Overlay
 * Displays a score from 0-100 with dynamic coloring
 */
export function ScoreOverlay() {
  const { isVisible, score } = useScoreOverlayStore();
  
  // Get color theme based on score
  const getScoreTheme = () => {
    if (score >= 80) {
      return {
        gradient: 'linear-gradient(135deg, #2E844A 0%, #194E31 100%)', // Green - Excellent
        glow: 'rgba(46, 132, 74, 0.4)',
        label: 'Excellent',
      };
    }
    if (score >= 60) {
      return {
        gradient: 'linear-gradient(135deg, #0176D3 0%, #014486 100%)', // Blue - Good
        glow: 'rgba(1, 118, 211, 0.4)',
        label: 'Good',
      };
    }
    if (score >= 40) {
      return {
        gradient: 'linear-gradient(135deg, #FF9A3C 0%, #DD7A00 100%)', // Orange - Fair
        glow: 'rgba(255, 154, 60, 0.4)',
        label: 'Fair',
      };
    }
    return {
      gradient: 'linear-gradient(135deg, #EA001E 0%, #A10115 100%)', // Red - Needs Work
      glow: 'rgba(234, 0, 30, 0.4)',
      label: 'Needs Work',
    };
  };
  
  const theme = getScoreTheme();
  
  // Calculate the arc progress (0-100 maps to 0-270 degrees)
  const arcProgress = (score / 100) * 270;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (arcProgress / 360) * circumference;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-[8%] right-[8%] z-40 pointer-events-none"
          initial={{ opacity: 0, scale: 0.5, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Salesforce Badge Container */}
          <div 
            className="relative w-36 h-44 rounded-2xl overflow-hidden"
            style={{
              background: theme.gradient,
              boxShadow: `0 8px 32px ${theme.glow}, 0 0 0 1px rgba(255,255,255,0.1) inset`,
            }}
          >
            {/* Subtle pattern overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
              }}
            />
            
            {/* Score Circle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="relative w-24 h-24">
                <svg 
                  className="w-full h-full"
                  viewBox="0 0 120 120"
                >
                  {/* Background track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(270/360) * circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(135 60 60)"
                  />
                  
                  {/* Progress arc */}
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    transform="rotate(135 60 60)"
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${arcLength} ${circumference}` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))',
                    }}
                  />
                </svg>
                
                {/* Score number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    className="text-3xl font-bold text-white tabular-nums"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', damping: 12 }}
                  >
                    {score}
                  </motion.span>
                </div>
              </div>
            </div>
            
            {/* Label */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  Score
                </span>
                <p className="text-white font-semibold text-sm mt-0.5">
                  {theme.label}
                </p>
              </motion.div>
            </div>
            
            {/* Salesforce cloud icon hint */}
            <div className="absolute top-2 right-2">
              <svg 
                className="w-4 h-4 text-white/30" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ScoreOverlay;
