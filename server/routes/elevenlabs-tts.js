/**
 * ElevenLabs TTS API
 * Text-to-speech conversion with emotion presets
 */

import express from 'express';

const router = express.Router();

// ElevenLabs voice emotion/style presets
const EMOTION_PRESETS = {
  excited: { stability: 0.3, similarity_boost: 0.8, style: 0.7, use_speaker_boost: true },
  friendly: { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true },
  serious: { stability: 0.8, similarity_boost: 0.9, style: 0.2, use_speaker_boost: true },
  soothing: { stability: 0.7, similarity_boost: 0.7, style: 0.3, use_speaker_boost: false },
  broadcaster: { stability: 0.85, similarity_boost: 0.85, style: 0.4, use_speaker_boost: true },
};

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

router.post('/', async (req, res) => {
  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, voiceId, emotion, speed } = req.body;

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const emotionSettings = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.friendly;
    const speechSpeed = speed || 1.0;

    console.log(`[ElevenLabs TTS] Voice: ${selectedVoiceId}, Emotion: ${emotion || 'friendly'}, Speed: ${speechSpeed}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: emotionSettings.stability,
            similarity_boost: emotionSettings.similarity_boost,
            style: emotionSettings.style,
            use_speaker_boost: emotionSettings.use_speaker_boost,
            speed: speechSpeed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ElevenLabs API Error]", response.status, errorText);

      let parsed = null;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        // ignore
      }

      const detailStatus = parsed?.detail?.status;
      const detailMessage = parsed?.detail?.message;

      if (detailStatus === 'quota_exceeded') {
        return res.status(402).json({
          error: detailMessage || 'ElevenLabs quota exceeded.',
          code: 'quota_exceeded',
        });
      }

      if (detailStatus === 'missing_permissions') {
        return res.status(403).json({
          error: detailMessage || 'ElevenLabs API key is missing text_to_speech permission.',
          code: 'missing_permissions',
        });
      }

      return res.status(response.status).json({
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText,
      });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[ElevenLabs TTS] Generated ${audioBuffer.byteLength} bytes of audio`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("ElevenLabs TTS Error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
