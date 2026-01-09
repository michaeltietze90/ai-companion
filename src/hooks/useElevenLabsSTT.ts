// ElevenLabs Scribe STT - Direct WebSocket implementation
import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversationStore } from '@/stores/conversationStore';
import { toast } from 'sonner';

interface ScribeConnection {
  ws: WebSocket;
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
}

export function useElevenLabsSTT(onTranscript: (text: string) => void) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const connectionRef = useRef<ScribeConnection | null>(null);
  const lastCommittedRef = useRef<string>('');
  const { setListening } = useConversationStore();

  const cleanup = useCallback(() => {
    const conn = connectionRef.current;
    if (conn) {
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
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error || !data?.token) {
        throw new Error('Failed to get speech recognition token');
      }

      console.log('Got ElevenLabs scribe token, connecting...');

      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Correct WebSocket URL with query parameters
      const wsUrl = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
      wsUrl.searchParams.set('model_id', 'scribe_v2_realtime');
      wsUrl.searchParams.set('token', data.token);
      wsUrl.searchParams.set('audio_format', 'pcm_16000');
      wsUrl.searchParams.set('commit_strategy', 'vad');
      wsUrl.searchParams.set('vad_silence_threshold_secs', '1.0');
      
      const ws = new WebSocket(wsUrl.toString());

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs Scribe');
        setIsConnected(true);
        setListening(true);
        setIsConnecting(false);
        
        // Start processing audio
        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Scribe message:', data.message_type);
          
          if (data.message_type === 'session_started') {
            console.log('Scribe session started:', data.session_id);
          } else if (data.message_type === 'partial_transcript') {
            setPartialTranscript(data.text || '');
          } else if (data.message_type === 'committed_transcript') {
            const text = data.text?.trim();
            if (text && text !== lastCommittedRef.current) {
              lastCommittedRef.current = text;
              setPartialTranscript('');
              console.log('Committed transcript:', text);
              onTranscript(text);
            }
          } else if (data.message_type === 'error') {
            console.error('Scribe error:', data);
            toast.error(`Speech recognition error: ${data.error || 'Unknown error'}`);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Speech recognition connection error');
        cleanup();
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        cleanup();
      };

      // Send audio data
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          // Convert to base64
          const uint8Array = new Uint8Array(pcmData.buffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          
          // Send audio chunk in correct format
          ws.send(JSON.stringify({ 
            message_type: 'input_audio_chunk',
            audio_base_64: base64,
            sample_rate: 16000,
          }));
        }
      };

      connectionRef.current = {
        ws,
        mediaStream,
        audioContext,
        processor,
      };

    } catch (error) {
      console.error('Failed to start ElevenLabs STT:', error);
      toast.error('Failed to start speech recognition');
      cleanup();
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onTranscript, setListening, cleanup]);

  const stopListening = useCallback(() => {
    console.log('Stopping ElevenLabs STT');
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
