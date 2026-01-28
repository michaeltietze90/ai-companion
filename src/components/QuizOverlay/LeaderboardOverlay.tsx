import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Star, Crown, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuizOverlayStore, LeaderboardEntry } from '@/stores/quizOverlayStore';

// Rank-specific configurations
const rankConfig = {
  1: {
    icon: Crown,
    gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
    bgGradient: 'from-yellow-500/20 to-amber-500/10',
    borderColor: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    scaleAnimation: [1, 1.05, 1] as number[],
  },
  2: {
    icon: Medal,
    gradient: 'from-gray-300 via-slate-400 to-gray-500',
    bgGradient: 'from-gray-400/20 to-slate-400/10',
    borderColor: 'border-gray-400/50',
    textColor: 'text-gray-300',
    scaleAnimation: [1, 1.03, 1] as number[],
  },
  3: {
    icon: Award,
    gradient: 'from-orange-400 via-amber-600 to-orange-700',
    bgGradient: 'from-orange-500/20 to-amber-600/10',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
    scaleAnimation: [1, 1.02, 1] as number[],
  },
  4: {
    icon: Star,
    gradient: 'from-primary via-primary to-accent',
    bgGradient: 'from-primary/15 to-accent/10',
    borderColor: 'border-primary/40',
    textColor: 'text-primary',
    scaleAnimation: [1, 1.01, 1] as number[],
  },
  5: {
    icon: Star,
    gradient: 'from-primary/80 via-primary/70 to-accent/80',
    bgGradient: 'from-primary/10 to-accent/5',
    borderColor: 'border-primary/30',
    textColor: 'text-primary/80',
    scaleAnimation: [1, 1.01, 1] as number[],
  },
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
  const config = rankConfig[rank as keyof typeof rankConfig] || rankConfig[5];
  const RankIcon = config.icon;

  const animateProps = isCurrentUser 
    ? { opacity: 1, x: 0, scale: config.scaleAnimation }
    : { opacity: 1, x: 0 };

  return (
    <motion.div
      className={`relative flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all
        ${isCurrentUser ? `bg-gradient-to-r ${config.bgGradient} ${config.borderColor} ring-2 ring-primary/30` : 'bg-secondary/30 border-border/50'}
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={animateProps}
      transition={{ 
        delay: animationDelay,
        duration: isCurrentUser ? 0.5 : 0.3,
        repeat: isCurrentUser ? Infinity : 0,
        repeatType: 'reverse',
        repeatDelay: 2,
      }}
    >
      {/* Rank Badge */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
        {rank <= 3 ? (
          <RankIcon className="w-6 h-6 text-white" />
        ) : (
          <span className="text-white font-bold text-lg">{rank}</span>
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold truncate ${isCurrentUser ? config.textColor : 'text-foreground'}`}>
            {entry.firstName} {entry.lastName}
          </span>
          {isCurrentUser && (
            <motion.span
              className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: animationDelay + 0.3, type: 'spring' }}
            >
              You
            </motion.span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{entry.country}</span>
      </div>

      {/* Score */}
      <div className={`text-right ${isCurrentUser ? config.textColor : 'text-foreground'}`}>
        <span className="text-xl font-bold">{entry.score.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground block">pts</span>
      </div>

      {/* Glow effect for current user */}
      {isCurrentUser && (
        <motion.div
          className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config.gradient} opacity-10 blur-xl -z-10`}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-lg mx-4 p-8 rounded-2xl bg-gradient-to-br from-card via-card to-secondary/50 border border-border shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl -z-10" />
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
          onClick={handleClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 mb-4 shadow-lg shadow-yellow-500/30"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h2>
          <p className="text-muted-foreground">Top performers this week</p>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3 mb-6">
          {leaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={index + 1}
              isCurrentUser={userEntry?.id === entry.id}
              animationDelay={0.3 + index * 0.1}
            />
          ))}

          {/* Show user's rank if outside top 5 */}
          {userEntry && !isInTop5 && userRank && (
            <>
              {/* Separator */}
              <motion.div
                className="flex items-center justify-center py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
              </motion.div>

              {/* User's actual rank */}
              <motion.div
                className="relative flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-primary/10 to-accent/5 border-primary/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">{userRank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary truncate">
                      {userEntry.firstName} {userEntry.lastName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      You
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{userEntry.country}</span>
                </div>
                <div className="text-right text-primary">
                  <span className="text-xl font-bold">{userEntry.score.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground block">pts</span>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleClose}
          className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30"
        >
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default LeaderboardOverlay;
