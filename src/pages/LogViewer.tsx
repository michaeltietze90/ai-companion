import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Wifi, WifiOff, Mic } from "lucide-react";
import { type DebugEvent, type DebugEventType } from "@/stores/debugStore";

/**
 * Mobile Log Viewer
 * 
 * Displays real-time logs from the Keynote app.
 * Optimized for mobile viewing (portrait mode).
 * 
 * Access at: /logs
 */

// Simplified event types for cleaner display
const eventConfig: Record<DebugEventType, { icon: string; color: string; bgColor: string; label: string; show: boolean }> = {
  'voice-transcript': { icon: '🎤', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', label: 'You said', show: true },
  'agentforce-response': { icon: '💬', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', label: 'Miguel', show: true },
  'trigger': { icon: '🎬', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30', label: 'Video', show: true },
  'error': { icon: '❌', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', label: 'Error', show: true },
  'api-request': { icon: '→', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'API', show: false },
  'api-response': { icon: '←', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'API', show: false },
  'sse-event': { icon: '⚡', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'SSE', show: false },
  'heygen-event': { icon: '🎭', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'HeyGen', show: false },
  'stt-event': { icon: '🎙️', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'STT', show: false },
  'state-change': { icon: '⚙️', color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'State', show: false },
};

const LogViewer = () => {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle incoming event
  const handleEvent = useCallback((event: DebugEvent) => {
    // Handle mic level updates separately (don't add to events list)
    if (event.source === 'mic-level') {
      setMicLevel(parseInt(event.message) || 0);
      return;
    }
    setEvents((prev) => [event, ...prev].slice(0, 200));
  }, []);

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
        reconnectTimer = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => {};
    };
    
    connect();
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [handleEvent]);

  // Reset mic level after inactivity
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (micLevel > 0) setMicLevel(0);
    }, 500);
    return () => clearTimeout(timeout);
  }, [micLevel]);

  const handleClear = () => {
    setEvents([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
    });
  };

  // Filter events based on showAll toggle
  const displayEvents = showAll 
    ? events 
    : events.filter(e => eventConfig[e.type]?.show);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Keynote Logs</h1>
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mic level indicator */}
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-2.5 py-1.5">
              <Mic className={`w-3.5 h-3.5 ${micLevel > 10 ? 'text-green-400' : 'text-gray-500'}`} />
              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-green-500 rounded-full"
                  animate={{ width: `${micLevel}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            </div>
            
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toggle for showing all events */}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setShowAll(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !showAll ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Conversation
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              showAll ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
            }`}
          >
            All Events
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            {displayEvents.length} events
          </span>
        </div>
      </header>

      {/* Event List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-5xl mb-3">📡</div>
            <p className="text-center text-sm">
              Waiting for conversation...
              <br />
              <span className="text-xs text-gray-600">Open Keynote Proto L in another browser</span>
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayEvents.map((event) => {
              const config = eventConfig[event.type] || eventConfig['state-change'];
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="mb-2"
                >
                  <div className={`rounded-xl p-3 border ${config.bgColor}`}>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{config.icon}</span>
                      <span className={`text-xs font-semibold ${config.color}`}>
                        {event.source || config.label}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-auto font-mono">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    
                    {/* Message */}
                    <p className={`text-sm leading-relaxed ${
                      event.type === 'voice-transcript' ? 'text-blue-200' :
                      event.type === 'agentforce-response' ? 'text-green-200' :
                      event.type === 'trigger' ? 'text-purple-200' :
                      event.type === 'error' ? 'text-red-300' :
                      'text-gray-300'
                    }`}>
                      {event.message.replace(/^[🎤💬🎬❌→←⚡🎭🎙️⚙️]\s*/, '').replace(/^["']|["']$/g, '')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
