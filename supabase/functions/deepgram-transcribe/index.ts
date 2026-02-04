import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64ToUint8Array(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY is not configured");

    const { audioBase64, mimeType } = await req.json().catch(() => ({}));
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing audioBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBytes = base64ToUint8Array(audioBase64);

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
      return new Response(JSON.stringify({ error: "Deepgram transcription failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await dgRes.json();
    const text =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
      json?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ??
      "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
