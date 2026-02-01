/**
 * HeyGen Proxy Service
 * 
 * Abstracts API calls to work with both:
 * - Lovable Cloud (Supabase Edge Functions)
 * - Heroku Express backend (/api/* routes)
 */

// Detect environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Proto endpoint for getting HeyGen access token
const PROTO_TOKEN_URL = 'https://proto-salesforce-b927b6eea443.herokuapp.com/api/manage/getAccessToken';

const getApiUrl = () => {
  if (isSupabase) {
    return `${SUPABASE_URL}/functions/v1/heygen-proxy`;
  }
  return '/api/heygen-proxy';
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

async function callProxy(action: string, params: Record<string, unknown> = {}) {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HeyGen ${action} failed`);
  }

  return response.json();
}

// Get HeyGen token - supports custom API key via edge function or falls back to Proto endpoint
export async function createHeyGenToken(apiKeyName?: string): Promise<string> {
  // If a custom API key name is specified, use our edge function
  if (apiKeyName && isSupabase) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/heygen-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ apiKeyName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get HeyGen token');
    }

    const data = await response.json();
    console.log(`Got access token using ${apiKeyName}`);
    return data.token;
  }

  // Default: use Proto endpoint
  const response = await fetch(PROTO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to get HeyGen token from Proto endpoint');
  }

  let token = await response.text();
  // Clean the token - remove quotes and any whitespace
  token = token.replace(/^"|"$/g, '').trim();
  console.log('Got access token from Proto endpoint');
  return token;
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
