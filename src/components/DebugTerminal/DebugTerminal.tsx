import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Wifi,
  Radio,
  AlertCircle,
  Activity,
  Mic,
  Video,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebugStore, DebugEvent, DebugEventType } from '@/stores/debugStore';
import { cn } from '@/lib/utils';

const EVENT_TYPE_CONFIG: Record<DebugEventType, { icon: typeof Terminal; color: string; label: string }> = {
  'api-request': { icon: Wifi, color: 'text-blue-400', label: 'REQ' },
  'api-response': { icon: Wifi, color: 'text-green-400', label: 'RES' },
  'sse-event': { icon: Radio, color: 'text-purple-400', label: 'SSE' },
  'heygen-event': { icon: Video, color: 'text-cyan-400', label: 'HEY' },
  'stt-event': { icon: Mic, color: 'text-yellow-400', label: 'STT' },
  'state-change': { icon: Activity, color: 'text-orange-400', label: 'STATE' },
  'error': { icon: AlertCircle, color: 'text-red-400', label: 'ERR' },
};

interface DebugEventRowProps {
  event: DebugEvent;
}

const DebugEventRow = ({ event }: DebugEventRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = EVENT_TYPE_CONFIG[event.type];
  const Icon = config.icon;
  
  const timeStr = event.timestamp.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const msStr = event.timestamp.getMilliseconds().toString().padStart(3, '0');
  
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <div 
        className="flex items-start gap-2 px-2 py-1.5 hover:bg-secondary/30 cursor-pointer text-xs font-mono"
        onClick={() => event.data && setIsExpanded(!isExpanded)}
      >
        <span className="text-muted-foreground shrink-0">{timeStr}.{msStr}</span>
        <span className={cn('shrink-0 font-bold w-12', config.color)}>
          [{config.label}]
        </span>
        <span className="text-muted-foreground shrink-0">{event.source}</span>
        <span className="text-foreground flex-1 truncate">{event.message}</span>
        {event.duration && (
          <span className="text-muted-foreground shrink-0">{event.duration}ms</span>
        )}
        {event.data && (
          <button className="shrink-0 text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {isExpanded && event.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre className="px-3 py-2 bg-secondary/50 text-xs text-muted-foreground overflow-x-auto max-h-40">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DebugTerminal = () => {
  const { events, isVisible, clearEvents, toggleVisibility } = useDebugStore();
  const [filter, setFilter] = useState<DebugEventType | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);
  
  // Auto-scroll to top (newest) when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll]);
  
  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-secondary/80 backdrop-blur-sm border border-border hover:bg-secondary"
        onClick={toggleVisibility}
      >
        <Terminal className="w-4 h-4 mr-2" />
        Debug
      </Button>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50 w-[600px] max-w-[calc(100vw-2rem)] h-[400px] bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Debug Terminal</span>
          <span className="text-xs text-muted-foreground">({events.length} events)</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearEvents}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={toggleVisibility}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-secondary/30 border-b border-border overflow-x-auto">
        <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
        <button
          className={cn(
            'px-2 py-0.5 rounded text-xs transition-colors shrink-0',
            filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            className={cn(
              'px-2 py-0.5 rounded text-xs transition-colors shrink-0',
              filter === type ? 'bg-primary text-primary-foreground' : cn(config.color, 'opacity-60 hover:opacity-100')
            )}
            onClick={() => setFilter(type as DebugEventType)}
          >
            {config.label}
          </button>
        ))}
      </div>
      
      {/* Events list */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={() => {
          if (scrollRef.current) {
            setAutoScroll(scrollRef.current.scrollTop < 10);
          }
        }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No events yet. Start a conversation to see activity.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <DebugEventRow key={event.id} event={event} />
          ))
        )}
      </div>
      
      {/* Footer with auto-scroll indicator */}
      <div className="px-2 py-1 bg-secondary/30 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {autoScroll ? '📍 Auto-scrolling' : '⏸️ Scroll paused'}
        </span>
        <span>
          Showing {filteredEvents.length} of {events.length}
        </span>
      </div>
    </motion.div>
  );
};
