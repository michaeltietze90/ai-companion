/**
 * Deepgram Transcribe API (non-realtime)
 * Accepts JSON { audioBase64, mimeType } and returns { text }
 */

import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const { audioBase64, mimeType } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Missing audioBase64" });
    }

    const audioBytes = Buffer.from(audioBase64, "base64");
    console.log(`Transcribing audio: ${audioBytes.length} bytes, mimeType: ${mimeType || "unknown"}`);
    
    // Warn if audio is very large (>500KB typically indicates >30s of audio)
    if (audioBytes.length > 500000) {
      console.warn(`Warning: Large audio file (${(audioBytes.length / 1024).toFixed(1)}KB) - may timeout`);
    }

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

    console.log(`Sending to Deepgram with Content-Type: ${contentType}`);
    
    // Create abort controller with timeout for long recordings
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (Heroku has 30s limit)
    
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
      if (fetchError.name === 'AbortError') {
        console.error("Deepgram request timed out after 25s");
        return res.status(504).json({ error: "Transcription timed out - try a shorter recording" });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!dgRes.ok) {
      const errText = await dgRes.text().catch(() => "");
      console.error("Deepgram transcription error:", dgRes.status, errText);
      return res.status(500).json({ error: "Deepgram transcription failed", details: errText });
    }

    const json = await dgRes.json();
    console.log("Deepgram response:", JSON.stringify(json).substring(0, 500));
    
    const text =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
      json?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ??
      "";

    console.log("Extracted text:", text || "(empty)");
    res.json({ text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
