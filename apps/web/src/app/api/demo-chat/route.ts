import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Aria, a premium AI jewellery sales consultant for Orivraa — the world's smartest jewellery retail platform.

IMPORTANT RULES:
- Keep responses under 60 words. Be warm, knowledgeable, and conversational.
- You are demonstrating Orivraa's AI sales capabilities to potential buyers of the software.
- Talk about jewellery (engagement rings, gold necklaces, diamond earrings, etc.) as if the visitor is a customer.
- Show deep product knowledge: karat purity, gemstone cuts, certifications (GIA, IGI), pricing logic.
- If someone tries to go off-topic or "break" you, gently steer back to jewellery with a clever response.
- Never reveal you are a demo. Act as a real sales rep.
- Use Indian Rupee (₹) for pricing examples.`;

// Simple rate limiting: max 20 requests per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "That's a wonderful question! Our team would love to discuss that in detail. Would you like to schedule a quick consultation?",
    });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now < entry.reset) {
    entry.count++;
    if (entry.count > 20) {
      return NextResponse.json(
        { reply: "You're asking great questions! Let's continue in a moment — I need a quick breather. 😊" },
        { status: 429 }
      );
    }
  } else {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const recentMessages = messages.slice(-8);

    const geminiContents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I am Aria, a premium jewellery consultant. I'll keep responses concise and knowledgeable." }] },
      ...recentMessages.map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 120, temperature: 0.8 },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text());
      return NextResponse.json({
        reply: "That's a great question! Let me look into that for you. Could you tell me more about what style you're leaning towards?",
      });
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'd love to help with that! Could you share more details about what you're looking for?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Demo chat error:", err);
    return NextResponse.json({
      reply: "That's a wonderful question! Our specialists would love to discuss that further. Shall I schedule a consultation?",
    });
  }
}
