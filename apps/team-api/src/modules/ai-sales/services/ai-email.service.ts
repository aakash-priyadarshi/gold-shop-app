import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { PrismaService } from "../../../prisma/prisma.service";
import { LeadInteractionService } from "./lead-interaction.service";
import { PostInteractionPipelineService } from "./post-interaction-pipeline.service";

@Injectable()
export class AiEmailService {
  private readonly logger = new Logger(AiEmailService.name);
  private resend: Resend | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private fromEmail: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private interactions: LeadInteractionService,
    private pipeline: PostInteractionPipelineService,
  ) {
    const resendKey = this.config.get<string>("RESEND_API_KEY");
    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.logger.log("Resend email client initialized");
    } else {
      this.logger.warn("RESEND_API_KEY not set — emails will run in dry-run mode");
    }
    this.fromEmail = this.config.get<string>("AI_SALES_FROM_EMAIL") || this.config.get<string>("MAIL_FROM") || "Orivraa Sales <onboarding@resend.dev>";

    const geminiKey = this.config.get<string>("GEMINI_API_KEY");
    if (geminiKey) this.genAI = new GoogleGenerativeAI(geminiKey);
  }

  /** Send an email to a lead */
  async sendEmail(params: {
    leadId: string;
    subject: string;
    body: string;
    htmlBody?: string;
    goalForEmail?: string;
    meetLink?: string;
    meetScheduledAt?: Date;
    fromEmail?: string;
  }) {
    const lead = await this.prisma.lead.findUnique({ where: { id: params.leadId } });
    if (!lead?.email) throw new Error("Lead has no email address");

    // Resolve from address: explicit param > DB settings > env var > fallback
    let from = params.fromEmail || this.fromEmail;
    if (!params.fromEmail) {
      const settings = await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } });
      if (settings?.aiSalesFromEmail) from = settings.aiSalesFromEmail;
    }
    const html = params.htmlBody || this.wrapInTemplate(params.body, lead.name, params.meetLink, params.meetScheduledAt);

    // Create DB record
    const email = await this.prisma.leadEmail.create({
      data: {
        leadId: params.leadId,
        direction: "SENT",
        subject: params.subject,
        body: params.body,
        htmlBody: html,
        fromEmail: from,
        toEmail: lead.email,
        goalForEmail: params.goalForEmail,
        meetLink: params.meetLink,
        meetScheduledAt: params.meetScheduledAt,
        status: "SENDING",
      },
    });

    // Send via Resend
    if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from,
          to: lead.email,
          subject: params.subject,
          html,
          headers: {
            "X-Lead-Id": params.leadId,
            "X-Email-Id": email.id,
          },
        });
        await this.prisma.leadEmail.update({
          where: { id: email.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            resendId: result.data?.id,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to send email: ${err.message}`);
        await this.prisma.leadEmail.update({
          where: { id: email.id },
          data: { status: "FAILED" },
        });
        throw err;
      }
    } else {
      this.logger.log(`[DRY-RUN] Email to=${lead.email} subject="${params.subject}"`);
      await this.prisma.leadEmail.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    // Record interaction on timeline
    await this.interactions.recordEmailInteraction({
      leadId: params.leadId,
      emailId: email.id,
      direction: "SENT",
      subject: params.subject,
      goalSet: params.goalForEmail,
      meetLink: params.meetLink,
    });

    // Update last contacted
    await this.prisma.lead.update({
      where: { id: params.leadId },
      data: { lastContactedAt: new Date() },
    });

    // Run post-interaction pipeline after sending (lightweight — mostly re-score + strategy)
    this.pipeline.afterEmail(params.leadId, params.body, "sent")
      .catch(err => this.logger.error(`Post-send-email pipeline failed: ${err.message}`));

    return email;
  }

  /** Generate an AI email draft based on lead context */
  async generateDraft(params: {
    leadId: string;
    purpose: string;
    includeMeetLink?: boolean;
  }) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: params.leadId },
      include: {
        callSessions: { orderBy: { startedAt: "desc" }, take: 3 },
        emails: { orderBy: { createdAt: "desc" }, take: 5 },
        callRemarks: { orderBy: { createdAt: "desc" }, take: 2 },
      },
    });
    if (!lead) throw new Error("Lead not found");

    if (!this.genAI) return { subject: "", body: "AI unavailable — draft manually." };

    const context = this.buildLeadContext(lead);
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 1024 },
      } as any,
    });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `Draft a professional sales email for this lead.

Lead Context:
${context}

Purpose: ${params.purpose}
${params.includeMeetLink ? "Include a mention that you'd like to schedule a Google Meet call to discuss further." : ""}

Return JSON: { "subject": "email subject", "body": "email body in plain text" }

Guidelines:
- Be concise, warm, professional
- Reference previous interactions if any
- Use their preferred name if available
- Match their communication style if known`,
        }],
      }],
    });

    const text = result.response.text()
      .replace(/```json?\n?/g, "").replace(/```/g, "")
      .replace(/,\s*([}\]])/g, "$1").trim();
    return JSON.parse(text) as { subject: string; body: string };
  }

  /** Process an inbound email (from webhook) */
  async processInbound(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
    messageId?: string;
    inReplyTo?: string;
  }) {
    // Match to a lead by email address
    const lead = await this.prisma.lead.findFirst({
      where: { email: { equals: params.from, mode: "insensitive" } },
    });

    if (!lead) {
      this.logger.log(`Inbound email from unknown sender: ${params.from}`);
      return null;
    }

    // Find thread
    let threadId: string | undefined;
    if (params.inReplyTo) {
      const parent = await this.prisma.leadEmail.findFirst({
        where: { messageId: params.inReplyTo },
      });
      threadId = parent?.threadId || parent?.id;
    }

    // Detect Google Meet links in email body
    const meetLinks = this.extractMeetLinks(params.body + " " + (params.htmlBody || ""));

    const email = await this.prisma.leadEmail.create({
      data: {
        leadId: lead.id,
        direction: "RECEIVED",
        subject: params.subject,
        body: params.body,
        htmlBody: params.htmlBody,
        fromEmail: params.from,
        toEmail: params.to,
        messageId: params.messageId,
        inReplyTo: params.inReplyTo,
        threadId,
        status: "DELIVERED",
        receivedAt: new Date(),
        meetLink: meetLinks.length > 0 ? meetLinks[0] : undefined,
      },
    });

    // Record interaction
    await this.interactions.recordEmailInteraction({
      leadId: lead.id,
      emailId: email.id,
      direction: "RECEIVED",
      subject: params.subject,
      meetLink: meetLinks.length > 0 ? meetLinks[0] : undefined,
    });

    // If a Google Meet link was detected, log it for the strategy engine
    if (meetLinks.length > 0) {
      this.logger.log(`🔗 Detected Google Meet link in email from ${params.from}: ${meetLinks[0]}`);

      // Create a pending meeting session so the AI can join
      try {
        await this.prisma.meetingSession.create({
          data: {
            leadId: lead.id,
            type: "external",
            status: "scheduled",
            title: `Meeting invite from ${lead.name}: ${params.subject}`,
            externalMeetUrl: meetLinks[0],
            scheduledAt: this.extractMeetingTime(params.body) || new Date(),
          },
        });
        this.logger.log(`Created pending meeting session for detected Meet link`);
      } catch (err: any) {
        this.logger.warn(`Failed to auto-create meeting session: ${err.message}`);
      }
    }

    // Run post-interaction pipeline: enrich from email → re-score → strategy
    this.pipeline.afterEmail(lead.id, params.body, "received")
      .catch(err => this.logger.error(`Post-email pipeline failed: ${err.message}`));

    return { email, meetLinksDetected: meetLinks, meetLinks, leadId: lead.id };
  }

  /**
   * Extract Google Meet / Zoom / Teams links from text.
   */
  extractMeetLinks(text: string): string[] {
    const patterns = [
      /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/gi,
      /https:\/\/[a-z0-9-]+\.zoom\.us\/j\/\d+/gi,
      /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<]+/gi,
    ];
    const links: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) links.push(...matches);
    }
    return [...new Set(links)]; // dedupe
  }

  /**
   * Try to extract a meeting time from email body text.
   * Falls back to now if unable to parse.
   */
  private extractMeetingTime(body: string): Date | null {
    // Common patterns: "at 3:00 PM", "on March 15", "tomorrow at 2pm"
    const timePatterns = [
      /(?:scheduled|meeting|call).*?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i,
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/,
    ];
    for (const pattern of timePatterns) {
      const match = body.match(pattern);
      if (match) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return null;
  }

  /** Get email thread for a lead */
  async getLeadEmails(leadId: string, limit = 50) {
    return this.prisma.leadEmail.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Get a single email */
  async getEmail(id: string) {
    return this.prisma.leadEmail.findUnique({ where: { id } });
  }

  private buildLeadContext(lead: any): string {
    const parts: string[] = [];
    parts.push(`Name: ${lead.preferredName || lead.name}`);
    if (lead.company) parts.push(`Company: ${lead.company}`);
    if (lead.role) parts.push(`Role: ${lead.role}`);
    if (lead.stage) parts.push(`Stage: ${lead.stage}`);
    if (lead.communicationStyle) parts.push(`Communication style: ${lead.communicationStyle}`);
    if (lead.tonePreference) parts.push(`Tone preference: ${lead.tonePreference}`);
    if (lead.lastCallSummary) parts.push(`Last call summary: ${lead.lastCallSummary}`);
    if (lead.nextCallStrategy) parts.push(`Next approach: ${lead.nextCallStrategy}`);

    const remarks = (lead as any).callRemarks || [];
    if (remarks.length > 0) {
      parts.push(`Recent call notes: ${remarks[0].summary}`);
    }

    const emails = (lead as any).emails || [];
    if (emails.length > 0) {
      parts.push(`Recent emails: ${emails.slice(0, 3).map((e: any) => `[${e.direction}] ${e.subject}`).join(", ")}`);
    }

    return parts.join("\n");
  }

  private wrapInTemplate(body: string, leadName: string, meetLink?: string, meetTime?: Date): string {
    const meetSection = meetLink
      ? `<div style="background:#f0f9ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #3b82f6;">
          <p style="margin:0 0 8px;font-weight:600;color:#1e40af;">📅 Meeting Scheduled</p>
          ${meetTime ? `<p style="margin:0 0 8px;color:#374151;">Time: ${meetTime.toLocaleString()}</p>` : ""}
          <a href="${meetLink}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Join Google Meet</a>
        </div>`
      : "";

    return `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fafafa;">
        <div style="background:linear-gradient(135deg,#d4a843,#b8941f);padding:16px 24px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">Orivraa</h2>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <p style="color:#4b5563;line-height:1.8;white-space:pre-wrap;">${body}</p>
          ${meetSection}
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
            Sent from Orivraa AI Sales
          </p>
        </div>
      </div>
    `;
  }
}
