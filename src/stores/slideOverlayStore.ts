import { create } from 'zustand';

interface SlideOverlayState {
  isVisible: boolean;
  currentSlide: number;
  showSlide: (slideNumber: number) => void;
  hideSlide: () => void;
}

export const useSlideOverlayStore = create<SlideOverlayState>((set) => ({
  isVisible: false,
  currentSlide: 1,
  showSlide: (slideNumber: number) => {
    const clamped = Math.max(1, Math.min(100, slideNumber));
    console.log(`[SlideOverlay] Showing slide ${clamped}`);
    set({ isVisible: true, currentSlide: clamped });
  },
  hideSlide: () => {
    console.log('[SlideOverlay] Hiding slide');
    set({ isVisible: false });
  },
}));
