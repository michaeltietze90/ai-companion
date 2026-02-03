import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  /** Callback for when Start is pressed (e.g., reconnect avatar) */
  onStartCallback: (() => void) | null;
  /** Loading state for DB operations */
  isLoading: boolean;

  // Actions
  showNameEntry: (score: number, prefill?: PrefillData) => void;
  showLeaderboard: () => void;
  hideOverlay: () => void;
  submitEntry: (firstName: string, lastName: string, country: string) => Promise<void>;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setUserRankData: (rank: number, entry: LeaderboardEntry) => void;
  setPrefillData: (data: PrefillData) => void;
  setScore: (score: number) => void;
  resetQuiz: () => void;
  setOnStartCallback: (callback: (() => void) | null) => void;
  triggerStart: () => void;
  /** Fetch leaderboard from database */
  fetchLeaderboard: () => Promise<void>;
}

// Map DB row to LeaderboardEntry
const mapDbEntry = (row: any): LeaderboardEntry => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  country: row.country,
  score: row.score,
  timestamp: new Date(row.created_at).getTime(),
});

export const useQuizOverlayStore = create<QuizOverlayState>((set, get) => ({
  currentOverlay: 'none',
  currentScore: 0,
  userEntry: null,
  leaderboard: [],
  userRank: null,
  prefillData: null,
  onStartCallback: null,
  isLoading: false,

  showNameEntry: (score, prefill) => {
    set({
      currentOverlay: 'nameEntry',
      currentScore: score,
      prefillData: prefill || null,
    });
  },

  showLeaderboard: () => {
    // Show overlay first, then fetch in background if needed
    set({ currentOverlay: 'leaderboard' });
    // Only fetch if we have no data yet
    if (get().leaderboard.length === 0) {
      get().fetchLeaderboard();
    }
  },

  hideOverlay: () => {
    set({ currentOverlay: 'none' });
  },

  submitEntry: async (firstName, lastName, country) => {
    const { currentScore } = get();
    set({ isLoading: true });

    try {
      console.log('Submitting entry to database...');
      const { data, error } = await supabase.functions.invoke('leaderboard', {
        body: {
          action: 'save',
          entry: { firstName, lastName, country, score: currentScore },
        },
      });

      if (error) throw error;

      const entries = (data.entries || []).map(mapDbEntry);
      const userEntry: LeaderboardEntry = {
        id: data.entry.id,
        firstName: data.entry.first_name,
        lastName: data.entry.last_name,
        country: data.entry.country,
        score: data.entry.score,
        timestamp: new Date(data.entry.created_at).getTime(),
      };

      set({
        userEntry,
        leaderboard: entries,
        userRank: data.userRank,
        currentOverlay: 'leaderboard',
        prefillData: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to submit entry:', error);
      set({ isLoading: false });
    }
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

  setOnStartCallback: (callback) => {
    set({ onStartCallback: callback });
  },

  triggerStart: () => {
    const { onStartCallback } = get();
    set({
      currentOverlay: 'none',
      currentScore: 0,
      userEntry: null,
      userRank: null,
      prefillData: null,
    });
    if (onStartCallback) {
      onStartCallback();
    }
  },

  fetchLeaderboard: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.functions.invoke('leaderboard', {
        body: { action: 'get' },
      });

      if (error) throw error;

      const entries = (data.entries || []).map(mapDbEntry);
      set({ leaderboard: entries, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      set({ isLoading: false });
    }
  },
}));

