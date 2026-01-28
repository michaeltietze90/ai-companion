import { AnimatePresence } from 'framer-motion';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';
import { NameEntryOverlay } from './NameEntryOverlay';
import { LeaderboardOverlay } from './LeaderboardOverlay';

export function QuizOverlayManager() {
  const { currentOverlay } = useQuizOverlayStore();

  return (
    <AnimatePresence mode="wait">
      {currentOverlay === 'nameEntry' && <NameEntryOverlay key="name-entry" />}
      {currentOverlay === 'leaderboard' && <LeaderboardOverlay key="leaderboard" />}
    </AnimatePresence>
  );
}

export default QuizOverlayManager;
