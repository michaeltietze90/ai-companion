const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export class ElevenLabsTTSError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, opts: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ElevenLabsTTSError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export interface TTSOptions {
  voiceId?: string;
  emotion?: 'excited' | 'friendly' | 'serious' | 'soothing' | 'broadcaster';
  speed?: number;
}

// Popular ElevenLabs voice IDs
export const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Natural, expressive female voice' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm British male voice' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Young American male voice' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Friendly female voice' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'British female voice' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Deep British male voice' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Transatlantic male voice' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Casual American male voice' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'American female voice' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'American male voice' },
];

export async function synthesizeSpeech(text: string, options: TTSOptions = {}): Promise<Blob> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      text,
      voiceId: options.voiceId,
      emotion: options.emotion,
      speed: options.speed,
    }),
  });

  if (!response.ok) {
    // The TTS function may return JSON error payloads. Prefer those over generic status.
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    const message =
      (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string'
        ? (payload as any).error
        : null) || `TTS request failed: ${response.status}`;

    const code =
      payload && typeof payload === 'object'
        ? ((payload as any).code as string | undefined) || ((payload as any).status as string | undefined)
        : undefined;

    throw new ElevenLabsTTSError(message, { status: response.status, code, details: payload });
  }

  return response.blob();
}

export async function playTTS(text: string, options: TTSOptions = {}): Promise<HTMLAudioElement> {
  const audioBlob = await synthesizeSpeech(text, options);
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  // Clean up URL when audio finishes
  audio.onended = () => URL.revokeObjectURL(audioUrl);
  audio.onerror = () => URL.revokeObjectURL(audioUrl);
  
  await audio.play();
  return audio;
}

export function createTTSQueue(options: TTSOptions = {}) {
  const queue: string[] = [];
  let isPlaying = false;
  let currentAudio: HTMLAudioElement | null = null;
  let onSpeakingChange: ((speaking: boolean) => void) | null = null;

  const processQueue = async () => {
    if (isPlaying || queue.length === 0) return;
    
    isPlaying = true;
    onSpeakingChange?.(true);

    while (queue.length > 0) {
      const text = queue.shift();
      if (!text) continue;

      try {
        console.log('[ElevenLabs TTS] Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        const audio = await playTTS(text, options);
        currentAudio = audio;
        
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
        
        currentAudio = null;
      } catch (error) {
        console.error('[ElevenLabs TTS] Error:', error);
      }
    }

    isPlaying = false;
    onSpeakingChange?.(false);
  };

  return {
    enqueue: (text: string) => {
      if (text.trim()) {
        queue.push(text);
        processQueue();
      }
    },
    clear: () => {
      queue.length = 0;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    },
    isPlaying: () => isPlaying,
    onSpeakingChange: (callback: (speaking: boolean) => void) => {
      onSpeakingChange = callback;
    },
  };
}
