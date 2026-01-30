import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AvatarOption {
  id: string;
  name: string;
  thumbnailUrl?: string;
  isCustom?: boolean;
}

export type VoiceEmotionType = 'excited' | 'serious' | 'friendly' | 'soothing' | 'broadcaster';

export type TTSProvider = 'heygen' | 'elevenlabs';

/** Response mode determines how Agentforce responses are parsed */
export type ResponseMode = 'text' | 'json';

/** HeyGen ElevenLabs voice settings for fine-tuning */
export interface HeyGenVoiceSettings {
  stability: number;        // 0-1: Lower = more expressive/variable, higher = more consistent
  similarityBoost: number;  // 0-1: How closely to match original voice characteristics
  style: number;            // 0-1: Style exaggeration (higher = more stylized)
  useSpeakerBoost: boolean; // Enhances clarity and voice similarity
  rate: number;             // 0.5-2.0: Speech rate multiplier
}

export interface ElevenLabsVoice {
  id: string;
  name: string;
  description?: string;
}

export interface Profile {
  id: string;
  name: string;
  salesforceOrgDomain: string;
  salesforceClientId: string;
  salesforceClientSecret: string;
  salesforceAgentId: string;
  salesforceApiHost: string;
  heygenApiKey: string;
  selectedAvatarId: string;
  selectedEmotion: VoiceEmotionType;
  customAvatars: AvatarOption[];
  // TTS Provider settings
  ttsProvider: TTSProvider;
  elevenLabsVoiceId: string;
  elevenLabsSpeed: number;
  customElevenLabsVoices: ElevenLabsVoice[];
  // HeyGen voice selection
  heygenVoice: 'miguel' | 'alternative';
  // HeyGen voice tuning settings (ElevenLabs parameters)
  heygenVoiceSettings: HeyGenVoiceSettings;
  // Response parsing mode
  responseMode: ResponseMode;
}

interface SettingsState {
  profiles: Profile[];
  activeProfileId: string | null;
  
  // Public HeyGen avatars (fetched from API)
  publicAvatars: AvatarOption[];
  
  // Actions
  setProfiles: (profiles: Profile[]) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfileId: (id: string | null) => void;
  setPublicAvatars: (avatars: AvatarOption[]) => void;
  
  // Helpers
  getActiveProfile: () => Profile | null;
}

// Default HeyGen voice settings (balanced for natural speech)
const defaultHeyGenVoiceSettings: HeyGenVoiceSettings = {
  stability: 0.5,        // Balanced expressiveness
  similarityBoost: 0.75, // Good voice matching
  style: 0.5,            // Moderate stylization
  useSpeakerBoost: true, // Enhanced clarity
  rate: 1.0,             // Normal speed
};

const defaultProfile: Profile = {
  id: 'default',
  name: 'Default Profile',
  salesforceOrgDomain: '',
  salesforceClientId: '',
  salesforceClientSecret: '',
  salesforceAgentId: '',
  salesforceApiHost: 'https://api.salesforce.com',
  heygenApiKey: '',
  selectedAvatarId: '',
  selectedEmotion: 'friendly',
  customAvatars: [],
  // TTS settings - HeyGen native voice (ElevenLabs quota depleted)
  ttsProvider: 'heygen',
  elevenLabsVoiceId: '91c3c9b4f73c47879b3a98d399db808d', // Miguelito - cloned voice
  elevenLabsSpeed: 1.0,
  customElevenLabsVoices: [
    { id: '91c3c9b4f73c47879b3a98d399db808d', name: 'Miguelito (Cloned)' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  ],
  // HeyGen voice selection
  heygenVoice: 'miguel',
  // HeyGen voice tuning settings
  heygenVoiceSettings: defaultHeyGenVoiceSettings,
  // Response parsing mode - 'text' for plain text, 'json' for structured responses
  responseMode: 'text',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profiles: [defaultProfile],
      activeProfileId: 'default',
      publicAvatars: [],

      setProfiles: (profiles) => set({ profiles }),
      
      addProfile: (profile) => set((state) => ({
        profiles: [...state.profiles, profile],
      })),
      
      updateProfile: (id, updates) => set((state) => ({
        profiles: state.profiles.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),
      
      deleteProfile: (id) => set((state) => {
        const newProfiles = state.profiles.filter((p) => p.id !== id);
        return {
          profiles: newProfiles.length > 0 ? newProfiles : [defaultProfile],
          activeProfileId: state.activeProfileId === id 
            ? (newProfiles[0]?.id || 'default') 
            : state.activeProfileId,
        };
      }),
      
      setActiveProfileId: (id) => set({ activeProfileId: id }),
      
      setPublicAvatars: (avatars) => set({ publicAvatars: avatars }),
      
      getActiveProfile: () => {
        const state = get();
        return state.profiles.find((p) => p.id === state.activeProfileId) || null;
      },
    }),
    {
      name: 'agentforce-settings',
    }
  )
);
