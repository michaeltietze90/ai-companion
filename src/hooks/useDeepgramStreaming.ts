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

  /**
   * Milliseconds of silence before speech_final is triggered. Default: 500ms
   * For longer recordings (like pitch mode), use higher values (e.g., 5000ms)
   */
  endpointingMs?: number;
};

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export function useDeepgramStreaming(
  onTranscript: (text: string) => void,
  options: UseDeepgramStreamingOptions = {}
) {
  const { disabled = false, onBargeIn, utteranceEndMs = 1000, endpointingMs = 500 } = options;

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
        endpointing: endpointingMs.toString(), // silence threshold for speech_final
        vad_events: "true", // Get VAD events for barge-in
        encoding: "linear16",
        sample_rate: "16000",
        channels: "1",
      });
      
      // Add keyword boosting for brand names, customer names, and industry terms
      // Format: "word:boost" where boost is 1-5 (higher = more likely to recognize)
      const keywords: { word: string; boost: number }[] = [
        // High priority - x3 boost
        { word: "Agentforce", boost: 3 },
        { word: "CKO", boost: 3 },
        { word: "Backflip", boost: 3 },
        { word: "Net New AOV", boost: 3 },
        
        // Standard priority - x2 boost
        { word: "Data Cloud", boost: 2 },
        { word: "Mulesoft", boost: 2 },
        { word: "Salesforce", boost: 2 },
        { word: "Agentic Enterprise", boost: 2 },
        { word: "Dreamforce", boost: 2 },
        
        // Customer names - x2 boost
        { word: "1-800Accountant", boost: 2 },
        { word: "Absa Group", boost: 2 },
        { word: "Adobe Population Health", boost: 2 },
        { word: "Advanced Turf Solutions", boost: 2 },
        { word: "AgencyQ", boost: 2 },
        { word: "Air India", boost: 2 },
        { word: "Alpine Intel", boost: 2 },
        { word: "America on Tech", boost: 2 },
        { word: "Andina ART", boost: 2 },
        { word: "Anthropic", boost: 2 },
        { word: "Asymbl", boost: 2 },
        { word: "Big Brothers Big Sisters", boost: 2 },
        { word: "Bionic", boost: 2 },
        { word: "CaixaBank", boost: 2 },
        { word: "Capita", boost: 2 },
        { word: "CentralSquare", boost: 2 },
        { word: "College Possible", boost: 2 },
        { word: "Dakota", boost: 2 },
        { word: "David Yurman", boost: 2 },
        { word: "DIRECTV", boost: 2 },
        { word: "DeVry University", boost: 2 },
        { word: "Elements.cloud", boost: 2 },
        { word: "Endress+Hauser", boost: 2 },
        { word: "Engie", boost: 2 },
        { word: "Engine", boost: 2 },
        { word: "Equinox", boost: 2 },
        { word: "Equipter", boost: 2 },
        { word: "Formula 1", boost: 2 },
        { word: "FedEx", boost: 2 },
        { word: "Finnair", boost: 2 },
        { word: "Fujitsu", boost: 2 },
        { word: "Fisher & Paykel", boost: 2 },
        { word: "Goodyear", boost: 2 },
        { word: "Globoplay", boost: 2 },
        { word: "Grupo Falabella", boost: 2 },
        { word: "Heathrow Airport", boost: 2 },
        { word: "Hero FinCorp", boost: 2 },
        { word: "HX Expeditions", boost: 2 },
        { word: "Indeed", boost: 2 },
        { word: "Kaseya", boost: 2 },
        { word: "Kyle, TX", boost: 2 },
        { word: "Lennar Homes", boost: 2 },
        { word: "McLaren F1 Team", boost: 2 },
        { word: "Miller Bros Solar", boost: 2 },
        { word: "MIMIT Health", boost: 2 },
        { word: "Montway", boost: 2 },
        { word: "Movistar Plus+", boost: 2 },
        { word: "National Ability Center", boost: 2 },
        { word: "Nexo", boost: 2 },
        { word: "Nexstar Media", boost: 2 },
        { word: "Northern Trains", boost: 2 },
        { word: "One NZ", boost: 2 },
        { word: "OpenTable", boost: 2 },
        { word: "ORRAA", boost: 2 },
        { word: "Pacers Sports & Entertainment", boost: 2 },
        { word: "Pacific Clinics", boost: 2 },
        { word: "Panasonic", boost: 2 },
        { word: "Pandora", boost: 2 },
        { word: "Pearson", boost: 2 },
        { word: "PenFed Credit Union", boost: 2 },
        { word: "PepsiCo", boost: 2 },
        { word: "Procure IT", boost: 2 },
        { word: "RBC Wealth Management", boost: 2 },
        { word: "The RealReal", boost: 2 },
        { word: "Reddit", boost: 2 },
        { word: "reMarkable", boost: 2 },
        { word: "Rush University Health", boost: 2 },
        { word: "SaaStr", boost: 2 },
        { word: "Safari365", boost: 2 },
        { word: "Salesforce Help", boost: 2 },
        { word: "Salesforce HR", boost: 2 },
        { word: "Salesforce Sales", boost: 2 },
        { word: "Salesforce.com", boost: 2 },
        { word: "Sammons Financial", boost: 2 },
        { word: "Scape", boost: 2 },
        { word: "Simplyhealth", boost: 2 },
        { word: "TASC Outsourcing", boost: 2 },
        { word: "Telepass", boost: 2 },
        { word: "UChicago Medicine", boost: 2 },
        { word: "United Football League", boost: 2 },
        { word: "Urban Rest", boost: 2 },
        { word: "Vev Romerike", boost: 2 },
        { word: "World Economic Forum", boost: 2 },
        { word: "Young Drivers of Canada", boost: 2 },
        { word: "Volkswagen Group", boost: 2 },
        { word: "YMCA of San Diego", boost: 2 },
        { word: "Zota Payment Services", boost: 2 },
      ];
      
      keywords.forEach(({ word, boost }) => {
        params.append("keywords", `${word}:${boost}`);
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

  // Force flush and send whatever is in the buffer (e.g., when countdown ends)
  const flushAndSend = useCallback(() => {
    if (transcriptBufferRef.current.trim()) {
      const fullTranscript = transcriptBufferRef.current.trim();
      console.log(`[Deepgram] Force flush, sending: "${fullTranscript}"`);
      transcriptBufferRef.current = "";
      setIsProcessing(true);
      onTranscriptRef.current(fullTranscript);
      setTimeout(() => setIsProcessing(false), 100);
      return true; // Indicates something was sent
    }
    return false; // Nothing to send
  }, []);

  const stopListening = useCallback(() => {
    console.log("[Deepgram] Stopping...");
    
    // Send any remaining transcript before stopping
    flushAndSend();
    
    cleanup();
  }, [cleanup, flushAndSend]);

  // Reconnect when VAD parameters change (e.g., countdown mode starts/stops)
  const prevEndpointingRef = useRef(endpointingMs);
  const prevUtteranceEndRef = useRef(utteranceEndMs);
  
  useEffect(() => {
    const paramsChanged = 
      prevEndpointingRef.current !== endpointingMs || 
      prevUtteranceEndRef.current !== utteranceEndMs;
    
    if (paramsChanged && isListening) {
      console.log(`[Deepgram] VAD params changed (endpointing: ${prevEndpointingRef.current}->${endpointingMs}, utteranceEnd: ${prevUtteranceEndRef.current}->${utteranceEndMs}), reconnecting...`);
      
      // Cleanup and restart with new parameters
      cleanup();
      
      // Small delay before reconnecting
      const timer = setTimeout(() => {
        startListening();
      }, 100);
      
      prevEndpointingRef.current = endpointingMs;
      prevUtteranceEndRef.current = utteranceEndMs;
      
      return () => clearTimeout(timer);
    }
    
    prevEndpointingRef.current = endpointingMs;
    prevUtteranceEndRef.current = utteranceEndMs;
  }, [endpointingMs, utteranceEndMs, isListening, cleanup, startListening]);

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
    flushAndSend, // Force send accumulated transcript (e.g., when countdown ends)
  };
}
