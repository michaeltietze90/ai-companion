import { useCallback, useRef, useEffect } from 'react';
import StreamingAvatar, { AvatarQuality, ElevenLabsModel, StreamingEvents, TaskType, TaskMode, VoiceEmotion } from '@heygen/streaming-avatar';
import { startAgentSession, endAgentSession, sendAgentMessage, streamAgentMessage, type StreamChunk } from '@/services/api';
import { createHeyGenToken, speakText, stopStreaming, interruptSpeaking } from '@/services/heygenProxy';
import { ElevenLabsTTSError, synthesizeSpeech } from '@/services/elevenLabsTTS';
import { useConversationStore } from '@/stores/conversationStore';
import { useVisualOverlayStore } from '@/stores/visualOverlayStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { parseRichResponse, type ParsedResponse, type VisualCommand } from '@/lib/richResponseParser';
import { parseStructuredResponse } from '@/lib/structuredResponseParser';
import { useStructuredActions } from '@/hooks/useStructuredActions';
import { findHardcodedTrigger } from '@/lib/hardcodedTriggers';
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

// Known valid Interactive Avatar IDs
const VALID_AVATAR_IDS = new Set([
  '26c21d9041654675aa0c2eb479c7d341', // Miguel
]);

// Available HeyGen voices
export const HEYGEN_VOICES = {
  miguel: { id: '35f1601abcf94ebd8970b08047d777f9', name: 'Miguel (Original)' },
  alternative: { id: 'bce4554224e440f8a318a365e089b48a', name: 'Alternative Voice' },
} as const;

export type HeyGenVoiceKey = keyof typeof HEYGEN_VOICES;

export function useAvatarConversation() {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const heygenSessionRef = useRef<string | null>(null);
  // Agentforce session refs (avoid stale closures after reconnects)
  const agentforceSessionIdRef = useRef<string | null>(null);
  const agentforceMessagesStreamUrlRef = useRef<string | null>(null);
  // Track which agent we started with so session recovery targets the same agent.
  const agentforceAgentIdRef = useRef<string | null>(null);
  const demoIndexRef = useRef(0);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ensures we dispatch speech requests to HeyGen in strict order.
  // Without this, concurrent ASYNC speak() calls can reach the server out-of-order.
  const heygenDispatchQueueRef = useRef<Promise<void>>(Promise.resolve());
  
  // Speech completion tracking
  const speechResolveRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  
  // ElevenLabs audio element reference
  const elevenLabsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Avoid spamming quota/permission toasts for every sentence
  const lastElevenLabsToastAtRef = useRef<number>(0);

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

    // Generic fallback
    if (lower.includes('elevenlabs')) {
      toast.error('ElevenLabs TTS failed — falling back to avatar voice.');
      lastElevenLabsToastAtRef.current = now;
    }
  }, []);
  
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

  // Keep refs in sync with store values.
  useEffect(() => {
    agentforceSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    agentforceMessagesStreamUrlRef.current = messagesStreamUrl;
  }, [messagesStreamUrl]);

  const { startVisuals, clearVisuals } = useVisualOverlayStore();
  const getActiveProfile = useSettingsStore((state) => state.getActiveProfile);
  const { executeActions, applyData } = useStructuredActions();

  // Initialize HeyGen Avatar with token (supports custom API key name)
  const initializeAvatar = useCallback(async (videoElement: HTMLVideoElement, heygenApiKeyName?: string) => {
    try {
      // Get token - use custom API key if specified
      const token = await createHeyGenToken(heygenApiKeyName);
      tokenRef.current = token;
      console.log('[HeyGen] Got token', heygenApiKeyName ? `using ${heygenApiKeyName}` : 'from Proto endpoint');
      
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

      // Get avatar from settings, fallback to Miguel if invalid
      const activeProfile = getActiveProfile();
      let selectedAvatarId = activeProfile?.selectedAvatarId || MIGUEL_AVATAR_ID;
      
      // Validate avatar ID - fallback to Miguel if not in known valid list
      if (!VALID_AVATAR_IDS.has(selectedAvatarId)) {
        console.warn('[HeyGen] Stored avatar ID not valid, falling back to Miguel:', selectedAvatarId);
        selectedAvatarId = MIGUEL_AVATAR_ID;
      }
      console.log('[HeyGen] Using avatar:', selectedAvatarId);
      
      // Get voice from settings
      const selectedVoiceKey = activeProfile?.heygenVoice || 'miguel';
      const selectedVoiceId = HEYGEN_VOICES[selectedVoiceKey].id;
      console.log('[HeyGen] Using voice:', selectedVoiceKey, selectedVoiceId);

      // Get voice tuning settings from profile
      const voiceSettings = activeProfile?.heygenVoiceSettings || {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true,
        rate: 1.0,
      };
      console.log('[HeyGen] Voice settings:', voiceSettings);

      // HARDCODED: Always use EXCITED emotion
      const selectedEmotion = VoiceEmotion.EXCITED;
      console.log('[HeyGen] Using emotion: EXCITED (hardcoded)');

      // Create avatar session with very_high quality for Miguel
      // IMPORTANT: disableIdleTimeout is NOT set (defaults to false) to prevent draining hours
      const sessionInfo = await avatar.createStartAvatar({
        quality: 'very_high' as AvatarQuality, // Use very_high for best resolution
        avatarName: selectedAvatarId,
        voice: {
          voiceId: selectedVoiceId,
          emotion: selectedEmotion,
          rate: voiceSettings.rate,
          model: ElevenLabsModel.eleven_multilingual_v2, // Use multilingual model for better quality
          elevenlabsSettings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.useSpeakerBoost,
          },
        },
      });
      
      console.log('Avatar session created and streaming started:', sessionInfo);
      
      // Store the HeyGen session ID for speak calls
      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }

      // Set up keep-alive interval (every 25 seconds) to prevent idle timeout
      // HeyGen sessions can timeout after ~30s of inactivity
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      keepAliveIntervalRef.current = setInterval(async () => {
        if (avatarRef.current && !isSpeakingRef.current) {
          try {
            console.log('[HeyGen] Sending keep-alive ping');
            // Send an empty speak task to keep the connection alive
            // Using REPEAT task type with empty/whitespace text won't produce audio
            await avatarRef.current.speak({ 
              text: ' ', // Single space - enough to ping without audible output
              task_type: TaskType.REPEAT 
            });
          } catch (e) {
            console.warn('[HeyGen] Keep-alive failed:', e);
            // If keepalive fails, the session may have expired
            // We don't auto-reconnect here; user will see issues on next speak
          }
        }
      }, 25000); // Every 25 seconds (before 30s timeout)

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
      
      // Get voice from settings
      const activeProfile = getActiveProfile();
      const selectedVoiceKey = activeProfile?.heygenVoice || 'miguel';
      const selectedVoiceId = HEYGEN_VOICES[selectedVoiceKey].id;
      
      // Get voice tuning settings from profile
      const voiceSettings = activeProfile?.heygenVoiceSettings || {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true,
        rate: 1.0,
      };
      
      // Create new session
      const sessionInfo = await avatar.createStartAvatar({
        quality: 'very_high' as AvatarQuality, // Use very_high for best resolution
        avatarName: MIGUEL_AVATAR_ID,
        voice: {
          voiceId: selectedVoiceId,
          emotion: selectedEmotion,
          rate: voiceSettings.rate,
          model: ElevenLabsModel.eleven_multilingual_v2, // Use multilingual model for better quality
          elevenlabsSettings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.useSpeakerBoost,
          },
        },
      });
      
      if (sessionInfo?.session_id) {
        heygenSessionRef.current = sessionInfo.session_id;
      }
      
      // Restart keep-alive with actual ping
      keepAliveIntervalRef.current = setInterval(async () => {
        if (avatarRef.current && !isSpeakingRef.current) {
          try {
            console.log('[HeyGen] Keep-alive ping');
            await avatarRef.current.speak({ 
              text: ' ', 
              task_type: TaskType.REPEAT 
            });
          } catch (e) {
            console.warn('[HeyGen] Keep-alive failed:', e);
          }
        }
      }, 25000);
      
      console.log('[HeyGen] Avatar reinitialized with emotion:', newEmotion);
      toast.success(`Emotion changed to ${newEmotion}!`);
      
    } catch (error) {
      console.error('[HeyGen] Failed to reinitialize avatar:', error);
      toast.error('Failed to change emotion. Avatar may be temporarily unavailable.');
      throw error;
    }
  }, [setSpeaking, setListening]);

  // Wait for avatar to finish speaking (resolves on AVATAR_STOP_TALKING event)
  // Uses a shorter timeout to prevent long delays if event doesn't fire
  const waitForSpeechComplete = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // If not currently speaking, resolve immediately
      if (!isSpeakingRef.current) {
        resolve();
        return;
      }
      
      // Set a shorter timeout - don't hang forever if event doesn't fire
      // HeyGen speak calls typically complete within a few seconds
      const timeout = setTimeout(() => {
        console.warn('[Speech] Timeout waiting for avatar to stop talking (continuing)');
        isSpeakingRef.current = false; // Reset state to unblock queue
        speechResolveRef.current = null;
        resolve();
      }, 8000); // 8 second max per sentence (much shorter than 30s)
      
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

  // Speak text using ASYNC mode - HeyGen queues internally for smooth streaming
  // This enables true streaming without visual glitches between chunks
  const speakSentenceNoInterrupt = useCallback(async (text: string): Promise<void> => {
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
    
    // Use ElevenLabs TTS (plays audio separately from HeyGen video)
    if (useElevenLabs) {
      try {
        await speakViaElevenLabs(spokenText);
        return;
      } catch (error) {
        console.error('[ElevenLabs TTS] speak failed:', error);
        maybeToastElevenLabsError(error);
        // Fall through to HeyGen as backup
      }
    }

    // Preferred: use the HeyGen SDK with ASYNC mode for smooth queuing.
    // IMPORTANT: we still serialize *dispatch* to preserve sentence order.
    if (avatarRef.current) {
      try {
        console.log('[HeyGen] Queueing speech (ASYNC):', spokenText.substring(0, 40) + '...');

        const avatar = avatarRef.current;
        const dispatch = async () => {
          await avatar.speak({
            text: spokenText,
            task_type: TaskType.REPEAT,
            taskMode: TaskMode.ASYNC,
          });
        };

        // Chain dispatch to guarantee ordering while keeping streaming non-blocking.
        const chained = heygenDispatchQueueRef.current.then(dispatch);
        // Prevent the queue from getting stuck on a single rejection.
        heygenDispatchQueueRef.current = chained.catch(() => undefined);

        await chained;
        return;
      } catch (error) {
        console.error('[HeyGen SDK] speak failed, trying proxy:', error);
      }
    }

    // Fallback: direct API calls via our proxy (still blocking for now)
    if (tokenRef.current && heygenSessionRef.current) {
      try {
        await speakText(tokenRef.current, heygenSessionRef.current, spokenText);
        return;
      } catch (error) {
        console.error('[HeyGen proxy] speak failed:', error);
      }
    }

    // NO browser TTS fallback - just skip if unavailable
    console.warn('[Speech] TTS unavailable, skipping speech for:', spokenText.substring(0, 50));
  }, [setLastSpokenText, getActiveProfile, speakViaElevenLabs, maybeToastElevenLabsError]);

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
        maybeToastElevenLabsError(error);
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
  }, [setLastSpokenText, getActiveProfile, speakViaElevenLabs, maybeToastElevenLabsError]);

  // Start full conversation (HeyGen + Agentforce)
  // IMPORTANT: Agentforce should still connect even if HeyGen is down / rate-limited.
  // Optional agentId parameter overrides the default from settings/env
  // Optional heygenApiKeyName parameter uses a specific HeyGen API key
  const startConversation = useCallback(async (
    videoElement?: HTMLVideoElement | null, 
    agentId?: string,
    heygenApiKeyName?: string
  ) => {
    setConnecting(true);
    setError(null);
    clearVisuals();

    try {
      // Remember current agent target for reconnects.
      agentforceAgentIdRef.current = agentId ?? null;

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
      // Pass agentId override if provided
      const { sessionId: newSessionId, welcomeMessage, messagesStreamUrl } = await startAgentSession(agentId);
      setSessionId(newSessionId);
      setMessagesStreamUrl(messagesStreamUrl);
      setConnected(true);

      // Capture welcome message as "Agentforce reply" for debugging
      if (welcomeMessage) setLastAgentforceResponse(welcomeMessage);

      // 2) Try to initialize HeyGen video (optional). If it fails, keep Agentforce running.
      if (videoElement) {
        try {
          await initializeAvatar(videoElement, heygenApiKeyName);
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
      // Check for hardcoded triggers (easter eggs) FIRST - bypass Agentforce entirely
      const hardcodedTrigger = findHardcodedTrigger(text);
      if (hardcodedTrigger) {
        console.log('[Hardcoded Trigger] Matched:', hardcodedTrigger.keywords[0]);
        
        // Add assistant message
        addMessage({ role: 'assistant', content: hardcodedTrigger.speech });
        setLastAgentforceResponse(hardcodedTrigger.speech);
        
        // Build visuals if any
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
        
        // Start visuals
        if (triggerVisuals.length > 0) {
          startVisuals(triggerVisuals);
        }
        
        // Speak the response directly via HeyGen
        setThinking(false);
        setSpeaking(true);
        
        try {
          await speakSentenceNoInterrupt(hardcodedTrigger.speech);
        } finally {
          setSpeaking(false);
        }
        
        return;
      }
      
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

      // IMPORTANT: always read the latest session from refs (not the closure)
      // so we never send against an old session after a reconnect.
      const activeSessionId = agentforceSessionIdRef.current;
      const activeStreamUrl = agentforceMessagesStreamUrlRef.current;

      if (!activeSessionId) {
        throw new Error('No active Agentforce session (sessionId missing)');
      }

      const runStreamingTurn = async (activeSessionId: string, activeMessagesStreamUrl: string | null) => {
        console.log('[Agentforce] send message (streaming)', { sessionId: activeSessionId, text });

        // Check if JSON mode is enabled for this profile
        const activeProfile = getActiveProfile();
        const useJsonMode = activeProfile?.responseMode === 'json';
        console.log('[Response Mode]', useJsonMode ? 'JSON (structured)' : 'Text (plain)');

        // Track full response for display and debugging
        let fullResponse = '';
        const allVisuals: ParsedResponse['visuals'] = [];

        // With ASYNC TaskMode, HeyGen queues speech internally
        // We can send sentences immediately for true low-latency streaming
        let speechPromises: Promise<void>[] = [];

        // Stream sentences from Agentforce
        for await (const chunk of streamAgentMessage(activeSessionId, text, activeMessagesStreamUrl)) {
          if (chunk.type === 'progress') {
            setThinking(true, chunk.text);
          } else if (chunk.type === 'sentence') {
            // Accumulate full response
            fullResponse += (fullResponse ? ' ' : '') + chunk.text;

            // For plain text mode, use rich response parser for visual tags
            if (!useJsonMode) {
              // Parse for visuals in this sentence
              const parsed = parseRichResponse(chunk.text);

              // Add to streaming display
              addStreamingSentence(parsed.speechText.trim() || chunk.text);

              // Start any visuals immediately
              if (parsed.hasRichContent) {
                console.log('[Rich Response] Starting visuals from sentence:', parsed.visuals);
                startVisuals(parsed.visuals);
                allVisuals.push(...parsed.visuals);
              }

              // Send to HeyGen immediately - ASYNC mode queues internally
              if (parsed.speechText.trim()) {
                const speakPromise = speakSentenceNoInterrupt(parsed.speechText.trim());
                speechPromises.push(speakPromise);
              }
            }
            // JSON mode sentences are accumulated and parsed at the end
          } else if (chunk.type === 'done') {
            console.log('[Agentforce] stream complete');
          }
        }

        // Store full response for debugging
        setLastAgentforceResponse(fullResponse);

        // Process the complete response
        if (fullResponse) {
          if (useJsonMode) {
            // JSON mode: parse structured response
            const structured = parseStructuredResponse(fullResponse);
            console.log('[Structured Response] Parsed:', {
              isStructured: structured.isStructured,
              speechText: structured.speechText.substring(0, 50) + '...',
              actionsCount: structured.actions.length,
              hasData: !!structured.data,
            });

            // Add speech text to display
            addStreamingSentence(structured.speechText);
            
            // Execute any actions (showNameEntry, showLeaderboard, showVisual, etc.)
            if (structured.actions.length > 0) {
              executeActions(structured.actions);
            }

            // Apply prefill data
            if (structured.data) {
              applyData(structured.data);
            }

            // Speak the response text
            if (structured.speechText.trim()) {
              const speakPromise = speakSentenceNoInterrupt(structured.speechText.trim());
              speechPromises.push(speakPromise);
            }

            // Also parse for any visual tags in the speech text (hybrid support)
            const richParsed = parseRichResponse(structured.speechText);
            if (richParsed.hasRichContent) {
              startVisuals(richParsed.visuals);
            }

            addMessage({ role: 'assistant', content: structured.speechText });
          } else {
            // Plain text mode: use rich response parser
            const finalParsed = parseRichResponse(fullResponse);
            addMessage({ role: 'assistant', content: finalParsed.displayText });
          }
        }

        // Speech commands are dispatched immediately via ASYNC mode as chunks arrive
        // No need to wait here - HeyGen queues internally and plays in order
        // This enables true parallel streaming: speaking starts while chunks still arrive
        console.log('[HeyGen] All speech commands dispatched (ASYNC mode - no blocking wait)');
      };

      try {
        await runStreamingTurn(activeSessionId, activeStreamUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Agentforce] Error during message:', msg);

        // Recover from session expiry (Agentforce returns 404 "V6Session not found")
        if (msg.includes('AGENTFORCE_SESSION_NOT_FOUND') || msg.includes('V6Session not found') || msg.includes('404')) {
          console.warn('[Agentforce] Session expired; restarting session and retrying once');
          toast.info('Session expired, reconnecting...');

          try {
            const agentIdForRecovery = agentforceAgentIdRef.current ?? undefined;
            const { sessionId: newSessionId, welcomeMessage: _welcome, messagesStreamUrl: newStreamUrl } = await startAgentSession(agentIdForRecovery);
            console.log('[Agentforce] New session created:', newSessionId);
            setSessionId(newSessionId);
            setMessagesStreamUrl(newStreamUrl);

            // Retry with new session
            await runStreamingTurn(newSessionId, newStreamUrl);
            toast.success('Reconnected successfully!');
            return;
          } catch (retryErr) {
            console.error('[Agentforce] Retry failed:', retryErr);
            throw new Error('Failed to reconnect to AI assistant. Please try again.');
          }
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
  }, [sessionId, messagesStreamUrl, demoMode, speakSentenceNoInterrupt, speakViaProxy, startVisuals, addMessage, setThinking, setLastAgentforceResponse, setSessionId, setMessagesStreamUrl, addStreamingSentence, clearStreamingSentences, getActiveProfile, executeActions, applyData]);

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
