import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Lead, MessageDirection, MessageSender } from "@prisma/client";
import axios from "axios";
import { PrismaService } from "../../prisma/prisma.service";
import { FestivalCalendarService } from "../recovery-offers/festival-calendar.service";
import { LeadsWhatsAppService } from "./leads-whatsapp.service";

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

@Injectable()
export class LeadsAiBotService {
  private readonly logger = new Logger(LeadsAiBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly festivalCalendar: FestivalCalendarService,
    @Inject(forwardRef(() => LeadsWhatsAppService))
    private readonly whatsAppService: LeadsWhatsAppService
  ) {}

  private getGeminiApiKey(): string {
    return this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("NEXT_PUBLIC_SITE_URL") ||
      "https://www.orivraa.com"
    );
  }

  private async getFestivalContext(countryCode: string): Promise<string> {
    try {
      if (this.festivalCalendar) {
        const currentYear = new Date().getFullYear();
        const cal = this.festivalCalendar.getCalendar(currentYear, 2);
        const nowIso = new Date().toISOString().slice(0, 10);
        const next = cal.events.find(
          (e) =>
            e.countries.includes(countryCode.toUpperCase() as any) &&
            e.date >= nowIso
        );
        if (next) {
          return `Active / Upcoming Festival: ${next.name} (Date: ${next.date}). Highlight special festival offers or extended trial bonus for this festive season!`;
        }
      }
    } catch {}
    return "No major jewellery festival within the next 30 days. Emphasize everyday business growth, faster billing, and inventory control.";
  }

  async generateAndSendReply(lead: Lead, incomingUserText: string): Promise<void> {
    const frontendBaseUrl = this.getFrontendBaseUrl();
    const apiKey = this.getGeminiApiKey();

    // Contextual claim link with tracking
    const claimLink = `${frontendBaseUrl}/auth/register?ref=lead_whatsapp&leadId=${lead.id}&shopName=${encodeURIComponent(
      lead.shopName
    )}&email=${encodeURIComponent(lead.email || "")}&city=${encodeURIComponent(
      lead.city || ""
    )}&country=${lead.country}&promo=WHATSAPP60`;

    // Retrieve recent message history (last 8 messages)
    const history = await this.prisma.leadMessage.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    history.reverse();

    const festivalInfo = await this.getFestivalContext(lead.country);

    let replyText = "";
    let mediaUrlToSend: string | undefined;

    if (apiKey) {
      try {
        const systemInstruction = `
You are the polite, knowledgeable Orivraa Jeweller Concierge assisting jewellery shopkeepers on WhatsApp.
Your goal is to answer their questions about Orivraa software, highlight its benefits for their business, and warmly invite them to claim their 60-day complimentary PRO access.

ABOUT ORIVRAA:
- All-in-one jewellery ERP & POS software built specifically for jewellery retail and manufacturing.
- Core Features:
  * Jewellery Invoicing: Pure gold/silver daily rates, wastage, making charges (per gram or flat), hallmark, gemstone breakdown, GST (India) / VAT (Nepal/UAE).
  * Karigar Book: Tracks gold issued to karigars, return metal, and calculates allowable gold loss.
  * Multi-unit weights: Tola, Laal, Grams, Troy Ounces.
  * Offline-capable cloud sync: Keeps billing even when the internet drops.
  * Free 60-Day Trial: No credit card required. Instant account setup.

CURRENT SHOP CONTEXT:
- Shop Name: ${lead.shopName}
- Location: ${lead.city || "Unknown City"}, ${lead.country}
- ${festivalInfo}
- Personalized 60-Day Trial Claim Link: ${claimLink}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Keep the reply concise, natural, and formatted for WhatsApp (use 1-2 emojis, short paragraphs, bullet points if listing features).
2. Reply in the same language as the shopkeeper (English, Nepali, Hindi, or Arabic). If unsure, use friendly English.
3. If they ask about pricing or starting a trial, give them their personalized link: ${claimLink}.
4. If they ask for photos, banners, or visual details, reply that you've attached a preview of Orivraa.
5. Never invent false pricing. Base price is after 60-day free trial.
6. If the user asks for a feature brochure or festival offer graphic, output the tag "[ATTACH_FEATURE_BANNER]" or "[ATTACH_PROMO_CARD]" at the end of your response.
`;

        const contents: GeminiContent[] = [];

        // Add history turns
        for (const msg of history) {
          if (msg.direction === MessageDirection.INBOUND) {
            contents.push({ role: "user", parts: [{ text: msg.body }] });
          } else {
            contents.push({ role: "model", parts: [{ text: msg.body }] });
          }
        }

        // Ensure the latest incoming text is present
        if (
          contents.length === 0 ||
          contents[contents.length - 1].parts[0].text !== incomingUserText
        ) {
          contents.push({ role: "user", parts: [{ text: incomingUserText }] });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const geminiRes = await axios.post(
          endpoint,
          {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600,
            },
          },
          { timeout: 20000 }
        );

        const candidates = geminiRes.data?.candidates;
        if (candidates && candidates[0]?.content?.parts?.[0]?.text) {
          replyText = candidates[0].content.parts[0].text.trim();
        }
      } catch (err: any) {
        this.logger.error(`Gemini WhatsApp generation failed: ${err?.message}`);
      }
    }

    // Check media tags in AI response
    if (replyText.includes("[ATTACH_FEATURE_BANNER]")) {
      mediaUrlToSend = `${frontendBaseUrl}/luxury-gold-ring-box.png`;
      replyText = replyText.replace(/\[ATTACH_FEATURE_BANNER\]/g, "").trim();
    } else if (replyText.includes("[ATTACH_PROMO_CARD]")) {
      mediaUrlToSend = `${frontendBaseUrl}/luxury-gold-globe.png`;
      replyText = replyText.replace(/\[ATTACH_PROMO_CARD\]/g, "").trim();
    }

    // Default fallback if Gemini is offline or failed
    if (!replyText) {
      replyText = `Namaste! 🙏 Thank you for reaching out from *${lead.shopName}*.\n\nOrivraa is designed specifically for jewellery shops to manage daily gold rates, jewellery billing, and karigar books seamlessly.\n\n✨ You can activate your *60-day complimentary PRO trial* (no credit card required) directly here:\n👉 ${claimLink}\n\nFeel free to ask any questions about features or setting up!`;
    }

    await this.whatsAppService.sendMessage(lead.id, replyText, {
      mediaUrl: mediaUrlToSend,
      sender: MessageSender.AI_BOT,
    });
  }
}
