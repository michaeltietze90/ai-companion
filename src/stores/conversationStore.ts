import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationState {
  messages: Message[];
  sessionId: string | null;
  messagesStreamUrl: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  thinkingMessage: string;
  error: string | null;
  demoMode: boolean;

  // Debug / observability
  lastVoiceTranscript: string;
  lastAgentforceResponse: string;
  lastSpokenText: string;
  
  // Live streaming sentences (for debug display)
  streamingSentences: string[];

  // Actions
  setSessionId: (sessionId: string | null) => void;
  setMessagesStreamUrl: (url: string | null) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setListening: (listening: boolean) => void;
  setThinking: (thinking: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setDemoMode: (demo: boolean) => void;
  setLastVoiceTranscript: (text: string) => void;
  setLastAgentforceResponse: (text: string) => void;
  setLastSpokenText: (text: string) => void;
  addStreamingSentence: (sentence: string) => void;
  clearStreamingSentences: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  sessionId: null,
  messagesStreamUrl: null,
  isConnected: false,
  isConnecting: false,
  isSpeaking: false,
  isListening: false,
  isThinking: false,
  thinkingMessage: '',
  error: null,
  demoMode: false,

  lastVoiceTranscript: '',
  lastAgentforceResponse: '',
  lastSpokenText: '',
  streamingSentences: [],

  setSessionId: (sessionId) => set({ sessionId }),
  setMessagesStreamUrl: (messagesStreamUrl) => set({ messagesStreamUrl }),
  setConnected: (isConnected) => set({ isConnected }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setListening: (isListening) => set({ isListening }),
  setThinking: (isThinking, thinkingMessage = '') => set({ isThinking, thinkingMessage }),
  setError: (error) => set({ error }),
  setDemoMode: (demoMode) => set({ demoMode }),

  setLastVoiceTranscript: (lastVoiceTranscript) => set({ lastVoiceTranscript }),
  setLastAgentforceResponse: (lastAgentforceResponse) => set({ lastAgentforceResponse }),
  setLastSpokenText: (lastSpokenText) => set({ lastSpokenText }),
  
  addStreamingSentence: (sentence) => set((state) => ({
    streamingSentences: [...state.streamingSentences, sentence],
  })),
  clearStreamingSentences: () => set({ streamingSentences: [] }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }],
  })),

  clearMessages: () => set({ messages: [] }),

  reset: () => set({
    messages: [],
    sessionId: null,
    messagesStreamUrl: null,
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    isListening: false,
    isThinking: false,
    thinkingMessage: '',
    error: null,
    lastVoiceTranscript: '',
    lastAgentforceResponse: '',
    lastSpokenText: '',
    streamingSentences: [],
  }),
}));
