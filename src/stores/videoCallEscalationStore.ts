import { create } from 'zustand';

interface VideoCallEscalationState {
  isVisible: boolean;
  duration: number; // 0 = manual close only
  
  // Actions
  show: (duration?: number) => void;
  hide: () => void;
}

export const useVideoCallEscalationStore = create<VideoCallEscalationState>((set) => ({
  isVisible: false,
  duration: 0,
  
  show: (duration = 0) => set({ isVisible: true, duration }),
  hide: () => set({ isVisible: false }),
}));
