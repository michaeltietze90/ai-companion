/**
 * Agentforce Message API
 * Handles sending messages to Salesforce Agentforce with streaming support
 */

import express from 'express';
import { getSalesforceToken, getSfApiHost } from '../lib/salesforceAuth.js';

const router = express.Router();

// Clause boundary regex - splits on . ! ? or " - " for faster TTS streaming.
// IMPORTANT: We no longer split on commas because they often appear inside numbers (e.g., "100,000").
// This prevents mid-number splits like "100" + "000 paid deals".
const CLAUSE_END_RE = /(?<=[.!?])\s+|\s+-\s+/;

/**
 * Check if text contains JSON and extract it.
 * Returns { json: parsed object, textBefore: string, textAfter: string } if found,
 * or null if no valid JSON found.
 */
function extractJsonFromText(text) {
  // Look for JSON patterns: {...} or [...]
  const jsonPatterns = [
    /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,  // Matches nested objects
    /(\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g  // Matches nested arrays
  ];
  
  for (const pattern of jsonPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          // Valid JSON found - extract text before and after
          const startIdx = text.indexOf(match);
          const endIdx = startIdx + match.length;
          return {
            json: parsed,
            jsonString: match,
            textBefore: text.slice(0, startIdx).trim(),
            textAfter: text.slice(endIdx).trim()
          };
        } catch {
          // Not valid JSON, continue
        }
      }
    }
  }
  return null;
}

/**
 * Split text into sentences, but preserve JSON blocks intact.
 * Returns array of { type: 'text' | 'json', content: string, parsed?: object }
 */
function splitPreservingJson(text) {
  const result = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    const jsonExtract = extractJsonFromText(remaining);
    
    if (jsonExtract) {
      // Add text before JSON as sentences
      if (jsonExtract.textBefore) {
        const sentences = jsonExtract.textBefore.split(CLAUSE_END_RE).filter(s => s.trim());
        for (const s of sentences) {
          result.push({ type: 'text', content: s.trim() });
        }
      }
      
      // Add JSON as single unit
      result.push({ 
        type: 'json', 
        content: jsonExtract.jsonString, 
        parsed: jsonExtract.json 
      });
      
      remaining = jsonExtract.textAfter;
    } else {
      // No JSON found, split remaining text into sentences
      const sentences = remaining.split(CLAUSE_END_RE).filter(s => s.trim());
      for (const s of sentences) {
        result.push({ type: 'text', content: s.trim() });
      }
      break;
    }
  }
  
  return result;
}

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
  
  // Try to get text from delta first (true streaming), then from Text/TextChunk message
  const chunk = delta?.text ?? delta?.content ?? 
    ((msg?.type === 'Text' || msg?.type === 'TextChunk') ? (msg?.text ?? msg?.message) : null);
  
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

    console.log('[Agentforce] ======= NEW MESSAGE =======');
    console.log('[Agentforce] Session:', sessionId);
    console.log('[Agentforce] User message:', message);
    console.log('[Agentforce] Streaming:', streaming);

    if (!sessionId || !message) {
      throw new Error('Session ID and message are required');
    }

    const accessToken = await getSalesforceToken();
    const sequenceId = Date.now();

    const sfApiHost = getSfApiHost();
    const streamUrl = (typeof messagesStreamUrl === 'string' && messagesStreamUrl.trim())
      ? messagesStreamUrl
      : `${sfApiHost}/einstein/ai-agent/v1/sessions/${sessionId}/messages/stream`;

    console.log('[Agentforce] Sending to:', streamUrl);

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
              const delta = data?.delta;
              
              // Debug: Log what we're receiving - full content
              console.log('[Streaming] Received:', { 
                messageType: msg?.type, 
                text: msg?.text || msg?.message || null,
                hasDelta: !!delta,
                deltaText: delta?.text || null
              });
              
              // Also log raw payload for debugging
              console.log('[Streaming] Raw payload:', payload.slice(0, 500));
              
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
                
                // Use JSON-aware splitting
                const segments = splitPreservingJson(textBuffer);
                
                // Emit all complete segments except the last one (which may be incomplete)
                // But if we have JSON, we can emit it immediately as it's self-contained
                let lastIncompleteText = '';
                
                for (let i = 0; i < segments.length; i++) {
                  const segment = segments[i];
                  const isLast = i === segments.length - 1;
                  
                  if (segment.type === 'json') {
                    // JSON is always complete, emit it
                    const jsonStr = segment.content;
                    if (!emittedSentences.has(jsonStr)) {
                      emittedSentences.add(jsonStr);
                      console.log('[Agentforce] Emitting JSON:', jsonStr);
                      res.write(`data: ${JSON.stringify({ type: 'sentence', text: jsonStr })}\n\n`);
                    }
                  } else if (segment.type === 'text') {
                    const sentence = normalizeSentence(segment.content);
                    if (!sentence) continue;
                    
                    // Keep last text segment as potentially incomplete (buffered)
                    if (isLast) {
                      lastIncompleteText = segment.content;
                    } else {
                      if (!emittedSentences.has(sentence)) {
                        emittedSentences.add(sentence);
                        console.log('[Agentforce] Emitting sentence:', sentence);
                        res.write(`data: ${JSON.stringify({ type: 'sentence', text: sentence })}\n\n`);
                      }
                    }
                  }
                }
                
                textBuffer = lastIncompleteText;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
        
        const remaining = normalizeSentence(textBuffer);
        if (remaining && !emittedSentences.has(remaining)) {
          emittedSentences.add(remaining);
          console.log('[Agentforce] Emitting final sentence:', remaining);
          res.write(`data: ${JSON.stringify({ type: 'sentence', text: remaining })}\n\n`);
        }
        
        console.log('[Agentforce] ======= STREAM COMPLETE =======');
        console.log('[Agentforce] Total sentences emitted:', emittedSentences.size);
        console.log('[Agentforce] Sentences:', [...emittedSentences]);
        
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
