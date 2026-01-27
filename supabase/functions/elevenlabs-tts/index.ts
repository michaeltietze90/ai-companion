import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ElevenLabs voice emotion/style presets mapped to voice settings
const EMOTION_PRESETS: Record<string, { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }> = {
  excited: { stability: 0.3, similarity_boost: 0.8, style: 0.7, use_speaker_boost: true },
  friendly: { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true },
  serious: { stability: 0.8, similarity_boost: 0.9, style: 0.2, use_speaker_boost: true },
  soothing: { stability: 0.7, similarity_boost: 0.7, style: 0.3, use_speaker_boost: false },
  broadcaster: { stability: 0.85, similarity_boost: 0.85, style: 0.4, use_speaker_boost: true },
};

// Default ElevenLabs voice (Sarah - natural, expressive)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, voiceId, emotion, speed } = await req.json();

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const emotionSettings = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.friendly;
    const speechSpeed = speed || 1.0;

    console.log(`[ElevenLabs TTS] Voice: ${selectedVoiceId}, Emotion: ${emotion || 'friendly'}, Speed: ${speechSpeed}`);
    console.log(`[ElevenLabs TTS] Emotion settings:`, JSON.stringify(emotionSettings));
    console.log(`[ElevenLabs TTS] Text (${text.length} chars): ${text.substring(0, 100)}...`);

    // Use multilingual_v2 model for best emotion/expressiveness support
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
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Return audio as binary directly
    const audioBuffer = await response.arrayBuffer();

    console.log(`[ElevenLabs TTS] Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
