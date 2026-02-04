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

// Chat App Agents
export const CHAT_AGENTS: AgentConfig[] = [
  {
    id: '0XxKZ000000yfD20AI',
    name: 'Chat with Miguel Agent',
    description: 'Interactive chat agent',
  },
  {
    id: '1bYKZ000000k9eM2AQ',
    name: 'Script based Chat with Miguel',
    description: 'Scripted conversation agent',
  },
];

// Default agent IDs for each app
export const DEFAULT_KEYNOTE_AGENT_ID = KEYNOTE_AGENTS[0].id;
export const DEFAULT_CHAT_AGENT_ID = CHAT_AGENTS[0].id;
