/**
 * Agentforce Agent Configuration
 * 
 * Defines the available agents for each app and their IDs.
 * Agent IDs can be overridden via environment variables:
 * - VITE_KEYNOTE_AGENT_ID
 * - VITE_PITCH_AGENT_ID
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
const pitchAgentId = import.meta.env.VITE_PITCH_AGENT_ID || MIGUEL_PITCH_AGENT_ID;

// Keynote App Agents
export const KEYNOTE_AGENTS: AgentConfig[] = [
  {
    id: keynoteAgentId,
    name: 'Keynote Agent',
    description: 'Primary keynote presentation agent',
  },
];

// Pitch Script Agent (Exec Experience for Frank)
export const PITCH_AGENTS: AgentConfig[] = [
  {
    id: pitchAgentId,
    name: 'Pitch Agent Script',
    description: 'Scripted pitch conversation agent',
  },
];

// Chat to Frank Agents (uses SALESFORCE_AGENT_ID from server env)
export const CHAT_AGENTS: AgentConfig[] = [
  {
    id: '', // Server uses SALESFORCE_AGENT_ID when empty/undefined
    name: 'Frank Chat Agent',
    description: 'Conversational chat with Frank',
  },
];

// Default agent IDs for each app
export const DEFAULT_KEYNOTE_AGENT_ID = KEYNOTE_AGENTS[0].id;
export const DEFAULT_PITCH_AGENT_ID = PITCH_AGENTS[0].id;
// Chat uses server's SALESFORCE_AGENT_ID - pass undefined
export const DEFAULT_CHAT_AGENT_ID: string | undefined = undefined;