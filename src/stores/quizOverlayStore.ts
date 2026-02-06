import { create } from 'zustand';
import { fetchLeaderboard, saveLeaderboardEntry } from '@/services/leaderboardApi';

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
  currentOverlay: OverlayType;
  currentScore: number;
  userEntry: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  prefillData: PrefillData | null;
  onStartCallback: (() => void) | null;
  onNameSubmitCallback: ((message: string) => void) | null;
  isLoading: boolean;

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
  setOnNameSubmitCallback: (callback: ((message: string) => void) | null) => void;
  triggerStart: () => void;
  notifyDataEdit: (firstName: string, lastName: string, country: string) => void;
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
  onNameSubmitCallback: null,
  isLoading: false,

  showNameEntry: (score, prefill) => {
    set({
      currentOverlay: 'nameEntry',
      currentScore: score,
      prefillData: prefill || null,
    });
  },

  showLeaderboard: () => {
    set({ currentOverlay: 'leaderboard' });
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
      const data = await saveLeaderboardEntry({
        firstName, lastName, country, score: currentScore,
      });

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

  setOnNameSubmitCallback: (callback) => {
    set({ onNameSubmitCallback: callback });
  },

  notifyDataEdit: (firstName, lastName, country) => {
    const { onNameSubmitCallback, prefillData } = get();
    
    const wasEdited = prefillData && (
      (prefillData.firstName && firstName !== prefillData.firstName) ||
      (prefillData.lastName && lastName !== prefillData.lastName) ||
      (prefillData.country && country !== prefillData.country)
    );
    
    if (wasEdited && onNameSubmitCallback) {
      const message = `Actually, you got my details wrong. My name is ${firstName} ${lastName} and I am from ${country}.`;
      console.log('[QuizStore] Notifying Agentforce of edited data:', message);
      onNameSubmitCallback(message);
    }
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
      const data = await fetchLeaderboard();
      const entries = (data.entries || []).map(mapDbEntry);
      set({ leaderboard: entries, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      set({ isLoading: false });
    }
  },
}));
