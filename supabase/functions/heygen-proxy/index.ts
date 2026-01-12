import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEYGEN_API_BASE = 'https://api.heygen.com/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    
    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
    }

    const { action, token, ...params } = await req.json();
    
    console.log('HeyGen proxy action:', action);

    let endpoint = '';
    let body: Record<string, unknown> = {};

    switch (action) {
      case 'create_token':
        endpoint = '/streaming.create_token';
        break;
      case 'new':
        endpoint = '/streaming.new';
        body = {
          avatar_name: params.avatarName || 'default',
          quality: params.quality || 'medium',
          voice: params.voice || { elevenlabs_settings: {} },
          version: 'v2',
          video_encoding: 'H264',
          source: 'sdk',
          ia_is_livekit_transport: false,
        };
        break;
      case 'start':
        endpoint = '/streaming.start';
        body = { session_id: params.sessionId };
        break;
      case 'stop':
        endpoint = '/streaming.stop';
        body = { session_id: params.sessionId };
        break;
      case 'speak':
        endpoint = '/streaming.task';
        body = { 
          session_id: params.sessionId,
          text: params.text,
          task_type: 'repeat',
        };
        break;
      case 'interrupt':
        endpoint = '/streaming.interrupt';
        body = { session_id: params.sessionId };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Use session token for authenticated calls, API key for token creation
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    } else {
      headers['x-api-key'] = HEYGEN_API_KEY;
    }

    console.log('Calling HeyGen:', endpoint);

    const response = await fetch(`${HEYGEN_API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('HeyGen response status:', response.status);

    if (!response.ok) {
      console.error('HeyGen API error:', response.status, responseText);
      return new Response(
        JSON.stringify({ error: `HeyGen API error: ${response.status}`, details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('HeyGen proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
