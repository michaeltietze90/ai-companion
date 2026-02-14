#!/bin/bash
# Proto Hologram & AgentForce Voice - Easy Startup Script

echo "🚀 Starting Proto Hologram & AgentForce Voice..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your Salesforce credentials"
    exit 1
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "create_agent_session.py" 2>/dev/null || true
pkill -f "http.server.*8000" 2>/dev/null || true

# Activate virtual environment
source venv/bin/activate

# Start API server in background
echo "🔌 Starting API server on port 7000..."
python create_agent_session.py &
API_PID=$!

# Start web server in background  
echo "🌐 Starting web server on port 8000..."
python -m http.server 8000 &
WEB_PID=$!

# Wait a moment for servers to start
sleep 2

echo ""
echo "✅ Proto Hologram & AgentForce Voice is running!"
echo ""
echo "🎤 Voice Interface: http://127.0.0.1:8000/join.html"
echo "🔧 Simple Client:   http://127.0.0.1:8000/simple_voice_client.html"
echo ""
echo "📋 To get credentials only:"
echo "   python get_livekit_creds.py"
echo ""
echo "🛑 To stop servers:"
echo "   kill $API_PID $WEB_PID"
echo "   # Or just press Ctrl+C"
echo ""

# Wait for user to stop
trap "echo '🛑 Stopping servers...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" INT
wait
