import { useCallback, useRef, useEffect } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents } from '@heygen/streaming-avatar';
import { startAgentSession, endAgentSession, sendAgentMessage } from '@/services/api';
import { createHeyGenToken, speakText, stopStreaming } from '@/services/heygenProxy';
import { useConversationStore } from '@/stores/conversationStore';
import { toast } from 'sonner';

// Demo responses for testing without credentials
const DEMO_RESPONSES = [
  "Hello! I'm your AI assistant. How can I help you today?",
  "That's a great question! Let me help you with that.",
  "I understand. Based on what you've told me, I'd recommend checking out our latest offerings.",
  "Is there anything else I can assist you with?",
  "Thank you for your interest! I'm here to help with any questions.",
];

export function useAvatarConversation() {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const heygenSessionRef = useRef<string | null>(null);
  const demoIndexRef = useRef(0);
  
  const {
    sessionId,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isThinking,
    demoMode,
    setSessionId,
    setConnected,
    setConnecting,
    setSpeaking,
    setListening,
    setThinking,
    setError,
    addMessage,
    reset,
  } = useConversationStore();

  // Initialize HeyGen Avatar with proxy for streaming.start
  const initializeAvatar = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      // Get token via proxy
      const token = await createHeyGenToken();
      tokenRef.current = token;
      
      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      // Set up event listeners
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log('Stream ready:', event);
        if (event.detail && videoElement) {
          mediaStreamRef.current = event.detail;
          videoElement.srcObject = event.detail;
          videoElement.play().catch(console.error);
        }
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log('Avatar started talking');
        setSpeaking(true);
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Avatar stopped talking');
        setSpeaking(false);
      });

      // Create avatar session - this also starts streaming internally
      const sessionInfo = await avatar.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: 'default',
      });
      
      console.log('Avatar session created and streaming started:', sessionInfo);
      
      // Store the HeyGen session ID for speak calls
      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }

      return avatar;
    } catch (error) {
      console.error('Failed to initialize avatar:', error);
      throw error;
    }
  }, [setSpeaking]);

  // Speak using the proxy to bypass any CORS issues
  const speakViaProxy = useCallback(async (text: string) => {
    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await speakText(tokenRef.current, heygenSessionRef.current, text);
        console.log('Speak command sent via proxy');
      } catch (error) {
        console.error('Speak via proxy error:', error);
        // Fallback to SDK method
        if (avatarRef.current) {
          await avatarRef.current.speak({ text });
        }
      }
    } else if (avatarRef.current) {
      await avatarRef.current.speak({ text });
    }
  }, []);

  // Start full conversation (HeyGen + Agentforce)
  const startConversation = useCallback(async (videoElement?: HTMLVideoElement | null) => {
    setConnecting(true);
    setError(null);
    
    try {
      if (demoMode) {
        // Demo mode - no real connections
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConnected(true);
        setSessionId('demo-session');
        demoIndexRef.current = 0;
        
        const welcomeMessage = DEMO_RESPONSES[0];
        addMessage({ role: 'assistant', content: welcomeMessage });
        toast.success('Demo mode connected!');
        return;
      }

      // Initialize HeyGen if video element provided
      if (videoElement) {
        await initializeAvatar(videoElement);
      }

      // Start Agentforce session
      const { sessionId: newSessionId, welcomeMessage } = await startAgentSession();
      setSessionId(newSessionId);
      setConnected(true);

      // Speak welcome message
      if (welcomeMessage) {
        addMessage({ role: 'assistant', content: welcomeMessage });
        console.log('Speaking welcome message:', welcomeMessage);
        try {
          await speakViaProxy(welcomeMessage);
          console.log('Welcome message speak command sent');
        } catch (speakError) {
          console.error('Welcome speak error:', speakError);
        }
      }

      toast.success('Connected to AI Assistant!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      setError(message);
      toast.error(message);
      console.error('Start conversation error:', error);
    } finally {
      setConnecting(false);
    }
  }, [demoMode, initializeAvatar, speakViaProxy, setConnecting, setConnected, setSessionId, setError, addMessage]);

  // Send message to agent
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    addMessage({ role: 'user', content: text });
    setThinking(true, 'Thinking...');

    try {
      if (demoMode) {
        // Demo mode response
        await new Promise(resolve => setTimeout(resolve, 1500));
        demoIndexRef.current = (demoIndexRef.current + 1) % DEMO_RESPONSES.length;
        const response = DEMO_RESPONSES[demoIndexRef.current];
        
        addMessage({ role: 'assistant', content: response });
        setThinking(false);
        return;
      }

      if (!sessionId) {
        throw new Error('No active session');
      }

      const { message, progressIndicators } = await sendAgentMessage(sessionId, text);
      
      // Update thinking indicator with progress messages
      if (progressIndicators.length > 0) {
        setThinking(true, progressIndicators[progressIndicators.length - 1]);
      }

      if (message) {
        addMessage({ role: 'assistant', content: message });
        
        // Make avatar speak the response via proxy
        console.log('Making avatar speak:', message.substring(0, 50) + '...');
        try {
          await speakViaProxy(message);
          console.log('Avatar speak command sent successfully');
        } catch (speakError) {
          console.error('Avatar speak error:', speakError);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      console.error('Send message error:', error);
    } finally {
      setThinking(false);
    }
  }, [sessionId, demoMode, speakViaProxy, addMessage, setThinking]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      if (sessionId && !demoMode) {
        await endAgentSession(sessionId);
      }

      // Stop HeyGen streaming via proxy
      if (tokenRef.current && heygenSessionRef.current) {
        try {
          await stopStreaming(tokenRef.current, heygenSessionRef.current);
        } catch (e) {
          console.error('Stop streaming error:', e);
        }
      }

      if (avatarRef.current) {
        await avatarRef.current.stopAvatar();
        avatarRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      tokenRef.current = null;
      heygenSessionRef.current = null;
      reset();
      toast.info('Conversation ended');
    } catch (error) {
      console.error('End conversation error:', error);
    }
  }, [sessionId, demoMode, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isThinking,
    startConversation,
    sendMessage,
    endConversation,
    setListening,
  };
}
