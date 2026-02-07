/**
 * Deepgram Streaming Transcription Hook
 * 
 * Uses Deepgram's real-time WebSocket API with built-in VAD:
 * - Streams audio continuously to Deepgram
 * - Deepgram's endpointing detects when speech ends
 * - UtteranceEnd message signals when to process transcript
 * 
 * Much simpler than client-side VAD - Deepgram handles everything.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UseDeepgramStreamingOptions = {
  /**
   * When true, pause streaming (e.g., while avatar is speaking)
   */
  disabled?: boolean;

  /**
   * Callback for barge-in support. Called when speech detected while disabled.
   */
  onBargeIn?: () => void;

  /**
   * Milliseconds of silence before utterance ends. Default: 1000ms
   */
  utteranceEndMs?: number;
};

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export function useDeepgramStreaming(
  onTranscript: (text: string) => void,
  options: UseDeepgramStreamingOptions = {}
) {
  const { disabled = false, onBargeIn, utteranceEndMs = 1000 } = options;

  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const apiKeyRef = useRef<string | null>(null);
  
  const onTranscriptRef = useRef(onTranscript);
  const onBargeInRef = useRef(onBargeIn);
  const disabledRef = useRef(disabled);
  const bargeInTriggeredRef = useRef(false);
  
  // Accumulate transcript parts until utterance ends
  const transcriptBufferRef = useRef<string>("");
  const lastSpeechTimeRef = useRef<number>(0);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  useEffect(() => {
    disabledRef.current = disabled;
    if (!disabled) {
      bargeInTriggeredRef.current = false;
    }
  }, [disabled]);

  // Fetch Deepgram API key from backend
  const getApiKey = useCallback(async (): Promise<string> => {
    if (apiKeyRef.current) return apiKeyRef.current;
    
    const response = await fetch("/api/deepgram-key");
    if (!response.ok) {
      throw new Error("Failed to get Deepgram API key");
    }
    const data = await response.json();
    apiKeyRef.current = data.key;
    return data.key;
  }, []);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    
    transcriptBufferRef.current = "";
    setIsListening(false);
    setIsConnecting(false);
    setIsProcessing(false);
  }, []);

  const startListening = useCallback(async () => {
    if (isListening || isConnecting) return;
    
    setIsConnecting(true);
    console.log("[Deepgram] Starting streaming connection...");

    try {
      // Get API key
      const apiKey = await getApiKey();
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Build WebSocket URL with parameters
      const params = new URLSearchParams({
        model: "nova-2",
        language: "en",
        smart_format: "true",
        punctuate: "true",
        interim_results: "true",
        utterance_end_ms: utteranceEndMs.toString(),
        endpointing: "500", // 500ms silence triggers speech_final
        vad_events: "true", // Get VAD events for barge-in
        encoding: "linear16",
        sample_rate: "16000",
        channels: "1",
      });
      
      // Add keyword boosting
      ["Agentforce", "Data360", "Salesforce", "Agentic Enterprise"].forEach(kw => {
        params.append("keywords", `${kw}:2`);
      });

      const wsUrl = `${DEEPGRAM_WS_URL}?${params.toString()}`;
      const ws = new WebSocket(wsUrl, ["token", apiKey]);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Deepgram] WebSocket connected");
        setIsConnecting(false);
        setIsListening(true);
        
        // Start sending audio
        startAudioCapture(stream);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle VAD events for barge-in
        if (data.type === "SpeechStarted") {
          console.log("[Deepgram] Speech started");
          lastSpeechTimeRef.current = Date.now();
          
          // Barge-in: if disabled (avatar speaking) and user speaks
          if (disabledRef.current && onBargeInRef.current && !bargeInTriggeredRef.current) {
            console.log("[Deepgram] Barge-in detected");
            bargeInTriggeredRef.current = true;
            onBargeInRef.current();
          }
        }
        
        // Handle transcription results
        if (data.type === "Results" && data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const transcript = alt.transcript || "";
          const isFinal = data.is_final;
          const speechFinal = data.speech_final;
          
          if (transcript) {
            console.log(`[Deepgram] ${isFinal ? 'Final' : 'Interim'}: "${transcript}" (speech_final: ${speechFinal})`);
            
            if (isFinal) {
              // Accumulate final transcripts
              if (transcriptBufferRef.current) {
                transcriptBufferRef.current += " " + transcript;
              } else {
                transcriptBufferRef.current = transcript;
              }
            }
            
            // If speech_final, send the accumulated transcript
            if (speechFinal && transcriptBufferRef.current.trim()) {
              const fullTranscript = transcriptBufferRef.current.trim();
              console.log(`[Deepgram] Speech final, sending: "${fullTranscript}"`);
              transcriptBufferRef.current = "";
              
              // Only send if not disabled
              if (!disabledRef.current) {
                setIsProcessing(true);
                onTranscriptRef.current(fullTranscript);
                // Small delay before resetting processing state
                setTimeout(() => setIsProcessing(false), 100);
              }
            }
          }
        }
        
        // Handle utterance end (backup for noisy environments)
        if (data.type === "UtteranceEnd") {
          console.log("[Deepgram] Utterance end");
          if (transcriptBufferRef.current.trim() && !disabledRef.current) {
            const fullTranscript = transcriptBufferRef.current.trim();
            console.log(`[Deepgram] Utterance end, sending: "${fullTranscript}"`);
            transcriptBufferRef.current = "";
            setIsProcessing(true);
            onTranscriptRef.current(fullTranscript);
            setTimeout(() => setIsProcessing(false), 100);
          }
        }
      };

      ws.onerror = (error) => {
        console.error("[Deepgram] WebSocket error:", error);
        toast.error("Voice connection error");
        cleanup();
      };

      ws.onclose = (event) => {
        console.log("[Deepgram] WebSocket closed:", event.code, event.reason);
        cleanup();
      };

    } catch (error) {
      console.error("[Deepgram] Failed to start:", error);
      toast.error("Failed to start voice input");
      cleanup();
    }
  }, [isListening, isConnecting, getApiKey, utteranceEndMs, cleanup]);

  const startAudioCapture = useCallback((stream: MediaStream) => {
    // Use AudioWorklet for better performance if available, fallback to ScriptProcessor
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create a ScriptProcessorNode to get raw audio data
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      
      // Get audio data and convert to 16-bit PCM
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Send to Deepgram
      ws.send(pcmData.buffer);
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    // Store for cleanup
    (streamRef.current as any)._audioContext = audioContext;
    (streamRef.current as any)._processor = processor;
  }, []);

  const stopListening = useCallback(() => {
    console.log("[Deepgram] Stopping...");
    
    // Send any remaining transcript before stopping
    if (transcriptBufferRef.current.trim() && !disabledRef.current) {
      const fullTranscript = transcriptBufferRef.current.trim();
      console.log(`[Deepgram] Sending remaining: "${fullTranscript}"`);
      transcriptBufferRef.current = "";
      onTranscriptRef.current(fullTranscript);
    }
    
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isConnecting,
    isProcessing,
    startListening,
    stopListening,
  };
}
