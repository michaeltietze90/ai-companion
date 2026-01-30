/**
 * Agentforce Session API
 * Handles starting and ending Salesforce Agentforce sessions
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Token cache
let cachedToken = null;

async function getSalesforceToken() {
  const now = Date.now();
  
  if (cachedToken && cachedToken.expires_at > now + 60000) {
    return cachedToken.access_token;
  }

  const orgDomain = process.env.SALESFORCE_ORG_DOMAIN;
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

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
    throw new Error(`Failed to get Salesforce token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
  };

  return data.access_token;
}

const getSfApiHost = () => process.env.SALESFORCE_API_HOST || 'https://api.salesforce.com';

router.post('/', async (req, res) => {
  try {
    const { action, sessionId, reason } = req.body;
    const agentId = process.env.SALESFORCE_AGENT_ID;
    const orgDomain = process.env.SALESFORCE_ORG_DOMAIN;
    
    if (!agentId || !orgDomain) {
      throw new Error('Salesforce configuration not complete');
    }

    const accessToken = await getSalesforceToken();

    if (action === 'start') {
      const externalSessionKey = crypto.randomUUID();
      
      const sfApiHost = getSfApiHost();
      const response = await fetch(
        `${sfApiHost}/einstein/ai-agent/v1/agents/${agentId}/sessions`,
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
        throw new Error(`Failed to start session: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log('Agentforce session response:', JSON.stringify(data, null, 2));
      
      let welcomeMessage = null;
      if (data.messages && data.messages.length > 0) {
        const informMessage = data.messages.find((m) => m.type === 'Inform');
        if (informMessage) {
          welcomeMessage = informMessage.message;
        }
      }

      const messagesStreamUrl = data?._links?.messagesStream?.href ?? null;

      return res.json({ 
        sessionId: data.sessionId,
        welcomeMessage,
        messagesStreamUrl,
      });
    } 
    
    if (action === 'end') {
      if (!sessionId) {
        throw new Error('Session ID required to end session');
      }

      const sfApiHostEnd = getSfApiHost();
      const response = await fetch(
        `${sfApiHostEnd}/einstein/ai-agent/v1/sessions/${sessionId}`,
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

      return res.json({ success: true });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
