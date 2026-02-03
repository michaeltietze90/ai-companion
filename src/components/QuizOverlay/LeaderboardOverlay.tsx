import { motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { useQuizOverlayStore, LeaderboardEntry } from '@/stores/quizOverlayStore';

// Rank badge colors
const getRankBadgeStyle = (rank: number): { bg: string; text: string } => {
  switch (rank) {
    case 1:
      return { bg: 'bg-amber-400', text: 'text-white' };
    case 2:
      return { bg: 'bg-slate-400', text: 'text-white' };
    case 3:
      return { bg: 'bg-orange-400', text: 'text-white' };
    default:
      return { bg: 'bg-slate-200', text: 'text-slate-600' };
  }
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
  const badgeStyle = getRankBadgeStyle(rank);
  
  return (
    <motion.tr
      className={`border-b border-slate-100 last:border-b-0 ${
        rank === 1 ? 'bg-amber-50/80' : isCurrentUser ? 'bg-purple-50/80' : 'bg-white'
      }`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.15 }}
    >
      {/* Rank */}
      <td className="py-3 px-4">
        <div className="flex items-center justify-center">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${badgeStyle.bg} ${badgeStyle.text}`}>
            {rank}
          </span>
        </div>
      </td>

      {/* Name */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <span className={`truncate font-medium text-slate-800 ${isCurrentUser ? 'text-purple-700' : ''}`}>
            {entry.firstName} {entry.lastName.charAt(0)}.
          </span>
          {isCurrentUser && (
            <motion.span
              className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold leading-none bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: animationDelay + 0.1, type: 'spring' }}
            >
              YOU
            </motion.span>
          )}
        </div>
      </td>

      {/* Score */}
      <td className="py-3 px-4 text-right">
        <span className={`font-bold tabular-nums ${isCurrentUser ? 'text-purple-600' : 'text-cyan-600'}`}>
          {entry.score.toLocaleString()}
        </span>
      </td>
    </motion.tr>
  );
}

export function LeaderboardOverlay() {
  const { leaderboard, userEntry, userRank, resetQuiz } = useQuizOverlayStore();
  
  // Show user separately only if they're ranked 7th or lower (not in top 6)
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
        className="pointer-events-auto w-full max-w-md mx-auto"
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Header - Blue gradient like reference */}
          <div 
            className="relative px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #4BA3E3 0%, #2B7FC3 100%)',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <h2 className="text-lg font-bold text-white">Leaderboard</h2>
            <p className="text-white/80 text-sm">Top performers this week</p>
          </div>
          
          {/* Table body */}
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Rank</th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={userEntry?.id === entry.id}
                    animationDelay={0.1 + index * 0.05}
                  />
                ))}
              </tbody>
            </table>

            {/* User's rank if outside top 6 */}
            {userEntry && showUserSeparately && userRank && (
              <>
                <motion.div
                  className="flex items-center justify-center py-2 bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-12 h-px bg-slate-200" />
                    <ChevronDown className="w-4 h-4" />
                    <div className="w-12 h-px bg-slate-200" />
                  </div>
                </motion.div>

                <table className="w-full">
                  <tbody>
                    <LeaderboardRow
                      entry={userEntry}
                      rank={userRank}
                      isCurrentUser={true}
                      animationDelay={0.4}
                    />
                  </tbody>
                </table>
              </>
            )}
            
            {/* Footer */}
            <div className="py-3 px-4 text-center border-t border-slate-100">
              <p className="text-xs text-slate-400">Updated every 24 hours • Keep climbing!</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LeaderboardOverlay;
