import { create } from 'zustand';
import type { VisualCommand } from '@/lib/richResponseParser';

interface VisualOverlayState {
  /** Queue of visuals to display */
  visualQueue: VisualCommand[];
  /** Currently displaying visuals */
  activeVisuals: VisualCommand[];
  /** Whether any visuals are currently showing */
  isShowingVisuals: boolean;
  
  // Actions
  queueVisuals: (visuals: VisualCommand[]) => void;
  startVisuals: (visuals: VisualCommand[]) => void;
  clearVisuals: () => void;
  markVisualComplete: (id: string) => void;
}

export const useVisualOverlayStore = create<VisualOverlayState>((set, get) => ({
  visualQueue: [],
  activeVisuals: [],
  isShowingVisuals: false,

  queueVisuals: (visuals) => {
    set(state => ({
      visualQueue: [...state.visualQueue, ...visuals],
    }));
  },

  startVisuals: (visuals) => {
    set({
      activeVisuals: visuals,
      isShowingVisuals: visuals.length > 0,
    });
  },

  clearVisuals: () => {
    set({
      visualQueue: [],
      activeVisuals: [],
      isShowingVisuals: false,
    });
  },

  markVisualComplete: (id) => {
    const { activeVisuals } = get();
    const remaining = activeVisuals.filter(v => v.id !== id);
    
    set({
      activeVisuals: remaining,
      isShowingVisuals: remaining.length > 0,
    });
  },
}));
