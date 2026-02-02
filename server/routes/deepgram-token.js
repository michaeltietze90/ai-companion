/**
 * Deepgram Token API
 * Returns API key for real-time speech-to-text WebSocket connection
 */

import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    // Return the API key for WebSocket authentication
    // Deepgram doesn't have single-use tokens like ElevenLabs,
    // but we keep the key server-side and return it securely
    res.json({ apiKey: DEEPGRAM_API_KEY });
  } catch (error) {
    console.error("Error getting Deepgram token:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
