import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { FestivalCalendarService } from "../recovery-offers/festival-calendar.service";
import { PreviewOutreachDto, SendOutreachCampaignDto } from "./dto/lead.dto";

export interface OutreachTemplatePreset {
  id: string;
  name: string;
  country: string;
  subject: string;
  body: string;
  festivalHint?: string;
}

export const OUTREACH_TEMPLATES: OutreachTemplatePreset[] = [
  {
    id: "np_festival_boost",
    name: "Nepal — Dashain & Tihar Jewellery Billing",
    country: "NP",
    festivalHint: "Dashain & Tihar",
    subject: "Prepare {{shopName}} for the {{festivalName}} rush with Orivraa (60 Days Free)",
    body: `<p>Namaste {{shopName}} team,</p>
<p>With <strong>{{festivalName}}</strong> approaching, jewellery walk-ins and custom bookings in {{city}} will soon reach peak volume.</p>
<p><strong>Orivraa</strong> is modern cloud jewellery software purpose-built for Nepali jewellers:</p>
<ul>
  <li>Instant Billing with <strong>Tola, Aana, and Laal</strong> weight calculations</li>
  <li>Real-time Gold &amp; Silver market rates with wastage &amp; making charges</li>
  <li>Karigar order tracking and gold loss ledger</li>
  <li>Digital tax-compliant invoices you can print or WhatsApp directly to customers</li>
</ul>
<p>To help you prepare your shop for the festival season, we are giving {{shopName}} <strong>60 days of full Pro access completely free</strong> — with zero credit card required.</p>`,
  },
  {
    id: "in_dhanteras_diwali",
    name: "India — Dhanteras & Diwali Gold POS",
    country: "IN",
    festivalHint: "Dhanteras & Diwali",
    subject: "Boost {{shopName}}'s festive gold sales this {{festivalName}} (60 Days Free Trial)",
    body: `<p>Dear {{shopName}} team,</p>
<p>As <strong>{{festivalName}}</strong> approaches, jewellery stores across {{city}} are preparing for high customer footfall and rapid billing demands.</p>
<p><strong>Orivraa Jewellery ERP</strong> streamlines your entire store:</p>
<ul>
  <li>Lightning-fast POS billing with automated GST breakdown &amp; hallmarking details</li>
  <li>Vault inventory &amp; RFID / Barcode scanning</li>
  <li>Live bullion rate sync with custom margins and making charge rules</li>
  <li>Customer ledger, advance booking &amp; Chit fund / savings schemes</li>
</ul>
<p>Claim your <strong>60-day complimentary Pro trial</strong> today to experience seamless festive sales without entering any payment details.</p>`,
  },
  {
    id: "ae_dubai_jewellery",
    name: "UAE — VAT-Compliant Gold & Diamond POS",
    country: "AE",
    festivalHint: "Eid & Festive Season",
    subject: "Modernize {{shopName}}'s Gold & Diamond Billing (60 Days Free Trial)",
    body: `<p>Dear {{shopName}} team,</p>
<p>Running a premier jewellery boutique in {{city}} requires fast, accurate bullion calculations and compliance.</p>
<p><strong>Orivraa ERP</strong> delivers a luxurious, ultra-responsive POS experience:</p>
<ul>
  <li>Automated FTA VAT calculation on precious metal &amp; craftsmanship</li>
  <li>Multi-currency and multi-vault stock management</li>
  <li>Instant WhatsApp and PDF invoice delivery with custom luxury branding</li>
</ul>
<p>Activate your <strong>60-day complimentary access</strong> with zero commitments.</p>`,
  },
  {
    id: "global_cloud_pos",
    name: "Global — Cloud Jewellery ERP Modernization",
    country: "ALL",
    subject: "Modern Cloud POS & Inventory for {{shopName}} (60 Days Free)",
    body: `<p>Hello {{shopName}} team,</p>
<p>Are you still tracking jewellery sales and inventory on outdated desktop software or paper ledgers?</p>
<p><strong>Orivraa</strong> is the modern cloud operating system built exclusively for fine jewellers:</p>
<ul>
  <li>Works seamlessly across iPad, Android tablet, Mac, and Windows</li>
  <li>Live market rates, stone breakdown, and wastage calculations</li>
  <li>Track karigar job orders, repair tickets, and customer histories in one place</li>
</ul>
<p>We invite you to try Orivraa Pro free for <strong>60 days</strong> — no credit card needed.</p>`,
  },
];

@Injectable()
export class LeadsOutreachService {
  private readonly logger = new Logger(LeadsOutreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @Optional() private readonly festivalService?: FestivalCalendarService,
  ) {}

  private getSiteUrl(): string {
    return (
      this.configService.get<string>("SITE_URL") ||
      this.configService.get<string>("FRONTEND_URL") ||
      "https://www.orivraa.com"
    ).replace(/\/$/, "");
  }

  async getUpcomingFestivals(country = "NP"): Promise<Array<{ name: string; date: string; country: string }>> {
    const currentYear = new Date().getFullYear();
    const list: Array<{ name: string; date: string; country: string }> = [];

    if (this.festivalService) {
      try {
        const cal = await this.festivalService.getCalendar(currentYear, 2);
        const nowIso = new Date().toISOString().slice(0, 10);
        for (const ev of cal.events) {
          if (ev.countries.includes(country as any) && ev.date >= nowIso) {
            list.push({
              name: ev.name,
              date: ev.date,
              country,
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not load panchangam festivals: ${err?.message}`);
      }
    }

    if (list.length === 0) {
      if (country === "NP") {
        list.push(
          { name: "Teej", date: `${currentYear}-09-15`, country: "NP" },
          { name: "Dashain", date: `${currentYear}-10-12`, country: "NP" },
          { name: "Tihar / Laxmi Puja", date: `${currentYear}-11-01`, country: "NP" },
          { name: "Chhath Puja", date: `${currentYear}-11-07`, country: "NP" },
        );
      } else if (country === "IN") {
        list.push(
          { name: "Dhanteras", date: `${currentYear}-10-29`, country: "IN" },
          { name: "Diwali", date: `${currentYear}-11-01`, country: "IN" },
          { name: "Akshaya Tritiya", date: `${currentYear + 1}-05-02`, country: "IN" },
        );
      } else if (country === "AE") {
        list.push(
          { name: "Eid al-Fitr", date: `${currentYear + 1}-03-30`, country: "AE" },
          { name: "Dubai Shopping Festival", date: `${currentYear}-12-15`, country: "AE" },
        );
      } else {
        list.push(
          { name: "Holiday Festive Season", date: `${currentYear}-12-25`, country: "US" },
          { name: "New Year Celebration", date: `${currentYear + 1}-01-01`, country: "US" },
        );
      }
    }

    return list.slice(0, 8);
  }

  generateClaimLink(lead: {
    id: string;
    shopName: string;
    country: string;
    email?: string | null;
    city?: string | null;
  }): string {
    const baseUrl = `${this.getSiteUrl()}/auth/register`;
    const params = new URLSearchParams({
      ref: "lead_outreach",
      leadId: lead.id,
      shopName: lead.shopName,
      country: lead.country || "NP",
      promo: "FESTIVAL60",
    });
    if (lead.email) {
      params.set("email", lead.email);
    }
    if (lead.city) {
      params.set("city", lead.city);
    }
    return `${baseUrl}?${params.toString()}`;
  }

  renderContent(
    template: string,
    lead: {
      id: string;
      shopName: string;
      country: string;
      city?: string | null;
      email?: string | null;
    },
    festivalName?: string,
    trialDays = 60,
  ): string {
    const claimLink = this.generateClaimLink(lead);
    const unsubscribeLink = `${this.getSiteUrl()}/offers/unsubscribe?lead=${encodeURIComponent(lead.id)}`;

    return template
      .replace(/\{\{shopName\}\}/g, lead.shopName || "Jewellery Partner")
      .replace(/\{\{city\}\}/g, lead.city || "your city")
      .replace(/\{\{country\}\}/g, lead.country || "")
      .replace(/\{\{festivalName\}\}/g, festivalName || "the upcoming festive season")
      .replace(/\{\{trialDays\}\}/g, String(trialDays))
      .replace(/\{\{claimLink\}\}/g, claimLink)
      .replace(/\{\{unsubscribeLink\}\}/g, unsubscribeLink);
  }

  wrapEmailHtml(
    bodyHtml: string,
    lead: {
      id: string;
      shopName: string;
      country: string;
      city?: string | null;
      email?: string | null;
    },
    trialDays = 60,
  ): string {
    const claimLink = this.generateClaimLink(lead);
    const unsubscribeLink = `${this.getSiteUrl()}/offers/unsubscribe?lead=${encodeURIComponent(lead.id)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orivraa Jewellery ERP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">ORIVRAA</span>
                    <span style="display: block; font-size: 12px; color: #d4af37; text-transform: uppercase; font-weight: 600; letter-spacing: 1.5px; margin-top: 4px;">Jewellery Operating System</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; color: #f59e0b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                      ${trialDays} Days Free
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px; line-height: 1.6; font-size: 15px; color: #334155;">
              ${bodyHtml}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 36px 0 24px;">
                <a href="${claimLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(184, 134, 11, 0.25);">
                  Claim ${trialDays} Days Free Trial →
                </a>
                <p style="font-size: 12px; color: #64748b; margin-top: 8px;">No credit card required &bull; Immediate activation</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px;">Orivraa Inc. &bull; Kathmandu &bull; Mumbai &bull; Dubai</p>
              <p style="margin: 0;">
                You received this invitation because your jewellery store is publicly listed on Google Maps.
                <br>
                <a href="${unsubscribeLink}" style="color: #64748b; text-decoration: underline;">Unsubscribe from invitations</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async previewOutreach(dto: PreviewOutreachDto) {
    let lead = {
      id: "demo-lead-1",
      shopName: "Priyadarshi Jewellers",
      city: "Kathmandu",
      country: "NP",
      email: "demo@jewellers.com",
    };

    if (dto.leadId) {
      const found = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
      });
      if (found) {
        lead = {
          id: found.id,
          shopName: found.shopName,
          city: found.city || "your city",
          country: found.country,
          email: found.email || "partner@jewellers.com",
        };
      }
    }

    const renderedSubject = this.renderContent(
      dto.subject,
      lead,
      dto.festivalName,
      dto.offerTrialDays || 60,
    );
    const renderedBody = this.renderContent(
      dto.bodyTemplate,
      lead,
      dto.festivalName,
      dto.offerTrialDays || 60,
    );
    const fullHtml = this.wrapEmailHtml(
      renderedBody,
      lead,
      dto.offerTrialDays || 60,
    );

    return {
      subject: renderedSubject,
      bodyHtml: renderedBody,
      fullHtml,
      sampleLead: lead,
      claimLink: this.generateClaimLink(lead),
    };
  }

  async sendOutreach(dto: SendOutreachCampaignDto): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const leads = await this.prisma.lead.findMany({
      where: {
        id: { in: dto.leadIds },
      },
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const lead of leads) {
      if (!lead.email || !lead.email.includes("@")) {
        skipped++;
        continue;
      }

      try {
        const renderedSubject = this.renderContent(
          dto.subject,
          lead,
          dto.festivalName,
          dto.offerTrialDays || 60,
        );
        const renderedBody = this.renderContent(
          dto.bodyTemplate,
          lead,
          dto.festivalName,
          dto.offerTrialDays || 60,
        );
        const fullHtml = this.wrapEmailHtml(
          renderedBody,
          lead,
          dto.offerTrialDays || 60,
        );

        const sendResult = await this.mailService.sendHtml({
          to: lead.email,
          subject: renderedSubject,
          html: fullHtml,
          from: "Orivraa Invitations <welcome@orivraa.com>",
          allowAdminLinks: false,
        });

        if (sendResult.success) {
          sent++;
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: LeadStatus.CONTACTED,
              outreachCount: { increment: 1 },
              lastEmailedAt: new Date(),
              lastCampaignKey: dto.campaignKey,
            },
          });
        } else {
          failed++;
          this.logger.warn(`Failed sending outreach to ${lead.email}: ${sendResult.error}`);
        }
      } catch (err: any) {
        failed++;
        this.logger.error(`Error sending outreach to lead ${lead.id}: ${err?.message}`);
      }
    }

    return {
      total: leads.length,
      sent,
      failed,
      skipped,
    };
  }
}
