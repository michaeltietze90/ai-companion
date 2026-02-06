import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

// Silence threshold in countdown mode (3 seconds)
const COUNTDOWN_SILENCE_MS = 3000;
// Normal silence threshold
const NORMAL_SILENCE_MS = 500;

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
  const [partialTranscript, setPartialTranscript] = useState(""); // kept for compatibility (no live STT)

  const stateRef = useRef<RecorderState | null>(null);
  const disabledRef = useRef(Boolean(options?.disabled));
  const countdownActiveRef = useRef(Boolean(options?.countdownActive));

  // Use 3s silence in countdown mode, otherwise normal threshold
  const getEffectiveSilenceMs = () => 
    countdownActiveRef.current ? COUNTDOWN_SILENCE_MS : (options?.silenceMs ?? NORMAL_SILENCE_MS);

  const silenceMsRef = useRef(getEffectiveSilenceMs());
  const silenceRmsThresholdRef = useRef(options?.silenceRmsThreshold ?? 0.004);
  const maxRecordMsRef = useRef(options?.maxRecordMs ?? 10_000); // Reduced to 10 seconds max

  useEffect(() => {
    disabledRef.current = Boolean(options?.disabled);
    countdownActiveRef.current = Boolean(options?.countdownActive);
    silenceMsRef.current = getEffectiveSilenceMs();
    silenceRmsThresholdRef.current = options?.silenceRmsThreshold ?? 0.004;
    maxRecordMsRef.current = options?.maxRecordMs ?? 20_000;

    // If disabled while recording, stop immediately and discard.
    if (disabledRef.current && stateRef.current) {
      void stopListening(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.disabled, options?.silenceMs, options?.silenceRmsThreshold, options?.maxRecordMs]);

  const cleanup = useCallback(async (discard: boolean) => {
    const s = stateRef.current;
    stateRef.current = null;
    setIsListening(false);
    setPartialTranscript("");

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
      let hasSpoken = false;
      let silenceStartedAt: number | null = null;

      const timeDomain = new Float32Array(analyser.fftSize);
      const tick = () => {
        const s = stateRef.current;
        if (!s) return;
        if (disabledRef.current) {
          s.stopRequested = true;
          try {
            s.recorder.stop();
          } catch {
            // ignore
          }
          return;
        }

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

        analyser.getFloatTimeDomainData(timeDomain);
        let sum = 0;
        for (let i = 0; i < timeDomain.length; i++) sum += timeDomain[i] * timeDomain[i];
        const rms = Math.sqrt(sum / timeDomain.length);

        if (rms > silenceRmsThresholdRef.current) {
          hasSpoken = true;
          silenceStartedAt = null;
        } else if (hasSpoken) {
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
      };

      recorder.onstop = async () => {
        const s = stateRef.current;
        // We set stateRef.current=null in cleanup, so snapshot chunks now.
        const recordedChunks = chunks.slice();
        const recordingStartedAt = s?.startedAt ?? Date.now();
        const discard = disabledRef.current;

        await cleanup(discard);
        if (discard) return;

        const blob = new Blob(recordedChunks, { type: chosenMime?.split(";")[0] || "audio/webm" });
        if (blob.size < 1024) {
          console.log(`[STT] Ignoring tiny recording: ${blob.size} bytes`);
          return; // ignore tiny recordings
        }

        // Calculate actual recording duration from when recording started
        const actualDuration = (Date.now() - recordingStartedAt) / 1000;
        console.log(`[STT] Sending ${blob.size} bytes (recorded for ${actualDuration.toFixed(1)}s) to Deepgram`);

        try {
          const text = await transcribe(blob);
          if (!text || text.trim().length === 0) {
            console.warn(`[STT] Deepgram returned empty transcription for ${blob.size} byte audio (${estimatedDuration.toFixed(1)}s)`);
            // Don't show error toast for empty results - might just be silence
            return;
          }
          console.log(`[STT] ✓ Successfully transcribed: "${text}"`);
          onTranscript(text);
        } catch (e) {
          console.error("[STT] Transcription failed:", e);
          toast.error(`Transcription failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    partialTranscript,
    startListening,
    stopListening,
    toggleListening,
    forceCommit,
  };
}
