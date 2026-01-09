const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function callProxy(action: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/heygen-proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HeyGen ${action} failed`);
  }

  return response.json();
}

export async function createHeyGenToken(): Promise<string> {
  const data = await callProxy('create_token');
  return data.data?.token || data.token;
}

export async function createStreamingSession(token: string, options?: {
  avatarName?: string;
  quality?: string;
}): Promise<{
  sessionId: string;
  accessToken: string;
  url: string;
}> {
  const data = await callProxy('new', {
    token,
    avatarName: options?.avatarName || 'default',
    quality: options?.quality || 'medium',
  });
  
  return {
    sessionId: data.data.session_id,
    accessToken: data.data.access_token,
    url: data.data.url,
  };
}

export async function startStreaming(token: string, sessionId: string): Promise<void> {
  await callProxy('start', { token, sessionId });
}

export async function stopStreaming(token: string, sessionId: string): Promise<void> {
  await callProxy('stop', { token, sessionId });
}

export async function speakText(token: string, sessionId: string, text: string): Promise<void> {
  await callProxy('speak', { token, sessionId, text });
}

export async function interruptSpeaking(token: string, sessionId: string): Promise<void> {
  await callProxy('interrupt', { token, sessionId });
}
