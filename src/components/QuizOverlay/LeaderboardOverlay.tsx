import { motion } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuizOverlayStore, LeaderboardEntry } from '@/stores/quizOverlayStore';

// Rank badge configurations - Salesforce style
const getRankStyle = (rank: number, isCurrentUser: boolean) => {
  const baseStyles = {
    1: { 
      badge: 'bg-gradient-to-br from-amber-400 to-amber-600',
      ring: 'ring-amber-400/30',
      text: 'text-amber-400',
    },
    2: { 
      badge: 'bg-gradient-to-br from-slate-300 to-slate-500',
      ring: 'ring-slate-400/30',
      text: 'text-slate-300',
    },
    3: { 
      badge: 'bg-gradient-to-br from-orange-400 to-orange-600',
      ring: 'ring-orange-400/30',
      text: 'text-orange-400',
    },
  };
  
  const style = baseStyles[rank as keyof typeof baseStyles] || {
    badge: 'bg-secondary',
    ring: 'ring-primary/20',
    text: 'text-muted-foreground',
  };

  if (isCurrentUser) {
    return {
      ...style,
      ring: 'ring-primary/40',
      text: 'text-primary',
    };
  }
  
  return style;
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
  const style = getRankStyle(rank, isCurrentUser);

  return (
    <motion.div
      className={`relative flex items-center gap-4 p-4 rounded-xl transition-all
        ${isCurrentUser 
          ? 'bg-primary/10 border border-primary/30' 
          : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
        }
      `}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
    >
      {/* Rank Badge */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${style.badge} flex items-center justify-center shadow-md`}>
        <span className="text-white font-bold text-sm">{rank}</span>
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
            {entry.firstName} {entry.lastName}
          </span>
          {isCurrentUser && (
            <motion.span
              className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: animationDelay + 0.2, type: 'spring' }}
            >
              You
            </motion.span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{entry.country}</span>
      </div>

      {/* Score */}
      <div className="text-right">
        <span className={`text-lg font-semibold ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
          {entry.score.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground block">pts</span>
      </div>

      {/* Highlight glow for current user */}
      {isCurrentUser && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary/5 -z-10"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}

export function LeaderboardOverlay() {
  const { leaderboard, userEntry, userRank, hideOverlay, resetQuiz } = useQuizOverlayStore();
  
  const isInTop5 = userRank !== null && userRank <= 5;

  const handleClose = () => {
    resetQuiz();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        {/* Header gradient bar */}
        <div className="h-1.5 w-full gradient-agentforce-wave" />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full z-10"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-4"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', damping: 15 }}
            >
              <span className="text-2xl">🏆</span>
            </motion.div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Leaderboard</h2>
            <p className="text-muted-foreground text-sm">Top performers this week</p>
          </div>

          {/* Leaderboard List */}
          <div className="space-y-2 mb-6">
            {leaderboard.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
                isCurrentUser={userEntry?.id === entry.id}
                animationDelay={0.2 + index * 0.08}
              />
            ))}

            {/* Show user's rank if outside top 5 */}
            {userEntry && !isInTop5 && userRank && (
              <>
                {/* Separator */}
                <motion.div
                  className="flex items-center justify-center py-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-8 h-px bg-border" />
                    <ChevronDown className="w-4 h-4" />
                    <div className="w-8 h-px bg-border" />
                  </div>
                </motion.div>

                {/* User's actual rank */}
                <LeaderboardRow
                  entry={userEntry}
                  rank={userRank}
                  isCurrentUser={true}
                  animationDelay={0.7}
                />
              </>
            )}
          </div>

          {/* Action Button */}
          <Button
            onClick={handleClose}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg shadow-primary/20"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LeaderboardOverlay;
