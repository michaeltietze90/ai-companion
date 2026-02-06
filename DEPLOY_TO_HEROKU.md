# 🚀 Deploy to Heroku — Complete Guide

> **This guide is designed for AI-assisted deployment (e.g., Cursor).** 
> It covers everything needed to go from this Lovable project to a fully running Heroku app.

---

## 📋 Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- A Heroku account with billing enabled (for Postgres addon)
- Git installed
- Node.js >= 18

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Heroku Dyno                    │
│                                                  │
│   ┌──────────────┐    ┌───────────────────────┐ │
│   │  Express.js  │    │    React (Vite)        │ │
│   │  /api/*      │    │    Static in /dist     │ │
│   │              │    │                         │ │
│   │  Routes:     │    │  All frontend requests │ │
│   │  - agentforce│◄───│  go to /api/* routes   │ │
│   │  - heygen    │    │  (no Supabase needed)  │ │
│   │  - deepgram  │    │                         │ │
│   │  - elevenlabs│    └───────────────────────┘ │
│   │  - leaderboard│                              │
│   └──────┬───────┘                               │
│          │                                       │
│   ┌──────▼───────┐                               │
│   │ Heroku       │                               │
│   │ Postgres     │                               │
│   │ (leaderboard)│                               │
│   └──────────────┘                               │
└─────────────────────────────────────────────────┘

External APIs:
  → Salesforce Agentforce (sessions + messages)
  → HeyGen (avatar streaming)
  → Deepgram (speech-to-text)
  → ElevenLabs (text-to-speech, optional)
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server/index.js` | Express server — serves frontend + API routes |
| `server/routes/*.js` | API route handlers (replaces Supabase Edge Functions) |
| `Procfile` | Tells Heroku to run `npm start` |
| `app.json` | Heroku app manifest with env vars + addons |
| `database/schema.sql` | Postgres schema for leaderboard + analytics |
| `heroku-package-config.json` | Package.json adjustments needed for Heroku |

---

## 🔧 Step-by-Step Deployment

### 1. Prepare package.json

Before deploying, update your `package.json`:

```bash
# Add these scripts:
"start": "node server/index.js",
"heroku-postbuild": "npm run build"

# Add engines:
"engines": {
  "node": ">=18.0.0"
}

# Add dependency:
npm install pg

# Remove Lovable-specific dependencies:
npm uninstall @supabase/supabase-js lovable-tagger
```

> ⚠️ **Important:** Also remove the `lovable-tagger` import from `vite.config.ts`:
> ```ts
> // REMOVE this line:
> import { componentTagger } from "lovable-tagger";
> // And remove it from the plugins array
> ```

### 2. Remove Lovable/Supabase Files (Optional Cleanup)

These files are NOT needed on Heroku:

```bash
# Remove Supabase edge functions (replaced by server/routes/)
rm -rf supabase/

# Remove Supabase integration files  
rm -rf src/integrations/

# Remove .env (Heroku uses Config Vars instead)
rm .env
```

### 3. Create Heroku App

```bash
# Login
heroku login

# Create app
heroku create your-app-name

# Add Postgres addon
heroku addons:create heroku-postgresql:essential-0
```

### 4. Set Environment Variables

```bash
# Salesforce Agentforce
heroku config:set SALESFORCE_ORG_DOMAIN="https://your-org.my.salesforce.com"
heroku config:set SALESFORCE_CLIENT_ID="your-client-id"
heroku config:set SALESFORCE_CLIENT_SECRET="your-client-secret"
heroku config:set SALESFORCE_AGENT_ID="your-agent-id"
heroku config:set SALESFORCE_API_HOST="https://api.salesforce.com"

# HeyGen Avatar
heroku config:set HEYGEN_API_KEY="your-heygen-key"

# Deepgram STT
heroku config:set DEEPGRAM_API_KEY="your-deepgram-key"

# ElevenLabs TTS (optional)
heroku config:set ELEVENLABS_API_KEY="your-elevenlabs-key"

# Node environment
heroku config:set NODE_ENV=production
```

> 💡 `DATABASE_URL` is automatically set by the Postgres addon.

### 5. Initialize Database

```bash
# Push the schema to Heroku Postgres
heroku pg:psql < database/schema.sql
```

### 6. Deploy

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial Heroku deployment"

# Push to Heroku
git push heroku main
```

### 7. Verify

```bash
# Check logs
heroku logs --tail

# Open the app
heroku open

# Test health endpoint
curl https://your-app-name.herokuapp.com/api/health
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SALESFORCE_ORG_DOMAIN` | ✅ | e.g., `https://your-org.my.salesforce.com` |
| `SALESFORCE_CLIENT_ID` | ✅ | Connected App Client ID |
| `SALESFORCE_CLIENT_SECRET` | ✅ | Connected App Client Secret |
| `SALESFORCE_AGENT_ID` | ✅ | Agentforce Agent ID |
| `SALESFORCE_API_HOST` | ❌ | Default: `https://api.salesforce.com` |
| `HEYGEN_API_KEY` | ✅ | HeyGen streaming API key |
| `DEEPGRAM_API_KEY` | ✅ | Deepgram Nova STT API key |
| `ELEVENLABS_API_KEY` | ❌ | ElevenLabs TTS/STT key (fallback) |
| `DATABASE_URL` | ✅ | Auto-set by Heroku Postgres addon |
| `NODE_ENV` | ❌ | Set to `production` |

---

## 🔄 How the Routing Works

The frontend code has been updated to **always** use relative `/api/*` paths:

```
Frontend → /api/agentforce-session → server/routes/agentforce-session.js → Salesforce API
Frontend → /api/heygen-token       → server/routes/heygen-token.js       → HeyGen API
Frontend → /api/deepgram-transcribe→ server/routes/deepgram-transcribe.js→ Deepgram API
Frontend → /api/leaderboard        → server/routes/leaderboard.js        → Heroku Postgres
```

No `VITE_SUPABASE_URL` detection is needed — everything goes through Express.

---

## 🛠️ Troubleshooting

### App crashes on start
```bash
heroku logs --tail
# Check for missing env vars or dependency issues
```

### Database errors
```bash
# Verify Postgres is attached
heroku addons

# Check DATABASE_URL is set
heroku config:get DATABASE_URL

# Re-run schema if needed
heroku pg:psql < database/schema.sql
```

### API errors
```bash
# Test individual endpoints
curl -X POST https://your-app.herokuapp.com/api/health
curl -X POST https://your-app.herokuapp.com/api/heygen-token \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📝 What Was Changed from Lovable

1. **Removed all Supabase/Lovable dependencies** from frontend services
2. **Created `/api/leaderboard` Express route** replacing the Supabase Edge Function
3. **Simplified all service files** to use `/api/*` paths only (no env detection)
4. **Added `pg` dependency** for Heroku Postgres
5. **Updated `app.json`** with `DATABASE_URL` and Postgres addon
6. **Removed `lovable-tagger`** dev dependency (Lovable-specific)

---

## ✅ Deployment Checklist

- [ ] `package.json` has `start` and `heroku-postbuild` scripts
- [ ] `package.json` has `engines.node >= 18`
- [ ] `package.json` has `pg` dependency
- [ ] `package.json` does NOT have `@supabase/supabase-js` or `lovable-tagger`
- [ ] `vite.config.ts` does NOT import `lovable-tagger`
- [ ] All 6 required env vars are set in Heroku
- [ ] Heroku Postgres addon is attached
- [ ] Database schema has been applied (`heroku pg:psql < database/schema.sql`)
- [ ] `supabase/` folder removed (or just ignored)
- [ ] `src/integrations/supabase/` folder removed (or just ignored)
