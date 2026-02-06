/**
 * HeyGen Token API
 * Creates streaming tokens for HeyGen avatar
 * Falls back to Proto endpoint if HEYGEN_API_KEY is not configured
 */

import express from 'express';

const router = express.Router();

// Proto endpoint for getting HeyGen access token (fallback)
const PROTO_TOKEN_URL = 'https://proto-salesforce-b927b6eea443.herokuapp.com/api/manage/getAccessToken';

router.post('/', async (req, res) => {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
    
    // If API key is configured, use it directly
    if (HEYGEN_API_KEY) {
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
      return res.json({ token: data.data.token });
    }

    // Fallback: use Proto endpoint
    console.log('HEYGEN_API_KEY not configured, using Proto endpoint');
    const response = await fetch(PROTO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Failed to get HeyGen token from Proto endpoint');
    }

    let token = await response.text();
    token = token.replace(/^"|"$/g, '').trim();
    
    // Parse the token if it's JSON
    try {
      const parsed = JSON.parse(token);
      if (parsed.token) {
        token = parsed.token;
      }
    } catch {
      // Token is already a string, use as is
    }
    
    res.json({ token });
  } catch (error) {
    console.error('Error creating HeyGen token:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
