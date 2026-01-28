import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuizOverlayStore, LeaderboardEntry } from '@/stores/quizOverlayStore';

// Compact rank badge
const getRankDisplay = (rank: number) => {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return medals[rank] || `#${rank}`;
};

function LeaderboardRow({ 
  entry, 
  rank, 
  isCurrentUser,
  animationDelay 
}: { 
  entry: LeaderboardEntry; 
  rank: number;
  isCurrentUser: boolean;
  animationDelay: number;
}) {
  return (
    <motion.div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs
        ${isCurrentUser 
          ? 'bg-primary/20 border border-primary/40' 
          : 'bg-white/5 border border-transparent'
        }
      `}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.15 }}
    >
      {/* Rank */}
      <div className="w-6 text-center flex-shrink-0">
        {rank <= 3 ? (
          <span className="text-sm">{getRankDisplay(rank)}</span>
        ) : (
          <span className="text-muted-foreground font-medium">{rank}</span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className={`truncate ${isCurrentUser ? 'text-primary font-medium' : 'text-foreground'}`}>
          {entry.firstName} {entry.lastName.charAt(0)}.
        </span>
        {isCurrentUser && (
          <motion.span
            className="px-1 py-0.5 rounded bg-primary text-[10px] text-white font-medium leading-none"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: animationDelay + 0.1, type: 'spring' }}
          >
            YOU
          </motion.span>
        )}
      </div>

      {/* Score */}
      <div className={`font-semibold tabular-nums ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
        {entry.score}
      </div>
    </motion.div>
  );
}

export function LeaderboardOverlay() {
  const { leaderboard, userEntry, userRank, resetQuiz } = useQuizOverlayStore();
  
  const isInTop5 = userRank !== null && userRank <= 5;

  const handleClose = () => {
    resetQuiz();
  };

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center pb-[8%] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-[85%] max-w-[280px]"
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Holographic card */}
        <div className="relative rounded-xl overflow-hidden">
          {/* Hologram glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-t from-primary/40 via-primary/20 to-accent/10 blur-xl opacity-60" />
          
          {/* Card content */}
          <div className="relative bg-black/70 backdrop-blur-md border border-primary/30 rounded-xl p-3">
            {/* Scan line effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, hsl(210 100% 50% / 0.03) 50%, transparent 100%)',
                backgroundSize: '100% 8px',
              }}
            />
            
            {/* Top accent line */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Header */}
            <div className="text-center mb-3">
              <div className="text-xs text-primary/80 font-medium tracking-wider uppercase">
                Leaderboard
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-1 mb-3">
              {leaderboard.map((entry, index) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={index + 1}
                  isCurrentUser={userEntry?.id === entry.id}
                  animationDelay={0.15 + index * 0.05}
                />
              ))}

              {/* User's rank if outside top 5 */}
              {userEntry && !isInTop5 && userRank && (
                <>
                  <motion.div
                    className="flex items-center justify-center py-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </motion.div>

                  <LeaderboardRow
                    entry={userEntry}
                    rank={userRank}
                    isCurrentUser={true}
                    animationDelay={0.45}
                  />
                </>
              )}
            </div>

            {/* Close Button */}
            <Button
              onClick={handleClose}
              size="sm"
              className="w-full h-7 text-xs bg-primary/80 hover:bg-primary text-white rounded-lg shadow-lg shadow-primary/20"
            >
              Close
            </Button>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LeaderboardOverlay;
