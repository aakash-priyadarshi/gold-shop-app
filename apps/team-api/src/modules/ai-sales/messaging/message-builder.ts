import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageType } from "./messaging-trigger-detector";

export interface BuiltMessage {
  text: string;
  mediaUrl: string | null;
}

export interface MessageContext {
  firstName: string;
  leadPhone: string;
  pricingUrl: string;
  calendarUrl: string;
  caseStudyUrl: string;
  comparisonUrl: string;
  contractUrl: string;
  summaryUrl: string;
  competitor: string;
  pricingImageUrl: string | null;
  caseStudyImageUrl: string | null;
  comparisonImageUrl: string | null;
}

/**
 * Builds formatted messages for WhatsApp and SMS.
 *
 * WhatsApp: rich formatting, emoji, can be long, includes media.
 * SMS: under 160 chars, no emoji, one link max.
 * Both feel personal — first name, clear next step.
 */
@Injectable()
export class MessageBuilder {
  constructor(private config: ConfigService) {}

  build(type: MessageType, channel: "whatsapp" | "sms", ctx: MessageContext): BuiltMessage {
    return channel === "whatsapp" ? this.whatsapp(type, ctx) : this.sms(type, ctx);
  }

  buildContext(firstName: string, leadPhone: string): MessageContext {
    return {
      firstName,
      leadPhone,
      pricingUrl: this.config.get("PRICING_URL") || "https://orivraa.com/pricing",
      calendarUrl: this.config.get("CALENDAR_URL") || "https://orivraa.com/book",
      caseStudyUrl: this.config.get("CASE_STUDY_URL") || "https://orivraa.com/case-studies",
      comparisonUrl: this.config.get("COMPARISON_URL") || "https://orivraa.com/compare",
      contractUrl: this.config.get("CONTRACT_URL") || "https://orivraa.com/agreement",
      summaryUrl: this.config.get("SUMMARY_URL") || "https://orivraa.com/summary",
      competitor: "",
      pricingImageUrl: null,
      caseStudyImageUrl: null,
      comparisonImageUrl: null,
    };
  }

  // ─── WhatsApp — rich, detailed, formatted ───

  private whatsapp(type: MessageType, ctx: MessageContext): BuiltMessage {
    const map: Record<MessageType, BuiltMessage> = {
      pricing: {
        text:
          `Hi ${ctx.firstName}! 👋\n\n` +
          `Here's the full pricing breakdown we discussed:\n\n` +
          `*📦 Gold Investment Plans*\n` +
          `• Starting from 1 gram\n` +
          `• Live market-linked pricing\n` +
          `• Transparent making charges\n` +
          `• BIS hallmarked certified\n\n` +
          `*💰 Full pricing + ROI calculator:*\n` +
          `${ctx.pricingUrl}\n\n` +
          `Based on current trends, gold has delivered consistent ` +
          `returns over the last decade.\n\n` +
          `Questions? Just reply here — happy to help! 😊`,
        mediaUrl: ctx.pricingImageUrl,
      },

      demo_booking: {
        text:
          `Hi ${ctx.firstName}! 🎯\n\n` +
          `Excited to show you around.\n\n` +
          `*📅 Book your demo here:*\n` +
          `${ctx.calendarUrl}\n\n` +
          `*The demo covers:*\n` +
          `• Live gold pricing dashboard\n` +
          `• Investment portfolio tools\n` +
          `• Automated price alerts\n` +
          `• Custom jewelry ordering\n\n` +
          `Pick any slot that works — takes about 20 minutes! 👆`,
        mediaUrl: null,
      },

      case_study: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Here's the case study I mentioned:\n\n` +
          `*📊 Customer Success Story*\n` +
          `See how businesses like yours are using Orivraa Gold ` +
          `to streamline their gold investment operations.\n\n` +
          `*Full case study:*\n` +
          `${ctx.caseStudyUrl}\n\n` +
          `Happy to walk through it if helpful!`,
        mediaUrl: ctx.caseStudyImageUrl,
      },

      competitor_comparison: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Here's that comparison we discussed:\n\n` +
          `*📋 Feature-by-feature breakdown:*\n` +
          `${ctx.comparisonUrl}\n\n` +
          `Key differences are in pricing transparency, ` +
          `certification standards, and real-time market integration.\n\n` +
          `Happy to answer any questions! 🙌`,
        mediaUrl: ctx.comparisonImageUrl,
      },

      call_summary: {
        text:
          `Hi ${ctx.firstName}! Great speaking with you today 😊\n\n` +
          `*📝 Call Summary*\n` +
          `Here's a recap of everything we covered and the next steps.\n\n` +
          `*View full summary:*\n` +
          `${ctx.summaryUrl}\n\n` +
          `I'll follow up as we discussed. ` +
          `Have a great day! 👋`,
        mediaUrl: null,
      },

      contract_link: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Here are the agreement details as promised:\n\n` +
          `*📄 Review agreement:*\n` +
          `${ctx.contractUrl}\n\n` +
          `Take your time going through it. ` +
          `Any questions — just reply here! 😊`,
        mediaUrl: null,
      },
    };

    return map[type];
  }

  // ─── SMS — short, clean, one link (<160 chars target) ───

  private sms(type: MessageType, ctx: MessageContext): BuiltMessage {
    const map: Record<MessageType, BuiltMessage> = {
      pricing: {
        text: `Hi ${ctx.firstName}, pricing details as discussed: ${ctx.pricingUrl} — reply with any questions!`,
        mediaUrl: null,
      },
      demo_booking: {
        text: `Hi ${ctx.firstName}, book your demo here: ${ctx.calendarUrl}`,
        mediaUrl: null,
      },
      case_study: {
        text: `Hi ${ctx.firstName}, here's the case study I mentioned: ${ctx.caseStudyUrl}`,
        mediaUrl: null,
      },
      competitor_comparison: {
        text: `Hi ${ctx.firstName}, comparison vs ${ctx.competitor || "alternatives"}: ${ctx.comparisonUrl}`,
        mediaUrl: null,
      },
      call_summary: {
        text: `Hi ${ctx.firstName}, great speaking! Summary + next steps: ${ctx.summaryUrl || ctx.pricingUrl}`,
        mediaUrl: null,
      },
      contract_link: {
        text: `Hi ${ctx.firstName}, here's the agreement: ${ctx.contractUrl} — let me know if you have questions!`,
        mediaUrl: null,
      },
    };

    return map[type];
  }
}
