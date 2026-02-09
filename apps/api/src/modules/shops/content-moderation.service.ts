import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Content Moderation Service
 *
 * Uses Google Gemini Flash API to:
 * 1. Detect personal contact info (phone, email, address, social media)
 * 2. Detect vulgar/offensive language
 * 3. Return structured moderation result
 *
 * Used for shop "about" sections where sellers must not share contact info.
 */
@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Moderate text content for the shop "about" section.
   * Returns { safe: boolean, violations: string[], sanitized?: string }
   */
  async moderateAboutText(text: string): Promise<{
    safe: boolean;
    violations: string[];
    sanitized?: string;
  }> {
    if (!text || text.trim().length === 0) {
      return { safe: true, violations: [] };
    }

    // Quick regex pre-check for obvious patterns (fast, no API call needed)
    const quickViolations = this.quickRegexCheck(text);
    if (quickViolations.length > 0) {
      return { safe: false, violations: quickViolations };
    }

    // Use Gemini for deeper semantic analysis
    if (!this.apiKey) {
      this.logger.warn(
        "GEMINI_API_KEY not configured — skipping AI moderation",
      );
      return { safe: true, violations: [] };
    }

    try {
      return await this.moderateWithGemini(text);
    } catch (error) {
      this.logger.error(
        "Gemini moderation failed, falling back to regex-only:",
        error,
      );
      // Fail open to avoid blocking sellers when AI is down
      return { safe: true, violations: [] };
    }
  }

  /**
   * Quick regex-based check for phone numbers, emails, URLs, addresses
   */
  private quickRegexCheck(text: string): string[] {
    const violations: string[] = [];
    const normalized = text.toLowerCase();

    // Phone numbers (international formats)
    const phonePatterns = [
      /(?:\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
      /\b\d{10,14}\b/g,
    ];
    for (const pattern of phonePatterns) {
      if (pattern.test(text)) {
        violations.push(
          "Phone number detected — personal contacts are not allowed",
        );
        break;
      }
    }

    // Email addresses
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(text)) {
      violations.push(
        "Email address detected — personal contacts are not allowed",
      );
    }

    // URLs / social media handles
    if (
      /(?:https?:\/\/|www\.)[^\s]+/gi.test(text) ||
      /(?:facebook|instagram|twitter|tiktok|youtube|whatsapp|telegram|viber)\.com/gi.test(
        normalized,
      )
    ) {
      violations.push(
        "Website or social media link detected — not allowed in about section",
      );
    }

    // Social media handles (@username patterns)
    if (/@[a-zA-Z0-9_]{3,}/g.test(text)) {
      violations.push(
        "Social media handle detected — personal contacts are not allowed",
      );
    }

    // Explicit "call me", "contact me", "WhatsApp" solicitations
    const contactSolicitation =
      /\b(call\s*(?:me|us)|contact\s*(?:me|us)|whatsapp\s*(?:me|us|number|no)|reach\s*(?:me|us))\b/gi;
    if (contactSolicitation.test(normalized)) {
      violations.push(
        "Contact solicitation detected — not allowed in about section",
      );
    }

    return violations;
  }

  /**
   * Deep semantic analysis using Gemini Flash
   */
  private async moderateWithGemini(text: string): Promise<{
    safe: boolean;
    violations: string[];
  }> {
    const prompt = `You are a content moderator for a jewelry marketplace platform. Analyze the following "About" section text from a seller's profile.

Check for these violations:
1. **Personal contact info**: Phone numbers (even disguised like "nine eight seven..."), email addresses, physical addresses, social media handles, WhatsApp numbers
2. **Offensive/vulgar language**: Profanity, slurs, hate speech, sexually explicit content
3. **Misleading claims**: False certification claims, deceptive promises
4. **Contact solicitation**: Any attempt to direct customers to contact the seller outside the platform (even subtle ones like "DM me", "ping me", "find us at...")

Text to analyze:
"""
${text}
"""

Respond in this exact JSON format only (no markdown, no explanation):
{"safe": true/false, "violations": ["violation description 1", "violation description 2"]}

If the text is clean business description about the shop, products, craftsmanship, history, etc., mark it as safe with empty violations array.`;

    const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    try {
      // Clean any markdown wrapper
      const cleaned = resultText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const result = JSON.parse(cleaned);
      return {
        safe: !!result.safe,
        violations: Array.isArray(result.violations) ? result.violations : [],
      };
    } catch {
      this.logger.warn(
        "Could not parse Gemini moderation response:",
        resultText,
      );
      return { safe: true, violations: [] };
    }
  }
}
