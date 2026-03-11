import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { ChannelPreferenceManager } from "./channel-preference-manager";
import { MessageBuilder, MessageContext } from "./message-builder";
import { MessageType } from "./messaging-trigger-detector";
import { AgentMemoryService } from "../services/agent-memory.service";

interface CallContext {
  callId: string;
  leadId: string;
  leadPhone: string;
  firstName: string;
}

/**
 * Orchestrates all message sending during active calls.
 *
 * CRITICAL: Every send is fire-and-forget.
 * Never await any send operation from the call hot path.
 * Failures are caught and logged silently — call never notices.
 *
 * Flow per call:
 * 1. MessagingTriggerDetector fires → handleTrigger() called
 * 2. Check stored preference → if known, send immediately
 * 3. If unknown → set waitingForChannelConfirmation, return question
 * 4. Customer answers → processChannelResponse() called
 * 5. Save preference → send pending → clear state
 */
@Injectable()
export class InCallMessagingService {
  private readonly logger = new Logger(InCallMessagingService.name);

  // Per-session state — keyed by sessionId
  private sessionState = new Map<string, {
    channelPreference: "whatsapp" | "sms" | null;
    waitingForChannelConfirmation: boolean;
    clarificationAttempts: number;
    pendingMessageType: MessageType | null;
    messagesSent: Set<MessageType>;
    context: CallContext;
  }>();

  private readonly MAX_CLARIFICATION_ATTEMPTS = 1;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private channelPrefManager: ChannelPreferenceManager,
    private messageBuilder: MessageBuilder,
    private memory: AgentMemoryService,
  ) {}

  /** Initialize messaging state for a new call session */
  initSession(sessionId: string, context: CallContext) {
    this.sessionState.set(sessionId, {
      channelPreference: null,
      waitingForChannelConfirmation: false,
      clarificationAttempts: 0,
      pendingMessageType: null,
      messagesSent: new Set(),
      context,
    });
  }

  /** Clean up session state when call ends */
  clearSession(sessionId: string) {
    this.sessionState.delete(sessionId);
  }

  /**
   * Main entry point — called when MessagingTriggerDetector fires on AI response.
   * Returns a question string to inject into AI response if preference unknown.
   * Returns null if message was sent directly (preference known).
   */
  async handleTrigger(sessionId: string, messageType: MessageType): Promise<string | null> {
    const state = this.sessionState.get(sessionId);
    if (!state) return null;

    // Don't send the same message type twice in one call
    if (state.messagesSent.has(messageType)) return null;

    // Already waiting for an answer — queue this type (last one wins)
    if (state.waitingForChannelConfirmation) {
      state.pendingMessageType = messageType;
      return null;
    }

    // Check CRM for stored preference first
    if (state.context.leadId) {
      const stored = await this.channelPrefManager.getStoredPreference(state.context.leadId);
      if (stored) {
        state.channelPreference = stored;
        this.sendInBackground(sessionId, messageType, stored);
        return null;
      }
    }

    // Unknown preference — return question to inject into AI response
    state.pendingMessageType = messageType;
    state.waitingForChannelConfirmation = true;
    state.clarificationAttempts = 0;

    return this.getChannelQuestion(messageType);
  }

  /** Get the natural question to ask the customer — context-aware phrasing */
  private getChannelQuestion(messageType: MessageType): string {
    const questions: Record<MessageType, string> = {
      pricing:
        "By the way — do you use WhatsApp on this number? " +
        "I can send you a much more detailed breakdown there " +
        "with the full feature list and ROI calculator. " +
        "Or I can just text you a link if you prefer.",
      demo_booking:
        "Quick question — are you on WhatsApp on this number? " +
        "I can send you the booking link with all the details there, " +
        "or I can text it to you — whatever's easier.",
      case_study:
        "Is WhatsApp good on this number? " +
        "I have a full case study with the actual numbers I can " +
        "send you there. Otherwise I'll send you the link by text.",
      competitor_comparison:
        "Do you use WhatsApp here? " +
        "I can send you a really clear comparison chart there — " +
        "looks much better than a text link.",
      call_summary:
        "Before I let you go — WhatsApp or SMS? " +
        "I'll send you a summary of everything we covered " +
        "and the next steps either way.",
      contract_link:
        "One quick thing — WhatsApp or SMS? " +
        "I can send the agreement details either way, " +
        "just want to use whatever you check more often.",
    };

    return questions[messageType];
  }

  /**
   * Process the customer's response to the WhatsApp question.
   * Returns an AI follow-up line and whether the preference was resolved.
   */
  async processChannelResponse(
    sessionId: string,
    transcript: string,
  ): Promise<{ aiLine: string; resolved: boolean } | null> {
    const state = this.sessionState.get(sessionId);
    if (!state || !state.waitingForChannelConfirmation) return null;

    const detected = this.channelPrefManager.detectFromResponse(transcript);

    if (detected === "unclear") {
      state.clarificationAttempts++;

      // Tried once already — default to SMS and move on
      if (state.clarificationAttempts > this.MAX_CLARIFICATION_ATTEMPTS) {
        return this.resolveWithChannel(sessionId, "sms");
      }

      return {
        aiLine: "Sorry — WhatsApp or regular text message?",
        resolved: false,
      };
    }

    return this.resolveWithChannel(sessionId, detected);
  }

  /** Resolve channel, save preference, fire pending message */
  private async resolveWithChannel(
    sessionId: string,
    channel: "whatsapp" | "sms",
  ): Promise<{ aiLine: string; resolved: boolean }> {
    const state = this.sessionState.get(sessionId);
    if (!state) return { aiLine: "", resolved: true };

    state.channelPreference = channel;
    state.waitingForChannelConfirmation = false;

    // Persist to CRM — never ask again
    if (state.context.leadId) {
      await this.channelPrefManager.savePreference(state.context.leadId, channel);
    }

    // Fire the pending message
    if (state.pendingMessageType) {
      this.sendInBackground(sessionId, state.pendingMessageType, channel);
      state.pendingMessageType = null;
    }

    const aiLine = channel === "whatsapp"
      ? "Perfect — sending it to WhatsApp now."
      : "Got it — sending you a text now.";

    return { aiLine, resolved: true };
  }

  /**
   * Fire-and-forget send. NEVER await this from the call path.
   * Any failure is caught and logged — call is never affected.
   */
  sendInBackground(sessionId: string, messageType: MessageType, channel: "whatsapp" | "sms"): void {
    const state = this.sessionState.get(sessionId);
    if (!state) return;

    state.messagesSent.add(messageType);

    this.doSend(messageType, channel, state.context).catch((err) => {
      this.logger.warn(`In-call message failed — call unaffected`, {
        sessionId,
        messageType,
        channel,
        error: err.message,
      });
    });
  }

  private async doSend(
    messageType: MessageType,
    channel: "whatsapp" | "sms",
    ctx: CallContext,
  ): Promise<void> {
    const msgCtx = this.messageBuilder.buildContext(ctx.firstName, ctx.leadPhone);
    const message = this.messageBuilder.build(messageType, channel, msgCtx);

    // Send via Twilio
    const twilioSid = this.config.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = this.config.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioAuth) {
      this.logger.debug(`[Messaging stub] ${channel}:${messageType} → ${ctx.firstName}`);
      return;
    }

    const Twilio = (await import("twilio")).default;
    const client = Twilio(twilioSid, twilioAuth);

    if (channel === "whatsapp") {
      const whatsappNumber = this.memory.get("phones", "whatsapp_number");
      await client.messages.create({
        from: `whatsapp:${whatsappNumber}`,
        to: `whatsapp:${ctx.leadPhone}`,
        body: message.text,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
      });
    } else {
      const twilioPhone = this.memory.get("phones", "twilio_phone");
      await client.messages.create({
        from: twilioPhone,
        to: ctx.leadPhone,
        body: message.text,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
      });
    }

    // Log to CRM — preview only (first 100 chars)
    await this.prisma.callMessage.create({
      data: {
        callId: ctx.callId,
        leadId: ctx.leadId,
        messageType,
        channel,
        sentAt: new Date(),
        preview: message.text.substring(0, 100),
      },
    });
  }

  /**
   * Send call summary at end of call.
   * Uses stored preference if known — defaults to SMS if unknown.
   */
  async sendCallSummary(sessionId: string): Promise<void> {
    const state = this.sessionState.get(sessionId);
    if (!state) return;

    let channel = state.channelPreference;
    if (!channel && state.context.leadId) {
      channel = await this.channelPrefManager.getStoredPreference(state.context.leadId);
    }
    channel = channel || "sms"; // Default to SMS for end-of-call summary

    this.sendInBackground(sessionId, "call_summary", channel);
  }

  isWaitingForChannelConfirmation(sessionId: string): boolean {
    return this.sessionState.get(sessionId)?.waitingForChannelConfirmation ?? false;
  }
}
