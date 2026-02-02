import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuizOverlayStore, LeaderboardEntry } from '@/stores/quizOverlayStore';

// Rank display with medals
const getRankDisplay = (rank: number) => {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return medals[rank] || String(rank);
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
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all
        ${isCurrentUser 
          ? 'bg-[hsl(280_70%_55%/0.15)] border border-[hsl(280_70%_55%/0.4)]' 
          : 'bg-white/5 border border-transparent'
        }
      `}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.15 }}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {rank <= 3 ? (
          <span className="text-lg">{getRankDisplay(rank)}</span>
        ) : (
          <span className="text-muted-foreground font-medium text-sm">{rank}</span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`truncate font-medium ${isCurrentUser ? 'text-[hsl(310_80%_70%)]' : 'text-foreground'}`}>
          {entry.firstName} {entry.lastName.charAt(0)}.
        </span>
        {isCurrentUser && (
          <motion.span
            className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold leading-none"
            style={{ background: 'linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(310 80% 50%) 100%)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: animationDelay + 0.1, type: 'spring' }}
          >
            YOU
          </motion.span>
        )}
      </div>

      {/* Country */}
      <span className="text-xs text-muted-foreground hidden sm:block">{entry.country}</span>

      {/* Score */}
      <div className={`font-bold tabular-nums ${isCurrentUser ? 'text-[hsl(310_80%_70%)]' : 'text-foreground'}`}>
        {entry.score}
      </div>
    </motion.div>
  );
}

export function LeaderboardOverlay() {
  const { leaderboard, userEntry, userRank, resetQuiz } = useQuizOverlayStore();
  
  // Show user separately only if they're ranked 7th or lower (not in top 5 or 6)
  const showUserSeparately = userRank !== null && userRank > 6;

  const handleClose = () => {
    resetQuiz();
  };

  return (
    <motion.div
      className="absolute inset-x-[3%] bottom-[6%] z-40 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-full"
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        {/* Card with Agentforce purple gradient */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Glow effect */}
          <div 
            className="absolute -inset-2 blur-2xl opacity-40"
            style={{
              background: 'linear-gradient(135deg, hsl(280 70% 55% / 0.5) 0%, hsl(310 80% 50% / 0.4) 100%)',
            }}
          />
          
          {/* Card body */}
          <div className="relative bg-[hsl(220_30%_8%/0.92)] backdrop-blur-xl border border-[hsl(280_70%_55%/0.3)] rounded-2xl overflow-hidden">
            {/* Top gradient accent */}
            <div className="h-1 w-full gradient-agentforce-wave" />
            
            <div className="p-5">
              {/* Header */}
              <div className="text-center mb-4">
                <div 
                  className="text-xs font-semibold tracking-[0.2em] uppercase"
                  style={{ color: 'hsl(310 80% 70%)' }}
                >
                  Leaderboard
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-1.5 mb-4">
                {leaderboard.map((entry, index) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={userEntry?.id === entry.id}
                    animationDelay={0.1 + index * 0.05}
                  />
                ))}

                {/* User's rank if outside top 6 */}
                {userEntry && showUserSeparately && userRank && (
                  <>
                    <motion.div
                      className="flex items-center justify-center py-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <div className="w-12 h-px bg-[hsl(280_70%_55%/0.2)]" />
                        <ChevronDown className="w-4 h-4" />
                        <div className="w-12 h-px bg-[hsl(280_70%_55%/0.2)]" />
                      </div>
                    </motion.div>

                    <LeaderboardRow
                      entry={userEntry}
                      rank={userRank}
                      isCurrentUser={true}
                      animationDelay={0.4}
                    />
                  </>
                )}
              </div>

              {/* Close Button */}
              <Button
                onClick={handleClose}
                className="w-full h-11 text-white font-medium rounded-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(310 80% 50%) 100%)',
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LeaderboardOverlay;
