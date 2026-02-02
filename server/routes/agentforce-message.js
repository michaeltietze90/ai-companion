/**
 * Agentforce Message API
 * Handles sending messages to Salesforce Agentforce with streaming support
 */

import express from 'express';

const router = express.Router();

// Token cache (shared with session route in production, simplified here)
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
    throw new Error(`Failed to get Salesforce token: ${response.status}`);
  }

  const data = await response.json();
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
  };

  return data.access_token;
}

const getSfApiHost = () => process.env.SALESFORCE_API_HOST || 'https://api.salesforce.com';

// Clause boundary regex - splits on . ! ? or " - " for faster TTS streaming.
// IMPORTANT: We no longer split on commas because they often appear inside numbers (e.g., "100,000").
// This prevents mid-number splits like "100" + "000 paid deals".
const CLAUSE_END_RE = /(?<=[.!?])\s+|\s+-\s+/;

/**
 * Extract text chunk from SSE data for STREAMING mode.
 * 
 * IMPORTANT: Salesforce SSE stream structure:
 * 1. Delta events (data.delta.text) - Streaming token chunks during generation
 * 2. Text messages (data.message.type="Text") - May contain streaming text during generation  
 * 3. Inform messages (data.message.type="Inform") - Final complete message at the end
 * 
 * To avoid duplicates: We track accumulated text and only emit genuinely new content.
 * The final "Inform" message often duplicates streamed content, so we skip it.
 */
function extractStreamingTextChunk(data, accumulatedText) {
  const msg = data?.message;
  const delta = data?.delta;
  
  // CRITICAL: Skip final "Inform" messages - they duplicate the streamed content
  // The "Inform" type is sent at the END with the complete cleaned response
  if (msg?.type === 'Inform') {
    console.log('[Streaming] Skipping final Inform message (duplicates streamed content)');
    return null;
  }
  
  // Try to get text from delta first (true streaming), then from Text message
  const chunk = delta?.text ?? delta?.content ?? (msg?.type === 'Text' ? msg?.text : null);
  
  if (typeof chunk !== 'string' || !chunk) return null;
  
  if (chunk.startsWith(accumulatedText) && chunk.length > accumulatedText.length) {
    const newPart = chunk.slice(accumulatedText.length);
    return { newText: newPart, fullChunk: chunk };
  }
  
  if (accumulatedText.startsWith(chunk)) {
    return null;
  }
  
  // Overlap dedup
  const computeOverlap = (acc, incoming) => {
    const max = Math.min(acc.length, incoming.length);
    for (let len = max; len > 0; len--) {
      if (acc.endsWith(incoming.slice(0, len))) return len;
    }
    return 0;
  };
  
  const overlap = computeOverlap(accumulatedText, chunk);
  if (overlap > 0 && chunk.length > overlap) {
    const newPart = chunk.slice(overlap);
    return { newText: newPart, fullChunk: accumulatedText + newPart };
  }
  
  return { newText: chunk, fullChunk: accumulatedText + chunk };
}

// Extract text chunk for NON-STREAMING mode (legacy)
function extractTextChunk(data, accumulatedText) {
  const msg = data?.message;
  const delta = data?.delta;
  
  const chunk = 
    delta?.text ?? 
    delta?.content ?? 
    msg?.text ?? 
    msg?.message ?? 
    data?.content;
  
  if (typeof chunk !== 'string' || !chunk) return null;
  
  if (chunk.startsWith(accumulatedText) && chunk.length > accumulatedText.length) {
    const newPart = chunk.slice(accumulatedText.length);
    return { newText: newPart, fullChunk: chunk };
  }
  
  if (accumulatedText.startsWith(chunk)) {
    return null;
  }
  
  return { newText: chunk, fullChunk: accumulatedText + chunk };
}

router.post('/', async (req, res) => {
  try {
    const { sessionId, message, messagesStreamUrl, streaming } = req.body;

    if (!sessionId || !message) {
      throw new Error('Session ID and message are required');
    }

    const accessToken = await getSalesforceToken();
    const sequenceId = Date.now();

    const sfApiHost = getSfApiHost();
    const streamUrl = (typeof messagesStreamUrl === 'string' && messagesStreamUrl.trim())
      ? messagesStreamUrl
      : `${sfApiHost}/einstein/ai-agent/v1/sessions/${sessionId}/messages/stream`;

    const sfResponse = await fetch(streamUrl, {
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
    });

    if (!sfResponse.ok) {
      const errorText = await sfResponse.text();
      console.error('Agentforce message error:', sfResponse.status, errorText);

      if (sfResponse.status === 404) {
        return res.status(404).json({
          error: 'AGENTFORCE_SESSION_NOT_FOUND',
          details: errorText,
        });
      }

      throw new Error(`Failed to send message: ${sfResponse.status}`);
    }

    // Streaming mode
    if (streaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let textBuffer = '';
      let accumulatedFromAPI = '';
      // Guard against providers re-sending the same content (sometimes with different spacing)
      // which can otherwise cause the frontend to speak the same answer twice.
      const emittedSentences = new Set();
      const normalizeSentence = (s) => String(s || '').replace(/\s+/g, ' ').trim();
      
      const reader = sfResponse.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            
            try {
              const data = JSON.parse(payload);
              const msg = data?.message;
              
              if (msg?.type === 'ProgressIndicator') {
                const progressMsg = msg?.message;
                if (typeof progressMsg === 'string') {
                  res.write(`data: ${JSON.stringify({ type: 'progress', text: progressMsg })}\n\n`);
                }
                continue;
              }
              
              const result = extractStreamingTextChunk(data, accumulatedFromAPI);
              if (result) {
                // Smart space injection: Add space between letter→digit or digit→letter transitions
                // This fixes "With30" → "With 30" and "monumental70" → "monumental 70"
                const prev = textBuffer;
                const next = result.newText;
                const needsSpace =
                  prev.length > 0 &&
                  next.length > 0 &&
                  !/\s$/.test(prev) &&
                  !/^\s/.test(next) &&
                  (
                    (/[a-zA-Z]$/.test(prev) && /^[0-9]/.test(next)) ||
                    (/[0-9]$/.test(prev) && /^[a-zA-Z]/.test(next))
                  );

                textBuffer += (needsSpace ? ' ' : '') + next;
                accumulatedFromAPI = result.fullChunk;
                
                const parts = textBuffer.split(CLAUSE_END_RE);
                
                for (let i = 0; i < parts.length - 1; i++) {
                  const sentence = normalizeSentence(parts[i]);
                  if (!sentence) continue;
                  if (emittedSentences.has(sentence)) continue;
                  emittedSentences.add(sentence);
                  res.write(`data: ${JSON.stringify({ type: 'sentence', text: sentence })}\n\n`);
                }
                
                textBuffer = parts[parts.length - 1];
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
        
        const remaining = normalizeSentence(textBuffer);
        if (remaining && !emittedSentences.has(remaining)) {
          emittedSentences.add(remaining);
          res.write(`data: ${JSON.stringify({ type: 'sentence', text: remaining })}\n\n`);
        }
        
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      } catch (error) {
        console.error('Stream error:', error);
        res.end();
      }
      return;
    }

    // Non-streaming mode
    const text = await sfResponse.text();
    const lines = text.split('\n');

    let responseMessage = '';
    let accumulatedFromAPILegacy = '';
    const progressIndicators = [];

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const data = JSON.parse(payload);
        const msg = data?.message;

        if (msg?.type === 'ProgressIndicator') {
          const progressMsg = msg?.message;
          if (typeof progressMsg === 'string') progressIndicators.push(progressMsg);
          continue;
        }

        const result = extractTextChunk(data, accumulatedFromAPILegacy);
        if (result) {
          responseMessage += result.newText;
          accumulatedFromAPILegacy = result.fullChunk;
        }
      } catch {
        // Skip malformed JSON
      }
    }

    responseMessage = responseMessage.replace(/\s+/g, ' ').trim();

    res.json({ 
      message: responseMessage,
      progressIndicators,
    });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
