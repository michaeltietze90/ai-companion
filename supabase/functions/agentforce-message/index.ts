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

// Sentence boundary regex - splits on . ! ? followed by space or end
const SENTENCE_END_RE = /(?<=[.!?])\s+/;

// Extract text chunk from SSE data - returns the NEW portion only (deduplicates against accumulated text)
function extractTextChunk(data: Record<string, unknown>, accumulatedText: string): { newText: string; fullChunk: string } | null {
  const msg = data?.message as Record<string, unknown> | undefined;
  const delta = data?.delta as Record<string, unknown> | undefined;
  
  // Priority order - only pick ONE source
  const chunk = 
    delta?.text ?? 
    delta?.content ?? 
    msg?.text ?? 
    msg?.message ?? 
    data?.content;
  
  if (typeof chunk !== 'string' || !chunk) return null;
  
  // If this chunk is an extension of what we've accumulated, return only the NEW part
  if (chunk.startsWith(accumulatedText) && chunk.length > accumulatedText.length) {
    const newPart = chunk.slice(accumulatedText.length);
    console.log('[Dedup] Extension detected, extracting new part:', newPart.substring(0, 50));
    return { newText: newPart, fullChunk: chunk };
  }
  
  // If what we have is an extension of this chunk, skip (we already have more)
  if (accumulatedText.startsWith(chunk)) {
    console.log('[Dedup] Skipping - already have this or longer:', chunk.substring(0, 50));
    return null;
  }
  
  // This is genuinely new text to append
  return { newText: chunk, fullChunk: accumulatedText + chunk };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, messagesStreamUrl, streaming } = await req.json();

    if (!sessionId || !message) {
      throw new Error('Session ID and message are required');
    }

    const accessToken = await getSalesforceToken();
    const sequenceId = Date.now();

    // Use the stream URL returned by session creation when available
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

    // IMPORTANT: Session expiry/invalid session manifests as 404 ("V6Session not found").
    // In that case, return a 404 to the client (NOT 500) so the frontend can re-create a session.
    if (!sfResponse.ok) {
      const errorText = await sfResponse.text();
      console.error('Agentforce message error:', sfResponse.status, errorText);

      if (sfResponse.status === 404) {
        return new Response(
          JSON.stringify({
            error: 'AGENTFORCE_SESSION_NOT_FOUND',
            details: errorText,
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Failed to send message: ${sfResponse.status}`);
    }

    // If streaming mode requested, forward SSE with sentence chunking
    if (streaming) {
      const encoder = new TextEncoder();
      let textBuffer = '';
      let accumulatedFromAPI = ''; // Track what Agentforce has sent so far
      
      const readable = new ReadableStream({
        async start(controller) {
          const reader = sfResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }
          
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
                  const msg = data?.message as Record<string, unknown> | undefined;
                  
                  // Forward progress indicators immediately
                  if (msg?.type === 'ProgressIndicator') {
                    const progressMsg = msg?.message;
                    if (typeof progressMsg === 'string') {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', text: progressMsg })}\n\n`));
                    }
                    continue;
                  }
                  
                  // Extract and buffer text (deduplicating against what we've accumulated)
                  const result = extractTextChunk(data, accumulatedFromAPI);
                  if (result) {
                    textBuffer += result.newText;
                    accumulatedFromAPI = result.fullChunk;
                    
                    // Check for complete sentences
                    const parts = textBuffer.split(SENTENCE_END_RE);
                    
                    // Send all complete sentences (all but last part)
                    for (let i = 0; i < parts.length - 1; i++) {
                      const sentence = parts[i].trim();
                      if (sentence) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sentence', text: sentence })}\n\n`));
                      }
                    }
                    
                    // Keep incomplete sentence in buffer
                    textBuffer = parts[parts.length - 1];
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
            
            // Send any remaining text as final sentence
            const remaining = textBuffer.replace(/\s+/g, ' ').trim();
            if (remaining) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sentence', text: remaining })}\n\n`));
            }
            
            // Send done marker
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        },
      });
      
      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode: buffer full response (legacy behavior)
    const text = await sfResponse.text();
    const lines = text.split('\n');

    let responseMessage = '';
    let accumulatedFromAPILegacy = '';
    const progressIndicators: string[] = [];

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const data = JSON.parse(payload);
        const msg = data?.message as Record<string, unknown> | undefined;

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

    // Normalize whitespace after stitching chunks
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
