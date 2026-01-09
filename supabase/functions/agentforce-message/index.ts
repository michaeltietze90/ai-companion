import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default to production, can be overridden for sandbox (https://test.salesforce.com)
const getSfApiHost = () => Deno.env.get('SALESFORCE_API_HOST') || 'https://api.salesforce.com';

// Token cache
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getSalesforceToken(): Promise<string> {
  const now = Date.now();
  
  if (cachedToken && cachedToken.expires_at > now + 60000) {
    return cachedToken.access_token;
  }

  const orgDomain = Deno.env.get('SALESFORCE_ORG_DOMAIN');
  const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
  const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');

  if (!orgDomain || !clientId || !clientSecret) {
    throw new Error('Salesforce credentials not configured');
  }

  const tokenUrl = `${orgDomain}/services/oauth2/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Salesforce token error:', response.status, errorText);
    throw new Error(`Failed to get Salesforce token: ${response.status}`);
  }

  const data = await response.json();
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
  };

  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message } = await req.json();

    if (!sessionId || !message) {
      throw new Error('Session ID and message are required');
    }

    const accessToken = await getSalesforceToken();
    const sequenceId = Date.now();

    // Use configurable API host for API calls
    const sfApiHost = getSfApiHost();
    const response = await fetch(
      `${sfApiHost}/einstein/ai-agent/v1/sessions/${sessionId}/messages/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: {
            sequenceId,
            type: 'Text',
            text: message,
          },
          variables: [],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agentforce message error:', response.status, errorText);
      throw new Error(`Failed to send message: ${response.status}`);
    }

    // Parse SSE stream (Agentforce streams multiple message types; we try to
    // reconstruct the final assistant text as robustly as possible).
    const text = await response.text();
    const lines = text.split('\n');

    let responseMessage = '';
    const progressIndicators: string[] = [];

    const pushText = (chunk?: unknown) => {
      if (typeof chunk !== 'string') return;
      if (!chunk) return;
      // Append exactly as streamed (no artificial spaces) to avoid splitting words.
      responseMessage += chunk;
    };

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const data = JSON.parse(payload);

        // Most common shape: { message: { type, message? , text? } }
        const msg = data?.message;

        if (msg?.type === 'ProgressIndicator') {
          if (typeof msg?.message === 'string') progressIndicators.push(msg.message);
          continue;
        }

        // Collect any assistant text we can find.
        pushText(msg?.message);
        pushText(msg?.text);
        pushText(data?.delta?.text);
        pushText(data?.delta?.content);
        pushText(data?.content);
      } catch {
        // Skip malformed JSON
      }
    }

    // Normalize whitespace after stitching chunks.
    responseMessage = responseMessage.replace(/\s+/g, ' ').trim();

    return new Response(
      JSON.stringify({ 
        message: responseMessage,
        progressIndicators,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Message error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
