#!/usr/bin/env python3
import os, json, time, traceback
from typing import Dict, Any, Tuple
from http.server import BaseHTTPRequestHandler, HTTPServer
import requests
from dotenv import load_dotenv

load_dotenv()
BOOTSTRAP_URL_TEMPLATE = os.getenv("BOOTSTRAP_URL")
AGENT_ID = os.getenv("AGENT_ID")
DOMAIN_URL = os.getenv("DOMAIN_URL")
SALESFORCE_ENDPOINT = os.getenv("SALESFORCE_ENDPOINT")

def _send_json(h: BaseHTTPRequestHandler, status: int, data: Dict[str, Any]):
    body = json.dumps(data).encode("utf-8")
    h.send_response(status)
    h.send_header("Content-Type", "application/json")
    h.send_header("Access-Control-Allow-Origin", "*")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")
    h.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    h.send_header("Content-Length", str(len(body)))
    h.end_headers()
    h.wfile.write(body)

def _get_by_path(obj, path):
    cur = obj
    for p in path.split("."):
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur

def _find_first_jwt(obj):
    import re
    jwt_re = re.compile(r'^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$')
    if isinstance(obj, dict):
        for v in obj.values():
            t = _find_first_jwt(v)
            if t: return t
    elif isinstance(obj, list):
        for v in obj:
            t = _find_first_jwt(v)
            if t: return t
    elif isinstance(obj, str) and jwt_re.match(obj):
        return obj
    return None

def _find_first_wss(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            t = _find_first_wss(v)
            if t: return t
    elif isinstance(obj, list):
        for v in obj:
            t = _find_first_wss(v)
            if t: return t
    elif isinstance(obj, str) and obj.startswith("wss://"):
        return obj
    return None

def extract_livekit_creds(join_data) -> Tuple[str, str]:
    token_paths = ["room.token","room.accessToken","room.jwt","roomToken","roomJWT","token","accessToken","jwt"]
    url_paths = ["endpoint","room.url","room.serverUrl","room.wss","wss","wssUrl","wsUrl","url"]
    tok, url = None, None
    for p in token_paths:
        t = _get_by_path(join_data, p)
        if isinstance(t, str) and t.count(".") == 2:
            tok = t; break
    for p in url_paths:
        u = _get_by_path(join_data, p)
        if isinstance(u, str) and u.startswith("wss://"):
            url = u; break
    if not tok: tok = _find_first_jwt(join_data)
    if not url: url = _find_first_wss(join_data)
    return tok, url

def get_bootstrap_token() -> Dict[str, Any]:
    if not BOOTSTRAP_URL_TEMPLATE or not AGENT_ID:
        raise ValueError("BOOTSTRAP_URL and AGENT_ID must be set.")
    url = BOOTSTRAP_URL_TEMPLATE.format(AGENT_ID=AGENT_ID)
    headers = {"Origin": DOMAIN_URL or ""}
    r = requests.get(url, headers=headers, timeout=30); r.raise_for_status()
    return r.json()

def create_session(access_token: str) -> Dict[str, Any]:
    if not SALESFORCE_ENDPOINT:
        raise ValueError("SALESFORCE_ENDPOINT must be set.")
    url = f"{SALESFORCE_ENDPOINT}/einstein/ai-agent/v1.1/agents/{AGENT_ID}/sessions"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type":"application/json",
               "Origin": DOMAIN_URL or "", "Referer": DOMAIN_URL or ""}
    payload = {
        "externalSessionKey": f"session-{os.urandom(8).hex()}",
        "instanceConfig": {"endpoint": DOMAIN_URL},
        "tz": "America/Los_Angeles",
        "variables": [{"name":"$Context.EndUserLanguage","type":"Text","value":"en_US"}],
        "featureSupport": "",
        "bypassUser": True,
    }
    r = requests.post(url, headers=headers, json=payload, timeout=30); r.raise_for_status()
    return r.json()

def join_realtime_session(access_token: str, session_id: str) -> Dict[str, Any]:
    if not SALESFORCE_ENDPOINT:
        raise ValueError("SALESFORCE_ENDPOINT must be set.")
    url = f"{SALESFORCE_ENDPOINT}/einstein/ai-agent/v1.1/realtime/sessions/{session_id}/join"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type":"application/json",
               "Origin": DOMAIN_URL or "", "Referer": DOMAIN_URL or ""}
    r = requests.post(url, headers=headers, json={}, timeout=30); r.raise_for_status()
    return r.json()


class SessionHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def _handle(self, fn):
        try:
            fn()
        except requests.exceptions.RequestException as e:
            body = getattr(e, "response", None).text if getattr(e, "response", None) else ""
            _send_json(self, 502, {"error": str(e), "responseBody": body})
        except Exception as e:
            traceback.print_exc()
            _send_json(self, 500, {"error": str(e)})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            data = {}

        def join_room():
            token_data = get_bootstrap_token()
            print(f"🔍 Bootstrap response: {json.dumps(token_data, indent=2)}")
            
            access_token = token_data.get("access_token") or token_data.get("accessToken")
            if not access_token:
                raise ValueError("Access token not found in bootstrap response.")
            print(f"🎫 Access token: {access_token[:50]}...")
            
            session_data = create_session(access_token)
            print(f"🔍 Session response: {json.dumps(session_data, indent=2)}")
            
            session_id = session_data.get("sessionId")
            if not session_id:
                raise ValueError("Session ID not found.")
            print(f"🆔 Session ID: {session_id}")
            
            join_data = join_realtime_session(access_token, session_id)
            print(f"🔍 Join response: {json.dumps(join_data, indent=2)}")
            
            tok, wss = extract_livekit_creds(join_data)
            if not tok or not wss:
                raise ValueError("Could not find LiveKit token or endpoint.")
            print(f"🎫 LiveKit token: {tok[:50]}...")
            print(f"🌐 LiveKit URL: {wss}")
            
            _send_json(self, 200, {"sessionId": session_id, "livekitUrl": wss, "token": tok})

        def create_session_only():
            token_data = get_bootstrap_token()
            access_token = token_data.get("access_token") or token_data.get("accessToken")
            if not access_token:
                raise ValueError("Access token not found in bootstrap response.")
            provided = (data.get("sessionId") or "").strip()
            if provided:
                _send_json(self, 200, {"sessionId": provided, "agentResponse": ""})
                return
            session_data = create_session(access_token)
            _send_json(self, 200, {"sessionId": session_data.get("sessionId"), "agentResponse": ""})


        if   self.path == "/api/room/join":          return self._handle(join_room)
        elif self.path == "/api/session/create":     return self._handle(create_session_only)
        else:
            _send_json(self, 404, {"error":"Not Found"})

def run_server(host="127.0.0.1", port=7000):
    print(f"🔌 Local API listening on http://{host}:{port}")
    HTTPServer((host, port), SessionHandler).serve_forever()

if __name__ == "__main__":
    run_server()
