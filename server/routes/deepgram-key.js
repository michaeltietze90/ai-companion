/**
 * Deepgram API Key endpoint
 * Returns the Deepgram API key for WebSocket authentication
 * 
 * Note: In production, you might want to use Deepgram's project API
 * to generate temporary keys instead of exposing the main key.
 */

import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Deepgram API key not configured' });
  }
  
  res.json({ key: apiKey });
});

export default router;
