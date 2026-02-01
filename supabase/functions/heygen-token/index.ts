import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support custom API key via request body (e.g., for Swiss Post)
    let apiKeyName = 'HEYGEN_API_KEY';
    try {
      const body = await req.json();
      if (body?.apiKeyName) {
        apiKeyName = body.apiKeyName;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    const HEYGEN_API_KEY = Deno.env.get(apiKeyName);
    
    if (!HEYGEN_API_KEY) {
      throw new Error(`${apiKeyName} is not configured`);
    }

    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', response.status, errorText);
      throw new Error(`HeyGen API error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify({ token: data.data.token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating HeyGen token:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
