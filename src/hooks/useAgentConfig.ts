/**
 * Hook to fetch agent configuration from the server
 * 
 * Returns keyword boosts and video triggers for the specified agent type.
 * Falls back to hardcoded defaults if the API fails.
 */

import { useState, useEffect } from 'react';

export interface KeywordBoost {
  word: string;
  boost: number;
}

export interface VideoTrigger {
  id: number;
  name: string;
  keywords: string[];
  videoUrl: string;
  durationMs: number;
  position: string;
  speech: string;
  enabled: boolean;
}

export interface AgentConfig {
  agentType: string;
  utteranceEndMs: number;
  keywords: KeywordBoost[];
  triggers: VideoTrigger[];
}

// Default keywords (used as fallback)
const DEFAULT_KEYNOTE_KEYWORDS: KeywordBoost[] = [
  { word: "UKI", boost: 5 },
  { word: "Are you Miguel", boost: 5 },
  { word: "Miguel", boost: 4 },
  { word: "agentic enterprise", boost: 5 },
  { word: "agentic", boost: 4 },
  { word: "enterprise", boost: 3 },
  { word: "net new AOV", boost: 5 },
  { word: "net new", boost: 4 },
  { word: "AOV", boost: 4 },
  { word: "backflip", boost: 5 },
  { word: "back flip", boost: 5 },
];

const DEFAULT_CHAT_KEYWORDS: KeywordBoost[] = [];

const DEFAULT_CONFIG: Record<string, AgentConfig> = {
  keynote: {
    agentType: 'keynote',
    utteranceEndMs: 1000,
    keywords: DEFAULT_KEYNOTE_KEYWORDS,
    triggers: [],
  },
  chat: {
    agentType: 'chat',
    utteranceEndMs: 1000,
    keywords: DEFAULT_CHAT_KEYWORDS,
    triggers: [],
  },
};

/**
 * Fetch and cache agent configuration
 */
export function useAgentConfig(agentType: 'keynote' | 'chat') {
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG[agentType]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        const res = await fetch(`/api/agent-config/${agentType}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch config: ${res.status}`);
        }
        
        const data: AgentConfig = await res.json();
        
        if (mounted) {
          // Use fetched data, but fall back to defaults if empty
          setConfig({
            ...data,
            keywords: data.keywords.length > 0 ? data.keywords : DEFAULT_CONFIG[agentType].keywords,
          });
          setError(null);
        }
      } catch (err) {
        console.warn(`[useAgentConfig] Failed to fetch ${agentType} config, using defaults:`, err);
        if (mounted) {
          setConfig(DEFAULT_CONFIG[agentType]);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, [agentType]);

  return { config, isLoading, error };
}

/**
 * Find a matching video trigger for the given input
 */
export function findVideoTrigger(input: string, triggers: VideoTrigger[]): VideoTrigger | null {
  const normalized = input.toLowerCase().trim();
  
  for (const trigger of triggers) {
    if (!trigger.enabled) continue;
    
    for (const keyword of trigger.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return trigger;
      }
    }
  }
  
  return null;
}
