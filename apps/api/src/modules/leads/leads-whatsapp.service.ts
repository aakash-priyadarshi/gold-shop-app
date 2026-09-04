import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageDirection, MessageSender, MessageStatus } from "@prisma/client";
import axios from "axios";
import { PrismaService } from "../../prisma/prisma.service";
import { LeadsAiBotService } from "./leads-ai-bot.service";

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  twilioMessageSid?: string;
  error?: string;
  skipped?: boolean;
}

export function normalizeWhatsAppNumber(
  rawPhone?: string | null,
  countryHint: string = "NP"
): string | null {
  if (!rawPhone) return null;
  let cleaned = rawPhone.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return null;

  if (!cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/^0+/, "");
    switch (countryHint.toUpperCase()) {
      case "NP":
        if (!cleaned.startsWith("977")) cleaned = `977${cleaned}`;
        break;
      case "IN":
        if (!cleaned.startsWith("91")) cleaned = `91${cleaned}`;
        break;
      case "AE":
        if (!cleaned.startsWith("971")) cleaned = `971${cleaned}`;
        break;
      case "UK":
      case "GB":
        if (!cleaned.startsWith("44")) cleaned = `44${cleaned}`;
        break;
      case "US":
        if (!cleaned.startsWith("1")) cleaned = `1${cleaned}`;
        break;
      default:
        break;
    }
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

@Injectable()
export class LeadsWhatsAppService {
  private readonly logger = new Logger(LeadsWhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => LeadsAiBotService))
    private readonly aiBotService: LeadsAiBotService
  ) {}

  isConfigured(): boolean {
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    const from =
      this.configService.get<string>("TWILIO_WHATSAPP_NUMBER") ||
      this.configService.get<string>("TWILIO_PHONE_NUMBER");
    return Boolean(accountSid && authToken && from);
  }

  private getTwilioSender(): string {
    let from =
      this.configService.get<string>("TWILIO_WHATSAPP_NUMBER") ||
      this.configService.get<string>("TWILIO_PHONE_NUMBER") ||
      "";
    if (from.startsWith("whatsapp:")) {
      from = from.replace("whatsapp:", "");
    }
    return from;
  }

  async sendMessage(
    leadId: string,
    body: string,
    options?: {
      mediaUrl?: string;
      sender?: MessageSender;
    }
  ): Promise<WhatsAppSendResult> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new BadRequestException(`Lead ${leadId} not found`);
    }

    if (lead.whatsappOptOut) {
      this.logger.warn(`Lead ${lead.shopName} has opted out of WhatsApp messages.`);
      return { success: false, skipped: true, error: "Lead opted out" };
    }

    const normalizedPhone = normalizeWhatsAppNumber(lead.phone, lead.country);
    if (!normalizedPhone) {
      return {
        success: false,
        error: "Lead has no valid international phone number",
      };
    }

    const senderRole = options?.sender || MessageSender.AI_BOT;
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    const twilioFrom = this.getTwilioSender();

    let twilioSid: string | undefined;
    let messageStatus: MessageStatus = MessageStatus.SENT;
    let errorMessage: string | undefined;

    if (accountSid && authToken && twilioFrom) {
      try {
        const payload = new URLSearchParams({
          From: `whatsapp:${twilioFrom}`,
          To: `whatsapp:${normalizedPhone}`,
          Body: body,
        });

        if (options?.mediaUrl) {
          payload.append("MediaUrl", options.mediaUrl);
        }

        const res = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          payload,
          {
            auth: { username: accountSid, password: authToken },
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000,
          }
        );

        twilioSid = res.data?.sid;
      } catch (err: any) {
        messageStatus = MessageStatus.FAILED;
        errorMessage =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Twilio send failed";
        this.logger.error(`Failed to send WhatsApp to ${lead.shopName}: ${errorMessage}`);
      }
    } else {
      this.logger.warn("Twilio WhatsApp credentials missing. Logging message in mock/development mode.");
      twilioSid = `mock_wa_${Date.now()}`;
    }

    const message = await this.prisma.leadMessage.create({
      data: {
        leadId: lead.id,
        direction: MessageDirection.OUTBOUND,
        sender: senderRole,
        body,
        mediaUrl: options?.mediaUrl || null,
        status: messageStatus,
        twilioMessageSid: twilioSid || null,
      },
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastMessageAt: new Date(),
        outreachCount: { increment: 1 },
      },
    });

    return {
      success: messageStatus === MessageStatus.SENT,
      messageId: message.id,
      twilioMessageSid: twilioSid,
      error: errorMessage,
    };
  }

  async handleIncomingWebhook(payload: Record<string, any>): Promise<any> {
    const rawFrom = (payload.From || payload.from || "") as string;
    const body = ((payload.Body || payload.body || "") as string).trim();
    const twilioSid = (payload.MessageSid || payload.messageSid || "") as string;

    if (!rawFrom || !body) {
      this.logger.warn("Received empty or malformed Twilio WhatsApp webhook payload");
      return { received: false };
    }

    const cleanPhone = rawFrom.replace(/^whatsapp:/i, "").trim();
    this.logger.log(`Incoming WhatsApp message from ${cleanPhone}: "${body}"`);

    let lead = await this.prisma.lead.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: cleanPhone.replace(/^\+/, "") },
        ],
      },
    });

    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          shopName: `WhatsApp Contact (${cleanPhone})`,
          phone: cleanPhone,
          source: "WHATSAPP" as any,
          country: cleanPhone.startsWith("+977")
            ? "NP"
            : cleanPhone.startsWith("+91")
            ? "IN"
            : cleanPhone.startsWith("+971")
            ? "AE"
            : cleanPhone.startsWith("+44")
            ? "UK"
            : cleanPhone.startsWith("+1")
            ? "US"
            : "NP",
        },
      });
    }

    // Check opt-out keywords (STOP, UNSUBSCRIBE, CANCEL)
    const upper = body.toUpperCase();
    if (["STOP", "UNSUBSCRIBE", "CANCEL", "HALT", "OPTOUT"].includes(upper)) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          whatsappOptOut: true,
          lastMessageAt: new Date(),
        },
      });

      await this.prisma.leadMessage.create({
        data: {
          leadId: lead.id,
          direction: MessageDirection.INBOUND,
          sender: MessageSender.LEAD,
          body,
          status: MessageStatus.RECEIVED,
          twilioMessageSid: twilioSid || null,
          rawPayload: payload,
        },
      });

      await this.sendMessage(
        lead.id,
        "You have successfully unsubscribed from Orivraa WhatsApp updates. Reply START anytime to re-enable."
      );
      return { optOut: true };
    }

    // Refresh 24-hour Meta customer service window
    const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        customerServiceWindowExpiresAt: windowExpiresAt,
        lastMessageAt: new Date(),
        whatsappOptOut: false, // If they sent a message, they opted back in
      },
    });

    const inboundMsg = await this.prisma.leadMessage.create({
      data: {
        leadId: lead.id,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.LEAD,
        body,
        status: MessageStatus.RECEIVED,
        twilioMessageSid: twilioSid || null,
        rawPayload: payload,
      },
    });

    // Check if AI Bot is active or paused by admin
    if (!lead.aiBotPaused) {
      this.logger.log(`Dispatching message to Orivraa AI Concierge for lead: ${lead.shopName}`);
      this.aiBotService
        .generateAndSendReply(lead, body)
        .catch((err) =>
          this.logger.error(`AI auto-reply failed for ${lead.id}: ${err?.message}`)
        );
    } else {
      this.logger.log(`AI Bot paused for lead ${lead.shopName}. Awaiting manual admin response.`);
    }

    return { received: true, messageId: inboundMsg.id };
  }

  async sendCampaign(
    leadIds: string[],
    templateText: string,
    options?: { mediaUrl?: string; festivalName?: string }
  ): Promise<{ sent: number; skipped: number; failed: number }> {
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: leadIds } },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const frontendBaseUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("NEXT_PUBLIC_SITE_URL") ||
      "https://www.orivraa.com";

    for (const lead of leads) {
      if (!lead.phone || lead.whatsappOptOut) {
        skipped++;
        continue;
      }

      const claimLink = `${frontendBaseUrl}/auth/register?ref=lead_whatsapp&leadId=${lead.id}&shopName=${encodeURIComponent(
        lead.shopName
      )}&email=${encodeURIComponent(lead.email || "")}&city=${encodeURIComponent(
        lead.city || ""
      )}&country=${lead.country}&promo=WHATSAPP60`;

      const messageBody = templateText
        .replace(/\{\{shopName\}\}/g, lead.shopName)
        .replace(/\{\{contactName\}\}/g, lead.contactName || lead.shopName)
        .replace(/\{\{city\}\}/g, lead.city || "your city")
        .replace(/\{\{country\}\}/g, lead.country || "NP")
        .replace(/\{\{festivalName\}\}/g, options?.festivalName || "this festive season")
        .replace(/\{\{trialDays\}\}/g, "60")
        .replace(/\{\{claimLink\}\}/g, claimLink);

      try {
        const res = await this.sendMessage(lead.id, messageBody, {
          mediaUrl: options?.mediaUrl,
          sender: MessageSender.SYSTEM,
        });
        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Small throttle to stay within Twilio WhatsApp throughput limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return { sent, skipped, failed };
  }
}
