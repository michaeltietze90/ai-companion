import { create } from 'zustand';

export type DebugEventType = 
  | 'api-request'
  | 'api-response'
  | 'sse-event'
  | 'heygen-event'
  | 'stt-event'
  | 'state-change'
  | 'error';

export interface DebugEvent {
  id: string;
  timestamp: Date;
  type: DebugEventType;
  source: string;
  message: string;
  data?: unknown;
  duration?: number;
}

interface DebugState {
  events: DebugEvent[];
  isVisible: boolean;
  maxEvents: number;
  
  addEvent: (event: Omit<DebugEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
  toggleVisibility: () => void;
  setVisible: (visible: boolean) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  events: [],
  isVisible: false,
  maxEvents: 200,
  
  addEvent: (event) => set((state) => ({
    events: [
      {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      },
      ...state.events,
    ].slice(0, state.maxEvents),
  })),
  
  clearEvents: () => set({ events: [] }),
  
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  setVisible: (isVisible) => set({ isVisible }),
}));

// Helper function to log debug events from anywhere
export const debugLog = (
  type: DebugEventType,
  source: string,
  message: string,
  data?: unknown,
  duration?: number
) => {
  useDebugStore.getState().addEvent({ type, source, message, data, duration });
};
