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

// Clause boundary regex - splits on . ! ? , or " - " for faster TTS streaming
const CLAUSE_END_RE = /(?<=[.!?,])\s+|\s+-\s+/;

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
function extractStreamingTextChunk(data: Record<string, unknown>, accumulatedText: string): { newText: string; fullChunk: string } | null {
  const msg = data?.message as Record<string, unknown> | undefined;
  const delta = data?.delta as Record<string, unknown> | undefined;

  const pickString = (...vals: unknown[]): string | null => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v;
    }
    return null;
  };
  
  // Log what we're receiving for debugging (shape varies: Text, TextChunk, Inform)
  if (msg?.type) {
    const msgKeys = Object.keys(msg).slice(0, 12).join(',');
    console.log(`[Streaming] Received message type: ${msg.type}, keys: ${msgKeys}`);
  }
  if (delta) {
    const deltaKeys = Object.keys(delta).slice(0, 12).join(',');
    console.log(`[Streaming] Received delta keys: ${deltaKeys}`);
  }
  
  // CRITICAL: Skip final "Inform" messages - they duplicate the streamed content
  // The "Inform" type is sent at the END with the complete cleaned response
  if (msg?.type === 'Inform') {
    console.log('[Streaming] Skipping final Inform message (duplicates streamed content)');
    return null;
  }
  
  // Try to get text from delta first (true streaming), then from message payloads.
  // Salesforce can emit:
  // - message.type = "Text"      with msg.text or msg.message
  // - message.type = "TextChunk" with msg.message / msg.chunk / msg.content (varies)
  const messageType = typeof msg?.type === 'string' ? msg.type : '';
  const chunk = pickString(
    (delta as any)?.text,
    (delta as any)?.content,
    messageType === 'Text' || messageType === 'TextChunk' ? (msg as any)?.text : null,
    messageType === 'Text' || messageType === 'TextChunk' ? (msg as any)?.message : null,
    messageType === 'Text' || messageType === 'TextChunk' ? (msg as any)?.chunk : null,
    messageType === 'Text' || messageType === 'TextChunk' ? (msg as any)?.content : null,
    (data as any)?.content,
  );
  
  if (!chunk) return null;
  
  console.log(`[Streaming] Processing chunk (${chunk.length} chars): "${chunk.slice(0, 50)}..."`);

  // Helper: longest overlap between end(accumulated) and start(incoming)
  // This guards against providers that sometimes resend overlapping prefixes.
  const computeOverlap = (acc: string, incoming: string): number => {
    const max = Math.min(acc.length, incoming.length);
    for (let len = max; len > 0; len--) {
      if (acc.endsWith(incoming.slice(0, len))) return len;
    }
    return 0;
  };
  
  // If this chunk is an extension of what we've accumulated, return only the NEW part
  if (chunk.startsWith(accumulatedText) && chunk.length > accumulatedText.length) {
    const newPart = chunk.slice(accumulatedText.length);
    return { newText: newPart, fullChunk: chunk };
  }
  
  // If what we have is an extension of this chunk, skip (we already have more)
  if (accumulatedText.startsWith(chunk)) {
    return null;
  }

  // Overlap dedup: if incoming begins with a suffix of accumulated, only append the non-overlapping part.
  const overlap = computeOverlap(accumulatedText, chunk);
  if (overlap > 0 && chunk.length > overlap) {
    const newPart = chunk.slice(overlap);
    return { newText: newPart, fullChunk: accumulatedText + newPart };
  }
  
  // This is genuinely new text to append
  return { newText: chunk, fullChunk: accumulatedText + chunk };
}

/**
 * Extract text chunk for NON-STREAMING mode (legacy).
 * In this mode we DO want the final message since we're not streaming deltas.
 */
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

  // Helper: longest overlap between end(accumulated) and start(incoming)
  const computeOverlap = (acc: string, incoming: string): number => {
    const max = Math.min(acc.length, incoming.length);
    for (let len = max; len > 0; len--) {
      if (acc.endsWith(incoming.slice(0, len))) return len;
    }
    return 0;
  };
  
  // If this chunk is an extension of what we've accumulated, return only the NEW part
  if (chunk.startsWith(accumulatedText) && chunk.length > accumulatedText.length) {
    const newPart = chunk.slice(accumulatedText.length);
    return { newText: newPart, fullChunk: chunk };
  }
  
  // If what we have is an extension of this chunk, skip (we already have more)
  if (accumulatedText.startsWith(chunk)) {
    return null;
  }

  // Overlap dedup
  const overlap = computeOverlap(accumulatedText, chunk);
  if (overlap > 0 && chunk.length > overlap) {
    const newPart = chunk.slice(overlap);
    return { newText: newPart, fullChunk: accumulatedText + newPart };
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
        // Guard against providers re-sending the same content (sometimes with different spacing)
        // which can otherwise cause the frontend to speak the same answer twice.
        const emittedSentences = new Set<string>();
        const normalizeSentence = (s: string) => s.replace(/\s+/g, ' ').trim();
      
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
                  
                  // Extract and buffer text from DELTA events only (skip final Inform message)
                  const result = extractStreamingTextChunk(data, accumulatedFromAPI);
                  if (result) {
                    // Avoid word-joining across chunk boundaries (e.g. "Fragen?Ein").
                    // Only affects the spoken/display buffer; we keep accumulatedFromAPI as raw provider text.
                    const prev = textBuffer;
                    const next = result.newText;
                    const needsSpace =
                      prev.length > 0 &&
                      !/\s$/.test(prev) &&
                      next.length > 0 &&
                      !/^\s/.test(next) &&
                      /[\p{L}\p{N}!?.,;:]$/u.test(prev) &&
                      /^[\p{L}\p{N}]/u.test(next);

                    textBuffer += (needsSpace ? ' ' : '') + next;
                    accumulatedFromAPI = result.fullChunk;
                    
                    // Check for complete clauses (sentences, comma-separated phrases, or dash-separated)
                    const parts = textBuffer.split(CLAUSE_END_RE);
                    
                    // Send all complete sentences (all but last part)
                    for (let i = 0; i < parts.length - 1; i++) {
                       const sentence = normalizeSentence(parts[i]);
                       if (!sentence) continue;

                       // Deduplicate within a single response stream
                       if (emittedSentences.has(sentence)) continue;
                       emittedSentences.add(sentence);

                       controller.enqueue(
                         encoder.encode(`data: ${JSON.stringify({ type: 'sentence', text: sentence })}\n\n`)
                       );
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
             const remaining = normalizeSentence(textBuffer);
             if (remaining && !emittedSentences.has(remaining)) {
               emittedSentences.add(remaining);
               controller.enqueue(
                 encoder.encode(`data: ${JSON.stringify({ type: 'sentence', text: remaining })}\n\n`)
               );
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
