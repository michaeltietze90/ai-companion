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

// Default agent IDs for each app
export const DEFAULT_KEYNOTE_AGENT_ID = KEYNOTE_AGENTS[0].id;
export const DEFAULT_PITCH_AGENT_ID = PITCH_AGENTS[0].id;
