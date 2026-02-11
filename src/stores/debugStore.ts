import { create } from 'zustand';

export type DebugEventType = 
  | 'api-request'
  | 'api-response'
  | 'sse-event'
  | 'heygen-event'
  | 'stt-event'
  | 'state-change'
  | 'error'
  | 'voice-transcript'
  | 'agentforce-response'
  | 'trigger';

export interface DebugEvent {
  id: string;
  timestamp: Date;
  type: DebugEventType;
  source: string;
  message: string;
  data?: unknown;
  duration?: number;
}

// Serializable version for BroadcastChannel
interface SerializedDebugEvent {
  id: string;
  timestamp: string;
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

// BroadcastChannel for cross-tab communication
const DEBUG_CHANNEL_NAME = 'keynote-debug-logs';
let broadcastChannel: BroadcastChannel | null = null;

try {
  broadcastChannel = new BroadcastChannel(DEBUG_CHANNEL_NAME);
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

export const useDebugStore = create<DebugState>((set) => ({
  events: [],
  isVisible: false,
  maxEvents: 200,
  
  addEvent: (event) => set((state) => {
    const newEvent: DebugEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    // Broadcast to other tabs/windows
    if (broadcastChannel) {
      const serialized: SerializedDebugEvent = {
        ...newEvent,
        timestamp: newEvent.timestamp.toISOString(),
      };
      broadcastChannel.postMessage({ type: 'new-event', event: serialized });
    }
    
    return {
      events: [newEvent, ...state.events].slice(0, state.maxEvents),
    };
  }),
  
  clearEvents: () => set({ events: [] }),
  
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  setVisible: (isVisible) => set({ isVisible }),
}));

// Subscribe to events from other tabs (for the log viewer)
export const subscribeToRemoteEvents = (
  onEvent: (event: DebugEvent) => void
): (() => void) => {
  if (!broadcastChannel) {
    console.warn('BroadcastChannel not available');
    return () => {};
  }
  
  const channel = new BroadcastChannel(DEBUG_CHANNEL_NAME);
  
  const handler = (e: MessageEvent) => {
    if (e.data.type === 'new-event') {
      const serialized = e.data.event as SerializedDebugEvent;
      onEvent({
        ...serialized,
        timestamp: new Date(serialized.timestamp),
      });
    }
  };
  
  channel.addEventListener('message', handler);
  
  return () => {
    channel.removeEventListener('message', handler);
    channel.close();
  };
};

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
