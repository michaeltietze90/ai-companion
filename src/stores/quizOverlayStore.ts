import { create } from 'zustand';

export interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  score: number;
  timestamp: number;
}

type OverlayType = 'none' | 'nameEntry' | 'leaderboard';

export interface PrefillData {
  firstName?: string;
  lastName?: string;
  country?: string;
  score?: number;
}

interface QuizOverlayState {
  /** Current overlay being shown */
  currentOverlay: OverlayType;
  /** User's score for the current quiz */
  currentScore: number;
  /** User's submitted entry */
  userEntry: LeaderboardEntry | null;
  /** Top 5 leaderboard entries */
  leaderboard: LeaderboardEntry[];
  /** User's rank (could be outside top 5) */
  userRank: number | null;
  /** Prefilled data from Agentforce */
  prefillData: PrefillData | null;

  // Actions
  showNameEntry: (score: number, prefill?: PrefillData) => void;
  showLeaderboard: () => void;
  hideOverlay: () => void;
  submitEntry: (firstName: string, lastName: string, country: string) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setUserRankData: (rank: number, entry: LeaderboardEntry) => void;
  setPrefillData: (data: PrefillData) => void;
  setScore: (score: number) => void;
  resetQuiz: () => void;
}

// Demo leaderboard data
const demoLeaderboard: LeaderboardEntry[] = [
  { id: '1', firstName: 'Sarah', lastName: 'Chen', country: 'Singapore', score: 980, timestamp: Date.now() - 86400000 },
  { id: '2', firstName: 'Marcus', lastName: 'Johnson', country: 'USA', score: 945, timestamp: Date.now() - 172800000 },
  { id: '3', firstName: 'Yuki', lastName: 'Tanaka', country: 'Japan', score: 920, timestamp: Date.now() - 259200000 },
  { id: '4', firstName: 'Emma', lastName: 'Wilson', country: 'UK', score: 890, timestamp: Date.now() - 345600000 },
  { id: '5', firstName: 'Carlos', lastName: 'Rodriguez', country: 'Spain', score: 875, timestamp: Date.now() - 432000000 },
];

export const useQuizOverlayStore = create<QuizOverlayState>((set, get) => ({
  currentOverlay: 'none',
  currentScore: 0,
  userEntry: null,
  leaderboard: demoLeaderboard,
  userRank: null,
  prefillData: null,

  showNameEntry: (score, prefill) => {
    set({
      currentOverlay: 'nameEntry',
      currentScore: score,
      prefillData: prefill || null,
    });
  },

  showLeaderboard: () => {
    set({ currentOverlay: 'leaderboard' });
  },

  hideOverlay: () => {
    set({ currentOverlay: 'none' });
  },

  submitEntry: (firstName, lastName, country) => {
    const { currentScore, leaderboard } = get();
    
    const newEntry: LeaderboardEntry = {
      id: `user-${Date.now()}`,
      firstName,
      lastName,
      country,
      score: currentScore,
      timestamp: Date.now(),
    };

    // Add to leaderboard and sort
    const allEntries = [...leaderboard, newEntry].sort((a, b) => b.score - a.score);
    
    // Find user's rank
    const userRank = allEntries.findIndex(e => e.id === newEntry.id) + 1;
    
    // Keep only top entries but ensure user entry is tracked
    const top5 = allEntries.slice(0, 5);

    set({
      userEntry: newEntry,
      leaderboard: top5,
      userRank,
      currentOverlay: 'leaderboard',
      prefillData: null,
    });
  },

  setLeaderboard: (entries) => {
    set({ leaderboard: entries.slice(0, 5) });
  },

  setUserRankData: (rank, entry) => {
    set({ userRank: rank, userEntry: entry });
  },

  setPrefillData: (data) => {
    set({ 
      prefillData: data,
      currentScore: data.score ?? get().currentScore,
    });
  },

  setScore: (score) => {
    set({ currentScore: score });
  },

  resetQuiz: () => {
    set({
      currentOverlay: 'none',
      currentScore: 0,
      userEntry: null,
      userRank: null,
      prefillData: null,
    });
  },
}));

