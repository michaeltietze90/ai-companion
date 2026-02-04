// Deepgram Nova STT - Real-time WebSocket implementation
import { useCallback, useRef, useState, useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { debugLog } from '@/stores/debugStore';
import { toast } from 'sonner';

// Detect environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const getDeepgramTokenUrl = () => {
  if (isSupabase) {
    return `${SUPABASE_URL}/functions/v1/deepgram-token`;
  }
  return '/api/deepgram-token';
};

const getHeaders = () => {
  if (isSupabase) {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    };
  }
  return {
    'Content-Type': 'application/json',
  };
};

interface DeepgramConnection {
  ws: WebSocket;
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
  keepAliveInterval: NodeJS.Timeout | null;
}

type UseDeepgramSTTOptions = {
  /**
   * When true, we keep the connection but stop sending mic audio and ignore transcripts.
   * This prevents the avatar's own voice from being transcribed (echo) while it is speaking.
   */
  disabled?: boolean;
};

export function useDeepgramSTT(
  onTranscript: (text: string) => void,
  options?: UseDeepgramSTTOptions
) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const connectionRef = useRef<DeepgramConnection | null>(null);
  const lastCommittedRef = useRef<string>('');
  const disabledRef = useRef<boolean>(Boolean(options?.disabled));
  const { setListening, setLastVoiceTranscript } = useConversationStore();

  useEffect(() => {
    disabledRef.current = Boolean(options?.disabled);
    // If we just disabled STT, clear any partial text so the UI doesn't look stuck.
    if (disabledRef.current) setPartialTranscript('');
  }, [options?.disabled]);

  const cleanup = useCallback(() => {
    const conn = connectionRef.current;
    if (conn) {
      if (conn.keepAliveInterval) {
        clearInterval(conn.keepAliveInterval);
      }
      if (conn.processor) {
        conn.processor.disconnect();
      }
      if (conn.audioContext) {
        conn.audioContext.close().catch(console.error);
      }
      if (conn.mediaStream) {
        conn.mediaStream.getTracks().forEach(track => track.stop());
      }
      if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        // Send close message to Deepgram
        conn.ws.send(JSON.stringify({ type: 'CloseStream' }));
        conn.ws.close();
      }
      connectionRef.current = null;
    }
    setIsConnected(false);
    setPartialTranscript('');
    setListening(false);
  }, [setListening]);

  const startListening = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    try {
      // Get API key from backend
      const response = await fetch(getDeepgramTokenUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to get speech recognition token');
      }

      const data = await response.json();

      if (!data?.apiKey) {
        throw new Error('Failed to get speech recognition API key');
      }

      console.log('Got Deepgram API key, connecting...');

      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Build WebSocket URL with parameters and API key
      // Using Nova-2 model with auto language detection for multilingual support
      const wsUrl = new URL('wss://api.deepgram.com/v1/listen');
      wsUrl.searchParams.set('model', 'nova-2');
      wsUrl.searchParams.set('encoding', 'linear16');
      wsUrl.searchParams.set('sample_rate', '16000');
      wsUrl.searchParams.set('channels', '1');
      wsUrl.searchParams.set('interim_results', 'true');
      wsUrl.searchParams.set('endpointing', '300'); // 300ms silence for VAD
      wsUrl.searchParams.set('smart_format', 'true');
      // detect_language=true enables auto language detection (German, French, Italian, English, etc.)
      wsUrl.searchParams.set('detect_language', 'true');

      // Some environments / proxies are picky about WebSocket auth.
      // Deepgram documents browser auth via Sec-WebSocket-Protocol (subprotocol), but in practice
      // sending the token as a query param can help in certain hosted previews.
      wsUrl.searchParams.set('token', data.apiKey);
      
      // Create WebSocket with authorization via Sec-WebSocket-Protocol header
      // Format: ['token', 'YOUR_API_KEY'] - Deepgram expects this exact format
      const ws = new WebSocket(wsUrl.toString(), ['token', data.apiKey]);
      ws.binaryType = 'arraybuffer';

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      let keepAliveInterval: NodeJS.Timeout | null = null;

      ws.onopen = () => {
        console.log('WebSocket connected to Deepgram Nova');
        debugLog('stt-event', 'STT', 'WebSocket connected to Deepgram Nova');
        setIsConnected(true);
        setListening(true);
        setIsConnecting(false);
        
        // Start processing audio
        source.connect(processor);
        processor.connect(audioContext.destination);

        // Send KeepAlive messages every 8 seconds to prevent timeout
        keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 8000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'Metadata') {
            console.log('Deepgram session started:', data.request_id);
            debugLog('stt-event', 'STT', `Session started: ${data.request_id}`);
          } else if (data.channel?.alternatives?.[0]) {
            if (disabledRef.current) return;
            
            const transcript = data.channel.alternatives[0].transcript?.trim();
            
            if (transcript) {
              if (data.is_final) {
                // Committed/final transcript
                if (transcript !== lastCommittedRef.current) {
                  lastCommittedRef.current = transcript;
                  setPartialTranscript('');
                  setLastVoiceTranscript(transcript);
                  console.log('Committed transcript:', transcript);
                  debugLog('stt-event', 'STT', `Committed: \"${transcript.slice(0, 50)}...\"`, { text: transcript });
                  onTranscript(transcript);
                }
              } else {
                // Interim/partial transcript
                setPartialTranscript(transcript);
              }
            }
          } else if (data.type === 'Error') {
            console.error('Deepgram error:', data);
            debugLog('error', 'STT', `Error: ${data.message || 'Unknown'}`, data);
            toast.error(`Speech recognition error: ${data.message || 'Unknown error'}`);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
        toast.error('Speech recognition connection error');
        cleanup();
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        cleanup();
      };

      // Send audio data as raw binary (Deepgram accepts raw PCM)
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Soft-pause STT while the avatar is speaking / app is busy, to prevent echo loops.
          if (disabledRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send raw binary PCM data (Deepgram accepts ArrayBuffer directly)
          ws.send(pcmData.buffer);
        }
      };

      connectionRef.current = {
        ws,
        mediaStream,
        audioContext,
        processor,
        keepAliveInterval,
      };

    } catch (error) {
      console.error('Failed to start Deepgram STT:', error);
      toast.error('Failed to start speech recognition');
      cleanup();
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onTranscript, setListening, cleanup, setLastVoiceTranscript]);

  const stopListening = useCallback(() => {
    console.log('Stopping Deepgram STT');
    cleanup();
    lastCommittedRef.current = '';
  }, [cleanup]);

  const toggleListening = useCallback(() => {
    if (isConnected) {
      stopListening();
    } else {
      startListening();
    }
  }, [isConnected, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening: isConnected,
    isConnecting,
    partialTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
