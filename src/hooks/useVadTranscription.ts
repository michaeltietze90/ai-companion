/**
 * VAD-based Voice Transcription Hook
 * 
 * Uses Silero VAD model for accurate speech detection:
 * 1. Continuously monitors microphone for speech
 * 2. Only records when speech is detected
 * 3. Stops recording when speech ends
 * 4. Sends audio to Deepgram for transcription
 * 
 * This is much more efficient than RMS-based detection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { toast } from "sonner";

type UseVadTranscriptionOptions = {
  /**
   * When true, pause VAD monitoring (e.g., while avatar is speaking)
   */
  disabled?: boolean;

  /**
   * Callback for barge-in support. Called when speech is detected while disabled.
   */
  onBargeIn?: () => void;

  /**
   * Minimum speech duration (ms) before we consider it valid. Default: 500ms
   */
  minSpeechDurationMs?: number;
};

async function transcribe(audioBlob: Blob): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  const response = await fetch("/api/deepgram-transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: audioBlob.type,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Transcription failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
}

export function useVadTranscription(
  onTranscript: (text: string) => void,
  options: UseVadTranscriptionOptions = {}
) {
  const { disabled = false, onBargeIn, minSpeechDurationMs = 500 } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);

  const onTranscriptRef = useRef(onTranscript);
  const onBargeInRef = useRef(onBargeIn);
  const disabledRef = useRef(disabled);
  const bargeInTriggeredRef = useRef(false);
  const speechStartTimeRef = useRef<number | null>(null);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  useEffect(() => {
    disabledRef.current = disabled;
    // Reset barge-in flag when disabled changes
    if (!disabled) {
      bargeInTriggeredRef.current = false;
    }
  }, [disabled]);

  const vad = useMicVAD({
    startOnLoad: false,
    positiveSpeechThreshold: 0.8, // High confidence required
    negativeSpeechThreshold: 0.3,
    redemptionFrames: 8, // ~240ms of silence before stopping
    preSpeechPadFrames: 10, // Include ~300ms before speech
    minSpeechFrames: 5, // Minimum ~150ms of speech
    
    onSpeechStart: () => {
      console.log("[VAD] Speech started");
      speechStartTimeRef.current = Date.now();
      setIsSpeechActive(true);

      // If disabled (avatar speaking), trigger barge-in
      if (disabledRef.current && onBargeInRef.current && !bargeInTriggeredRef.current) {
        console.log("[VAD] Barge-in detected while avatar speaking");
        bargeInTriggeredRef.current = true;
        onBargeInRef.current();
      }
    },

    onSpeechEnd: async (audio: Float32Array) => {
      console.log("[VAD] Speech ended");
      setIsSpeechActive(false);

      // Don't process if disabled
      if (disabledRef.current) {
        console.log("[VAD] Ignoring speech - disabled (avatar speaking)");
        return;
      }

      // Check minimum speech duration
      const speechDuration = speechStartTimeRef.current
        ? Date.now() - speechStartTimeRef.current
        : 0;
      
      if (speechDuration < minSpeechDurationMs) {
        console.log(`[VAD] Ignoring short speech: ${speechDuration}ms < ${minSpeechDurationMs}ms`);
        return;
      }

      // Convert Float32Array to WAV blob
      const wavBlob = utils.encodeWAV(audio);
      const audioSizeKB = (wavBlob.size / 1024).toFixed(1);
      console.log(`[VAD] Processing ${audioSizeKB}KB audio (${(speechDuration / 1000).toFixed(1)}s speech)`);

      setIsProcessing(true);
      try {
        const text = await transcribe(wavBlob);
        
        if (!text || text.trim().length === 0) {
          console.warn("[VAD] Deepgram returned empty transcription");
          // Don't show toast - VAD already validated it was speech
          return;
        }

        console.log(`[VAD] ✓ Transcribed: "${text}"`);
        onTranscriptRef.current(text);
      } catch (error) {
        console.error("[VAD] Transcription error:", error);
        toast.error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
      }
    },

    onVADMisfire: () => {
      console.log("[VAD] Misfire (too short)");
      setIsSpeechActive(false);
    },
  });

  // Sync listening state
  useEffect(() => {
    setIsListening(vad.listening);
  }, [vad.listening]);

  const startListening = useCallback(() => {
    if (!vad.listening && !vad.loading) {
      console.log("[VAD] Starting");
      vad.start();
    }
  }, [vad]);

  const stopListening = useCallback(() => {
    if (vad.listening) {
      console.log("[VAD] Stopping");
      vad.pause();
    }
  }, [vad]);

  return {
    isListening,
    isProcessing,
    isSpeechActive,
    isLoading: vad.loading,
    startListening,
    stopListening,
    // For compatibility with existing code
    forceCommit: stopListening,
  };
}
