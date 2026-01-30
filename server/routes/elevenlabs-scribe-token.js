/**
 * ElevenLabs Scribe Token API
 * Creates single-use tokens for real-time speech-to-text
 */

import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const { token } = await response.json();

    res.json({ token });
  } catch (error) {
    console.error("Error getting scribe token:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
