/**
 * Structured Response Parser
 * 
 * Parses Agentforce JSON responses that include both spoken text and structured data/actions.
 * Works alongside the existing rich response parser for visual tags.
 * 
 * Expected JSON Structure from Agentforce:
 * {
 *   "response": "Hi Michael, great to have you come all the way from Switzerland!",
 *   "actions": [
 *     { "type": "showNameEntry", "data": { "firstName": "Michael", "lastName": "Tietze", "country": "Switzerland" } },
 *     { "type": "showLeaderboard" },
 *     { "type": "showVisual", "data": { "src": "https://...", "position": "center", "duration": 5000 } }
 *   ],
 *   "data": {
 *     "firstName": "Michael",
 *     "lastName": "Tietze", 
 *     "country": "Switzerland",
 *     "score": 950
 *   }
 * }
 * 
 * The parser extracts:
 * - speechText: The text to be spoken by the avatar
 * - actions: Array of UI actions to trigger (overlays, prefills, etc.)
 * - data: Extracted structured data for form prefills
 */

export type ActionType = 
  | 'showNameEntry' 
  | 'showLeaderboard' 
  | 'hideOverlay'
  | 'showVisual'
  | 'prefillData'
  | 'setScore'
  | 'setLeaderboardData'
  | 'countdown'
  | 'stopCountdown'
  | 'score'
  | 'hideScore'
  | 'slide'
  | 'hideSlide';

export interface StructuredAction {
  type: ActionType;
  data?: Record<string, unknown>;
}

export interface StructuredData {
  firstName?: string;
  lastName?: string;
  country?: string;
  score?: number;
  [key: string]: unknown;
}

export interface StructuredResponse {
  /** The text to speak (clean, no markup) */
  response: string;
  /** UI actions to execute */
  actions?: StructuredAction[];
  /** Structured data for form prefills, etc. */
  data?: StructuredData;
}

export interface ParsedStructuredResponse {
  /** Whether the response was valid JSON */
  isStructured: boolean;
  /** The speech text (from JSON or raw text) */
  speechText: string;
  /** Actions to execute */
  actions: StructuredAction[];
  /** Extracted data */
  data: StructuredData | null;
  /** Raw response for debugging */
  rawResponse: string;
  /** Parse error if any */
  parseError?: string;
}

/**
 * Attempt to parse a response as structured JSON.
 * Falls back to treating it as plain text if parsing fails.
 */
export function parseStructuredResponse(rawResponse: string): ParsedStructuredResponse {
  const trimmed = rawResponse.trim();
  
  // Quick check - does it look like JSON?
  if (!trimmed.startsWith('{')) {
    return {
      isStructured: false,
      speechText: trimmed,
      actions: [],
      data: null,
      rawResponse: rawResponse,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as StructuredResponse;
    
    // Validate minimum structure
    if (typeof parsed.response !== 'string') {
      return {
        isStructured: false,
        speechText: trimmed,
        actions: [],
        data: null,
        rawResponse: rawResponse,
        parseError: 'Missing "response" field in JSON',
      };
    }

    return {
      isStructured: true,
      speechText: parsed.response,
      actions: parsed.actions || [],
      data: parsed.data || null,
      rawResponse: rawResponse,
    };
  } catch (error) {
    // Not valid JSON - treat as plain text
    return {
      isStructured: false,
      speechText: trimmed,
      actions: [],
      data: null,
      rawResponse: rawResponse,
      parseError: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

/**
 * Try to extract JSON from a partial/streaming response.
 * This handles cases where JSON is being streamed and we want to parse
 * as soon as we have complete sentences.
 */
export function extractJsonFromStream(buffer: string): {
  json: StructuredResponse | null;
  remainder: string;
} {
  const trimmed = buffer.trim();
  
  if (!trimmed.startsWith('{')) {
    return { json: null, remainder: buffer };
  }

  // Try to find a complete JSON object
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) {
    return { json: null, remainder: buffer };
  }

  try {
    const jsonStr = trimmed.substring(0, endIndex + 1);
    const json = JSON.parse(jsonStr) as StructuredResponse;
    const remainder = trimmed.substring(endIndex + 1).trim();
    return { json, remainder };
  } catch {
    return { json: null, remainder: buffer };
  }
}

/**
 * Check if a response looks like it might be structured JSON.
 */
export function looksLikeJson(response: string): boolean {
  const trimmed = response.trim();
  return trimmed.startsWith('{') && trimmed.includes('"response"');
}
