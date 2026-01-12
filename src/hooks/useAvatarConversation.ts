import { useCallback, useRef, useEffect } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from '@heygen/streaming-avatar';
import { startAgentSession, endAgentSession, sendAgentMessage, streamAgentMessage, type StreamChunk } from '@/services/api';
import { createHeyGenToken, speakText, stopStreaming, interruptSpeaking } from '@/services/heygenProxy';
import { useConversationStore } from '@/stores/conversationStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import { parseRichResponse, type ParsedResponse } from '@/lib/richResponseParser';
import { toast } from 'sonner';

// Demo responses for testing without credentials (with visual examples)
const DEMO_RESPONSES = [
  "Hello! I'm your AI assistant. How can I help you today?",
  'That\'s a great question! Let me show you our product. <visual type="image" src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400" duration="4000" position="right"/> This is one of our bestsellers!',
  "I understand. Based on what you've told me, I'd recommend checking out our latest offerings.",
  'Here\'s our special offer <break time="500ms"/> currently available for you. <visual type="image" src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400" duration="5000" position="center"/>',
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
    messagesStreamUrl,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isThinking,
    demoMode,
    setSessionId,
    setMessagesStreamUrl,
    setConnected,
    setConnecting,
    setSpeaking,
    setListening,
    setThinking,
    setError,
    setLastAgentforceResponse,
    setLastSpokenText,
    addMessage,
    reset,
  } = useConversationStore();

  const { startVisuals, clearVisuals } = useVisualOverlayStore();

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
        setListening(false); // Stop listening while avatar speaks
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Avatar stopped talking');
        setSpeaking(false);
        // Resume listening is handled by the STT hook
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

  // Speak using HeyGen (SDK first). If it fails, fall back to proxy, then browser TTS.
  // Accepts parsed speech text (already cleaned of visual tags)
  const speakViaProxy = useCallback(async (text: string) => {
    const spokenText = text
      // Remove Markdown images/links that Agentforce sometimes includes
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\(([^\)]*)\)/g, '$1')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();

    setLastSpokenText(spokenText);
    if (!spokenText) return;

    // Preferred: use the HeyGen SDK instance that owns the session + auth.
    if (avatarRef.current) {
      try {
        await avatarRef.current.interrupt();
      } catch {
        // ignore
      }

      try {
        await avatarRef.current.speak({ text: spokenText, task_type: TaskType.REPEAT });
        return;
      } catch (error) {
        console.error('[HeyGen SDK] speak failed, falling back to proxy:', error);
      }
    }

    // Fallback: direct API calls via our proxy.
    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await interruptSpeaking(tokenRef.current, heygenSessionRef.current);
      } catch {
        // ignore
      }

      try {
        await speakText(tokenRef.current, heygenSessionRef.current, spokenText);
        return;
      } catch (error) {
        console.error('[HeyGen] speak failed, falling back to browser TTS:', error);
      }
    }

    // Last resort: browser TTS
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(spokenText);
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
  }, [setLastSpokenText]);

  // Start full conversation (HeyGen + Agentforce)
  // IMPORTANT: Agentforce should still connect even if HeyGen is down / rate-limited.
  const startConversation = useCallback(async (videoElement?: HTMLVideoElement | null) => {
    setConnecting(true);
    setError(null);
    clearVisuals();

    try {
      if (demoMode) {
        // Demo mode - no real connections
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConnected(true);
        setSessionId('demo-session');
        demoIndexRef.current = 0;

        const welcomeRaw = DEMO_RESPONSES[0];
        const parsed = parseRichResponse(welcomeRaw);
        addMessage({ role: 'assistant', content: parsed.displayText });
        
        if (parsed.hasRichContent) {
          startVisuals(parsed.visuals);
        }
        
        toast.success('Demo mode connected!');
        return;
      }

      // 1) Start Agentforce first (so "brain" is always available)
      const { sessionId: newSessionId, welcomeMessage, messagesStreamUrl } = await startAgentSession();
      setSessionId(newSessionId);
      setMessagesStreamUrl(messagesStreamUrl);
      setConnected(true);

      // Capture welcome message as "Agentforce reply" for debugging
      if (welcomeMessage) setLastAgentforceResponse(welcomeMessage);

      // 2) Try to initialize HeyGen video (optional). If it fails, keep Agentforce running.
      if (videoElement) {
        try {
          await initializeAvatar(videoElement);
        } catch (avatarError) {
          console.error('[HeyGen] avatar init failed (continuing with Agentforce):', avatarError);
          toast.warning('Avatar is temporarily unavailable; continuing with Agentforce.');
        }
      }

      // 3) Parse and speak/show welcome (with rich content support)
      if (welcomeMessage) {
        const parsed = parseRichResponse(welcomeMessage);
        addMessage({ role: 'assistant', content: parsed.displayText });
        
        // Start any visuals
        if (parsed.hasRichContent) {
          startVisuals(parsed.visuals);
        }
        
        // Speak the clean speech text
        try {
          await speakViaProxy(parsed.speechText);
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
  }, [demoMode, initializeAvatar, speakViaProxy, clearVisuals, startVisuals, setConnecting, setConnected, setSessionId, setError, addMessage, setLastAgentforceResponse]);

  // Send message to agent
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    addMessage({ role: 'user', content: text });
    setThinking(true, 'Thinking...');

    try {
      if (demoMode) {
        // Demo mode response with rich content support
        await new Promise(resolve => setTimeout(resolve, 1500));
        demoIndexRef.current = (demoIndexRef.current + 1) % DEMO_RESPONSES.length;
        const rawResponse = DEMO_RESPONSES[demoIndexRef.current];
        const parsed = parseRichResponse(rawResponse);

        addMessage({ role: 'assistant', content: parsed.displayText });
        
        // Start any visuals
        if (parsed.hasRichContent) {
          startVisuals(parsed.visuals);
        }
        
        setThinking(false);
        return;
      }

      if (!sessionId) {
        throw new Error('No active Agentforce session (sessionId missing)');
      }

      console.log('[Agentforce] send message (streaming)', { sessionId, text });
      
      // Track full response for display and debugging
      let fullResponse = '';
      const allVisuals: ParsedResponse['visuals'] = [];
      
      // Speech queue - we queue sentences and speak them one at a time
      const speechQueue: string[] = [];
      let isSpeakingQueue = false;
      
      const processSpeechQueue = async () => {
        if (isSpeakingQueue || speechQueue.length === 0) return;
        isSpeakingQueue = true;
        
        while (speechQueue.length > 0) {
          const sentence = speechQueue.shift();
          if (!sentence) continue;
          
          console.log('[HeyGen] speaking sentence:', sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''));
          try {
            await speakViaProxy(sentence);
          } catch (speakError) {
            console.error('[HeyGen] speak error:', speakError);
          }
          
          // Wait for avatar to finish speaking before next sentence
          // The avatar.speak() returns when command is sent, not when speech ends
          // We'll wait a brief moment to allow some overlap prevention
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        isSpeakingQueue = false;
      };
      
      // Stream sentences from Agentforce
      for await (const chunk of streamAgentMessage(sessionId, text, messagesStreamUrl)) {
        if (chunk.type === 'progress') {
          setThinking(true, chunk.text);
        } else if (chunk.type === 'sentence') {
          // Accumulate full response
          fullResponse += (fullResponse ? ' ' : '') + chunk.text;
          
          // Parse for visuals in this sentence
          const parsed = parseRichResponse(chunk.text);
          
          // Start any visuals immediately
          if (parsed.hasRichContent) {
            console.log('[Rich Response] Starting visuals from sentence:', parsed.visuals);
            startVisuals(parsed.visuals);
            allVisuals.push(...parsed.visuals);
          }
          
          // Queue the clean speech text for speaking
          if (parsed.speechText.trim()) {
            speechQueue.push(parsed.speechText);
            // Start processing queue (non-blocking)
            processSpeechQueue();
          }
        } else if (chunk.type === 'done') {
          console.log('[Agentforce] stream complete');
        }
      }
      
      // Store full response for debugging
      setLastAgentforceResponse(fullResponse);
      
      // Add complete message to chat
      if (fullResponse) {
        const finalParsed = parseRichResponse(fullResponse);
        addMessage({ role: 'assistant', content: finalParsed.displayText });
      }
      
      // Wait for all queued speech to finish
      while (speechQueue.length > 0 || isSpeakingQueue) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('[HeyGen] all sentences spoken');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      console.error('Send message error:', error);
    } finally {
      setThinking(false);
    }
  }, [sessionId, messagesStreamUrl, demoMode, speakViaProxy, startVisuals, addMessage, setThinking, setLastAgentforceResponse]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      // Clear any active visuals
      clearVisuals();
      
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
  }, [sessionId, demoMode, reset, clearVisuals]);

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
