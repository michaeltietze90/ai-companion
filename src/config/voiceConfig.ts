/**
 * Voice Recording Configuration
 * Centralizes all configurable thresholds and timings for voice recording/STT.
 */

export const VOICE_CONFIG = {
  /**
   * Silence Detection
   */
  silence: {
    /** Normal silence threshold in milliseconds - commits recording after this much silence */
    normalMs: 500,
    
    /** Countdown mode silence threshold - longer to allow for thinking during pitch */
    countdownMs: 3000,
    
    /** RMS threshold below which audio is considered silence (0-1 range) */
    rmsThreshold: 0.004,
  },

  /**
   * Recording Limits
   */
  recording: {
    /** Maximum recording duration in normal mode (milliseconds) */
    maxNormalMs: 30_000,
    
    /** Maximum recording duration in countdown/pitch mode (milliseconds) */
    maxCountdownMs: 60_000,
    
    /** Minimum blob size to process (bytes) - smaller recordings are ignored */
    minBlobSize: 1024,
  },

  /**
   * Barge-In Configuration
   */
  bargeIn: {
    /** 
     * Multiplier applied to rmsThreshold for barge-in detection.
     * Higher values require louder speech to trigger interrupt.
     * This helps avoid false triggers from avatar audio bleed.
     */
    thresholdMultiplier: 3,
  },

  /**
   * Audio Level Display
   */
  audioLevel: {
    /** 
     * Maximum RMS value for normalization (0-1 scale).
     * 0.1 is approximately loud speech level.
     */
    maxRms: 0.1,
  },
} as const;

// Type for the config
export type VoiceConfig = typeof VOICE_CONFIG;
