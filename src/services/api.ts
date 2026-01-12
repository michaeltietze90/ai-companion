const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

export async function getHeyGenToken(): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/heygen-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get HeyGen token');
  }

  const data = await response.json();
  return data.token;
}

export async function startAgentSession(): Promise<{ sessionId: string; welcomeMessage: string | null; messagesStreamUrl: string | null }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentforce-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'start' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start session');
  }

  return response.json();
}

export async function endAgentSession(sessionId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/functions/v1/agentforce-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'end', sessionId }),
  });
}

// Legacy non-streaming message (kept for backwards compatibility)
export async function sendAgentMessage(
  sessionId: string,
  message: string,
  messagesStreamUrl?: string | null
): Promise<{ message: string; progressIndicators: string[] }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentforce-message`, {
    method: 'POST',
    headers,
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
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentforce-message`, {
    method: 'POST',
    headers,
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
