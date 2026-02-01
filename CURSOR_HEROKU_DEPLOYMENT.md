# Swiss Post App - Heroku Deployment Guide for Cursor AI

This guide provides step-by-step instructions for deploying ONLY the Swiss Post application to Heroku.

## Prerequisites

- Heroku CLI installed and authenticated
- Git repository initialized
- Node.js 18+ installed locally

## Required Environment Variables

Set these in Heroku Dashboard → Settings → Config Vars:

```
HEYGEN_API_KEY=<your-heygen-api-key>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
AGENTFORCE_INSTANCE_URL=<your-salesforce-instance-url>
AGENTFORCE_API_KEY=<your-agentforce-api-key>
AGENTFORCE_AGENT_ID=<your-agent-id>
AGENTFORCE_ORG_ID=<your-org-id>
NODE_ENV=production
```

## Deployment Steps

### 1. Create Heroku App

```bash
heroku create your-swiss-post-app-name
```

### 2. Add PostgreSQL (if needed for future features)

```bash
heroku addons:create heroku-postgresql:essential-0
```

### 3. Set Buildpacks

```bash
heroku buildpacks:set heroku/nodejs
```

### 4. Configure for Production Build

The app is already configured with:
- `Procfile` - Runs `npm start` which serves via Express
- `server/index.js` - Express server serving static React build + API routes
- `app.json` - Heroku app configuration

### 5. Deploy

```bash
git push heroku main
```

Or if using a branch:

```bash
git push heroku your-branch:main
```

### 6. Open the App

```bash
heroku open
```

Navigate to `/swiss-post` to access the Swiss Post application.

## Key Files for Heroku Deployment

| File | Purpose |
|------|---------|
| `Procfile` | Tells Heroku how to start the app |
| `server/index.js` | Express server for production |
| `app.json` | Heroku app manifest |
| `database/schema.sql` | PostgreSQL schema (if using DB) |

## API Routes Served by Express

The Express server handles these API endpoints:
- `POST /api/heygen-token` - HeyGen streaming token
- `POST /api/heygen-proxy` - HeyGen API proxy
- `POST /api/elevenlabs-tts` - ElevenLabs text-to-speech
- `POST /api/elevenlabs-scribe-token` - ElevenLabs Scribe token
- `POST /api/agentforce-session` - Agentforce session creation
- `POST /api/agentforce-message` - Agentforce message handling

## Routing Configuration

The Swiss Post app is accessible at `/swiss-post`. The React Router handles client-side routing while Express serves the static build and API endpoints.

## Troubleshooting

### Build Fails
```bash
heroku logs --tail
```

### Check Running Processes
```bash
heroku ps
```

### Restart App
```bash
heroku restart
```

### Check Config Vars
```bash
heroku config
```

## Post-Deployment Verification

1. Open `https://your-app-name.herokuapp.com/swiss-post`
2. Verify the avatar loads and connects
3. Test voice interaction
4. Check browser console for any errors

## Notes for Cursor AI

When making changes:
1. Always run `npm run build` locally to verify build succeeds
2. Commit all changes including the `dist/` folder if not using Heroku buildpacks
3. The Express server automatically serves from `dist/` in production
4. Environment variables must be set in Heroku, not in `.env` file
