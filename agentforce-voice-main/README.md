# Proto Hologram & AgentForce Voice

A Python application that connects to Salesforce AgentForce voice agents through LiveKit, enabling real-time voice conversations with AI agents.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Salesforce org with AgentForce enabled
- AgentForce agent configured for voice

### 1. Setup Environment

```bash
# Clone or download this project
cd agentforce_voice_create_session

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Credentials

Create a `.env` file with your Salesforce credentials:

```bash
# Copy the template and edit with your values
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required values in `.env`:**
```
# Your Salesforce org URL (sandbox or production)
SALESFORCE_ENDPOINT=https://your-org.sandbox.my.salesforce.com

# Bootstrap URL - replace {AGENT_ID} will be automatically substituted
BOOTSTRAP_URL=https://your-org.sandbox.my.salesforce.com/services/data/v61.0/einstein/ai-agent/v1.1/agents/{AGENT_ID}/bootstrap

# Your AgentForce agent ID (found in Salesforce Setup)
AGENT_ID=0XxYourAgentIdHere

# Domain URL for API headers
DOMAIN_URL=https://your-org.sandbox.my.salesforce.com
```

### 3. Start the Application

```bash
# Start the API server
python create_agent_session.py &

# Start the web server (in a new terminal or background)
python -m http.server 8000 &
```

### 4. Connect to Voice Agent

Open your browser and go to: **http://127.0.0.1:8000/join.html**

1. Click **"🎤 Join Voice Room"**
2. Allow microphone access when prompted
3. Start talking to your AgentForce voice agent!

## 🛠️ Usage Options

### Option 1: Web Interface (Recommended)
- **URL**: http://127.0.0.1:8000/join.html
- **Features**: Full voice interface with session management
- **Best for**: Interactive voice conversations

### Option 2: Get Credentials Only
```bash
# Get LiveKit credentials for external use
python get_livekit_creds.py
```
This outputs the LiveKit token and WebSocket URL that you can use with any LiveKit-compatible client.

### Option 3: Simple Voice Client
- **URL**: http://127.0.0.1:8000/simple_voice_client.html
- **Features**: Direct LiveKit connection with manual credential input
- **Best for**: Testing or custom integrations

## 📁 Project Structure

```
├── create_agent_session.py    # Main API server
├── join.html                  # Web interface for voice chat
├── simple_voice_client.html   # Direct LiveKit client
├── get_livekit_creds.py      # Credential extraction script
├── requirements.txt           # Python dependencies
├── .env                      # Your Salesforce credentials
└── README.md                 # This file
```

## 🔧 API Endpoints

The Python server provides these endpoints:

- `POST /api/room/join` - Creates session and returns LiveKit credentials
- `POST /api/session/create` - Creates AgentForce session only

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill existing processes
pkill -f "create_agent_session.py"
pkill -f "http.server"
```

### Connection Errors
1. **Check `.env` file** - Ensure all URLs and IDs are correct
2. **Verify agent permissions** - Make sure your Salesforce user can access the agent
3. **Check network** - Ensure you can reach your Salesforce org

### Debug Mode
The server logs all API responses. Check the terminal running `create_agent_session.py` for detailed error information.

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your AgentForce agent ID and Salesforce credentials secure
- LiveKit tokens are temporary and expire automatically

## 📚 How It Works

1. **Bootstrap**: Gets access token from Salesforce
2. **Session**: Creates AgentForce session with voice capabilities
3. **Join**: Connects to LiveKit realtime voice room
4. **Voice**: Enables bidirectional audio with the AI agent

## 🤝 Support

For issues with:
- **Salesforce/AgentForce**: Check Salesforce documentation
- **LiveKit**: Check LiveKit documentation  
- **This application**: Review the debug output in terminal

---

**Ready to talk to your AI agent? Follow the Quick Start guide above!** 🎤