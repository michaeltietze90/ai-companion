#!/usr/bin/env python3
"""
Proto Hologram & AgentForce Voice - Credential Extractor
Quick script to get LiveKit token and URL for AgentForce voice sessions
"""
import os, json
from dotenv import load_dotenv
from create_agent_session import get_bootstrap_token, create_session, join_realtime_session, extract_livekit_creds

load_dotenv()

def get_livekit_credentials():
    """Get LiveKit token and URL quickly"""
    try:
        # Get access token
        token_data = get_bootstrap_token()
        access_token = token_data.get("access_token") or token_data.get("accessToken")
        
        # Create session
        session_data = create_session(access_token)
        session_id = session_data.get("sessionId")
        
        # Join realtime session
        join_data = join_realtime_session(access_token, session_id)
        
        # Extract LiveKit credentials
        livekit_token, livekit_url = extract_livekit_creds(join_data)
        
        # Output results
        print("=" * 60)
        print("🎫 LIVEKIT CREDENTIALS")
        print("=" * 60)
        print(f"Session ID: {session_id}")
        print(f"LiveKit URL: {livekit_url}")
        print(f"LiveKit Token: {livekit_token}")
        print("=" * 60)
        
        # Also output as JSON for easy copying
        credentials = {
            "sessionId": session_id,
            "livekitUrl": livekit_url,
            "token": livekit_token
        }
        
        print("\n📋 JSON FORMAT (for copying):")
        print(json.dumps(credentials, indent=2))
        
        return credentials
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    get_livekit_credentials()
