// Deepgram Nova STT - Real-time WebSocket implementation using Deepgram SDK
import { useCallback, useRef, useState, useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { debugLog } from '@/stores/debugStore';
import { toast } from 'sonner';
import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk';

const getDeepgramTokenUrl = () => '/api/deepgram-token';

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

interface DeepgramConnection {
  liveClient: LiveClient;
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
  keepAliveInterval: NodeJS.Timeout | null;
  silenceCheckInterval: NodeJS.Timeout | null;
}

const VAD_SILENCE_THRESHOLD = 0.004;

type UseDeepgramSTTOptions = {
  disabled?: boolean;
  commitDelayMs?: number;
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
  const finalBufferRef = useRef<string>('');
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitDelayMsRef = useRef<number>(options?.commitDelayMs ?? 900);
  const lastVoiceActivityRef = useRef<number>(Date.now());
  const { setListening, setLastVoiceTranscript } = useConversationStore();

  useEffect(() => {
    disabledRef.current = Boolean(options?.disabled);
    commitDelayMsRef.current = options?.commitDelayMs ?? 900;
    if (disabledRef.current) {
      finalBufferRef.current = '';
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      setPartialTranscript('');
    }
  }, [options?.disabled, options?.commitDelayMs]);

  const commitBufferedTranscript = useCallback(() => {
    const text = finalBufferRef.current.trim();
    finalBufferRef.current = '';
    if (!text || text === lastCommittedRef.current) return;
    lastCommittedRef.current = text;
    setPartialTranscript('');
    setLastVoiceTranscript(text);
    console.log('Committed transcript:', text);
    debugLog('stt-event', 'STT', `Committed: "${text.slice(0, 50)}..."`, { text });
    onTranscript(text);
  }, [onTranscript, setLastVoiceTranscript]);

  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      if (disabledRef.current) return;
      commitBufferedTranscript();
    }, commitDelayMsRef.current);
  }, [commitBufferedTranscript]);

  const cleanup = useCallback(() => {
    const conn = connectionRef.current;
    if (conn) {
      if (conn.keepAliveInterval) clearInterval(conn.keepAliveInterval);
      if (conn.silenceCheckInterval) clearInterval(conn.silenceCheckInterval);
      if (conn.processor) conn.processor.disconnect();
      if (conn.audioContext) conn.audioContext.close().catch(console.error);
      if (conn.mediaStream) conn.mediaStream.getTracks().forEach(track => track.stop());
      if (conn.liveClient) {
        try { conn.liveClient.requestClose(); } catch (e) { console.error('Error closing Deepgram client:', e); }
      }
      connectionRef.current = null;
    }
    finalBufferRef.current = '';
    if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
    setIsConnected(false);
    setPartialTranscript('');
    setListening(false);
  }, [setListening]);

  const startListening = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    try {
      const response = await fetch(getDeepgramTokenUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to get speech recognition token');
      const data = await response.json();
      if (!data?.apiKey) throw new Error('Failed to get speech recognition API key');

      console.log('Got Deepgram API key, connecting via SDK...');
      debugLog('stt-event', 'STT', 'Got API key, connecting via Deepgram SDK');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const deepgram = createClient(data.apiKey);
      const liveClient = deepgram.listen.live({
        model: 'nova-2',
        language: 'en',
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        interim_results: true,
        utterance_end_ms: 1500,
        endpointing: 1000,
        smart_format: true,
        keywords: ['Agentforce:2', 'Data360:2', 'Agentic Enterprise:2', 'Salesforce:2'],
      });

      let keepAliveInterval: NodeJS.Timeout | null = null;

      liveClient.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram SDK connection opened');
        debugLog('stt-event', 'STT', 'Deepgram SDK connection opened');
        setIsConnected(true);
        setListening(true);
        setIsConnecting(false);

        keepAliveInterval = setInterval(() => {
          try { liveClient.keepAlive(); } catch (e) { console.error('KeepAlive error:', e); }
        }, 8000);

        if (connectionRef.current) connectionRef.current.keepAliveInterval = keepAliveInterval;
      });

      liveClient.on(LiveTranscriptionEvents.Transcript, (data) => {
        if (disabledRef.current) return;
        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
        if (transcript) {
          lastVoiceActivityRef.current = Date.now();
          finalBufferRef.current = transcript;
          setPartialTranscript(transcript);
        }
      });

      liveClient.on(LiveTranscriptionEvents.Metadata, (data) => {
        debugLog('stt-event', 'STT', `Session metadata received`, data);
      });

      liveClient.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram SDK error:', error);
        debugLog('error', 'STT', `SDK Error: ${error.message || 'Unknown'}`, error);
        toast.error(`Speech recognition error: ${error.message || 'Unknown error'}`);
      });

      liveClient.on(LiveTranscriptionEvents.Close, () => {
        debugLog('stt-event', 'STT', 'SDK connection closed');
        cleanup();
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (disabledRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        if (rms > VAD_SILENCE_THRESHOLD) lastVoiceActivityRef.current = Date.now();

        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        try { liveClient.send(pcmData.buffer); } catch { /* Connection might be closed */ }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      const silenceCheckInterval = setInterval(() => {
        if (disabledRef.current) return;
        const silenceDuration = Date.now() - lastVoiceActivityRef.current;
        const hasBufferedText = finalBufferRef.current.trim().length > 0;
        if (hasBufferedText && silenceDuration >= commitDelayMsRef.current) {
          console.log(`[VAD] ${silenceDuration}ms silence detected, committing transcript`);
          commitBufferedTranscript();
        }
      }, 100);

      connectionRef.current = { liveClient, mediaStream, audioContext, processor, keepAliveInterval, silenceCheckInterval };
    } catch (error) {
      console.error('Failed to start Deepgram STT:', error);
      toast.error('Failed to start speech recognition');
      cleanup();
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onTranscript, setListening, cleanup, setLastVoiceTranscript]);

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
