import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { VOICE_CONFIG } from "@/config/voiceConfig";

const getTranscribeUrl = () => "/api/deepgram-transcribe";

const getBackendHeaders = () => ({
  "Content-Type": "application/json",
} as const);

type UseSilenceTranscriptionOptions = {
  /**
   * When true, stop recording (and discard any buffered audio).
   * Use this while the avatar is speaking to prevent echo loops.
   */
  disabled?: boolean;

  /** Commit once we detect at least this much silence (ms). Default: 500 */
  silenceMs?: number;

  /**
   * RMS threshold below which we consider it silence.
   * Default tuned for typical echo-cancelled mic input.
   */
  silenceRmsThreshold?: number;

  /** Max recording length (ms). Default: 20s */
  maxRecordMs?: number;

  /**
   * When true (countdown mode), use longer silence threshold (3s).
   * Also enables force commit on countdown expiry.
   */
  countdownActive?: boolean;

  /**
   * Callback for barge-in support. When user speaks while disabled=true (avatar speaking),
   * this callback is called to allow interrupting the avatar.
   * If provided, enables barge-in mode instead of discarding audio.
   */
  onBargeIn?: () => void;
};

type RecorderState = {
  stream: MediaStream;
  recorder: MediaRecorder;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  chunks: Blob[];
  rafId: number | null;
  stopRequested: boolean;
  startedAt: number;
  hasSpoken: boolean; // Track if any speech was detected during this recording
};

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

// Use centralized voice config for all thresholds
const { silence, recording, bargeIn, audioLevel: audioLevelConfig } = VOICE_CONFIG;

/**
 * Simple voice input:
 * 1) record microphone
 * 2) detect silence (500ms normally, 3s in countdown mode)
 * 3) send audio to backend for transcription
 */
export function useSilenceTranscription(
  onTranscript: (text: string) => void,
  options?: UseSilenceTranscriptionOptions
) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // true while sending to Deepgram
  const [partialTranscript, setPartialTranscript] = useState(""); // kept for compatibility (no live STT)
  const [audioLevel, setAudioLevel] = useState(0); // 0-1 normalized RMS level
  const [hasSpokenState, setHasSpokenState] = useState(false); // true once speech detected

  const stateRef = useRef<RecorderState | null>(null);
  const disabledRef = useRef(Boolean(options?.disabled));
  const countdownActiveRef = useRef(Boolean(options?.countdownActive));
  const onBargeInRef = useRef(options?.onBargeIn);
  const bargeInTriggeredRef = useRef(false); // Prevent multiple barge-in calls per disabled cycle

  // Use countdown silence threshold in countdown mode, otherwise normal threshold
  const getEffectiveSilenceMs = () => 
    countdownActiveRef.current ? silence.countdownMs : (options?.silenceMs ?? silence.normalMs);

  const silenceMsRef = useRef(getEffectiveSilenceMs());
  const silenceRmsThresholdRef = useRef(options?.silenceRmsThreshold ?? silence.rmsThreshold);
  // Use countdown max recording time in countdown mode, otherwise normal max
  const getDefaultMaxRecordMs = () => 
    countdownActiveRef.current ? recording.maxCountdownMs : recording.maxNormalMs;
  const maxRecordMsRef = useRef(options?.maxRecordMs ?? getDefaultMaxRecordMs());

  useEffect(() => {
    disabledRef.current = Boolean(options?.disabled);
    countdownActiveRef.current = Boolean(options?.countdownActive);
    silenceMsRef.current = getEffectiveSilenceMs();
    silenceRmsThresholdRef.current = options?.silenceRmsThreshold ?? silence.rmsThreshold;
    onBargeInRef.current = options?.onBargeIn;
    // Update max recording time based on mode
    maxRecordMsRef.current = options?.maxRecordMs ?? getDefaultMaxRecordMs();

    // Reset barge-in flag when disabled changes to false (avatar stopped speaking)
    if (!options?.disabled) {
      bargeInTriggeredRef.current = false;
    }

    // If disabled while recording, stop immediately and discard.
    // (Barge-in logic is handled in the tick function when user speaks while disabled)
    if (disabledRef.current && stateRef.current) {
      void stopListening(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.disabled, options?.silenceMs, options?.silenceRmsThreshold, options?.maxRecordMs, options?.onBargeIn]);

  const cleanup = useCallback(async (discard: boolean) => {
    const s = stateRef.current;
    stateRef.current = null;
    setIsListening(false);
    setPartialTranscript("");
    setAudioLevel(0);
    setHasSpokenState(false);

    if (!s) return;

    try {
      if (s.rafId) cancelAnimationFrame(s.rafId);
    } catch {
      // ignore
    }

    try {
      s.source.disconnect();
      s.analyser.disconnect();
    } catch {
      // ignore
    }

    try {
      await s.audioContext.close();
    } catch {
      // ignore
    }

    try {
      s.stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }

    if (discard) {
      s.chunks.length = 0;
    }
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch(getTranscribeUrl(), {
        method: "POST",
        headers: getBackendHeaders(),
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || "audio/webm",
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Transcription failed (${res.status})`);
      }
      const data = await res.json();
      const text = String(data?.text ?? "").trim();
      return text;
    },
    [
      // no deps
    ]
  );

  const startListening = useCallback(async () => {
    if (disabledRef.current) return;
    if (stateRef.current || isConnecting) return;

    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];
      const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const startedAt = Date.now();
      let silenceStartedAt: number | null = null;
      
      // Track hasSpoken in a mutable object we can reference in onstop
      const speechState = { hasSpoken: false };

      const timeDomain = new Float32Array(analyser.fftSize);
      const tick = () => {
        const s = stateRef.current;
        if (!s) return;
        
        // Get current audio level first (for barge-in detection)
        analyser.getFloatTimeDomainData(timeDomain);
        let sum = 0;
        for (let i = 0; i < timeDomain.length; i++) sum += timeDomain[i] * timeDomain[i];
        const rms = Math.sqrt(sum / timeDomain.length);
        
        // If disabled (avatar speaking), check for barge-in
        if (disabledRef.current) {
          // Check if user is speaking loudly enough to trigger barge-in
          // Use a higher threshold (configurable multiplier) to avoid false triggers from avatar audio bleed
          const bargeInThreshold = silenceRmsThresholdRef.current * bargeIn.thresholdMultiplier;
          
          if (rms > bargeInThreshold && onBargeInRef.current && !bargeInTriggeredRef.current) {
            console.log(`[STT] Barge-in detected! RMS: ${rms.toFixed(4)} > ${bargeInThreshold.toFixed(4)}`);
            bargeInTriggeredRef.current = true;
            onBargeInRef.current();
            // Don't stop - let the disabled state change naturally after barge-in
          }
          
          // Continue monitoring but don't stop yet (let useEffect handle stop)
          s.rafId = requestAnimationFrame(tick);
          return;
        }

        // Normalize RMS to 0-1 range and expose to UI for visual feedback
        const normalizedLevel = Math.min(1, rms / audioLevelConfig.maxRms);
        setAudioLevel(normalizedLevel);

        const elapsed = Date.now() - startedAt;
        
        // Enforce maximum recording time
        if (elapsed >= maxRecordMsRef.current) {
          console.log(`[STT] Max recording time reached (${maxRecordMsRef.current}ms), stopping`);
          s.stopRequested = true;
          try {
            s.recorder.stop();
          } catch {
            // ignore
          }
          return;
        }

        if (rms > silenceRmsThresholdRef.current) {
          speechState.hasSpoken = true;
          setHasSpokenState(true);
          silenceStartedAt = null;
        } else if (speechState.hasSpoken) {
          // Only allow silence detection to stop recording after minimum duration
          // This prevents false stops from brief ambient noise triggering hasSpoken
          if (elapsed < recording.minDurationBeforeSilenceStop) {
            s.rafId = requestAnimationFrame(tick);
            return;
          }
          
          silenceStartedAt ??= Date.now();
          const silenceFor = Date.now() - silenceStartedAt;
          if (silenceFor >= silenceMsRef.current) {
            console.log(`[STT] Silence detected (${silenceFor}ms >= ${silenceMsRef.current}ms), stopping after ${(elapsed / 1000).toFixed(1)}s`);
            s.stopRequested = true;
            try {
              s.recorder.stop();
            } catch {
              // ignore
            }
            return;
          }
        }

        s.rafId = requestAnimationFrame(tick);
      };

      stateRef.current = {
        stream,
        recorder,
        audioContext,
        analyser,
        source,
        chunks,
        rafId: null,
        stopRequested: false,
        startedAt,
        hasSpoken: false, // Will be updated via speechState reference
      };
      
      // Link speechState to stateRef so onstop can access it
      // We use a getter pattern since speechState is updated during tick()
      Object.defineProperty(stateRef.current, 'hasSpoken', {
        get: () => speechState.hasSpoken,
        set: (v) => { speechState.hasSpoken = v; },
      });

      recorder.onstop = async () => {
        const s = stateRef.current;
        // We set stateRef.current=null in cleanup, so snapshot chunks now.
        const recordedChunks = chunks.slice();
        const recordingStartedAt = s?.startedAt ?? Date.now();
        const speechDetected = s?.hasSpoken ?? false;
        const discard = disabledRef.current;

        await cleanup(discard);
        if (discard) return;

        const blob = new Blob(recordedChunks, { type: chosenMime?.split(";")[0] || "audio/webm" });
        
        // Calculate actual recording duration from when recording started
        const actualDurationMs = Date.now() - recordingStartedAt;
        const actualDurationSec = actualDurationMs / 1000;
        
        // If no speech was ever detected, skip transcription entirely
        // This prevents sending pure silence recordings to Deepgram (e.g., during breaks)
        if (!speechDetected) {
          console.log(`[STT] No speech detected during ${actualDurationSec.toFixed(1)}s recording, skipping transcription`);
          return;
        }
        
        // Filter out recordings that are too small or too short
        if (blob.size < recording.minBlobSize) {
          console.log(`[STT] Ignoring tiny recording: ${blob.size} bytes (min: ${recording.minBlobSize})`);
          return;
        }
        
        if (actualDurationMs < recording.minValidDurationMs) {
          console.log(`[STT] Ignoring short recording: ${actualDurationMs}ms (min: ${recording.minValidDurationMs}ms)`);
          return;
        }

        console.log(`[STT] Sending ${blob.size} bytes (recorded for ${actualDurationSec.toFixed(1)}s) to Deepgram`);

        setIsProcessing(true);
        try {
          const text = await transcribe(blob);
          if (!text || text.trim().length === 0) {
            console.warn(`[STT] Deepgram returned empty transcription for ${blob.size} byte audio (${actualDurationSec.toFixed(1)}s)`);
            // Show subtle feedback so user knows to try again
            toast.info("Couldn't understand. Please try again.");
            // Don't return early - let finally block run to reset isProcessing
          } else {
            console.log(`[STT] ✓ Successfully transcribed: "${text}"`);
            onTranscript(text);
          }
        } catch (e) {
          console.error("[STT] Transcription failed:", e);
          toast.error(`Transcription failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start(250);
      setIsListening(true);
      setIsConnecting(false);
      tick();
    } catch (e) {
      console.error("Failed to start recording:", e);
      toast.error("Failed to access microphone");
      setIsConnecting(false);
      await cleanup(true);
    }
  }, [cleanup, isConnecting, onTranscript, transcribe]);

  const stopListening = useCallback(
    async (discard = false) => {
      const s = stateRef.current;
      if (!s) {
        setIsListening(false);
        return;
      }

      try {
        s.stopRequested = true;
        s.recorder.stop();
      } catch {
        await cleanup(discard);
      }
    },
    [cleanup]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      void stopListening(false);
    } else {
      void startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Force commit - used when countdown expires.
   * Immediately stops recording and sends whatever was captured.
   */
  const forceCommit = useCallback(() => {
    console.log('[STT] Force commit triggered (countdown expired)');
    if (stateRef.current) {
      // Stop recording - this will trigger onstop which transcribes
      void stopListening(false);
    }
  }, [stopListening]);

  useEffect(() => {
    return () => {
      void stopListening(true);
    };
  }, [stopListening]);

  return {
    isListening,
    isConnecting,
    isProcessing,
    partialTranscript,
    audioLevel,
    hasSpoken: hasSpokenState,
    startListening,
    stopListening,
    toggleListening,
    forceCommit,
  };
}
