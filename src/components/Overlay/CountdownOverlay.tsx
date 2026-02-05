import { motion, AnimatePresence } from 'framer-motion';
import { useCountdownStore } from '@/stores/countdownStore';
import { Timer } from 'lucide-react';

/**
 * Salesforce-branded countdown timer overlay
 * Displays a circular timer with seconds remaining
 */
export function CountdownOverlay() {
  const { isVisible, seconds, remainingSeconds } = useCountdownStore();
  
  // Calculate progress for circular indicator (0 to 1)
  const progress = remainingSeconds / seconds;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference * (1 - progress);
  
  // Color transitions based on time remaining
  const getColor = () => {
    if (remainingSeconds <= 10) return { primary: '#ef4444', secondary: '#fecaca' }; // Red
    if (remainingSeconds <= 30) return { primary: '#f59e0b', secondary: '#fef3c7' }; // Amber
    return { primary: '#0176d3', secondary: '#cce4f6' }; // Salesforce Blue
  };
  
  const colors = getColor();
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-4 left-4 z-40 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div 
            className="relative w-28 h-28 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #032d60 0%, #014486 50%, #0176d3 100%)',
              boxShadow: '0 10px 40px rgba(1, 118, 211, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Salesforce cloud pattern background */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 15c-4.5 0-8.5 2-11 5.5-1.5-1-3.5-1.5-5.5-1.5-6 0-10 4.5-10 10s4 10 10 10h32c5 0 9-4 9-9s-4-9-9-9c0-3.5-3-6.5-6.5-6.5-1.5 0-3 .5-4 1.5-2-1-4-1.5-5-1.5z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Circular progress */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    filter: `drop-shadow(0 0 8px ${colors.primary})`,
                  }}
                />
              </svg>
            </div>
            
            {/* Timer icon and seconds */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Timer 
                className="w-4 h-4 mb-0.5" 
                style={{ color: colors.secondary }}
              />
              <motion.span
                key={remainingSeconds}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-white tabular-nums"
                style={{
                  textShadow: `0 2px 10px ${colors.primary}`,
                }}
              >
                {remainingSeconds}
              </motion.span>
              <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">
                seconds
              </span>
            </div>
            
            {/* Pulsing ring when low on time */}
            {remainingSeconds <= 10 && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2"
                style={{ borderColor: colors.primary }}
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.02, 1],
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
