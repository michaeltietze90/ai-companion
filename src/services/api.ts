/**
 * API Service
 * 
 * Abstracts API calls to work with both:
 * - Lovable Cloud (Supabase Edge Functions) - when VITE_SUPABASE_URL is set
 * - Heroku Express backend - when running on Heroku (/api/* routes)
 */

// Detect environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use Supabase if configured, otherwise use relative /api paths (Heroku)
const isSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const getApiUrl = (endpoint: string) => {
  if (isSupabase) {
    return `${SUPABASE_URL}/functions/v1/${endpoint}`;
  }
  // Heroku: use relative path
  return `/api/${endpoint}`;
};

const getHeaders = () => {
  if (isSupabase) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    };
  }
  return {
    'Content-Type': 'application/json',
  };
};

export async function getHeyGenToken(): Promise<string> {
  const response = await fetch(getApiUrl('heygen-token'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get HeyGen token');
  }

  const data = await response.json();
  return data.token;
}

export async function startAgentSession(agentId?: string): Promise<{ sessionId: string; welcomeMessage: string | null; messagesStreamUrl: string | null }> {
  const response = await fetch(getApiUrl('agentforce-session'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action: 'start', agentId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start session');
  }

  return response.json();
}

export async function endAgentSession(sessionId: string): Promise<void> {
  await fetch(getApiUrl('agentforce-session'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action: 'end', sessionId }),
  });
}

// Legacy non-streaming message (kept for backwards compatibility)
export async function sendAgentMessage(
  sessionId: string,
  message: string,
  messagesStreamUrl?: string | null
): Promise<{ message: string; progressIndicators: string[] }> {
  const response = await fetch(getApiUrl('agentforce-message'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId, message, messagesStreamUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

// Streaming message types
export type StreamChunk = 
  | { type: 'progress'; text: string }
  | { type: 'sentence'; text: string }
  | { type: 'done' };

// Streaming message - yields sentences as they arrive
export async function* streamAgentMessage(
  sessionId: string,
  message: string,
  messagesStreamUrl?: string | null
): AsyncGenerator<StreamChunk, void, unknown> {
  const response = await fetch(getApiUrl('agentforce-message'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId, message, messagesStreamUrl, streaming: true }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const payload = line.slice(6).trim();
        if (!payload) continue;

        try {
          const chunk = JSON.parse(payload) as StreamChunk;
          yield chunk;
          
          if (chunk.type === 'done') {
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
