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
import * as crypto from "crypto";
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
      bypassOptOut?: boolean;
      contentSid?: string;
      contentVariables?: string;
    }
  ): Promise<WhatsAppSendResult> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new BadRequestException(`Lead ${leadId} not found`);
    }

    if (lead.whatsappOptOut && !options?.bypassOptOut) {
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
        });

        if (options?.contentSid) {
          payload.append("ContentSid", options.contentSid);
          if (options?.contentVariables) {
            payload.append("ContentVariables", options.contentVariables);
          }
        } else {
          payload.append("Body", body);
        }

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

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, any> = {}
  ): boolean {
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    if (!authToken) {
      this.logger.warn(
        "TWILIO_AUTH_TOKEN is not set — Twilio webhook signature verification bypassed (development mode)"
      );
      return true;
    }

    if (!signature) {
      this.logger.warn("Twilio webhook rejected: missing X-Twilio-Signature header");
      return false;
    }

    const configuredUrl = this.configService.get<string>("TWILIO_WEBHOOK_URL");
    const candidateUrls = [configuredUrl, url, url.replace(/^http:/, "https:")].filter(
      Boolean
    ) as string[];

    const sortedKeys = Object.keys(params).sort();

    for (const testUrl of candidateUrls) {
      try {
        let data = testUrl;
        for (const key of sortedKeys) {
          data += key + (params[key] ?? "");
        }

        const hmac = crypto.createHmac("sha1", authToken);
        hmac.update(Buffer.from(data, "utf-8"));
        const expected = hmac.digest("base64");

        const sigBuf = Buffer.from(signature, "utf-8");
        const expBuf = Buffer.from(expected, "utf-8");
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          return true;
        }
      } catch (err: any) {
        this.logger.error(`Error computing Twilio webhook signature: ${err?.message}`);
      }
    }

    this.logger.warn("Twilio webhook rejected: invalid X-Twilio-Signature header");
    return false;
  }

  async handleIncomingWebhook(payload: Record<string, any>): Promise<any> {
    const rawFrom = (payload.From || payload.from || "") as string;
    const body = ((payload.Body || payload.body || "") as string).trim();
    const twilioSid = (payload.MessageSid || payload.messageSid || "") as string;

    if (!rawFrom || !body) {
      this.logger.warn("Received empty or malformed Twilio WhatsApp webhook payload");
      return { received: false };
    }

    // Replay / duplicate check for provider SID
    if (twilioSid) {
      const existing = await this.prisma.leadMessage.findUnique({
        where: { twilioMessageSid: twilioSid },
      });
      if (existing) {
        this.logger.log(
          `Replay webhook delivery ignored for existing twilioMessageSid: ${twilioSid}`
        );
        return { received: true, duplicate: true };
      }
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

    const upper = body.toUpperCase();

    // Check opt-out keywords (STOP, UNSUBSCRIBE, CANCEL, HALT, OPTOUT)
    if (["STOP", "UNSUBSCRIBE", "CANCEL", "HALT", "OPTOUT"].includes(upper)) {
      try {
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
      } catch (err: any) {
        if (err?.code === "P2002") {
          this.logger.log(`Duplicate webhook insertion avoided on twilioMessageSid: ${twilioSid}`);
          return { received: true, duplicate: true };
        }
        throw err;
      }

      // Send transactional confirmation before/with bypass opt-out
      await this.sendMessage(
        lead.id,
        "You have successfully unsubscribed from Orivraa WhatsApp updates. Reply START anytime to re-enable.",
        { bypassOptOut: true, sender: MessageSender.SYSTEM }
      );

      // Persist opt-out
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          whatsappOptOut: true,
          lastMessageAt: new Date(),
        },
      });

      return { optOut: true };
    }

    // Check explicit opt-in keywords (START, UNSTOP, RESUME, SUBSCRIBE)
    const isExplicitOptIn = ["START", "UNSTOP", "RESUME", "SUBSCRIBE"].includes(upper);
    const updatedOptOut = isExplicitOptIn ? false : lead.whatsappOptOut;

    // Refresh 24-hour Meta customer service window and update opt-out state
    const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        customerServiceWindowExpiresAt: windowExpiresAt,
        lastMessageAt: new Date(),
        whatsappOptOut: updatedOptOut,
      },
    });

    let inboundMsg: any;
    try {
      inboundMsg = await this.prisma.leadMessage.create({
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
    } catch (err: any) {
      if (err?.code === "P2002") {
        this.logger.log(`Duplicate webhook insertion avoided on twilioMessageSid: ${twilioSid}`);
        return { received: true, duplicate: true };
      }
      throw err;
    }

    if (isExplicitOptIn) {
      await this.sendMessage(
        lead.id,
        "Welcome back! You have re-subscribed to Orivraa WhatsApp updates. How can we help your jewellery business today?",
        { bypassOptOut: true, sender: MessageSender.SYSTEM }
      );
      return { received: true, optIn: true, messageId: inboundMsg.id };
    }

    // If the lead is currently opted out and sent a non-opt-in message (e.g., "thanks", "wrong number"),
    // do NOT dispatch to the AI bot to avoid spamming an opted-out contact.
    if (updatedOptOut) {
      this.logger.log(`Lead ${lead.shopName} is opted out; recorded message but skipping AI reply.`);
      return { received: true, optedOut: true, messageId: inboundMsg.id };
    }

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
    templateText?: string,
    options?: {
      mediaUrl?: string;
      festivalName?: string;
      contentSid?: string;
      contentVariables?: Record<string, string> | string;
    }
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

      const resolvedBody = (templateText || "")
        .replace(/\{\{shopName\}\}/g, lead.shopName)
        .replace(/\{\{contactName\}\}/g, lead.contactName || lead.shopName)
        .replace(/\{\{city\}\}/g, lead.city || "your city")
        .replace(/\{\{country\}\}/g, lead.country || "NP")
        .replace(/\{\{festivalName\}\}/g, options?.festivalName || "this festive season")
        .replace(/\{\{trialDays\}\}/g, "60")
        .replace(/\{\{claimLink\}\}/g, claimLink);

      let contentVariablesStr: string | undefined;
      if (options?.contentVariables) {
        if (typeof options.contentVariables === "string") {
          contentVariablesStr = options.contentVariables;
        } else {
          const resolvedVars: Record<string, string> = {};
          for (const [k, v] of Object.entries(options.contentVariables)) {
            resolvedVars[k] = String(v)
              .replace(/\{\{shopName\}\}/g, lead.shopName)
              .replace(/\{\{contactName\}\}/g, lead.contactName || lead.shopName)
              .replace(/\{\{city\}\}/g, lead.city || "your city")
              .replace(/\{\{country\}\}/g, lead.country || "NP")
              .replace(/\{\{festivalName\}\}/g, options?.festivalName || "this festive season")
              .replace(/\{\{trialDays\}\}/g, "60")
              .replace(/\{\{claimLink\}\}/g, claimLink);
          }
          contentVariablesStr = JSON.stringify(resolvedVars);
        }
      }

      try {
        const res = await this.sendMessage(lead.id, resolvedBody, {
          mediaUrl: options?.mediaUrl,
          sender: MessageSender.SYSTEM,
          contentSid: options?.contentSid,
          contentVariables: contentVariablesStr,
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
