/**
 * Agentforce Session API
 * Handles starting and ending Salesforce Agentforce sessions
 */

import express from 'express';
import crypto from 'crypto';
import { getSalesforceToken, getSfApiHost } from '../lib/salesforceAuth.js';

const router = express.Router();

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
