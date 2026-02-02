/**
 * API Service
 * 
 * Abstracts API calls to work with both:
 * - Lovable Cloud (Supabase Edge Functions) - when VITE_SUPABASE_URL is set
 * - Heroku Express backend - when running on Heroku (/api/* routes)
 */

import { debugLog } from '@/stores/debugStore';

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

// Instrumented fetch with debug logging
const debugFetch = async (endpoint: string, options: RequestInit, body?: unknown): Promise<Response> => {
  const url = getApiUrl(endpoint);
  const startTime = Date.now();
  
  debugLog('api-request', endpoint, `${options.method || 'GET'} ${endpoint}`, body);
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    debugLog('api-response', endpoint, `${response.status} ${response.statusText}`, undefined, duration);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    debugLog('error', endpoint, `Request failed: ${error}`, undefined, duration);
    throw error;
  }
};

export async function getHeyGenToken(): Promise<string> {
  const body = {};
  const response = await debugFetch('heygen-token', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  }, body);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get HeyGen token');
  }

  const data = await response.json();
  debugLog('api-response', 'heygen-token', 'Token received', { tokenLength: data.token?.length });
  return data.token;
}

export async function startAgentSession(agentId?: string): Promise<{ sessionId: string; welcomeMessage: string | null; messagesStreamUrl: string | null }> {
  const body = { action: 'start', agentId };
  const response = await debugFetch('agentforce-session', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  }, body);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start session');
  }

  const data = await response.json();
  debugLog('api-response', 'agentforce-session', `Session started: ${data.sessionId?.slice(0, 8)}...`, {
    sessionId: data.sessionId,
    hasWelcome: !!data.welcomeMessage,
    hasStreamUrl: !!data.messagesStreamUrl,
  });
  return data;
}

export async function endAgentSession(sessionId: string): Promise<void> {
  const body = { action: 'end', sessionId };
  debugLog('api-request', 'agentforce-session', `Ending session: ${sessionId.slice(0, 8)}...`);
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
  const body = { sessionId, message, messagesStreamUrl, streaming: true };
  const startTime = Date.now();
  
  debugLog('api-request', 'agentforce-message', `Streaming: "${message.slice(0, 50)}..."`, body);
  
  const response = await fetch(getApiUrl('agentforce-message'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    debugLog('error', 'agentforce-message', `Stream failed: ${error.error}`, error);
    throw new Error(error.error || 'Failed to send message');
  }
  
  debugLog('api-response', 'agentforce-message', 'Stream opened', undefined, Date.now() - startTime);

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

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
          chunkCount++;
          
          // Log SSE events
          if (chunk.type === 'sentence') {
            debugLog('sse-event', 'agentforce', `Sentence #${chunkCount}: "${chunk.text.slice(0, 40)}..."`, chunk);
          } else if (chunk.type === 'progress') {
            debugLog('sse-event', 'agentforce', `Progress: ${chunk.text}`, chunk);
          } else if (chunk.type === 'done') {
            debugLog('sse-event', 'agentforce', `Stream complete (${chunkCount} chunks)`, undefined, Date.now() - startTime);
          }
          
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
