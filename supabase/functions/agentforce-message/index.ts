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

// Track accumulated text to detect when Agentforce re-sends a "corrected" version
let accumulatedText = '';

// Extract text chunk from SSE data - returns null if no new text or if duplicate
function extractTextChunk(data: Record<string, unknown>, seenText: Set<string>): string | null {
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
  
  // Deduplicate - exact match
  if (seenText.has(chunk)) {
    console.log('[Dedup] Skipping exact duplicate chunk:', chunk.substring(0, 50));
    return null;
  }
  
  // Near-duplicate detection: if the new chunk is very similar to something we've seen
  // (e.g., Agentforce sends partial then full sentence), skip it
  for (const seen of seenText) {
    // If new chunk starts with something we've seen (prefix match)
    if (chunk.startsWith(seen) && chunk.length > seen.length) {
      // This is an extension - skip, we already have the prefix
      console.log('[Dedup] Skipping extended chunk (already have prefix):', chunk.substring(0, 50));
      return null;
    }
    // If something we've seen starts with this chunk
    if (seen.startsWith(chunk) && seen.length > chunk.length) {
      // We already have a longer version - skip this
      console.log('[Dedup] Skipping shorter chunk (already have longer):', chunk.substring(0, 50));
      return null;
    }
  }
  
  seenText.add(chunk);
  return chunk;
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
      const seenChunks = new Set<string>(); // Track seen text to deduplicate
      
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
                  
                  // Extract and buffer text
                  const textChunk = extractTextChunk(data, seenChunks);
                  if (textChunk) {
                    textBuffer += textChunk;
                    
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
    const progressIndicators: string[] = [];
    const seenChunksLegacy = new Set<string>(); // Deduplicate for legacy mode too

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

        const textChunk = extractTextChunk(data, seenChunksLegacy);
        if (textChunk) responseMessage += textChunk;
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
