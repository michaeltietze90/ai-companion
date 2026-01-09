import { useCallback, useRef, useState } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useConversationStore } from '@/stores/conversationStore';
import { toast } from 'sonner';

export function useElevenLabsSTT(onTranscript: (text: string) => void) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { setListening } = useConversationStore();
  const lastCommittedRef = useRef<string>('');

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log('Partial transcript:', data.text);
    },
    onCommittedTranscript: (data) => {
      console.log('Committed transcript:', data.text);
      if (data.text && data.text.trim() && data.text !== lastCommittedRef.current) {
        lastCommittedRef.current = data.text;
        onTranscript(data.text.trim());
      }
    },
  });

  const startListening = useCallback(async () => {
    if (scribe.isConnected) {
      console.log('Already connected to ElevenLabs STT');
      return;
    }

    setIsConnecting(true);
    try {
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error) {
        console.error('Failed to get scribe token:', error);
        throw new Error('Failed to get speech recognition token');
      }

      if (!data?.token) {
        throw new Error('No token received');
      }

      console.log('Got ElevenLabs scribe token, connecting...');

      // Connect with microphone
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log('Connected to ElevenLabs STT');
      setListening(true);
    } catch (error) {
      console.error('Failed to start ElevenLabs STT:', error);
      toast.error('Failed to start speech recognition');
      setListening(false);
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, setListening]);

  const stopListening = useCallback(() => {
    console.log('Stopping ElevenLabs STT');
    scribe.disconnect();
    setListening(false);
    lastCommittedRef.current = '';
  }, [scribe, setListening]);

  const toggleListening = useCallback(() => {
    if (scribe.isConnected) {
      stopListening();
    } else {
      startListening();
    }
  }, [scribe.isConnected, startListening, stopListening]);

  return {
    isListening: scribe.isConnected,
    isConnecting,
    partialTranscript: scribe.partialTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
