import { create } from 'zustand';

interface CountdownState {
  isVisible: boolean;
  seconds: number;
  remainingSeconds: number;
  intervalId: ReturnType<typeof setInterval> | null;
  onExpireCallback: (() => void) | null;
  
  startCountdown: (seconds: number) => void;
  stopCountdown: () => void;
  tick: () => void;
  setOnExpireCallback: (callback: (() => void) | null) => void;
}

export const useCountdownStore = create<CountdownState>((set, get) => ({
  isVisible: false,
  seconds: 60,
  remainingSeconds: 60,
  intervalId: null,
  onExpireCallback: null,

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
    const { remainingSeconds, stopCountdown, onExpireCallback } = get();
    
    if (remainingSeconds <= 1) {
      // Fire the expire callback before stopping
      if (onExpireCallback) {
        console.log('[Countdown] Timer expired, triggering callback');
        onExpireCallback();
      }
      stopCountdown();
      return;
    }

    set({ remainingSeconds: remainingSeconds - 1 });
  },

  setOnExpireCallback: (callback) => {
    set({ onExpireCallback: callback });
  },
}));
