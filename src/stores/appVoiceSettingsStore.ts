import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VoiceEmotionType = 'excited' | 'serious' | 'friendly' | 'soothing' | 'broadcaster';

export interface HeyGenVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  rate: number;
}

export interface AppVoiceSettings {
  heygenVoice: 'miguel' | 'alternative';
  selectedEmotion: VoiceEmotionType;
  voiceSettings: HeyGenVoiceSettings;
}

const defaultVoiceSettings: HeyGenVoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
  useSpeakerBoost: true,
  rate: 1.0,
};

const defaultAppSettings: AppVoiceSettings = {
  heygenVoice: 'miguel',
  selectedEmotion: 'excited',
  voiceSettings: defaultVoiceSettings,
};

interface AppVoiceSettingsState {
  keynote: AppVoiceSettings;
  chat: AppVoiceSettings;
  pitch: AppVoiceSettings;
  
  updateKeynoteSettings: (updates: Partial<AppVoiceSettings>) => void;
  updateChatSettings: (updates: Partial<AppVoiceSettings>) => void;
  updatePitchSettings: (updates: Partial<AppVoiceSettings>) => void;
}

/**
 * Separate voice settings for each app (Keynote, Chat, Pitch).
 * Persisted to localStorage so settings survive page reloads.
 */
export const useAppVoiceSettingsStore = create<AppVoiceSettingsState>()(
  persist(
    (set) => ({
      keynote: { ...defaultAppSettings },
      chat: { ...defaultAppSettings },
      pitch: { ...defaultAppSettings },
      
      updateKeynoteSettings: (updates) => set((state) => ({
        keynote: { ...state.keynote, ...updates },
      })),
      
      updateChatSettings: (updates) => set((state) => ({
        chat: { ...state.chat, ...updates },
      })),
      
      updatePitchSettings: (updates) => set((state) => ({
        pitch: { ...state.pitch, ...updates },
      })),
    }),
    {
      name: 'app-voice-settings',
    }
  )
);
