/**
 * Agentforce Agent Configuration
 * 
 * Defines the available agents for each app and their IDs.
 * Agent IDs can be overridden via environment variables:
 * - VITE_KEYNOTE_AGENT_ID (for /keynote routes)
 * - VITE_CHAT_AGENT_ID (for /chat routes - Exec Experience for Frank)
 */

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
}

// Default agent IDs (Miguel org) - can be overridden by env vars
const MIGUEL_KEYNOTE_AGENT_ID = '0XxKZ000000yZro0AE';
const MIGUEL_PITCH_AGENT_ID = '0XxKZ000000yfFr0AI';

// Get agent IDs from env vars or fall back to defaults
const keynoteAgentId = import.meta.env.VITE_KEYNOTE_AGENT_ID || MIGUEL_KEYNOTE_AGENT_ID;
const chatAgentId = import.meta.env.VITE_CHAT_AGENT_ID || ''; // Empty = use server's SALESFORCE_AGENT_ID

// Keynote App Agents
export const KEYNOTE_AGENTS: AgentConfig[] = [
  {
    id: keynoteAgentId,
    name: 'Keynote Agent',
    description: 'Primary keynote presentation agent',
  },
];

// Pitch Script Agent (Miguel only - not used for Frank)
export const PITCH_AGENTS: AgentConfig[] = [
  {
    id: MIGUEL_PITCH_AGENT_ID,
    name: 'Pitch Agent Script',
    description: 'Scripted pitch conversation agent',
  },
];

// Chat Agents (Exec Experience for Frank, uses VITE_CHAT_AGENT_ID)
export const CHAT_AGENTS: AgentConfig[] = [
  {
    id: chatAgentId,
    name: 'Chat Agent',
    description: 'Conversational chat agent',
  },
];

// Default agent IDs for each app
export const DEFAULT_KEYNOTE_AGENT_ID = KEYNOTE_AGENTS[0].id;
export const DEFAULT_PITCH_AGENT_ID = PITCH_AGENTS[0].id;
// Chat uses VITE_CHAT_AGENT_ID if set, otherwise undefined (server fallback)
export const DEFAULT_CHAT_AGENT_ID: string | undefined = chatAgentId || undefined;