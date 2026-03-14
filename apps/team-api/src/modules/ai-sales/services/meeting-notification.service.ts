import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Meeting Notification Service
 *
 * Sends meeting-related notifications via multiple channels:
 * - Email (Resend)
 * - WhatsApp (Twilio)
 * - SMS (Twilio)
 *
 * Used for: confirmation, 24h reminder, 30m reminder, post-meeting summary.
 */
@Injectable()
export class MeetingNotificationService {
  private readonly logger = new Logger(MeetingNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ── Email via Resend ────────────────────────────────────────────────────

  private async sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    fromEmail?: string;
  }): Promise<boolean> {
    try {
      const apiKey = this.config.get<string>("RESEND_API_KEY");
      if (!apiKey) {
        this.logger.warn("RESEND_API_KEY not set — skipping email");
        return false;
      }
      const resend = new Resend(apiKey);

      const settings = await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } });
      const from = opts.fromEmail || settings?.aiSalesFromEmail || "Orivraa <noreply@orivraa.com>";

      const result = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });

      if (result.error) {
        this.logger.error(`Email send failed: ${JSON.stringify(result.error)}`);
        return false;
      }

      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Email error: ${err.message}`);
      return false;
    }
  }

  // ── WhatsApp via Twilio ─────────────────────────────────────────────────

  private async sendWhatsApp(opts: { to: string; body: string }): Promise<boolean> {
    try {
      const accountSid = this.config.get<string>("TWILIO_ACCOUNT_SID");
      const authToken = this.config.get<string>("TWILIO_AUTH_TOKEN");
      const from = this.config.get<string>("TWILIO_WHATSAPP_FROM");
      if (!accountSid || !authToken || !from) {
        this.logger.warn("Twilio WhatsApp not configured — skipping");
        return false;
      }

      const twilio = require("twilio")(accountSid, authToken);
      await twilio.messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${opts.to}`,
        body: opts.body,
      });

      this.logger.log(`WhatsApp sent to ${opts.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`WhatsApp error: ${err.message}`);
      return false;
    }
  }

  // ── SMS via Twilio ──────────────────────────────────────────────────────

  private async sendSMS(opts: { to: string; body: string }): Promise<boolean> {
    try {
      const accountSid = this.config.get<string>("TWILIO_ACCOUNT_SID");
      const authToken = this.config.get<string>("TWILIO_AUTH_TOKEN");
      const from = this.config.get<string>("TWILIO_PHONE_NUMBER");
      if (!accountSid || !authToken || !from) {
        this.logger.warn("Twilio SMS not configured — skipping");
        return false;
      }

      const twilio = require("twilio")(accountSid, authToken);
      await twilio.messages.create({ from, to: opts.to, body: opts.body });

      this.logger.log(`SMS sent to ${opts.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`SMS error: ${err.message}`);
      return false;
    }
  }

  // ── Blast helpers (send via all available channels) ─────────────────────

  private formatTime(date: Date): string {
    return date.toLocaleString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  /**
   * Send confirmation blast when a meeting is scheduled.
   */
  async sendConfirmation(opts: {
    meetingSessionId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    agentName: string;
    meetLink: string;
    scheduledAt: Date;
    title?: string;
  }): Promise<void> {
    const time = this.formatTime(opts.scheduledAt);

    // Email
    if (opts.leadEmail) {
      await this.sendEmail({
        to: opts.leadEmail,
        subject: `Meeting Confirmed: ${opts.title || `Meeting with ${opts.agentName}`} — ${time}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Meeting Confirmed ✓</h2>
            <p>Hi ${opts.leadName},</p>
            <p>Your meeting with <strong>${opts.agentName}</strong> has been scheduled.</p>
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>📅 When:</strong> ${time}</p>
              <p style="margin: 8px 0 0;"><strong>🔗 Join:</strong> <a href="${opts.meetLink}" style="color: #3b82f6;">${opts.meetLink}</a></p>
            </div>
            <p>Simply click the link above at the scheduled time to join. No app installation needed.</p>
            <p>Best regards,<br/>${opts.agentName} — Orivraa Team</p>
          </div>
        `,
      });
    }

    // WhatsApp
    if (opts.leadPhone) {
      await this.sendWhatsApp({
        to: opts.leadPhone,
        body: `✅ Meeting Confirmed!\n\n📅 ${time}\n👤 With: ${opts.agentName}\n🔗 Join: ${opts.meetLink}\n\nLooking forward to speaking with you!`,
      });
    }

    // Update notification timestamp
    await this.prisma.meetingSession.update({
      where: { id: opts.meetingSessionId },
      data: { confirmationSentAt: new Date() },
    }).catch(() => {});
  }

  /**
   * Send 24-hour reminder.
   */
  async sendReminder24h(opts: {
    meetingSessionId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    agentName: string;
    meetLink: string;
    scheduledAt: Date;
  }): Promise<void> {
    const time = this.formatTime(opts.scheduledAt);

    if (opts.leadEmail) {
      await this.sendEmail({
        to: opts.leadEmail,
        subject: `Reminder: Meeting with ${opts.agentName} tomorrow — ${time}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Meeting Reminder 🗓</h2>
            <p>Hi ${opts.leadName},</p>
            <p>Just a friendly reminder about your meeting with <strong>${opts.agentName}</strong> tomorrow.</p>
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>📅 When:</strong> ${time}</p>
              <p style="margin: 8px 0 0;"><strong>🔗 Join:</strong> <a href="${opts.meetLink}" style="color: #3b82f6;">${opts.meetLink}</a></p>
            </div>
            <p>See you there!</p>
          </div>
        `,
      });
    }

    if (opts.leadPhone) {
      await this.sendWhatsApp({
        to: opts.leadPhone,
        body: `🗓 Reminder: Your meeting with ${opts.agentName} is tomorrow at ${time}.\n\n🔗 Join: ${opts.meetLink}`,
      });
    }

    await this.prisma.meetingSession.update({
      where: { id: opts.meetingSessionId },
      data: { reminder24hSentAt: new Date(), status: "reminder_sent" },
    }).catch(() => {});
  }

  /**
   * Send 30-minute reminder.
   */
  async sendReminder30m(opts: {
    meetingSessionId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    agentName: string;
    meetLink: string;
    scheduledAt: Date;
  }): Promise<void> {
    if (opts.leadPhone) {
      await this.sendWhatsApp({
        to: opts.leadPhone,
        body: `⏰ ${opts.agentName} is joining in 30 minutes!\n\n🔗 Join here: ${opts.meetLink}\n\nSee you soon!`,
      });
    }

    if (opts.leadEmail) {
      await this.sendEmail({
        to: opts.leadEmail,
        subject: `Starting in 30 mins: Meeting with ${opts.agentName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Starting Soon! ⏰</h2>
            <p>Hi ${opts.leadName},</p>
            <p>Your meeting with <strong>${opts.agentName}</strong> starts in 30 minutes.</p>
            <p><a href="${opts.meetLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Join Meeting →</a></p>
          </div>
        `,
      });
    }

    await this.prisma.meetingSession.update({
      where: { id: opts.meetingSessionId },
      data: { reminder30mSentAt: new Date() },
    }).catch(() => {});
  }

  /**
   * Send post-meeting summary blast.
   */
  async sendPostMeetingSummary(opts: {
    meetingSessionId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    agentName: string;
    summary: string;
    actionItems?: string[];
    duration?: number;
  }): Promise<void> {
    const durationStr = opts.duration
      ? `${Math.floor(opts.duration / 60)}m ${opts.duration % 60}s`
      : "N/A";

    const actionItemsHtml = opts.actionItems?.length
      ? `<h3>Action Items</h3><ul>${opts.actionItems.map(a => `<li>${a}</li>`).join("")}</ul>`
      : "";

    if (opts.leadEmail) {
      await this.sendEmail({
        to: opts.leadEmail,
        subject: `Meeting Summary — ${opts.agentName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Meeting Summary 📋</h2>
            <p>Hi ${opts.leadName},</p>
            <p>Here's a summary of your meeting with <strong>${opts.agentName}</strong> (Duration: ${durationStr}):</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; white-space: pre-line;">${opts.summary}</p>
            </div>
            ${actionItemsHtml}
            <p>Thank you for your time!</p>
            <p>Best regards,<br/>${opts.agentName} — Orivraa Team</p>
          </div>
        `,
      });
    }

    if (opts.leadPhone) {
      await this.sendWhatsApp({
        to: opts.leadPhone,
        body: `📋 Meeting Summary with ${opts.agentName} (${durationStr}):\n\n${opts.summary.substring(0, 500)}${opts.summary.length > 500 ? "..." : ""}\n\nCheck your email for the full summary!`,
      });

      // SMS fallback
      await this.sendSMS({
        to: opts.leadPhone,
        body: `Great meeting! Check your email for the full summary from ${opts.agentName}. - Orivraa`,
      });
    }

    await this.prisma.meetingSession.update({
      where: { id: opts.meetingSessionId },
      data: { postMeetingSentAt: new Date() },
    }).catch(() => {});
  }
}
