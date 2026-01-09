import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { action, sessionId, reason } = await req.json();
    const agentId = Deno.env.get('SALESFORCE_AGENT_ID');
    const orgDomain = Deno.env.get('SALESFORCE_ORG_DOMAIN');
    
    if (!agentId || !orgDomain) {
      throw new Error('Salesforce configuration not complete');
    }

    const accessToken = await getSalesforceToken();

    if (action === 'start') {
      const externalSessionKey = crypto.randomUUID();
      
      const response = await fetch(
        `https://api.salesforce.com/einstein/ai-agent/v1/agents/${agentId}/sessions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            externalSessionKey,
            instanceConfig: { endpoint: orgDomain },
            featureSupport: 'Streaming',
            streamingCapabilities: { chunkTypes: ['Text'] },
            bypassUser: true,
            tz: 'America/Los_Angeles',
            variables: [
              { name: '$Context.EndUserLanguage', type: 'Text', value: 'en_US' }
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Agentforce session error:', response.status, errorText);
        throw new Error(`Failed to start session: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract welcome message if present
      let welcomeMessage = null;
      if (data.messages && data.messages.length > 0) {
        const informMessage = data.messages.find((m: any) => m.type === 'Inform');
        if (informMessage) {
          welcomeMessage = informMessage.message;
        }
      }

      return new Response(
        JSON.stringify({ 
          sessionId: data.sessionId,
          welcomeMessage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (action === 'end') {
      if (!sessionId) {
        throw new Error('Session ID required to end session');
      }

      const response = await fetch(
        `https://api.salesforce.com/einstein/ai-agent/v1/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-session-end-reason': reason || 'UserRequest',
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        console.error('Failed to end session:', response.status);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
