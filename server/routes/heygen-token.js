/**
 * HeyGen Token API
 * Creates streaming tokens for HeyGen avatar
 */

import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
    
    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
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
    
    res.json({ token: data.data.token });
  } catch (error) {
    console.error('Error creating HeyGen token:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
