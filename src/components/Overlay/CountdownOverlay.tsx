import { motion, AnimatePresence } from 'framer-motion';
import { useCountdownStore } from '@/stores/countdownStore';

/**
 * Clean Salesforce-branded countdown timer overlay
 * Just the ring and number - no background
 */
export function CountdownOverlay() {
  const { isVisible, seconds, remainingSeconds } = useCountdownStore();
  
  // Calculate progress (1 = full, 0 = empty)
  const progress = remainingSeconds / seconds;
  
  // Urgency levels for color theming
  const getUrgencyTheme = () => {
    if (remainingSeconds <= 10) {
      return {
        ring: '#ef4444',
        textColor: '#ef4444',
        pulse: true,
      };
    }
    if (remainingSeconds <= 30) {
      return {
        ring: '#f59e0b',
        textColor: '#f59e0b',
        pulse: false,
      };
    }
    // Salesforce Blue theme
    return {
      ring: '#0176D3',
      textColor: '#0176D3',
      pulse: false,
    };
  };
  
  const theme = getUrgencyTheme();
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  
  // Format time display
  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}:${secs.toString().padStart(2, '0')}`
    : remainingSeconds.toString();
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-[8%] left-[8%] z-40 pointer-events-none"
          style={{ background: 'transparent' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Main container - fully transparent */}
          <div className="relative w-32 h-32" style={{ background: 'transparent' }}>
            {/* Animated ring */}
            <svg 
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 120 120"
            >
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              
              {/* Animated progress ring */}
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={theme.ring}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  filter: `drop-shadow(0 0 6px ${theme.ring})`,
                }}
              />
              
              {/* Glowing dot at progress end */}
              <motion.circle
                cx="60"
                cy="6"
                r="6"
                fill={theme.ring}
                style={{
                  filter: `drop-shadow(0 0 8px ${theme.ring})`,
                  transformOrigin: '60px 60px',
                }}
                animate={{ 
                  rotate: 360 * (1 - progress),
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            
            {/* Number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                key={remainingSeconds}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="text-4xl font-bold tabular-nums"
                style={{ color: theme.textColor }}
              >
                {timeDisplay}
              </motion.span>
            </div>
            
            {/* Pulse effect for critical time */}
            {theme.pulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: theme.ring }}
                animate={{ 
                  opacity: [0.8, 0.2, 0.8],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CountdownOverlay;
