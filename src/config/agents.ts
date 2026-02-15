/**
 * Agentforce Agent Configuration
 * 
 * Defines the available agents for each app and their IDs.
 */

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
}

// Keynote App Agents
export const KEYNOTE_AGENTS: AgentConfig[] = [
  {
    id: '0XxKZ000000yZro0AE',
    name: 'CKO Keynote Agent',
    description: 'Primary keynote presentation agent',
  },
];

// Pitch Script Agent
export const PITCH_AGENTS: AgentConfig[] = [
  {
    id: '0XxKZ000000yfFr0AI',
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