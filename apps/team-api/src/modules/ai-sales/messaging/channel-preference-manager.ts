import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Manages per-customer messaging channel preference (WhatsApp vs SMS).
 *
 * Flow:
 * 1. Before any send, check CRM for stored preference
 * 2. If stored → use it immediately (never ask again)
 * 3. If not stored → ConversationBrain asks the question
 * 4. Customer answers → detectFromResponse() parses it
 * 5. Save to CRM → all future calls use it automatically
 *
 * Supports English and Hindi yes/no detection for Indian market.
 */
@Injectable()
export class ChannelPreferenceManager {
  private readonly logger = new Logger(ChannelPreferenceManager.name);

  // Signals that customer confirmed WhatsApp is available
  private readonly WHATSAPP_YES_SIGNALS = [
    // English
    /\byes\b/i, /\byeah\b/i, /\byep\b/i, /\bsure\b/i,
    /\bof course\b/i, /\bgo ahead\b/i, /works for me/i,
    /\bthat.s fine\b/i, /\bwhatsapp.s fine\b/i, /\bwhatsapp is good\b/i,
    /send.*whatsapp/i, /whatsapp.*works/i,
    // Hindi (romanised)
    /\bhaan\b/i, /\bha\b/i, /\bbilkul\b/i, /\btheek hai\b/i,
    /\btheek\b/i, /\bkar do\b/i, /\bbhejo\b/i,
  ];

  // Signals that customer prefers SMS or doesn't have WhatsApp
  private readonly WHATSAPP_NO_SIGNALS = [
    // English
    /\bno\b/i, /\bnope\b/i, /don.t have/i, /not on whatsapp/i,
    /dont use whatsapp/i, /different number/i, /other number/i,
    /just.*text/i, /just.*sms/i, /text.*me/i, /sms.*fine/i,
    // Hindi (romanised)
    /\bnahi\b/i, /\bnah\b/i, /\bmat\b/i, /whatsapp nahi/i,
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Check CRM for stored preference before asking the customer.
   * Returns null if no preference stored yet.
   */
  async getStoredPreference(leadId: string): Promise<"whatsapp" | "sms" | null> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          messagingPreference: true,
          messagingPreferenceDetectedAt: true,
        },
      });
      return (lead?.messagingPreference as "whatsapp" | "sms") || null;
    } catch (err: any) {
      this.logger.error(`Failed to get stored preference: ${err.message}`);
      return null;
    }
  }

  /**
   * Parse customer's response to the WhatsApp question.
   *
   * Returns 'unclear' if we can't confidently parse the answer.
   * After second unclear, default to 'sms' and move on.
   */
  detectFromResponse(transcript: string): "whatsapp" | "sms" | "unclear" {
    const text = transcript.toLowerCase().trim();

    if (this.WHATSAPP_YES_SIGNALS.some((p) => p.test(text))) return "whatsapp";
    if (this.WHATSAPP_NO_SIGNALS.some((p) => p.test(text))) return "sms";
    return "unclear";
  }

  /**
   * Persist preference to CRM.
   * Called immediately after a clear answer is detected.
   * Never ask this customer again after this is saved.
   */
  async savePreference(leadId: string, preference: "whatsapp" | "sms"): Promise<void> {
    try {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          messagingPreference: preference,
          messagingPreferenceDetectedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to save preference: ${err.message}`);
    }
  }
}
