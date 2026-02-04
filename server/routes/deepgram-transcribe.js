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

    const dgRes = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": typeof mimeType === "string" && mimeType ? mimeType : "application/octet-stream",
      },
      body: audioBytes,
    });

    if (!dgRes.ok) {
      const errText = await dgRes.text().catch(() => "");
      console.error("Deepgram transcription error:", errText);
      return res.status(500).json({ error: "Deepgram transcription failed" });
    }

    const json = await dgRes.json();
    const text =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
      json?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ??
      "";

    res.json({ text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

export default router;
