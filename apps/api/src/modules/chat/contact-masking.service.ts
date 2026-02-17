import { Injectable, Logger } from '@nestjs/common';

export interface MaskingResult {
  maskedContent: string;
  hasViolation: boolean;
  violationType: string | null;
  originalMatches: string[];
}

/**
 * Contact masking service — detects and replaces PII
 * (phone numbers, emails, social handles, contact solicitations)
 * in chat messages to prevent off-platform leakage.
 */
@Injectable()
export class ContactMaskingService {
  private readonly logger = new Logger(ContactMaskingService.name);

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
      regex: /instagram|insta\s*gram|ig\s*:?\s*@?[a-zA-Z0-9_.]+/gi,
    },
    // Contact solicitation phrases
    {
      type: 'CONTACT_PHRASE',
      regex: /\b(call\s+me|text\s+me|message\s+me|reach\s+me|contact\s+me|ping\s+me|dm\s+me|my\s+number|my\s+phone|my\s+email|send\s+me\s+your|give\s+me\s+your\s+(number|phone|email|contact))\b/gi,
    },
  ];

  /**
   * Scan and mask contact information in a message.
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
        // Set the first detected violation type
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

    return { maskedContent, hasViolation, violationType, originalMatches };
  }
}
