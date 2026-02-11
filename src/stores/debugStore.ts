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

// WebSocket for cross-device communication (sender side)
let logSenderWs: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectLogSender() {
  if (logSenderWs?.readyState === WebSocket.OPEN) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/logs?role=sender`;
  
  try {
    logSenderWs = new WebSocket(wsUrl);
    
    logSenderWs.onopen = () => {
      console.log('[DebugStore] WebSocket sender connected');
    };
    
    logSenderWs.onclose = () => {
      logSenderWs = null;
      // Reconnect after 5 seconds
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(connectLogSender, 5000);
    };
    
    logSenderWs.onerror = () => {
      // Error will trigger onclose
    };
  } catch (e) {
    console.warn('[DebugStore] WebSocket connection failed:', e);
  }
}

// Connect on load (only if not on /logs page to avoid loop)
if (typeof window !== 'undefined' && !window.location.pathname.includes('/logs')) {
  // Delay connection to avoid blocking page load
  setTimeout(connectLogSender, 1000);
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
    
    const serialized: SerializedDebugEvent = {
      ...newEvent,
      timestamp: newEvent.timestamp.toISOString(),
    };
    
    // Broadcast to other tabs/windows (same browser)
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'new-event', event: serialized });
    }
    
    // Send via WebSocket (cross-device)
    if (logSenderWs?.readyState === WebSocket.OPEN) {
      logSenderWs.send(JSON.stringify(serialized));
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
