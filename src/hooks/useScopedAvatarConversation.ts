import { useCallback, useRef, useEffect } from 'react';
import StreamingAvatar, { AvatarQuality, ElevenLabsModel, StreamingEvents, TaskType, TaskMode, VoiceEmotion } from '@heygen/streaming-avatar';
import { startAgentSession, endAgentSession, streamAgentMessage, type StreamChunk } from '@/services/api';
import { createHeyGenToken, speakText, stopStreaming, interruptSpeaking } from '@/services/heygenProxy';
import { ElevenLabsTTSError, synthesizeSpeech } from '@/services/elevenLabsTTS';
import type { ConversationState } from '@/stores/createConversationStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import { useSlideOverlayStore } from '@/stores/slideOverlayStore';
import { useScoreOverlayStore } from '@/stores/scoreOverlayStore';
import { useCountdownStore } from '@/stores/countdownStore';
import type { AppVoiceSettings } from '@/stores/appVoiceSettingsStore';
import { parseRichResponse, type ParsedResponse, type VisualCommand } from '@/lib/richResponseParser';
import { parseStructuredResponse } from '@/lib/structuredResponseParser';
import { useStructuredActions } from '@/hooks/useStructuredActions';
import { findHardcodedTrigger } from '@/lib/hardcodedTriggers';
import { debugLog } from '@/stores/debugStore';
import { toast } from 'sonner';
import type { StoreApi, UseBoundStore } from 'zustand';

// Demo responses removed - using live Agentforce only

const MIGUEL_AVATAR_ID = '26c21d9041654675aa0c2eb479c7d341';
const VALID_AVATAR_IDS = new Set([MIGUEL_AVATAR_ID]);

export const HEYGEN_VOICES = {
  miguel: { id: '35f1601abcf94ebd8970b08047d777f9', name: 'Miguel (Original)' },
  alternative: { id: 'bce4554224e440f8a318a365e089b48a', name: 'Alternative Voice' },
} as const;

export type HeyGenVoiceKey = keyof typeof HEYGEN_VOICES;

interface ScopedAvatarConversationOptions {
  /** The Zustand store to use for this conversation instance */
  store: UseBoundStore<StoreApi<ConversationState>>;
  /** Voice settings for this app instance */
  voiceSettings: AppVoiceSettings;
  /** Default agent ID to use */
  defaultAgentId: string;
  /** Available agents for this app */
  availableAgents: { id: string; name: string }[];
  /** Whether to use JSON response mode by default */
  useJsonMode?: boolean;
}

/**
 * Scoped avatar conversation hook that accepts a specific store instance.
 * This enables running multiple independent conversations in parallel.
 */
export function useScopedAvatarConversation(options: ScopedAvatarConversationOptions) {
  const { store, voiceSettings, defaultAgentId, useJsonMode = true } = options;
  
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const heygenSessionRef = useRef<string | null>(null);
  const agentforceSessionIdRef = useRef<string | null>(null);
  const agentforceMessagesStreamUrlRef = useRef<string | null>(null);
  const agentforceAgentIdRef = useRef<string | null>(null);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heygenDispatchQueueRef = useRef<Promise<void>>(Promise.resolve());
  const speechResolveRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const elevenLabsAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastElevenLabsToastAtRef = useRef<number>(0);
  const isProcessingMessageRef = useRef(false); // Guard against concurrent messages

  // Use scoped store
  const {
    sessionId,
    messagesStreamUrl,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isThinking,
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
  } = store();

  // Keep refs in sync
  useEffect(() => {
    agentforceSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    agentforceMessagesStreamUrlRef.current = messagesStreamUrl;
  }, [messagesStreamUrl]);

  const { startVisuals, clearVisuals } = useVisualOverlayStore();
  const { hideSlide } = useSlideOverlayStore();
  const { hideScore } = useScoreOverlayStore();
  const { stopCountdown } = useCountdownStore();
  const { executeActions, applyData } = useStructuredActions();

  const maybeToastElevenLabsError = useCallback((err: unknown) => {
    const now = Date.now();
    if (now - lastElevenLabsToastAtRef.current < 8000) return;

    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    if (err instanceof ElevenLabsTTSError) {
      if (err.code === 'quota_exceeded' || lower.includes('quota')) {
        toast.error('ElevenLabs quota exceeded — falling back to avatar voice.');
        lastElevenLabsToastAtRef.current = now;
        return;
      }
      if (err.code === 'missing_permissions') {
        toast.error('ElevenLabs key missing TTS permission — falling back to avatar voice.');
        lastElevenLabsToastAtRef.current = now;
        return;
      }
    }

    if (lower.includes('elevenlabs')) {
      toast.error('ElevenLabs TTS failed — falling back to avatar voice.');
      lastElevenLabsToastAtRef.current = now;
    }
  }, []);

  // Initialize HeyGen Avatar
  const initializeAvatar = useCallback(async (videoElement: HTMLVideoElement, heygenApiKeyName?: string) => {
    try {
      const token = await createHeyGenToken(heygenApiKeyName);
      tokenRef.current = token;
      
      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      avatar.on(StreamingEvents.STREAM_READY, (event) => {
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

      const selectedVoiceId = HEYGEN_VOICES[voiceSettings.heygenVoice].id;
      const selectedEmotion = VoiceEmotion.EXCITED;

      const sessionInfo = await avatar.createStartAvatar({
        quality: 'very_high' as AvatarQuality,
        avatarName: MIGUEL_AVATAR_ID,
        voice: {
          voiceId: selectedVoiceId,
          emotion: selectedEmotion,
          rate: voiceSettings.voiceSettings.rate,
          model: ElevenLabsModel.eleven_multilingual_v2,
          elevenlabsSettings: {
            stability: voiceSettings.voiceSettings.stability,
            similarity_boost: voiceSettings.voiceSettings.similarityBoost,
            style: voiceSettings.voiceSettings.style,
            use_speaker_boost: voiceSettings.voiceSettings.useSpeakerBoost,
          },
        },
      });

      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }

      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      keepAliveIntervalRef.current = setInterval(async () => {
        if (avatarRef.current && !isSpeakingRef.current) {
          try {
            await avatarRef.current.keepAlive();
          } catch (e) {
            console.warn('[HeyGen] Keep-alive failed:', e);
          }
        }
      }, 60000);

      return avatar;
    } catch (error) {
      console.error('Failed to initialize avatar:', error);
      throw error;
    }
  }, [setSpeaking, setListening, voiceSettings]);

  // Speak via HeyGen without interrupt (streaming mode)
  const speakSentenceNoInterrupt = useCallback(async (text: string): Promise<void> => {
    const spokenText = text
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\(([^\)]*)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    setLastSpokenText(spokenText);
    if (!spokenText) return;

    if (avatarRef.current) {
      try {
        const avatar = avatarRef.current;
        const dispatch = async () => {
          await avatar.speak({
            text: spokenText,
            task_type: TaskType.REPEAT,
            taskMode: TaskMode.ASYNC,
          });
        };

        const chained = heygenDispatchQueueRef.current.then(dispatch);
        heygenDispatchQueueRef.current = chained.catch((err) => {
          console.warn('[HeyGen] Dispatch error (continuing):', err);
        });

        return;
      } catch (error) {
        console.error('[HeyGen SDK] speak failed:', error);
      }
    }

    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await speakText(tokenRef.current, heygenSessionRef.current, spokenText);
        return;
      } catch (error) {
        console.error('[HeyGen proxy] speak failed:', error);
      }
    }
  }, [setLastSpokenText]);

  // Speak with interrupt (for welcome message, etc.)
  const speakViaProxy = useCallback(async (text: string) => {
    const spokenText = text
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]\(([^\)]*)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    setLastSpokenText(spokenText);
    if (!spokenText) return;

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
        console.error('[HeyGen SDK] speak failed:', error);
      }
    }

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
  }, [setLastSpokenText]);

  // Start conversation
  const startConversation = useCallback(async (
    videoElement?: HTMLVideoElement | null,
    agentId?: string,
    heygenApiKeyName?: string
  ) => {
    const targetAgentId = agentId || defaultAgentId;
    console.log('[startConversation] agentId param:', agentId);
    console.log('[startConversation] defaultAgentId:', defaultAgentId);
    console.log('[startConversation] targetAgentId:', targetAgentId);
    debugLog('state-change', 'Conversation', 'Starting conversation', { agentId: targetAgentId });
    setConnecting(true);
    setError(null);
    clearVisuals();

    try {
      agentforceAgentIdRef.current = targetAgentId;

      // Start Agentforce session
      const { sessionId: newSessionId, welcomeMessage, messagesStreamUrl: newStreamUrl } = await startAgentSession(targetAgentId);
      setSessionId(newSessionId);
      setMessagesStreamUrl(newStreamUrl);
      setConnected(true);

      if (welcomeMessage) setLastAgentforceResponse(welcomeMessage);

      // Initialize HeyGen
      if (videoElement) {
        try {
          await initializeAvatar(videoElement, heygenApiKeyName);
        } catch (avatarError) {
          console.error('[HeyGen] avatar init failed:', avatarError);
          toast.warning('Avatar is temporarily unavailable; continuing with Agentforce.');
        }
      }

      // Speak welcome message
      if (welcomeMessage) {
        const parsed = parseRichResponse(welcomeMessage);
        addMessage({ role: 'assistant', content: parsed.displayText });
        
        if (parsed.hasRichContent) {
          startVisuals(parsed.visuals);
        }
        
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
    } finally {
      setConnecting(false);
    }
  }, [initializeAvatar, speakViaProxy, clearVisuals, startVisuals, setConnecting, setConnected, setSessionId, setMessagesStreamUrl, setError, addMessage, setLastAgentforceResponse, defaultAgentId]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Prevent concurrent messages (causes 423 "Locked" errors from Salesforce)
    if (isProcessingMessageRef.current) {
      console.warn('[sendMessage] Skipping - already processing a message');
      toast.info('Please wait for the current response...');
      return;
    }
    isProcessingMessageRef.current = true;

    addMessage({ role: 'user', content: text });
    setThinking(true, 'Thinking...');
    clearStreamingSentences();

    try {
      // Check hardcoded triggers first
      console.log('[sendMessage] Checking triggers for text:', text);
      const hardcodedTrigger = findHardcodedTrigger(text);
      console.log('[sendMessage] Trigger found:', hardcodedTrigger ? hardcodedTrigger.keywords[0] : 'none');
      if (hardcodedTrigger) {
        debugLog('trigger', 'Video', `🎬 Playing: ${hardcodedTrigger.keywords[0]}`);
        addMessage({ role: 'assistant', content: hardcodedTrigger.speech });
        setLastAgentforceResponse(hardcodedTrigger.speech);
        
        const triggerVisuals: VisualCommand[] = [];
        if (hardcodedTrigger.video) {
          triggerVisuals.push({
            id: `trigger_video_${Date.now()}`,
            type: 'video',
            src: hardcodedTrigger.video.src,
            duration: hardcodedTrigger.video.duration,
            position: hardcodedTrigger.video.position,
            startOffset: 0,
          });
        }
        if (hardcodedTrigger.image) {
          triggerVisuals.push({
            id: `trigger_image_${Date.now()}`,
            type: 'image',
            src: hardcodedTrigger.image.src,
            duration: hardcodedTrigger.image.duration,
            position: hardcodedTrigger.image.position,
            startOffset: 0,
          });
        }
        
        if (triggerVisuals.length > 0) {
          startVisuals(triggerVisuals);
        }
        
        // Video call escalation removed
        
        setThinking(false);
        
        if (hardcodedTrigger.speech.trim()) {
          setSpeaking(true);
          try {
            await speakViaProxy(hardcodedTrigger.speech);
          } finally {
            setSpeaking(false);
          }
        }
        
        return;
      }


      const activeSessionId = agentforceSessionIdRef.current;
      const activeStreamUrl = agentforceMessagesStreamUrlRef.current;

      if (!activeSessionId) {
        throw new Error('No active Agentforce session');
      }

      const runStreamingTurn = async (sid: string, streamUrl: string | null) => {
        let fullResponse = '';
        const allVisuals: ParsedResponse['visuals'] = [];
        const seenSentenceKeys = new Set<string>();
        const normalizeSentenceKey = (s: string) =>
          s.toLowerCase().replace(/\s+/g, ' ').replace(/\b(agent)\s+(force)\b/g, '$1$2').replace(/(\d)\s+(\d)/g, '$1$2').replace(/\s+([,.;:!?])/g, '$1').trim();

        let speechPromises: Promise<void>[] = [];

        for await (const chunk of streamAgentMessage(sid, text, streamUrl)) {
          if (chunk.type === 'progress') {
            setThinking(true, chunk.text);
          } else if (chunk.type === 'sentence') {
            const rawSentence = chunk.text;
            const sentenceKey = normalizeSentenceKey(rawSentence);
            if (!sentenceKey || seenSentenceKeys.has(sentenceKey)) continue;
            seenSentenceKeys.add(sentenceKey);

            fullResponse += (fullResponse ? ' ' : '') + rawSentence;

            if (!useJsonMode) {
              const parsed = parseRichResponse(chunk.text);
              addStreamingSentence(parsed.speechText.trim() || chunk.text);

              if (parsed.hasRichContent) {
                startVisuals(parsed.visuals);
                allVisuals.push(...parsed.visuals);
              }

              if (parsed.speechText.trim()) {
                speechPromises.push(speakSentenceNoInterrupt(parsed.speechText.trim()));
              }
            }
          }
        }

        setLastAgentforceResponse(fullResponse);

        if (fullResponse) {
          // Log the response for remote debug viewer
          debugLog('agentforce-response', 'Miguel', `💬 ${fullResponse}`);
          if (useJsonMode) {
            const structured = parseStructuredResponse(fullResponse);
            addStreamingSentence(structured.speechText);
            
            // Auto-hide overlays unless this message explicitly includes them
            // This prevents stale overlays from staying visible when moving to a new topic
            const actionTypes = new Set(structured.actions.map(a => a.type));
            
            if (!actionTypes.has('slide')) {
              hideSlide();
            }
            if (!actionTypes.has('score')) {
              hideScore();
            }
            if (!actionTypes.has('countdown')) {
              stopCountdown();
            }
            
            if (structured.actions.length > 0) {
              executeActions(structured.actions);
            }

            if (structured.data) {
              applyData(structured.data);
            }

            if (structured.speechText.trim()) {
              speechPromises.push(speakSentenceNoInterrupt(structured.speechText.trim()));
            }

            const richParsed = parseRichResponse(structured.speechText);
            if (richParsed.hasRichContent) {
              startVisuals(richParsed.visuals);
            }

            addMessage({ role: 'assistant', content: structured.speechText });
          } else {
            const finalParsed = parseRichResponse(fullResponse);
            addMessage({ role: 'assistant', content: finalParsed.displayText });
          }
        }

        // Wait for all speech to complete before returning
        // This ensures lip-sync stays synchronized with the text
        if (speechPromises.length > 0) {
          await Promise.all(speechPromises);
        }
        // Also wait for the HeyGen dispatch queue to drain
        await heygenDispatchQueueRef.current;
      };

      try {
        await runStreamingTurn(activeSessionId, activeStreamUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        
        if (msg.includes('AGENTFORCE_SESSION_NOT_FOUND') || msg.includes('V6Session not found') || msg.includes('404')) {
          toast.info('Session expired, reconnecting...');

          try {
            const agentIdForRecovery = agentforceAgentIdRef.current ?? defaultAgentId;
            const { sessionId: newSid, messagesStreamUrl: newUrl } = await startAgentSession(agentIdForRecovery);
            setSessionId(newSid);
            setMessagesStreamUrl(newUrl);

            await runStreamingTurn(newSid, newUrl);
            toast.success('Reconnected successfully!');
            return;
          } catch (retryErr) {
            throw new Error('Failed to reconnect. Please try again.');
          }
        }

        throw err;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setThinking(false);
      isProcessingMessageRef.current = false; // Allow new messages
    }
  }, [speakSentenceNoInterrupt, speakViaProxy, startVisuals, addMessage, setThinking, setLastAgentforceResponse, setSessionId, setMessagesStreamUrl, addStreamingSentence, clearStreamingSentences, executeActions, applyData, useJsonMode, defaultAgentId, setSpeaking, hideSlide, hideScore, stopCountdown]);

  // Interrupt avatar speech and clear queue
  const interruptAvatar = useCallback(async () => {
    debugLog('state-change', 'Conversation', 'Interrupting avatar speech');
    
    // Reset the dispatch queue to prevent pending sentences from playing
    heygenDispatchQueueRef.current = Promise.resolve();
    
    // Interrupt via SDK
    if (avatarRef.current) {
      try {
        await avatarRef.current.interrupt();
      } catch (e) {
        console.warn('[HeyGen] SDK interrupt error:', e);
      }
    }
    
    // Fallback: interrupt via proxy
    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await interruptSpeaking(tokenRef.current, heygenSessionRef.current);
      } catch (e) {
        console.warn('[HeyGen] Proxy interrupt error:', e);
      }
    }
    
    // Clear speaking state
    isSpeakingRef.current = false;
    setSpeaking(false);
    setThinking(false);
    
    // Resolve any pending speech promise
    if (speechResolveRef.current) {
      speechResolveRef.current();
      speechResolveRef.current = null;
    }
    
    toast.info('Interrupted');
  }, [setSpeaking, setThinking]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      clearVisuals();
      
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      if (sessionId) {
        await endAgentSession(sessionId);
      }

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
  }, [sessionId, reset, clearVisuals]);

  // Cleanup
  useEffect(() => {
    return () => {
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
    interruptAvatar,
    setListening,
  };
}
