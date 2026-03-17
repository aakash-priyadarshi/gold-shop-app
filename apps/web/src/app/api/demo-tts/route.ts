import { NextResponse } from "next/server";

// ElevenLabs voice ID for Aria (use a warm female voice)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Return empty audio if no key — frontend falls back to browser TTS
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const text =
    "We have twelve stunning designs in that range. Our Kasu Mala collection is a bestseller — shall I walk you through it?";

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("ElevenLabs API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: 502 }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("Demo TTS error:", err);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
