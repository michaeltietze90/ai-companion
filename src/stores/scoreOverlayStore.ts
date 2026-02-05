import { create } from 'zustand';

interface ScoreOverlayState {
  isVisible: boolean;
  score: number;
  showScore: (score: number) => void;
  hideScore: () => void;
}

export const useScoreOverlayStore = create<ScoreOverlayState>((set) => ({
  isVisible: false,
  score: 0,
  
  showScore: (score: number) => {
    // Clamp score between 0-100
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
    set({ isVisible: true, score: clampedScore });
  },
  
  hideScore: () => {
    set({ isVisible: false });
  },
}));
