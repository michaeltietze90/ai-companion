// ElevenLabs Scribe STT - Direct WebSocket implementation
import { useCallback, useRef, useState, useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { debugLog } from '@/stores/debugStore';
import { toast } from 'sonner';

const getScribeTokenUrl = () => '/api/elevenlabs-scribe-token';

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

interface ScribeConnection {
  ws: WebSocket;
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
}

type UseElevenLabsSTTOptions = {
  disabled?: boolean;
};

export function useElevenLabsSTT(
  onTranscript: (text: string) => void,
  options?: UseElevenLabsSTTOptions
) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const connectionRef = useRef<ScribeConnection | null>(null);
  const lastCommittedRef = useRef<string>('');
  const disabledRef = useRef<boolean>(Boolean(options?.disabled));
  const { setListening, setLastVoiceTranscript } = useConversationStore();

  useEffect(() => {
    disabledRef.current = Boolean(options?.disabled);
    if (disabledRef.current) setPartialTranscript('');
  }, [options?.disabled]);

  const cleanup = useCallback(() => {
    const conn = connectionRef.current;
    if (conn) {
      if (conn.processor) conn.processor.disconnect();
      if (conn.audioContext) conn.audioContext.close().catch(console.error);
      if (conn.mediaStream) conn.mediaStream.getTracks().forEach(track => track.stop());
      if (conn.ws && conn.ws.readyState === WebSocket.OPEN) conn.ws.close();
      connectionRef.current = null;
    }
    setIsConnected(false);
    setPartialTranscript('');
    setListening(false);
  }, [setListening]);

  const startListening = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    try {
      const response = await fetch(getScribeTokenUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to get speech recognition token');

      const data = await response.json();
      if (!data?.token) throw new Error('Failed to get speech recognition token');

      console.log('Got ElevenLabs scribe token, connecting...');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const wsUrl = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
      wsUrl.searchParams.set('model_id', 'scribe_v2_realtime');
      wsUrl.searchParams.set('token', data.token);
      wsUrl.searchParams.set('audio_format', 'pcm_16000');
      wsUrl.searchParams.set('commit_strategy', 'vad');
      wsUrl.searchParams.set('vad_silence_threshold_secs', '0.5');
      
      const ws = new WebSocket(wsUrl.toString());

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs Scribe');
        debugLog('stt-event', 'STT', 'WebSocket connected to ElevenLabs Scribe');
        setIsConnected(true);
        setListening(true);
        setIsConnecting(false);
        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message_type === 'session_started') {
            console.log('Scribe session started:', data.session_id);
            debugLog('stt-event', 'STT', `Session started: ${data.session_id}`);
          } else if (data.message_type === 'partial_transcript') {
            if (disabledRef.current) return;
            setPartialTranscript(data.text || '');
          } else if (data.message_type === 'committed_transcript') {
            if (disabledRef.current) return;
            const text = data.text?.trim();
            if (text && text !== lastCommittedRef.current) {
              lastCommittedRef.current = text;
              setPartialTranscript('');
              setLastVoiceTranscript(text);
              console.log('Committed transcript:', text);
              debugLog('stt-event', 'STT', `Committed: "${text.slice(0, 50)}..."`, { text });
              onTranscript(text);
            }
          } else if (data.message_type === 'error') {
            console.error('Scribe error:', data);
            debugLog('error', 'STT', `Error: ${data.error || 'Unknown'}`, data);
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

      ws.onclose = () => {
        cleanup();
      };

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (disabledRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          const uint8Array = new Uint8Array(pcmData.buffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          ws.send(JSON.stringify({ 
            message_type: 'input_audio_chunk',
            audio_base_64: base64,
            sample_rate: 16000,
          }));
        }
      };

      connectionRef.current = { ws, mediaStream, audioContext, processor };
    } catch (error) {
      console.error('Failed to start ElevenLabs STT:', error);
      toast.error('Failed to start speech recognition');
      cleanup();
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onTranscript, setListening, cleanup]);

  const stopListening = useCallback(() => {
    cleanup();
    lastCommittedRef.current = '';
  }, [cleanup]);

  const toggleListening = useCallback(() => {
    if (isConnected) stopListening();
    else startListening();
  }, [isConnected, startListening, stopListening]);

  useEffect(() => {
    return () => { cleanup(); };
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
