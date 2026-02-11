import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pause, Play, Wifi, WifiOff } from "lucide-react";
import { type DebugEvent, type DebugEventType } from "@/stores/debugStore";

/**
 * Mobile Log Viewer
 * 
 * Displays real-time logs from the Keynote app.
 * Optimized for mobile viewing (portrait mode).
 * 
 * Access at: /logs
 */

const eventTypeColors: Record<DebugEventType, string> = {
  'voice-transcript': 'bg-blue-500',
  'agentforce-response': 'bg-green-500',
  'trigger': 'bg-purple-500',
  'api-request': 'bg-yellow-500',
  'api-response': 'bg-yellow-600',
  'sse-event': 'bg-orange-500',
  'heygen-event': 'bg-pink-500',
  'stt-event': 'bg-cyan-500',
  'state-change': 'bg-gray-500',
  'error': 'bg-red-500',
};

const eventTypeLabels: Record<DebugEventType, string> = {
  'voice-transcript': 'Voice',
  'agentforce-response': 'Response',
  'trigger': 'Trigger',
  'api-request': 'API Req',
  'api-response': 'API Res',
  'sse-event': 'SSE',
  'heygen-event': 'HeyGen',
  'stt-event': 'STT',
  'state-change': 'State',
  'error': 'Error',
};

const LogViewer = () => {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<DebugEventType | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedEventsRef = useRef<DebugEvent[]>([]);

  // Handle incoming event
  const handleEvent = useCallback((event: DebugEvent) => {
    if (isPaused) {
      pausedEventsRef.current = [event, ...pausedEventsRef.current].slice(0, 500);
    } else {
      setEvents((prev) => [event, ...prev].slice(0, 500));
    }
  }, [isPaused]);

  // Subscribe via WebSocket for cross-device support
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/logs?role=viewer`;
    
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[LogViewer] WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (e) => {
        try {
          const serialized = JSON.parse(e.data);
          const event: DebugEvent = {
            ...serialized,
            timestamp: new Date(serialized.timestamp),
          };
          handleEvent(event);
        } catch (err) {
          console.error('[LogViewer] Failed to parse event:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[LogViewer] WebSocket disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => {
        // Error triggers onclose
      };
    };
    
    connect();
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [handleEvent]);

  // Resume and merge paused events
  const handleResume = () => {
    setEvents((prev) => [...pausedEventsRef.current, ...prev].slice(0, 500));
    pausedEventsRef.current = [];
    setIsPaused(false);
  };

  const handleClear = () => {
    setEvents([]);
    pausedEventsRef.current = [];
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Keynote Logs</h1>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => isPaused ? handleResume() : setIsPaused(true)}
              className={`p-2 rounded-lg ${isPaused ? 'bg-green-600' : 'bg-gray-700'}`}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-gray-700"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'all' 
                ? 'bg-white text-gray-900' 
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            All ({events.length})
          </button>
          {(['voice-transcript', 'agentforce-response', 'trigger', 'error'] as DebugEventType[]).map((type) => {
            const count = events.filter(e => e.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === type 
                    ? `${eventTypeColors[type]} text-white` 
                    : 'bg-gray-800 text-gray-300'
                }`}
              >
                {eventTypeLabels[type]} ({count})
              </button>
            );
          })}
        </div>
      </header>

      {/* Event List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {isPaused && pausedEventsRef.current.length > 0 && (
          <div className="mb-2 p-2 bg-yellow-900/50 rounded-lg text-center text-sm text-yellow-300">
            {pausedEventsRef.current.length} new events paused
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-4xl mb-2">📡</div>
            <p className="text-center">
              Waiting for logs...
              <br />
              <span className="text-sm">Open Keynote in another tab to see logs here</span>
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="mb-2"
              >
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventTypeColors[event.type]} text-white`}>
                      {eventTypeLabels[event.type]}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(event.timestamp)}
                    </span>
                    {event.source && event.source !== 'KeynoteProtoL' && (
                      <span className="text-xs text-gray-600">
                        {event.source}
                      </span>
                    )}
                  </div>
                  
                  {/* Message */}
                  <p className={`text-sm leading-relaxed ${
                    event.type === 'error' ? 'text-red-400' : 
                    event.type === 'voice-transcript' ? 'text-blue-300' :
                    event.type === 'agentforce-response' ? 'text-green-300' :
                    'text-gray-300'
                  }`}>
                    {event.message}
                  </p>

                  {/* Data (if any) */}
                  {event.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Show data
                      </summary>
                      <pre className="mt-1 text-xs text-gray-400 bg-gray-950 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer status */}
      <footer className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-4 py-2 text-center text-xs text-gray-500 safe-area-inset-bottom">
        {filteredEvents.length} events • BroadcastChannel API
      </footer>
    </div>
  );
};

export default LogViewer;
