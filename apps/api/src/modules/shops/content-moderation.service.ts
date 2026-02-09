import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { RedisService } from "../../common";

/**
 * Content Moderation Service
 *
 * Uses Google Gemini Flash API to:
 * 1. Detect personal contact info (phone, email, address, social media)
 * 2. Detect vulgar/offensive language
 * 3. Return structured moderation result
 *
 * Includes Redis caching to avoid repeated Gemini API calls for the same text.
 * Used for shop "about" sections where sellers must not share contact info.
 */
@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = "moderation:";
  private readonly CACHE_TTL = 86400; // 24 hours

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Generate a short hash of the text for cache key
   */
  private getTextHash(text: string): string {
    return createHash("sha256")
      .update(text.trim().toLowerCase())
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Moderate text content for the shop "about" section.
   * Uses Redis cache to avoid repeated Gemini API calls.
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

    // Check Redis cache before calling Gemini
    const cacheKey = `${this.CACHE_PREFIX}${this.getTextHash(text)}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Moderation cache hit for key: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {
      // Cache miss or error — proceed to API
    }

    // Use Gemini for deeper semantic analysis
    if (!this.apiKey) {
      this.logger.warn(
        "GEMINI_API_KEY not configured — skipping AI moderation",
      );
      return { safe: true, violations: [] };
    }

    try {
      const result = await this.moderateWithGemini(text);

      // Cache the result (both safe and unsafe) for 24h
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(result),
          this.CACHE_TTL,
        );
      } catch {
        // Non-critical — caching failure shouldn't block moderation
      }

      return result;
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
   * Normalize obfuscated text before regex checking.
   * Strips separators, converts spelled-out/leetspeak digits, etc.
   */
  private normalizeForDigitDetection(text: string): string {
    let normalized = text.toLowerCase();

    // Replace spelled-out numbers with digits
    const wordToDigit: Record<string, string> = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      oh: "0",
      o: "0",
      nought: "0",
    };
    // Match whole words — "one", "two", etc.
    for (const [word, digit] of Object.entries(wordToDigit)) {
      // Use word boundary but handle "o" carefully (only standalone or as digit substitute)
      if (word === "o") {
        normalized = normalized.replace(/\bo\b/g, digit);
      } else {
        normalized = normalized.replace(
          new RegExp(`\\b${word}\\b`, "g"),
          digit,
        );
      }
    }

    // Replace leetspeak / homoglyph characters
    const homoglyphs: Record<string, string> = {
      l: "1",
      i: "1",
      "!": "1",
      "|": "1",
      z: "2",
      e: "3",
      a: "4",
      s: "5",
      b: "8",
      g: "9",
      q: "9",
    };
    // Only apply homoglyph replacement in sequences that look like digit attempts
    // (surrounded by actual digits or separators)
    // We do this by first stripping common separators between digits
    normalized = normalized.replace(/(\d)[.\-\s,_|/\\]+(\d)/g, "$1$2");

    return normalized;
  }

  /**
   * Quick regex-based check for phone numbers, emails, URLs, addresses.
   * Catches creative obfuscation patterns including:
   * - Dotted digits: 6.2.0.3.9.6.5.5.5.7
   * - Spaced digits: 6 2 0 3 9 6 5 5 5 7
   * - Spelled-out: six two zero three nine six five five five seven
   * - Dash/comma separated: 6-2-0-3, 620,396,5557
   * - Parenthesized: (620) 396 5557
   * - Mixed: s1x tw0 thr33
   */
  private quickRegexCheck(text: string): string[] {
    const violations: string[] = [];
    const normalized = text.toLowerCase();

    // ── PHONE NUMBER DETECTION ────────────────────────────

    // 1. Standard phone formats (international, grouped)
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

    // 2. Digits separated by dots, dashes, spaces, commas, underscores, pipes
    // e.g. "6.2.0.3.9.6.5.5.5.7" or "6-2-0-3-9-6-5-5-5-7" or "6 2 0 3 9 6 5 5 5 7"
    if (violations.length === 0) {
      const separatedDigits =
        /\d[\s.\-_,|/\\]+\d[\s.\-_,|/\\]+\d[\s.\-_,|/\\]+\d[\s.\-_,|/\\]+\d[\s.\-_,|/\\]+\d[\s.\-_,|/\\]+\d/g;
      if (separatedDigits.test(text)) {
        // Verify it's 7+ digits when separators are stripped
        const digitsOnly = text.replace(/[^\d]/g, "");
        if (digitsOnly.length >= 7) {
          violations.push(
            "Separated digits detected as phone number — personal contacts are not allowed",
          );
        }
      }
    }

    // 3. Spelled-out digit sequences: "six two zero three nine six five five five seven"
    if (violations.length === 0) {
      const digitWords =
        /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought)\b/gi;
      const matches = normalized.match(digitWords);
      if (matches && matches.length >= 7) {
        violations.push(
          "Spelled-out phone number detected — personal contacts are not allowed",
        );
      }
    }

    // 4. Normalized digit extraction — catches mixed obfuscation
    // After normalizing spelled words to digits and stripping separators,
    // check for any run of 7+ consecutive digits
    if (violations.length === 0) {
      const normalizedText = this.normalizeForDigitDetection(text);
      const digitRuns = normalizedText.match(/\d{7,}/g);
      if (digitRuns && digitRuns.length > 0) {
        // Only flag if not already caught and doesn't look like a year range or normal number
        const suspicious = digitRuns.some(
          (run) => run.length >= 7 && run.length <= 15,
        );
        if (suspicious) {
          violations.push(
            "Hidden phone number pattern detected — personal contacts are not allowed",
          );
        }
      }
    }

    // ── EMAIL DETECTION ────────────────────────────────

    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(text)) {
      violations.push(
        "Email address detected — personal contacts are not allowed",
      );
    }

    // Obfuscated email: "name at gmail dot com", "name [at] domain [dot] com"
    if (
      /\b\w+\s*(?:\[?\s*at\s*\]?|@)\s*\w+\s*(?:\[?\s*dot\s*\]?|\.)\s*(?:com|net|org|io|co|in|np)\b/gi.test(
        normalized,
      )
    ) {
      violations.push(
        "Obfuscated email detected — personal contacts are not allowed",
      );
    }

    // ── URL / SOCIAL MEDIA DETECTION ──────────────────

    if (
      /(?:https?:\/\/|www\.)[^\s]+/gi.test(text) ||
      /(?:facebook|instagram|twitter|tiktok|youtube|whatsapp|telegram|viber|snapchat|linkedin|pinterest)\.com/gi.test(
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

    // Platform references without URLs: "follow us on instagram", "find me on facebook"
    if (
      /\b(?:follow|find|message|dm|ping|add)\s+(?:me|us|them)?\s*(?:on|at|via)\s+(?:instagram|facebook|twitter|whatsapp|telegram|viber|tiktok|snapchat)\b/gi.test(
        normalized,
      )
    ) {
      violations.push(
        "Social media reference detected — not allowed in about section",
      );
    }

    // ── CONTACT SOLICITATION ──────────────────────────

    const contactSolicitation =
      /\b(call\s*(?:me|us)|contact\s*(?:me|us)|whatsapp\s*(?:me|us|number|no)|reach\s*(?:me|us)|dm\s*(?:me|us)|ping\s*(?:me|us)|text\s*(?:me|us)|msg\s*(?:me|us)|phone\s*(?:me|us))\b/gi;
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
