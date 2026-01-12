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
5. **Rich Response Parsing**: Visual tags and SSML processed before speech

---

## Rich Response System (SSML + Visual Tags)

Agentforce can return responses with embedded tags that control **what gets spoken** vs **what gets displayed visually**.

### Tag Reference

#### Visual Tags (displayed as overlays, NOT spoken)

```xml
<visual type="image|gif|video" src="URL" duration="5000" position="center" />
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `type` | No | `image`, `gif`, or `video` (default: `image`) |
| `src` | Yes | URL to the media file (PNG with transparency works) |
| `duration` | No | Display time in ms or `5s` format (default: `5000`) |
| `position` | No | `center`, `top`, `bottom`, `left`, `right`, `topleft`, `topright`, `bottomleft`, `bottomright` (default: `center`) |
| `startOffset` | No | Delay before showing in ms (default: `0`) |
| `alt` | No | Accessibility description |

#### SSML Tags (affect speech timing)

```xml
<break time="500ms"/>   <!-- Pause in speech -->
<break time="1s"/>      <!-- Longer pause -->
```

### Example Agentforce Response

```
Hi there! Let me show you our product.
<visual type="image" src="https://example.com/product.png" duration="4000" position="right"/>
This is our bestseller!
<break time="500ms"/>
Would you like to learn more?
```

**Parsed Output:**
- **Speech Text**: "Hi there! Let me show you our product. This is our bestseller! ... Would you like to learn more?"
- **Visual**: Image displays for 4 seconds on the right side
- **Break**: Converted to "..." pause in TTS

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Agentforce Response (raw with tags)                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ richResponseParser.ts                                           │
│ - parseRichResponse(rawText)                                    │
│   └─> { speechText, displayText, visuals[], hasRichContent }   │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ speechText → HeyGen TTS     │   │ visuals → VisualOverlay     │
│ (clean, speakable text)     │   │ (full-screen transparent    │
│                             │   │  overlay for images/videos) │
└─────────────────────────────┘   └─────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/richResponseParser.ts` | Parses tags, extracts speech text and visual commands |
| `src/components/Overlay/VisualOverlay.tsx` | Renders full-screen transparent overlays |
| `src/stores/visualOverlayStore.ts` | Manages active visual queue and state |

### Configuring Agentforce

In your Salesforce Agentforce agent, instruct it to return rich responses:

```
When showing visual content, use this format:
<visual type="image" src="[URL]" duration="[ms]" position="[position]"/>

Supported positions: center, top, bottom, left, right, topleft, topright, bottomleft, bottomright

For pauses, use: <break time="500ms"/>

Example: "Here's our product <visual type="image" src="https://..." duration="5000" position="right"/> - it's amazing!"
```

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

### Adding new visual tag types
1. Update `VisualType` in `src/lib/richResponseParser.ts`
2. Update `VisualOverlay.tsx` to render the new type

### Customizing visual positions
Edit `positionClasses` in `src/components/Overlay/VisualOverlay.tsx`.

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
