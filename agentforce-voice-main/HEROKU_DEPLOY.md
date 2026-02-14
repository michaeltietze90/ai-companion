# Deploy AgentForce Voice Assistant to Heroku

This guide shows you how to deploy your AgentForce Voice Assistant to Heroku in just a few steps.

## 🚀 Quick Heroku Deployment

### Prerequisites
- Heroku account (free tier works fine)
- Heroku CLI installed
- Git installed

### Step 1: Prepare for Deployment

1. **Clone or download this repository**
2. **Navigate to the project directory**
   ```bash
   cd agentforce_voice_create_session
   ```

### Step 2: Create Heroku App

```bash
# Login to Heroku
heroku login

# Create a new Heroku app (replace 'your-app-name' with your desired name)
heroku create your-agentforce-voice-app

# Or let Heroku generate a random name
heroku create
```

### Step 3: Deploy to Heroku

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit"

# Deploy to Heroku
git push heroku main
```

### Step 4: Open Your App

```bash
# Open your deployed app in browser
heroku open
```

## 🎯 How to Use

1. **Open your Heroku app URL** (e.g., `https://your-app-name.herokuapp.com`)

2. **Configure your settings** by clicking on "⚙️ Configuration":
   - **Bootstrap URL Template**: `https://your-org.sandbox.my.salesforce.com/services/data/v61.0/einstein/ai-agent/v1.1/agents/{AGENT_ID}/bootstrap`
   - **Agent ID**: Your AgentForce agent ID (e.g., `0XxYourAgentIdHere`)
   - **Domain URL**: `https://your-org.sandbox.my.salesforce.com`
   - **Salesforce Endpoint**: `https://your-org.sandbox.my.salesforce.com`

3. **Use the preset buttons** to quickly switch between Sandbox and Production environments

4. **Click "🚀 Start Voice Session"** to connect and start talking to your AI agent!

## 🔧 Configuration Tips

### Sandbox vs Production
- **Sandbox**: Use preset button to automatically configure sandbox URLs
- **Production**: Use preset button to automatically configure production URLs

### Finding Your Agent ID
1. Go to Salesforce Setup
2. Search for "Agents" 
3. Find your agent and copy its ID (starts with `0X`)

### URL Format Examples
- **Sandbox**: `https://yourorg--sandbox.sandbox.my.salesforce.com`
- **Production**: `https://yourorg.my.salesforce.com`

## 🛠️ Optional: Environment Variables

If you want to set default values, you can configure environment variables in Heroku:

```bash
# Set environment variables (optional - UI configuration takes precedence)
heroku config:set BOOTSTRAP_URL="https://your-org.sandbox.my.salesforce.com/services/data/v61.0/einstein/ai-agent/v1.1/agents/{AGENT_ID}/bootstrap"
heroku config:set AGENT_ID="0XxYourAgentIdHere"
heroku config:set DOMAIN_URL="https://your-org.sandbox.my.salesforce.com"
heroku config:set SALESFORCE_ENDPOINT="https://your-org.sandbox.my.salesforce.com"
```

## 📱 Features

- **🎤 One-Click Voice Connection**: Simple button to start talking to your AI agent
- **⚙️ Easy Configuration**: Web-based settings panel with preset options
- **💾 Auto-Save Settings**: Your configuration is saved in browser localStorage
- **📱 Mobile Friendly**: Works on desktop and mobile devices
- **🔄 Real-time Audio**: Live voice conversation with your AgentForce agent
- **🎯 Error Handling**: Clear error messages and debugging information

## 🐛 Troubleshooting

### App Won't Start
- Check Heroku logs: `heroku logs --tail`
- Ensure all files are committed to git

### Configuration Issues
- Double-check your Salesforce URLs
- Verify your Agent ID is correct
- Make sure your agent has voice capabilities enabled

### Voice Connection Problems
- Allow microphone access when prompted
- Check browser console for errors
- Verify your Salesforce org allows external connections

## 🔒 Security Notes

- Configuration is stored in browser localStorage (client-side only)
- No sensitive data is stored on the server
- All communication is encrypted (HTTPS/WSS)
- LiveKit tokens are temporary and expire automatically

## 📚 Support

- **Heroku Issues**: Check [Heroku Dev Center](https://devcenter.heroku.com/)
- **AgentForce Issues**: Check Salesforce documentation
- **Voice Issues**: Verify microphone permissions and LiveKit compatibility

---

**Your AgentForce Voice Assistant is now ready to deploy! 🎉**

Just run the commands above and you'll have a live voice assistant running on Heroku in minutes.
