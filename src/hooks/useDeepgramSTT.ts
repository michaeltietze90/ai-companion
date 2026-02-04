// Deepgram Nova STT - Real-time WebSocket implementation using Deepgram SDK
import { useCallback, useRef, useState, useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { debugLog } from '@/stores/debugStore';
import { toast } from 'sonner';
import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk';

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
  liveClient: LiveClient;
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
      if (conn.liveClient) {
        try {
          conn.liveClient.requestClose();
        } catch (e) {
          console.error('Error closing Deepgram client:', e);
        }
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

      console.log('Got Deepgram API key, connecting via SDK...');
      debugLog('stt-event', 'STT', 'Got API key, connecting via Deepgram SDK');

      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Create Deepgram client using SDK
      const deepgram = createClient(data.apiKey);
      
      // Create live transcription connection
      const liveClient = deepgram.listen.live({
        model: 'nova-2', // Back to nova-2 for better accuracy
        language: 'en',
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        interim_results: true,
        utterance_end_ms: 1500, // Wait 1.5s of silence before finalizing
        endpointing: 1000, // Increased to 1 second
        smart_format: true,
        keywords: ['Agentforce:2', 'Data360:2', 'Agentic Enterprise:2', 'Salesforce:2'],
      });

      let keepAliveInterval: NodeJS.Timeout | null = null;

      // Set up event handlers
      liveClient.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram SDK connection opened');
        debugLog('stt-event', 'STT', 'Deepgram SDK connection opened');
        setIsConnected(true);
        setListening(true);
        setIsConnecting(false);

        // Send KeepAlive messages every 8 seconds to prevent timeout
        keepAliveInterval = setInterval(() => {
          try {
            liveClient.keepAlive();
          } catch (e) {
            console.error('KeepAlive error:', e);
          }
        }, 8000);

        // Update the connection ref with the interval
        if (connectionRef.current) {
          connectionRef.current.keepAliveInterval = keepAliveInterval;
        }
      });

      liveClient.on(LiveTranscriptionEvents.Transcript, (data) => {
        if (disabledRef.current) return;

        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
        
        if (transcript) {
          if (data.is_final) {
            // Committed/final transcript
            if (transcript !== lastCommittedRef.current) {
              lastCommittedRef.current = transcript;
              setPartialTranscript('');
              setLastVoiceTranscript(transcript);
              console.log('Committed transcript:', transcript);
              debugLog('stt-event', 'STT', `Committed: "${transcript.slice(0, 50)}..."`, { text: transcript });
              onTranscript(transcript);
            }
          } else {
            // Interim/partial transcript
            setPartialTranscript(transcript);
          }
        }
      });

      liveClient.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log('Deepgram metadata:', data);
        debugLog('stt-event', 'STT', `Session metadata received`, data);
      });

      liveClient.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram SDK error:', error);
        debugLog('error', 'STT', `SDK Error: ${error.message || 'Unknown'}`, error);
        toast.error(`Speech recognition error: ${error.message || 'Unknown error'}`);
      });

      liveClient.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram SDK connection closed');
        debugLog('stt-event', 'STT', 'SDK connection closed');
        cleanup();
      });

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      // Send audio data to Deepgram SDK
      processor.onaudioprocess = (e) => {
        // Soft-pause STT while the avatar is speaking / app is busy, to prevent echo loops.
        if (disabledRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send to Deepgram via SDK
        try {
          liveClient.send(pcmData.buffer);
        } catch (e) {
          // Connection might be closed
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      connectionRef.current = {
        liveClient,
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
