/**
 * HeyGen Proxy API
 * Proxies requests to HeyGen streaming API
 */

import express from 'express';

const router = express.Router();

const HEYGEN_API_BASE = 'https://api.heygen.com/v1';

router.post('/', async (req, res) => {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
    
    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
    }

    const { action, token, ...params } = req.body;
    
    console.log('HeyGen proxy action:', action);

    let endpoint = '';
    let body = {};

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

    const headers = {
      'Content-Type': 'application/json',
    };

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
      return res.status(response.status).json({ 
        error: `HeyGen API error: ${response.status}`, 
        details: responseText 
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    res.json(data);
  } catch (error) {
    console.error('HeyGen proxy error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
