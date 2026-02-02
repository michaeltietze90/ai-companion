/**
 * Rich Response Parser
 * 
 * Parses Agentforce responses containing visual commands and basic SSML.
 * Extracts clean speech text and visual overlay instructions.
 * 
 * Supported Tags:
 * 
 * VISUAL TAGS (removed from speech, trigger overlays):
 * - <visual type="image|gif|video" src="URL" duration="5000" position="center|top|bottom|left|right|topleft|topright|bottomleft|bottomright" />
 * - <overlay> ... </overlay> - Wraps content to show as overlay (not spoken)
 * 
 * SSML TAGS (affect speech timing):
 * - <break time="500ms"/> or <break time="1s"/> - Pause in speech (converted to "...")
 * 
 * Example Input:
 * "Hi there, I was talking about customer X <visual type="image" src="https://example.com/logo.png" duration="5000" position="right"/> they bought it all!"
 * 
 * Output:
 * - speechText: "Hi there, I was talking about customer X they bought it all!"
 * - visuals: [{ type: 'image', src: 'https://...', duration: 5000, position: 'right', startOffset: 0 }]
 */

export type VisualType = 'image' | 'gif' | 'video';

export type VisualPosition = 
  | 'center' 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'topleft' 
  | 'topright' 
  | 'bottomleft' 
  | 'bottomright'
  | 'avatar'; // Special: seamlessly overlays on the avatar

export interface VisualCommand {
  id: string;
  type: VisualType;
  src: string;
  duration: number; // in milliseconds
  position: VisualPosition;
  startOffset: number; // milliseconds from speech start (0 = immediate)
  alt?: string; // accessibility description
}

export interface ParsedResponse {
  /** Clean text for TTS (no visual tags, SSML converted to pauses) */
  speechText: string;
  /** Original text with all tags for display */
  displayText: string;
  /** Visual overlay commands to execute */
  visuals: VisualCommand[];
  /** Whether response contains any rich elements */
  hasRichContent: boolean;
}

// Regex patterns for tag extraction
const VISUAL_TAG_REGEX = /<visual\s+([^>]+)\s*\/?>/gi;
const OVERLAY_TAG_REGEX = /<overlay[^>]*>([\s\S]*?)<\/overlay>/gi;
const BREAK_TAG_REGEX = /<break\s+time=["']([^"']+)["']\s*\/?>/gi;

// Helper to parse duration strings like "5000", "5s", "500ms"
function parseDuration(value: string | undefined): number {
  if (!value) return 5000; // default 5 seconds
  
  const str = value.trim().toLowerCase();
  
  if (str.endsWith('ms')) {
    return parseInt(str.replace('ms', ''), 10) || 5000;
  }
  if (str.endsWith('s')) {
    return (parseFloat(str.replace('s', '')) || 5) * 1000;
  }
  // Assume milliseconds if just a number
  return parseInt(str, 10) || 5000;
}

// Helper to parse attributes from a tag string
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)=["']([^"']+)["']/g;
  let match;
  
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  
  return attrs;
}

// Generate unique ID for visual commands
function generateId(): string {
  return `visual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse an Agentforce response into speech text and visual commands.
 */
export function parseRichResponse(rawResponse: string): ParsedResponse {
  if (!rawResponse) {
    return {
      speechText: '',
      displayText: '',
      visuals: [],
      hasRichContent: false,
    };
  }

  let speechText = rawResponse;
  const visuals: VisualCommand[] = [];
  let visualIndex = 0;

  // 1. Extract and process <visual> tags
  speechText = speechText.replace(VISUAL_TAG_REGEX, (match, attrString) => {
    const attrs = parseAttributes(attrString);
    
    const visual: VisualCommand = {
      id: generateId(),
      type: (attrs.type as VisualType) || 'image',
      src: attrs.src || '',
      duration: parseDuration(attrs.duration),
      position: (attrs.position as VisualPosition) || 'center',
      startOffset: parseDuration(attrs.startoffset || attrs.offset || '0'),
      alt: attrs.alt,
    };
    
    // Only add if we have a valid source
    if (visual.src) {
      visuals.push(visual);
      visualIndex++;
    }
    
    return ''; // Remove from speech text
  });

  // 2. Remove <overlay> content entirely from speech (it's visual-only content)
  speechText = speechText.replace(OVERLAY_TAG_REGEX, '');

  // 3. Convert <break> tags to ellipsis for natural pauses in TTS
  speechText = speechText.replace(BREAK_TAG_REGEX, (_, time) => {
    const ms = parseDuration(time);
    // For short breaks, use ellipsis. For longer, add more.
    if (ms < 500) return '... ';
    if (ms < 1500) return '... ... ';
    return '... ... ... ';
  });

  // 4. Clean up any remaining HTML-like tags (safety)
  speechText = speechText
    .replace(/<[^>]+>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Create display text (clean but might show visual indicators later)
  const displayText = rawResponse
    .replace(VISUAL_TAG_REGEX, '')
    .replace(OVERLAY_TAG_REGEX, '')
    .replace(BREAK_TAG_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    speechText,
    displayText,
    visuals,
    hasRichContent: visuals.length > 0,
  };
}

/**
 * Quick check if response contains visual tags
 */
export function hasVisualContent(response: string): boolean {
  return VISUAL_TAG_REGEX.test(response) || OVERLAY_TAG_REGEX.test(response);
}

/**
 * Strip all rich content tags for plain display
 */
export function stripRichTags(response: string): string {
  return response
    .replace(VISUAL_TAG_REGEX, '')
    .replace(OVERLAY_TAG_REGEX, '')
    .replace(BREAK_TAG_REGEX, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
