import { create } from 'zustand';

interface CountdownState {
  isVisible: boolean;
  seconds: number;
  remainingSeconds: number;
  intervalId: ReturnType<typeof setInterval> | null;
  
  startCountdown: (seconds: number) => void;
  stopCountdown: () => void;
  tick: () => void;
}

export const useCountdownStore = create<CountdownState>((set, get) => ({
  isVisible: false,
  seconds: 60,
  remainingSeconds: 60,
  intervalId: null,

  startCountdown: (seconds: number) => {
    // Clear any existing interval
    const existing = get().intervalId;
    if (existing) clearInterval(existing);

    const intervalId = setInterval(() => {
      get().tick();
    }, 1000);

    set({
      isVisible: true,
      seconds,
      remainingSeconds: seconds,
      intervalId,
    });
  },

  stopCountdown: () => {
    const intervalId = get().intervalId;
    if (intervalId) clearInterval(intervalId);
    
    set({
      isVisible: false,
      intervalId: null,
    });
  },

  tick: () => {
    const { remainingSeconds, stopCountdown } = get();
    
    if (remainingSeconds <= 1) {
      stopCountdown();
      return;
    }

    set({ remainingSeconds: remainingSeconds - 1 });
  },
}));
