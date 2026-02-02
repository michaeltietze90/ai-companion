# Heroku Deployment Guide

This application is configured for Heroku deployment with Express backend serving both the React frontend and API routes.

## Quick Deploy

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set SALESFORCE_ORG_DOMAIN=https://your-org.my.salesforce.com
   heroku config:set SALESFORCE_CLIENT_ID=your_client_id
   heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
   heroku config:set SALESFORCE_AGENT_ID=your_agent_id
   heroku config:set SALESFORCE_API_HOST=https://api.salesforce.com
   heroku config:set HEYGEN_API_KEY=your_heygen_key
   heroku config:set ELEVENLABS_API_KEY=your_elevenlabs_key
   heroku config:set NODE_ENV=production
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

## One-Click Deploy

Use the "Deploy to Heroku" button if you have `app.json` configured:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Heroku Dyno                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Express Server                       │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │  Static Files   │  │       API Routes            │ │  │
│  │  │  (React build)  │  │  /api/agentforce-session    │ │  │
│  │  │                 │  │  /api/agentforce-message    │ │  │
│  │  │  /dist/*        │  │  /api/heygen-token          │ │  │
│  │  │                 │  │  /api/heygen-proxy          │ │  │
│  │  │                 │  │  /api/elevenlabs-tts        │ │  │
│  │  │                 │  │  /api/deepgram-token        │ │  │
│  │  └─────────────────┘  └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │           External Services             │
        │  • Salesforce Agentforce API            │
        │  • HeyGen Streaming API                 │
        │  • Deepgram Nova STT API                │
        │  • ElevenLabs TTS API (optional)        │
        └─────────────────────────────────────────┘
```

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SALESFORCE_ORG_DOMAIN` | Your Salesforce org URL | ✅ |
| `SALESFORCE_CLIENT_ID` | Connected App Client ID | ✅ |
| `SALESFORCE_CLIENT_SECRET` | Connected App Client Secret | ✅ |
| `SALESFORCE_AGENT_ID` | Agentforce Agent ID | ✅ |
| `SALESFORCE_API_HOST` | API host (default: api.salesforce.com) | ❌ |
| `HEYGEN_API_KEY` | HeyGen API key | ✅ |
| `DEEPGRAM_API_KEY` | Deepgram Nova STT API key | ✅ |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (optional, for TTS) | ❌ |

## Database (Heroku Postgres)

If you need database functionality:

```bash
heroku addons:create heroku-postgresql:essential-0
```

Then run the migration:
```bash
heroku pg:psql < database/schema.sql
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local`:
   ```
   SALESFORCE_ORG_DOMAIN=https://your-org.my.salesforce.com
   SALESFORCE_CLIENT_ID=your_client_id
   SALESFORCE_CLIENT_SECRET=your_client_secret
   SALESFORCE_AGENT_ID=your_agent_id
   HEYGEN_API_KEY=your_key
   ELEVENLABS_API_KEY=your_key
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Run production build locally:
   ```bash
   npm run build
   npm start
   ```

## Troubleshooting

### View Logs
```bash
heroku logs --tail
```

### Check Config
```bash
heroku config
```

### Restart App
```bash
heroku restart
```

### Check Dyno Status
```bash
heroku ps
```
