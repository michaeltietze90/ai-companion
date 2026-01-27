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
  elevenLabsVoiceId: 'JBFqnCBsd6RMkjVDRZzb', // George - warm British male voice
  elevenLabsSpeed: 1.0,
  customElevenLabsVoices: [],
  // HeyGen voice selection
  heygenVoice: 'miguel',
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
