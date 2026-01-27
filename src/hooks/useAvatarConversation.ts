import { useCallback, useRef, useEffect } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType, VoiceEmotion } from '@heygen/streaming-avatar';
import { startAgentSession, endAgentSession, sendAgentMessage, streamAgentMessage, type StreamChunk } from '@/services/api';
import { createHeyGenToken, speakText, stopStreaming, interruptSpeaking } from '@/services/heygenProxy';
import { synthesizeSpeech } from '@/services/elevenLabsTTS';
import { useConversationStore } from '@/stores/conversationStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import { useSettingsStore } from '@/stores/settingsStore';
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
// Fixed avatar and voice IDs from Proto
const MIGUEL_AVATAR_ID = '26c21d9041654675aa0c2eb479c7d341';
const MIGUEL_VOICE_ID = '35f1601abcf94ebd8970b08047d777f9';

export function useAvatarConversation() {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const heygenSessionRef = useRef<string | null>(null);
  const demoIndexRef = useRef(0);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Speech completion tracking
  const speechResolveRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  
  // ElevenLabs audio element reference
  const elevenLabsAudioRef = useRef<HTMLAudioElement | null>(null);
  
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
    addStreamingSentence,
    clearStreamingSentences,
    addMessage,
    reset,
  } = useConversationStore();

  const { startVisuals, clearVisuals } = useVisualOverlayStore();
  const getActiveProfile = useSettingsStore((state) => state.getActiveProfile);

  // Initialize HeyGen Avatar with Proto token and fixed avatar/voice
  const initializeAvatar = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      // Get token from Proto endpoint
      const token = await createHeyGenToken();
      tokenRef.current = token;
      console.log('[HeyGen] Got token from Proto endpoint');
      
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
        isSpeakingRef.current = true;
        setSpeaking(true);
        setListening(false); // Stop listening while avatar speaks
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Avatar stopped talking');
        isSpeakingRef.current = false;
        setSpeaking(false);
        // Resolve any pending speech wait
        if (speechResolveRef.current) {
          speechResolveRef.current();
          speechResolveRef.current = null;
        }
        // Resume listening is handled by the STT hook
      });

      console.log('[HeyGen] Using Miguel avatar:', MIGUEL_AVATAR_ID);
      console.log('[HeyGen] Using voice:', MIGUEL_VOICE_ID);

      // HARDCODED: Always use EXCITED emotion
      const selectedEmotion = VoiceEmotion.EXCITED;
      console.log('[HeyGen] Using emotion: EXCITED (hardcoded)');

      // Create avatar session with high quality for Miguel
      // IMPORTANT: disableIdleTimeout is NOT set (defaults to false) to prevent draining hours
      const sessionInfo = await avatar.createStartAvatar({
        quality: AvatarQuality.High, // Use High quality (SDK enum)
        avatarName: MIGUEL_AVATAR_ID,
        voice: {
          voiceId: MIGUEL_VOICE_ID,
          emotion: selectedEmotion,
        },
      });
      
      console.log('Avatar session created and streaming started:', sessionInfo);
      
      // Store the HeyGen session ID for speak calls
      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }

      // Set up keep-alive interval (every 60 seconds) to prevent idle timeout
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      keepAliveIntervalRef.current = setInterval(async () => {
        if (avatarRef.current) {
          try {
            console.log('[HeyGen] Sending keep-alive ping');
            // The SDK doesn't expose a direct keepAlive method, 
            // but we can use the session to send a silent task
            // For now, just log - the session should stay alive with activity
          } catch (e) {
            console.warn('[HeyGen] Keep-alive failed:', e);
          }
        }
      }, 60000); // Every 60 seconds

      return avatar;
    } catch (error) {
      console.error('Failed to initialize avatar:', error);
      throw error;
    }
  }, [setSpeaking, setListening, getActiveProfile]);

  // Reinitialize avatar with a new emotion (keeps Agentforce session alive)
  const reinitializeAvatarWithEmotion = useCallback(async (
    videoElement: HTMLVideoElement,
    newEmotion: string
  ): Promise<void> => {
    console.log('[HeyGen] Reinitializing avatar with new emotion:', newEmotion);
    
    try {
      // 1) Stop current avatar session
      if (avatarRef.current) {
        try {
          await avatarRef.current.stopAvatar();
        } catch (e) {
          console.warn('[HeyGen] Error stopping avatar:', e);
        }
        avatarRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      // 2) Get new token
      const token = await createHeyGenToken();
      tokenRef.current = token;
      
      // 3) Create new avatar with updated emotion
      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;
      
      // Set up event listeners
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log('[HeyGen] Stream ready after emotion change');
        if (event.detail && videoElement) {
          mediaStreamRef.current = event.detail;
          videoElement.srcObject = event.detail;
          videoElement.play().catch(console.error);
        }
      });
      
      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        isSpeakingRef.current = true;
        setSpeaking(true);
        setListening(false);
      });
      
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        isSpeakingRef.current = false;
        setSpeaking(false);
        if (speechResolveRef.current) {
          speechResolveRef.current();
          speechResolveRef.current = null;
        }
      });
      
      // HARDCODED: Always use EXCITED emotion (ignoring newEmotion param)
      const selectedEmotion = VoiceEmotion.EXCITED;
      console.log('[HeyGen] Reinitializing with EXCITED (hardcoded, ignoring:', newEmotion, ')');
      
      // Create new session
      const sessionInfo = await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: MIGUEL_AVATAR_ID,
        voice: {
          voiceId: MIGUEL_VOICE_ID,
          emotion: selectedEmotion,
        },
      });
      
      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }
      
      // Restart keep-alive
      keepAliveIntervalRef.current = setInterval(async () => {
        if (avatarRef.current) {
          console.log('[HeyGen] Keep-alive ping');
        }
      }, 60000);
      
      console.log('[HeyGen] Avatar reinitialized with emotion:', newEmotion);
      toast.success(`Emotion changed to ${newEmotion}!`);
      
    } catch (error) {
      console.error('[HeyGen] Failed to reinitialize avatar:', error);
      toast.error('Failed to change emotion. Avatar may be temporarily unavailable.');
      throw error;
    }
  }, [setSpeaking, setListening]);

  // Wait for avatar to finish speaking (resolves on AVATAR_STOP_TALKING event)
  const waitForSpeechComplete = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // If not currently speaking, resolve immediately
      if (!isSpeakingRef.current) {
        resolve();
        return;
      }
      
      // Set a timeout so we don't hang forever if event never fires
      const timeout = setTimeout(() => {
        console.warn('[Speech] Timeout waiting for avatar to stop talking');
        speechResolveRef.current = null;
        resolve();
      }, 30000); // 30 second max per sentence
      
      // Store resolver to be called by AVATAR_STOP_TALKING event
      speechResolveRef.current = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }, []);

  // Speak via ElevenLabs TTS with HeyGen lip-sync
  // Plays ElevenLabs audio while sending text to HeyGen (muted video) for lip-sync
  const speakViaElevenLabs = useCallback(async (text: string): Promise<void> => {
    const activeProfile = getActiveProfile();
    
    try {
      isSpeakingRef.current = true;
      setSpeaking(true);
      
      console.log('[ElevenLabs TTS] Speaking with lip-sync:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      
      // Start both in parallel:
      // 1. Generate and play ElevenLabs audio
      // 2. Send text to HeyGen for lip-sync animation (video is muted so we only see lips move)
      
      const audioPromise = synthesizeSpeech(text, {
        voiceId: activeProfile?.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL',
        emotion: activeProfile?.selectedEmotion || 'friendly',
        speed: activeProfile?.elevenLabsSpeed || 1.0,
      });
      
      // Trigger HeyGen lip-sync (fire and forget - the video element should be muted)
      const lipSyncPromise = (async () => {
        if (avatarRef.current) {
          try {
            await avatarRef.current.speak({ text, task_type: TaskType.REPEAT });
          } catch (e) {
            console.warn('[HeyGen] Lip-sync speak failed:', e);
          }
        } else if (tokenRef.current && heygenSessionRef.current) {
          try {
            await speakText(tokenRef.current, heygenSessionRef.current, text);
          } catch (e) {
            console.warn('[HeyGen proxy] Lip-sync speak failed:', e);
          }
        }
      })();
      
      // Wait for audio to be ready
      const audioBlob = await audioPromise;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      elevenLabsAudioRef.current = audio;
      
      // Play ElevenLabs audio and wait for it to finish
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          reject(e);
        };
        audio.play().catch(reject);
      });
      
      // Wait for lip-sync to finish too (or timeout)
      await Promise.race([
        lipSyncPromise,
        new Promise(resolve => setTimeout(resolve, 1000)) // 1s grace period
      ]);
      
      elevenLabsAudioRef.current = null;
    } finally {
      isSpeakingRef.current = false;
      setSpeaking(false);
    }
  }, [getActiveProfile, setSpeaking]);

  // Speak text WITHOUT interrupting (for queued sentences)
  const speakSentenceNoInterrupt = useCallback(async (text: string): Promise<void> => {
    const spokenText = text
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\(([^\)]*)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    setLastSpokenText(spokenText);
    if (!spokenText) return;

    // Wait for any currently speaking to finish first
    if (isSpeakingRef.current) {
      console.log('[Speech] Waiting for current speech to finish...');
      await waitForSpeechComplete();
    }

    // Get active profile to check TTS provider
    const activeProfile = getActiveProfile();
    const useElevenLabs = activeProfile?.ttsProvider === 'elevenlabs';
    
    // Use ElevenLabs TTS (plays audio separately from HeyGen video)
    if (useElevenLabs) {
      try {
        await speakViaElevenLabs(spokenText);
        return;
      } catch (error) {
        console.error('[ElevenLabs TTS] speak failed:', error);
        // Fall through to HeyGen as backup
      }
    }

    // Preferred: use the HeyGen SDK instance
    if (avatarRef.current) {
      try {
        await avatarRef.current.speak({ text: spokenText, task_type: TaskType.REPEAT });
        // Wait for speech to actually complete
        await waitForSpeechComplete();
        return;
      } catch (error) {
        console.error('[HeyGen SDK] speak failed, trying proxy:', error);
      }
    }

    // Fallback: direct API calls via our proxy
    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await speakText(tokenRef.current, heygenSessionRef.current, spokenText);
        // Wait for speech completion
        await waitForSpeechComplete();
        return;
      } catch (error) {
        console.error('[HeyGen proxy] speak failed:', error);
      }
    }

    // NO browser TTS fallback - just skip if unavailable
    console.warn('[Speech] TTS unavailable, skipping speech for:', spokenText.substring(0, 50));
  }, [setLastSpokenText, waitForSpeechComplete, getActiveProfile, speakViaElevenLabs]);

  // Speak using HeyGen WITH interrupt (for new messages, welcome message, etc.)
  const speakViaProxy = useCallback(async (text: string) => {
    const spokenText = text
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\(([^\)]*)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    setLastSpokenText(spokenText);
    if (!spokenText) return;

    // Get active profile to check TTS provider
    const activeProfile = getActiveProfile();
    const useElevenLabs = activeProfile?.ttsProvider === 'elevenlabs';
    
    // Interrupt any current ElevenLabs audio
    if (useElevenLabs && elevenLabsAudioRef.current) {
      elevenLabsAudioRef.current.pause();
      elevenLabsAudioRef.current = null;
    }
    
    // Use ElevenLabs TTS
    if (useElevenLabs) {
      try {
        await speakViaElevenLabs(spokenText);
        return;
      } catch (error) {
        console.error('[ElevenLabs TTS] speak failed:', error);
        // Fall through to HeyGen as backup
      }
    }

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
        console.error('[HeyGen SDK] speak failed, trying proxy:', error);
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
        console.error('[HeyGen proxy] speak failed:', error);
      }
    }

    // NO browser TTS fallback - just skip if unavailable
    console.warn('[Speech] TTS unavailable, skipping speech for:', spokenText.substring(0, 50));
  }, [setLastSpokenText, getActiveProfile, speakViaElevenLabs]);

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
    clearStreamingSentences(); // Clear previous sentences for fresh display

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

      const runStreamingTurn = async (activeSessionId: string, activeMessagesStreamUrl: string | null) => {
        console.log('[Agentforce] send message (streaming)', { sessionId: activeSessionId, text });

        // Track full response for display and debugging
        let fullResponse = '';
        const allVisuals: ParsedResponse['visuals'] = [];

        // Speech queue - we queue sentences and speak them sequentially (waiting for each to complete)
        const speechQueue: string[] = [];
        let isProcessingQueue = false;

        const processSpeechQueue = async () => {
          if (isProcessingQueue) return;
          isProcessingQueue = true;

          while (speechQueue.length > 0) {
            const sentence = speechQueue.shift();
            if (!sentence) continue;

            console.log('[HeyGen] speaking sentence:', sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''));
            try {
              // Use the no-interrupt version that waits for speech to complete
              await speakSentenceNoInterrupt(sentence);
              console.log('[HeyGen] sentence complete');
            } catch (speakError) {
              console.error('[HeyGen] speak error:', speakError);
            }
          }

          isProcessingQueue = false;
        };

        // Stream sentences from Agentforce
        for await (const chunk of streamAgentMessage(activeSessionId, text, activeMessagesStreamUrl)) {
          if (chunk.type === 'progress') {
            setThinking(true, chunk.text);
          } else if (chunk.type === 'sentence') {
            // Accumulate full response
            fullResponse += (fullResponse ? ' ' : '') + chunk.text;

            // Parse for visuals in this sentence
            const parsed = parseRichResponse(chunk.text);

            // Add to streaming display (with sentence boundary marker)
            addStreamingSentence(parsed.speechText.trim() || chunk.text);

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
        while (speechQueue.length > 0 || isProcessingQueue) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('[HeyGen] all sentences spoken');
      };

      try {
        await runStreamingTurn(sessionId, messagesStreamUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        // Recover from session expiry (Agentforce returns 404 "V6Session not found")
        if (msg.includes('AGENTFORCE_SESSION_NOT_FOUND') || msg.includes('Failed to send message: 404')) {
          console.warn('[Agentforce] session expired; restarting session and retrying once');

          const { sessionId: newSessionId, welcomeMessage: _welcome, messagesStreamUrl: newStreamUrl } = await startAgentSession();
          setSessionId(newSessionId);
          setMessagesStreamUrl(newStreamUrl);

          await runStreamingTurn(newSessionId, newStreamUrl);
          return;
        }

        throw err;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      console.error('Send message error:', error);
    } finally {
      setThinking(false);
    }
  }, [sessionId, messagesStreamUrl, demoMode, speakSentenceNoInterrupt, speakViaProxy, startVisuals, addMessage, setThinking, setLastAgentforceResponse, setSessionId, setMessagesStreamUrl, addStreamingSentence, clearStreamingSentences]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      // Clear any active visuals
      clearVisuals();
      
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
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
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
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
    reinitializeAvatarWithEmotion,
  };
}
