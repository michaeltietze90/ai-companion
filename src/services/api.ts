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

export async function startAgentSession(): Promise<{ sessionId: string; welcomeMessage: string | null }> {
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

export async function sendAgentMessage(sessionId: string, message: string): Promise<{ message: string; progressIndicators: string[] }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentforce-message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}
