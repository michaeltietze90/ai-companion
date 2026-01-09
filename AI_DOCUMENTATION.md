# AI Documentation: Agentforce Avatar Platform

This document explains the architecture and functionality of this application for AI assistants working on the codebase.

---

## Overview

This is a **full-stack interactive AI avatar platform** that integrates:
- **HeyGen Streaming Avatar SDK** for visual avatar rendering and text-to-speech
- **Salesforce Agentforce** for intelligent conversational AI logic
- **ElevenLabs** for speech-to-text (voice input)

The user speaks → ElevenLabs transcribes → Agentforce processes → HeyGen avatar speaks the response.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  src/pages/Index.tsx          Main UI page                      │
│  src/components/ProtoMDevice  Holographic device container      │
│  src/components/Avatar        HeyGen video avatar display       │
│  src/components/Settings      Settings modal for configuration  │
├─────────────────────────────────────────────────────────────────┤
│                          Hooks                                   │
├─────────────────────────────────────────────────────────────────┤
│  useAvatarConversation.ts     Main orchestration hook           │
│  useElevenLabsSTT.ts          Speech-to-text via ElevenLabs     │
│  useSpeechRecognition.ts      Browser native STT fallback       │
├─────────────────────────────────────────────────────────────────┤
│                          Stores (Zustand)                        │
├─────────────────────────────────────────────────────────────────┤
│  conversationStore.ts         Conversation state & messages     │
│  settingsStore.ts             User profiles & API credentials   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
├─────────────────────────────────────────────────────────────────┤
│  agentforce-session/          Start/end Agentforce sessions     │
│  agentforce-message/          Send messages, receive SSE stream │
│  heygen-token/                Get HeyGen access token           │
│  heygen-proxy/                Proxy speak requests to HeyGen    │
│  elevenlabs-scribe-token/     Get ElevenLabs STT token          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  Salesforce Agentforce API    Conversational AI backend         │
│  HeyGen Streaming API         Avatar video + TTS                │
│  ElevenLabs Scribe API        Speech-to-text                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files

### Frontend Components

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main page with avatar, controls, conversation history |
| `src/components/ProtoMDevice/ProtoMDevice.tsx` | Holographic device frame/container |
| `src/components/Avatar/HologramAvatar.tsx` | HeyGen video element with hologram effects |
| `src/components/Settings/SettingsModal.tsx` | Modal for API keys, avatars, profiles |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useAvatarConversation.ts` | **Core orchestration**: initializes HeyGen SDK, starts/ends Agentforce sessions, sends messages, handles speech |
| `src/hooks/useElevenLabsSTT.ts` | WebSocket connection to ElevenLabs for real-time speech-to-text |
| `src/hooks/useSpeechRecognition.ts` | Browser Web Speech API fallback |

### Stores (Zustand)

| File | Purpose |
|------|---------|
| `src/stores/conversationStore.ts` | Tracks: messages, session state, speaking/listening/thinking flags, debug info |
| `src/stores/settingsStore.ts` | Persisted profiles with Salesforce/HeyGen credentials, avatar selection |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `supabase/functions/agentforce-session/` | OAuth2 auth with Salesforce, start/end agent sessions |
| `supabase/functions/agentforce-message/` | Send user message, stream SSE response from Agentforce |
| `supabase/functions/heygen-token/` | Fetch HeyGen streaming access token |
| `supabase/functions/heygen-proxy/` | Proxy TTS requests to HeyGen (for fallback) |
| `supabase/functions/elevenlabs-scribe-token/` | Get signed URL for ElevenLabs STT WebSocket |

---

## Conversation Flow

```
1. User clicks "Start Conversation"
   └─> useAvatarConversation.startConversation()
       ├─> Calls agentforce-session edge function (action: "start")
       │   └─> Returns sessionId
       └─> Initializes HeyGen StreamingAvatar SDK
           └─> Gets token from heygen-token edge function

2. User speaks (or types)
   └─> ElevenLabs STT transcribes audio
       └─> handleVoiceTranscript() called with text
           └─> sendMessage(text)

3. sendMessage() flow:
   └─> Calls agentforce-message edge function
       ├─> Sends message to Salesforce Agentforce API
       ├─> Streams SSE response
       └─> Returns aggregated reply text
   └─> Calls speakViaProxy(replyText)
       └─> HeyGen SDK speaks the text (avatar lip-syncs)

4. User clicks "End" or closes
   └─> endConversation()
       ├─> Calls agentforce-session (action: "end")
       └─> Stops HeyGen avatar stream
```

---

## Environment Variables / Secrets

These are stored as **Supabase secrets** (not in code):

| Secret | Purpose |
|--------|---------|
| `SALESFORCE_ORG_DOMAIN` | e.g., `https://yourorg.my.salesforce.com` |
| `SALESFORCE_CLIENT_ID` | Connected App client ID |
| `SALESFORCE_CLIENT_SECRET` | Connected App client secret |
| `SALESFORCE_AGENT_ID` | Agentforce agent ID |
| `SALESFORCE_API_HOST` | Usually `https://api.salesforce.com` |
| `HEYGEN_API_KEY` | HeyGen API key for streaming avatar |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for STT |

---

## Settings & Profiles

The app supports **multiple profiles** stored in localStorage:

```typescript
interface Profile {
  id: string;
  name: string;
  salesforceOrgDomain: string;
  salesforceClientId: string;
  salesforceClientSecret: string;
  salesforceAgentId: string;
  salesforceApiHost: string;
  heygenApiKey: string;
  selectedAvatarId: string;
  customAvatars: AvatarOption[];
}
```

Users can:
- Create/switch/delete profiles
- Configure Salesforce credentials per profile
- Select from public HeyGen avatars or add custom avatar IDs
- Settings persist across sessions

**Note**: Currently, profiles are stored locally but edge functions still use Supabase secrets. To fully wire profiles to runtime, the edge functions would need to accept credentials from the client or use a different auth approach.

---

## Demo Mode

When `demoMode` is enabled in the conversation store:
- No actual Agentforce API calls are made
- Simulated responses are returned
- Useful for testing UI without valid credentials

---

## UI Structure

```
┌────────────────────────────────────────────────────┐
│ Header: Logo, Demo toggle, Settings button         │
├────────────────────────────────────────────────────┤
│                                                    │
│     ┌──────────────────────────────────┐          │
│     │      Proto M Device Frame        │          │
│     │  ┌────────────────────────────┐  │          │
│     │  │   HeyGen Avatar Video      │  │          │
│     │  │   (hologram effects)       │  │          │
│     │  └────────────────────────────┘  │          │
│     └──────────────────────────────────┘          │
│                                                    │
│     Status badge: Connected/Ready/Demo             │
│     Debug strip: transcript → response → spoken    │
│     Thinking indicator (when processing)           │
│                                                    │
├────────────────────────────────────────────────────┤
│ Footer: Text input, Mic, Mute, History, End buttons│
└────────────────────────────────────────────────────┘
          │
          └─> Slide-out Conversation History sidebar
```

---

## Styling

- **Tailwind CSS** with semantic design tokens
- **Dark theme** with glassmorphism effects
- **Framer Motion** for animations
- Colors defined in `src/index.css` and `tailwind.config.ts`
- Agentforce-inspired branding (gradients, professional aesthetic)

---

## Key Behaviors

1. **Speech Concurrency**: Stops microphone while avatar is speaking to prevent feedback
2. **Interruption**: New speech requests interrupt any ongoing avatar audio
3. **Text Sanitization**: Markdown/links stripped before sending to TTS
4. **Fallback Chain**: HeyGen SDK → HeyGen Proxy → Browser TTS

---

## Common Tasks

### Adding a new avatar option
Edit `src/components/Settings/SettingsModal.tsx`, add to `DEFAULT_PUBLIC_AVATARS` array.

### Modifying the conversation logic
Edit `src/hooks/useAvatarConversation.ts`.

### Changing how Agentforce responses are parsed
Edit `supabase/functions/agentforce-message/index.ts`.

### Adding new UI controls
Edit `src/pages/Index.tsx`.

### Persisting new settings
Add fields to `Profile` interface in `src/stores/settingsStore.ts`.

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **shadcn/ui** (component library)
- **Zustand** (state management)
- **Framer Motion** (animations)
- **Supabase** (backend via Lovable Cloud)
- **HeyGen Streaming Avatar SDK** (@heygen/streaming-avatar)
