import { motion, AnimatePresence } from 'framer-motion';
import { useCountdownStore } from '@/stores/countdownStore';
import { useEffect, useState } from 'react';

/**
 * Premium Salesforce-branded countdown timer overlay
 * Holographic glassmorphism design with animated ring
 */
export function CountdownOverlay() {
  const { isVisible, seconds, remainingSeconds } = useCountdownStore();
  const [prevSeconds, setPrevSeconds] = useState(remainingSeconds);
  
  // Track when seconds change for animation
  useEffect(() => {
    setPrevSeconds(remainingSeconds);
  }, [remainingSeconds]);
  
  // Calculate progress (1 = full, 0 = empty)
  const progress = remainingSeconds / seconds;
  
  // Urgency levels for color theming
  const getUrgencyTheme = () => {
    if (remainingSeconds <= 10) {
      return {
        gradient: 'from-red-500 via-orange-500 to-red-600',
        glow: 'rgba(239, 68, 68, 0.6)',
        ring: '#ef4444',
        text: 'text-red-100',
        pulse: true,
      };
    }
    if (remainingSeconds <= 30) {
      return {
        gradient: 'from-amber-400 via-orange-500 to-amber-500',
        glow: 'rgba(245, 158, 11, 0.5)',
        ring: '#f59e0b',
        text: 'text-amber-100',
        pulse: false,
      };
    }
    return {
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      glow: 'rgba(6, 182, 212, 0.5)',
      ring: '#06b6d4',
      text: 'text-cyan-100',
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
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Outer glow */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ background: theme.glow }}
            animate={theme.pulse ? { 
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
          
          {/* Main container */}
          <div 
            className="relative w-32 h-32 rounded-full"
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
              boxShadow: `
                0 0 40px ${theme.glow},
                inset 0 2px 4px rgba(255,255,255,0.1),
                inset 0 -2px 4px rgba(0,0,0,0.3)
              `,
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Animated ring track */}
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
                stroke="rgba(255,255,255,0.1)"
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
                  filter: `drop-shadow(0 0 8px ${theme.ring})`,
                }}
              />
              
              {/* Glowing dot at progress end */}
              <motion.circle
                cx="60"
                cy="6"
                r="5"
                fill={theme.ring}
                style={{
                  filter: `drop-shadow(0 0 10px ${theme.ring})`,
                  transformOrigin: '60px 60px',
                }}
                animate={{ 
                  rotate: 360 * (1 - progress),
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            
            {/* Inner content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Animated number */}
              <motion.div
                key={remainingSeconds}
                initial={{ scale: 1.3, opacity: 0, y: -5 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="relative"
              >
                <span 
                  className={`text-4xl font-bold tabular-nums bg-gradient-to-b ${theme.gradient} bg-clip-text text-transparent`}
                  style={{
                    textShadow: `0 0 30px ${theme.glow}`,
                  }}
                >
                  {timeDisplay}
                </span>
              </motion.div>
              
              {/* Label */}
              <span className={`text-[10px] font-medium uppercase tracking-[0.2em] ${theme.text} opacity-70 mt-1`}>
                {minutes > 0 ? 'remaining' : 'seconds'}
              </span>
            </div>
            
            {/* Decorative inner ring */}
            <div 
              className="absolute inset-3 rounded-full border border-white/5"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.05), transparent)',
              }}
            />
            
            {/* Critical time pulse ring */}
            {theme.pulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: theme.ring }}
                animate={{ 
                  opacity: [0.8, 0.2, 0.8],
                  scale: [1, 1.08, 1],
                }}
                transition={{ 
                  duration: 0.6, 
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </div>
          
          {/* Floating particles for visual interest */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ 
                background: theme.ring,
                left: `${30 + i * 20}%`,
                top: `${20 + i * 15}%`,
              }}
              animate={{
                y: [0, -8, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CountdownOverlay;
