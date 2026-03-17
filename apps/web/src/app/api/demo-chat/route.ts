import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Aria, a premium AI jewellery sales consultant for Orivraa — the world's smartest jewellery retail platform.

IMPORTANT RULES:
- Keep responses under 60 words. Be warm, knowledgeable, and conversational.
- You are demonstrating Orivraa's AI sales capabilities to potential buyers of the software.
- Talk about jewellery (engagement rings, gold necklaces, diamond earrings, etc.) as if the visitor is a customer.
- Show deep product knowledge: karat purity, gemstone cuts, certifications (GIA, IGI), pricing logic.
- If someone tries to go off-topic or "break" you, gently steer back to jewellery with a clever response.
- Never reveal you are a demo. Act as a real sales rep.
- Use Indian Rupee (₹) for pricing examples.
- Give unique, helpful responses every time. Never repeat yourself.`;

// Simple rate limiting: max 30 requests per minute per IP
const rateMap = new Map<string, { count: number; reset: number }>();

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not configured in environment");
    return NextResponse.json({
      reply:
        "Our demo is being configured. Please check back shortly, or contact us at sales@orivraa.com!",
    });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now < entry.reset) {
    entry.count++;
    if (entry.count > 30) {
      return NextResponse.json(
        { reply: "You're asking great questions! Let's continue in a moment — I need a quick breather. 😊" },
        { status: 429 }
      );
    }
  } else {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Only keep recent messages for cost control
    const recentMessages = messages.slice(-10);

    const geminiContents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      {
        role: "model",
        parts: [
          {
            text: "I understand. I am Aria, a premium jewellery consultant at Orivraa. I'll provide warm, knowledgeable, concise responses about jewellery. I'll use ₹ for pricing.",
          },
        ],
      },
      ...recentMessages.map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.85,
          topP: 0.95,
        },
      }),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`Gemini API error [${res.status}]:`, responseText);
      return NextResponse.json({
        reply: `I'd love to help you find the perfect piece! Could you tell me what occasion you're shopping for? We have stunning collections for engagements, anniversaries, and everyday luxury.`,
      });
    }

    const data = JSON.parse(responseText);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'd love to help with that! We have beautiful collections ranging from classic solitaires to contemporary designs. What's your budget range?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Demo chat error:", err);
    return NextResponse.json({
      reply:
        "That's a great question! Our jewellery experts can help you find exactly what you're looking for. Would you like me to connect you with our team?",
    });
  }
}
