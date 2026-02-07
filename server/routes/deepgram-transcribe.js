/**
 * Deepgram Transcribe API (non-realtime)
 * Accepts JSON { audioBase64, mimeType } and returns { text }
 * 
 * Supports recordings up to 60+ seconds. Deepgram typically processes
 * audio at ~10x realtime speed, so 60s audio takes ~6s to transcribe.
 */

import express from "express";

const router = express.Router();
// Note: JSON body limit (10mb) is set in main server/index.js

router.post("/", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const { audioBase64, mimeType } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Missing audioBase64" });
    }

    // Decode base64 to buffer
    const audioBytes = Buffer.from(audioBase64, "base64");
    const fileSizeKB = (audioBytes.length / 1024).toFixed(1);
    console.log(`[Deepgram] Transcribing ${fileSizeKB}KB audio, mimeType: ${mimeType || "unknown"}`);

    // Clean mimeType - remove codecs parameter if present (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    let contentType = "application/octet-stream";
    if (typeof mimeType === "string" && mimeType) {
      contentType = mimeType.split(";")[0].trim();
    }

    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", "nova-2");
    url.searchParams.set("language", "en");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    // Keyword boosting for domain-specific terms
    url.searchParams.append("keywords", "Agentforce:2");
    url.searchParams.append("keywords", "Data360:2");
    url.searchParams.append("keywords", "Agentic Enterprise:2");
    url.searchParams.append("keywords", "Salesforce:2");

    console.log(`[Deepgram] Sending to API with Content-Type: ${contentType}`);
    
    // Deepgram is fast - typically processes at 10x realtime
    // 60s audio = ~6s processing time, so 28s timeout is plenty
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);
    
    let dgRes;
    try {
      dgRes = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": contentType,
        },
        body: audioBytes,
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      if (fetchError.name === 'AbortError') {
        console.error(`[Deepgram] Request timed out after ${elapsed}ms`);
        return res.status(504).json({ error: "Transcription timed out" });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!dgRes.ok) {
      const errText = await dgRes.text().catch(() => "");
      console.error(`[Deepgram] API error ${dgRes.status}:`, errText);
      return res.status(500).json({ error: "Deepgram transcription failed", details: errText });
    }

    const json = await dgRes.json();
    const elapsed = Date.now() - startTime;
    
    const text =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
      json?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ??
      "";

    console.log(`[Deepgram] ✓ Transcribed in ${elapsed}ms: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    res.json({ text });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Deepgram] Error after ${elapsed}ms:`, error.message || error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
