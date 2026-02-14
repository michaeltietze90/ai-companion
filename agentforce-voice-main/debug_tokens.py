#!/usr/bin/env python3
"""
Debug script to test AgentForce API calls and see all the tokens/responses
"""
import os, json
from dotenv import load_dotenv
from create_agent_session import get_bootstrap_token, create_session, join_realtime_session, extract_livekit_creds

load_dotenv()

def debug_full_flow():
    print("🚀 Starting AgentForce API debug flow...")
    
    try:
        # Step 1: Get bootstrap token
        print("\n📡 Step 1: Getting bootstrap token...")
        token_data = get_bootstrap_token()
        print("Bootstrap response:")
        print(json.dumps(token_data, indent=2))
        
        access_token = token_data.get("access_token") or token_data.get("accessToken")
        if not access_token:
            raise ValueError("No access token found!")
        
        print(f"\n🎫 Extracted access token: {access_token}")
        
        # Step 2: Create session
        print(f"\n📡 Step 2: Creating session...")
        session_data = create_session(access_token)
        print("Session response:")
        print(json.dumps(session_data, indent=2))
        
        session_id = session_data.get("sessionId")
        print(f"\n🆔 Extracted session ID: {session_id}")
        
        # Step 3: Join realtime session
        print(f"\n📡 Step 3: Joining realtime session...")
        join_data = join_realtime_session(access_token, session_id)
        print("Join response:")
        print(json.dumps(join_data, indent=2))
        
        # Step 4: Extract LiveKit credentials
        print(f"\n🔍 Step 4: Extracting LiveKit credentials...")
        livekit_token, livekit_url = extract_livekit_creds(join_data)
        
        print(f"\n🎫 LiveKit Token: {livekit_token}")
        print(f"🌐 LiveKit URL: {livekit_url}")
        
        print(f"\n✅ Success! All tokens extracted.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_full_flow()
