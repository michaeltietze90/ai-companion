/**
 * Hardcoded Triggers
 * 
 * Intercepts specific keywords/phrases and returns preset responses
 * without sending to Agentforce. Used for easter eggs and demos.
 */

import backflipVideo from '@/assets/backflip.mp4';

export type TriggerPosition = 
  | 'center' | 'top' | 'bottom' | 'left' | 'right' 
  | 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
  | 'avatar'; // Special: overlays seamlessly on the avatar

export interface HardcodedTrigger {
  /** Keywords that trigger this response (case-insensitive, partial match) */
  keywords: string[];
  /** What the avatar should say */
  speech: string;
  /** Optional video to display */
  video?: {
    src: string;
    duration: number; // ms
    position: TriggerPosition;
  };
  /** Optional image to display */
  image?: {
    src: string;
    duration: number;
    position: TriggerPosition;
  };
}

/**
 * List of hardcoded triggers.
 * Add new easter eggs here!
 */
export const HARDCODED_TRIGGERS: HardcodedTrigger[] = [
  {
    keywords: ['backflip', 'back flip', 'rückwärtssalto', 'salto'],
    speech: '', // Silent - just play the video
    video: {
      src: backflipVideo,
      duration: 5000,
      position: 'avatar', // Seamless overlay on avatar
    },
  },
  // Add more triggers here as needed...
];

/**
 * Check if user input matches any hardcoded trigger.
 * Returns the matching trigger or null.
 */
export function findHardcodedTrigger(userInput: string): HardcodedTrigger | null {
  const normalized = userInput.toLowerCase().trim();
  
  for (const trigger of HARDCODED_TRIGGERS) {
    for (const keyword of trigger.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return trigger;
      }
    }
  }
  
  return null;
}
