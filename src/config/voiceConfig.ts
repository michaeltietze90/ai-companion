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
    
    /** RMS threshold below which audio is considered silence (0-1 range) 
     *  Higher values require louder audio to count as "speech"
     *  0.015 helps filter out ambient noise that might false-trigger hasSpoken */
    rmsThreshold: 0.015,
  },

  /**
   * Recording Limits
   */
  recording: {
    /** Maximum recording duration in normal mode (milliseconds) */
    maxNormalMs: 30_000,
    
    /** Maximum recording duration in countdown/pitch mode (milliseconds) */
    maxCountdownMs: 60_000,
    
    /** Minimum blob size to process (bytes) - smaller recordings are ignored
     *  ~2KB is roughly 0.1s of audio, so this filters out near-empty recordings */
    minBlobSize: 2048,
    
    /** Minimum recording duration before silence detection can stop (milliseconds)
     *  This is the "listening window" - how long we wait for speech before silence can trigger
     *  1.5s gives user time to start speaking after avatar finishes */
    minDurationBeforeSilenceStop: 1500,
    
    /** Minimum duration (ms) for a recording to be considered valid speech
     *  Recordings shorter than this are discarded (likely just noise trigger) */
    minValidDurationMs: 800,
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
