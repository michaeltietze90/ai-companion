import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Play, Send, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';
import { useCountdownStore } from '@/stores/countdownStore';
import { useStructuredActions } from '@/hooks/useStructuredActions';
import { parseStructuredResponse } from '@/lib/structuredResponseParser';
import { toast } from 'sonner';

// Preset test messages
const PRESET_MESSAGES = [
  {
    name: 'Show Leaderboard',
    json: {
      response: "Here's the current leaderboard!",
      actions: [{ type: 'showLeaderboard' }],
    },
  },
  {
    name: 'Show Name Entry',
    json: {
      response: "Great job! Let me save your score.",
      actions: [
        {
          type: 'showNameEntry',
          data: {
            firstName: 'Michael',
            lastName: 'Tietze',
            country: 'Switzerland',
            score: 950,
          },
        },
      ],
    },
  },
  {
    name: 'Leaderboard with Data',
    json: {
      response: "You're doing great! Here are the top scores.",
      actions: [
        {
          type: 'setLeaderboardData',
          data: {
            entries: [
              { firstName: 'Alice', lastName: 'Smith', country: 'USA', score: 1200 },
              { firstName: 'Bob', lastName: 'Jones', country: 'UK', score: 1100 },
              { firstName: 'Carlos', lastName: 'Garcia', country: 'Spain', score: 1050 },
              { firstName: 'Diana', lastName: 'Lee', country: 'Canada', score: 980 },
              { firstName: 'Erik', lastName: 'Müller', country: 'Germany', score: 950 },
            ],
            userRank: 20,
            userEntry: { firstName: 'Michael', lastName: 'Tietze', country: 'Switzerland', score: 650 },
          },
        },
        { type: 'showLeaderboard' },
      ],
    },
  },
  {
    name: 'Start Countdown (60s)',
    json: {
      response: "Starting the 60 second countdown now!",
      actions: [
        { type: 'countdown', data: { seconds: 60 } },
      ],
    },
  },
  {
    name: 'Start Countdown (10s)',
    json: {
      response: "Quick countdown - 10 seconds!",
      actions: [
        { type: 'countdown', data: { seconds: 10 } },
      ],
    },
  },
  {
    name: 'Hide Overlay',
    json: {
      response: "Hiding the overlay now.",
      actions: [{ type: 'hideOverlay' }],
    },
  },
];

interface TestMessageSenderProps {
  onSendMessage?: (text: string) => void;
}

export function TestMessageSender({ onSendMessage }: TestMessageSenderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customJson, setCustomJson] = useState('');
  const { executeActions } = useStructuredActions();
  const { startCountdown, stopCountdown } = useCountdownStore();

  const handlePresetClick = (preset: typeof PRESET_MESSAGES[0]) => {
    processJsonMessage(preset.json);
  };

  const handleCustomSubmit = () => {
    try {
      const parsed = JSON.parse(customJson);
      processJsonMessage(parsed);
      setCustomJson('');
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  const processJsonMessage = (json: Record<string, unknown>) => {
    console.log('[TestPanel] Processing message:', json);
    
    // Handle response speech (optional - just log it)
    if (json.response) {
      console.log('[TestPanel] Would speak:', json.response);
      toast.success(`Speaking: "${String(json.response).slice(0, 50)}..."`);
    }
    
    // Handle actions
    if (Array.isArray(json.actions)) {
      json.actions.forEach((action: { type: string; data?: Record<string, unknown> }) => {
        // Special handling for countdown action
        if (action.type === 'countdown') {
          const seconds = (action.data?.seconds as number) || 60;
          startCountdown(seconds);
          toast.info(`Countdown started: ${seconds}s`);
          return;
        }
        
        if (action.type === 'stopCountdown') {
          stopCountdown();
          toast.info('Countdown stopped');
          return;
        }
        
        // Process other actions through the standard handler
        executeActions([action as { type: 'showLeaderboard'; data?: Record<string, unknown> }]);
      });
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <motion.div
        className="bg-secondary/95 backdrop-blur-md rounded-xl border border-border shadow-2xl overflow-hidden"
        animate={{ width: isExpanded ? 380 : 'auto' }}
      >
        {/* Header / Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-secondary/80 transition-colors"
        >
          <Beaker className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-foreground">Test Panel</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border"
            >
              {/* Preset buttons */}
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-2">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      className="text-xs justify-start h-8"
                      onClick={() => handlePresetClick(preset)}
                    >
                      <Play className="w-3 h-3 mr-1.5" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom JSON input */}
              <div className="p-3 pt-0 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Custom JSON</p>
                <Textarea
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  placeholder='{"response": "Hello!", "actions": [...]}'
                  className="text-xs font-mono h-24 resize-none bg-background/50"
                />
                <Button
                  size="sm"
                  className="w-full bg-purple-500 hover:bg-purple-600"
                  onClick={handleCustomSubmit}
                  disabled={!customJson.trim()}
                >
                  <Send className="w-3 h-3 mr-1.5" />
                  Send Custom Message
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default TestMessageSender;
