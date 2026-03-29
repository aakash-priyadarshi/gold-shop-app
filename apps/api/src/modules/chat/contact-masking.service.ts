import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MaskingResult {
  maskedContent: string;
  hasViolation: boolean;
  violationType: string | null;
  originalMatches: string[];
  aiDetected: boolean; // true if Gemini flagged it (beyond regex)
  confidence: number; // 0-1 confidence score from AI
}


/**
 * Contact masking service — multi-layer detection:
 *   Layer 1: Regex patterns (instant, deterministic)
 *   Layer 2: Gemini Flash AI (catches obfuscated contacts, coded language, etc.)
 *
 * Prevents off-platform contact sharing to protect commission revenue.
 */
@Injectable()
export class ContactMaskingService {
  private readonly logger = new Logger(ContactMaskingService.name);
  private readonly GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  // ──────────────────── regex patterns ────────────────────
  private readonly patterns: { type: string; regex: RegExp }[] = [
    // Email
    {
      type: 'EMAIL',
      regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
    },
    // Phone numbers (international formats, 7-15 digits, optional +/country code)
    {
      type: 'PHONE',
      regex: /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}/g,
    },
    // WhatsApp mention
    {
      type: 'WHATSAPP',
      regex: /whats\s*app|wa\.me\/?\d*/gi,
    },
    // Telegram
    {
      type: 'TELEGRAM',
      regex: /telegram|t\.me\/[a-zA-Z0-9_]+/gi,
    },
    // Instagram
    {
      type: 'INSTAGRAM',
      regex: /instagram|insta\s*gram|\big\b\s*:?\s*@?[a-zA-Z0-9_.]+/gi,
    },
    // Facebook / Messenger
    {
      type: 'FACEBOOK',
      regex: /facebook|fb\.com|messenger/gi,
    },
    // Viber
    {
      type: 'VIBER',
      regex: /viber/gi,
    },
    // Signal
    {
      type: 'SIGNAL',
      regex: /\bsignal\s+(app|me|number)/gi,
    },
    // Contact solicitation phrases
    {
      type: 'CONTACT_PHRASE',
      regex: /\b(call\s+me|text\s+me|message\s+me|reach\s+me|contact\s+me|ping\s+me|dm\s+me|my\s+number|my\s+phone|my\s+email|send\s+me\s+your|give\s+me\s+your\s+(number|phone|email|contact)|lets?\s+talk\s+outside|meet\s+me\s+on|find\s+me\s+on|add\s+me\s+on|hit\s+me\s+up)\b/gi,
    },
    // Obfuscated numbers: "nine eight seven..." or "9-8-7-6-5"
    {
      type: 'OBFUSCATED_NUMBER',
      regex:
        /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s,.-]+(zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s,.-]+(zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s,.-]+(zero|one|two|three|four|five|six|seven|eight|nine|oh)/gi,
    },
    // Spaced out digits: "9 8 7 6 5 4 3 2 1 0"
    {
      type: 'SPACED_DIGITS',
      regex: /\b\d[\s.]+\d[\s.]+\d[\s.]+\d[\s.]+\d[\s.]+\d[\s.]+\d/g,
    },
  ];

  /**
   * Scan and mask contact information in a message.
   * Layer 1: regex (fast, deterministic).
   * Layer 2: Gemini AI (for obfuscated attempts) — async, non-blocking.
   * Returns the masked content along with violation metadata.
   */
  mask(content: string): MaskingResult {
    let maskedContent = content;
    let hasViolation = false;
    let violationType: string | null = null;
    const originalMatches: string[] = [];

    for (const pattern of this.patterns) {
      const matches = maskedContent.match(pattern.regex);
      if (matches && matches.length > 0) {
        hasViolation = true;
        if (!violationType) {
          violationType = pattern.type;
        }
        for (const match of matches) {
          originalMatches.push(match);
          maskedContent = maskedContent.replace(match, '[Contact info removed]');
        }
      }
    }

    if (hasViolation) {
      this.logger.warn(
        `Contact info detected (${violationType}): ${originalMatches.length} match(es)`,
      );
    }

    return {
      maskedContent,
      hasViolation,
      violationType,
      originalMatches,
      aiDetected: false,
      confidence: hasViolation ? 1.0 : 0,
    };
  }

  /**
   * Async AI-powered deep scan using Gemini Flash.
   * Catches obfuscated contacts, coded language, screenshots descriptions, etc.
   * Called after regex pass — if regex already caught it, AI is optional.
   * Returns updated MaskingResult with AI findings.
   */
  async deepScan(content: string, regexResult: MaskingResult): Promise<MaskingResult> {
    // If regex already caught it with high confidence, skip AI
    if (regexResult.hasViolation && regexResult.originalMatches.length >= 2) {
      return regexResult;
    }

    if (!this.apiKey) {
      return regexResult; // No API key configured, rely on regex only
    }

    try {
      const aiResult = await this.analyzeWithGemini(content);

      if (aiResult.isViolation && !regexResult.hasViolation) {
        // AI caught something regex missed
        return {
          maskedContent: '[Message blocked — contact sharing detected]',
          hasViolation: true,
          violationType: aiResult.violationType || 'AI_DETECTED',
          originalMatches: aiResult.detectedFragments || [content],
          aiDetected: true,
          confidence: aiResult.confidence,
        };
      }

      // AI confirms regex result or finds additional detail
      if (aiResult.isViolation && regexResult.hasViolation) {
        return {
          ...regexResult,
          aiDetected: true,
          confidence: Math.max(regexResult.confidence, aiResult.confidence),
        };
      }

      return regexResult;
    } catch (error) {
      this.logger.warn(`Gemini deep scan failed, falling back to regex: ${error}`);
      return regexResult;
    }
  }

  /**
   * Call Gemini Flash to analyze message for hidden contact attempts.
   */
  private async analyzeWithGemini(content: string): Promise<{
    isViolation: boolean;
    violationType: string | null;
    confidence: number;
    detectedFragments: string[];
    reasoning: string;
  }> {
    const prompt = `You are a chat moderation AI for a jewellery marketplace. Your job is to detect if a message contains any attempt to share personal contact information or move communication off-platform.
 
Detect ALL of these:
1. Phone numbers (any format, any country, obfuscated like "nine-eight-seven...")
2. Email addresses (even partially hidden like "john at gmail dot com")
3. Social media handles (WhatsApp, Instagram, Telegram, Facebook, Viber, Signal, etc.)
4. URLs or website addresses
5. Physical addresses given for direct contact
6. Coded language trying to share contacts ("check my profile", "my shop name + google", etc.)
7. Requests to move communication off-platform ("let's talk elsewhere", "DM me", etc.)
8. Number sequences that look like phone numbers even if separated by words/spaces
 
Message to analyze:
"${content.replace(/"/g, '\\"').substring(0, 1000)}"

Respond ONLY with valid JSON (no markdown):
{
  "isViolation": boolean,
  "violationType": "PHONE" | "EMAIL" | "SOCIAL_MEDIA" | "URL" | "CODED_LANGUAGE" | "OFF_PLATFORM" | null,
  "confidence": number between 0 and 1,
  "detectedFragments": ["exact text fragments that are violations"],
  "reasoning": "brief explanation"
}`;

    const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (strip markdown code blocks if present)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      isViolation: result.isViolation === true,
      violationType: result.violationType || null,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      detectedFragments: Array.isArray(result.detectedFragments) ? result.detectedFragments : [],
      reasoning: result.reasoning || '',
    };
  }

  /**
   * Analyze an image attachment URL for contact information.
   * Uses Gemini's vision capabilities to detect screenshots of contacts.
   */
  async analyzeImage(imageUrl: string): Promise<{
    hasContactInfo: boolean;
    confidence: number;
    description: string;
  }> {
    if (!this.apiKey) {
      return { hasContactInfo: false, confidence: 0, description: 'AI not configured' };
    }

    try {
      const prompt = `Analyze this image. Does it contain any contact information such as phone numbers, email addresses, social media handles, QR codes linking to contact info, or business cards? Respond only with valid JSON (no markdown):
{
  "hasContactInfo": boolean,
  "confidence": number between 0 and 1,
  "description": "brief description of what was found"
}`;

      const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  fileData: {
                    mimeType: 'image/jpeg',
                    fileUri: imageUrl,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini vision API error: ${response.status}`);
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(jsonStr);

      return {
        hasContactInfo: result.hasContactInfo === true,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        description: result.description || '',
      };
    } catch (error) {
      this.logger.warn(`Gemini image analysis failed: ${error}`);
      return { hasContactInfo: false, confidence: 0, description: 'Analysis failed' };
    }
  }
}
