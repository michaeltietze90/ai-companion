# Australia Frank Hologram - Heroku Deployment

Two Heroku apps:
1. **Australia Frank Keynote** – Keynote main + Proto L only
2. **Chat to Frank** – Chat main + Proto L only

## Prerequisites

- Heroku CLI installed and logged in (`heroku login`)
- Salesforce Agentforce agent IDs for Frank (Keynote + Chat)
- Same env vars as cko-miguel-avatar: `SALESFORCE_*`, `HEYGEN_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, etc.

## Create & Deploy

### 1. Create Heroku apps (if not already created)

```bash
heroku create australia-frank-keynote
heroku create chat-to-frank
```

### 2. Add Postgres (optional, for conversation logs)

```bash
heroku addons:create heroku-postgresql:essential-0 -a australia-frank-keynote
heroku addons:create heroku-postgresql:essential-0 -a chat-to-frank
```

### 3. Configure Australia Frank Keynote

```bash
heroku config:set VITE_APP_MODE=frank-keynote -a australia-frank-keynote
heroku config:set SALESFORCE_ORG_DOMAIN="https://your-frank-org.my.salesforce.com" -a australia-frank-keynote
heroku config:set SALESFORCE_CLIENT_ID="your-client-id" -a australia-frank-keynote
heroku config:set SALESFORCE_CLIENT_SECRET="your-client-secret" -a australia-frank-keynote
heroku config:set SALESFORCE_AGENT_ID="your-frank-keynote-agent-id" -a australia-frank-keynote
heroku config:set SALESFORCE_API_HOST="https://api.salesforce.com" -a australia-frank-keynote
heroku config:set HEYGEN_API_KEY="your-heygen-key" -a australia-frank-keynote
heroku config:set DEEPGRAM_API_KEY="your-deepgram-key" -a australia-frank-keynote
heroku config:set ELEVENLABS_API_KEY="your-elevenlabs-key" -a australia-frank-keynote
heroku config:set NODE_ENV=production -a australia-frank-keynote
```

### 4. Configure Chat to Frank

```bash
heroku config:set VITE_APP_MODE=frank-chat -a chat-to-frank
heroku config:set SALESFORCE_ORG_DOMAIN="https://your-frank-org.my.salesforce.com" -a chat-to-frank
heroku config:set SALESFORCE_CLIENT_ID="your-client-id" -a chat-to-frank
heroku config:set SALESFORCE_CLIENT_SECRET="your-client-secret" -a chat-to-frank
heroku config:set SALESFORCE_AGENT_ID="your-frank-chat-agent-id" -a chat-to-frank
heroku config:set SALESFORCE_API_HOST="https://api.salesforce.com" -a chat-to-frank
heroku config:set HEYGEN_API_KEY="your-heygen-key" -a chat-to-frank
heroku config:set DEEPGRAM_API_KEY="your-deepgram-key" -a chat-to-frank
heroku config:set ELEVENLABS_API_KEY="your-elevenlabs-key" -a chat-to-frank
heroku config:set NODE_ENV=production -a chat-to-frank
```

### 5. Add git remotes and deploy

```bash
# Add remotes (run once)
git remote add heroku-keynote https://git.heroku.com/australia-frank-keynote.git
git remote add heroku-chat https://git.heroku.com/chat-to-frank.git

# Deploy Keynote app
git push heroku-keynote main

# Deploy Chat app
git push heroku-chat main
```

### 6. Apply database schema (if using Postgres)

```bash
heroku pg:psql -a australia-frank-keynote < database/schema.sql
heroku pg:psql -a chat-to-frank < database/schema.sql
```

## URLs

- **Keynote**: https://australia-frank-keynote.herokuapp.com/ → redirects to /keynote
- **Chat**: https://chat-to-frank.herokuapp.com/ → redirects to /chat

## Copy config from existing app

To copy all config from cko-miguel-avatar to the new apps:

```bash
# Export from cko-miguel-avatar
heroku config -a cko-miguel-avatar -s > /tmp/cko-config.txt

# Then set each var manually, or use:
# (Edit SALESFORCE_AGENT_ID for each Frank app)
heroku config:set $(heroku config -a cko-miguel-avatar -s | grep -v SALESFORCE_AGENT_ID) -a australia-frank-keynote
heroku config:set VITE_APP_MODE=frank-keynote SALESFORCE_AGENT_ID=your-keynote-agent-id -a australia-frank-keynote
```
