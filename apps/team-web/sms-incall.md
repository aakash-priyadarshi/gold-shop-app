# In-Call Messaging Feature — GitHub Copilot Instructions

# File: .github/instructions/messaging.instructions.md

# Apply to: **/messaging/**, **/_message_.ts, **/_sms_.ts, **/_whatsapp_.ts, **/_channel_.ts

---

## FEATURE OVERVIEW

This module adds real-time messaging during active phone calls.
While the AI is talking to a customer, it can simultaneously send
WhatsApp messages or SMS — without pausing or interrupting the call.

The AI naturally asks the customer mid-conversation:
"Do you use WhatsApp on this number? I can send you more detailed
info there, or I can text you a link — whatever you prefer."

Based on the answer, all future messages in this call (and future calls)
go to the customer's preferred channel automatically.

This feature dramatically increases trust and conversion because:

- Customer receives rich formatted information WHILE talking
- They can reference it immediately ("oh I can see it right here")
- It feels premium, organised, and professional
- WhatsApp allows full formatting, images, PDFs — SMS is just a link

---

## HOW IT CONNECTS TO THE REST OF THE SYSTEM

```
ConversationBrain (LLM layer)
  → detects when AI says something that should trigger a send
  → checks ChannelPreferenceManager for stored preference
  → if preference known: fires InCallMessagingService immediately
  → if preference unknown: injects WhatsApp question into AI response
  → after customer answers: saves preference, fires pending message

InCallMessagingService
  → completely non-blocking (fire and forget)
  → NEVER awaited during call — zero latency impact on voice
  → uses MessageBuilder to construct the right format
  → routes to WhatsApp or SMS based on confirmed preference

ChannelPreferenceManager
  → stores preference per lead in CRM after first detection
  → future calls check this first — never ask the same customer twice
  → detects yes/no from customer response including Hindi signals

MessageBuilder
  → builds two completely different messages from same data
  → WhatsApp: rich, long, formatted with emoji and bold text
  → SMS: short, clean, link-based, under 160 chars per segment
```

---

## CRITICAL RULES FOR THIS MODULE

- NEVER await InCallMessagingService.sendInBackground() — fire and forget only
- NEVER let a messaging failure affect the voice call — always catch silently
- NEVER ask the WhatsApp question if preference already stored in CRM
- NEVER ask the WhatsApp question twice in the same call
- NEVER send a message before the customer has confirmed their preference
  (exception: call_summary at end of call — default to SMS if unknown)
- NEVER block the audio pipeline for any messaging operation
- ALWAYS save preference to CRM immediately after detection
- ALWAYS use the customer's first name in messages — never full name
- ALWAYS include a clear next step or call to action in every message
- ALWAYS detect Hindi yes/no signals for Indian customers

---

## FILE STRUCTURE

```
/src/messaging/
  channel-preference-manager.ts   ← detects + stores whatsapp/sms preference
  in-call-messaging-service.ts    ← orchestrates send during active call
  message-builder.ts              ← builds formatted messages per channel
  messaging-trigger-detector.ts   ← detects when AI should send something
  index.ts                        ← exports
```

---

## CLASS 1: ChannelPreferenceManager

```typescript
/**
 * Manages per-customer messaging channel preference.
 *
 * Detection flow:
 * 1. Before any send, check CRM for stored preference
 * 2. If stored → use it immediately (never ask again)
 * 3. If not stored → ConversationBrain asks the question
 * 4. Customer answers → detectFromResponse() parses it
 * 5. Save to CRM → all future calls use it automatically
 *
 * Supports English and Hindi yes/no detection for Indian market.
 */
class ChannelPreferenceManager {
  // Signals that customer confirmed WhatsApp is available
  private readonly WHATSAPP_YES_SIGNALS = [
    // English
    /\byes\b/i,
    /\byeah\b/i,
    /\byep\b/i,
    /\bsure\b/i,
    /\bof course\b/i,
    /\bgo ahead\b/i,
    /works for me/i,
    /\bthat.s fine\b/i,
    /\bwhatsapp.s fine\b/i,
    /\bwhatsapp is good\b/i,
    /send.*whatsapp/i,
    /whatsapp.*works/i,
    // Hindi (romanised)
    /\bhaan\b/i,
    /\bha\b/i,
    /\bbilkul\b/i,
    /\btheek hai\b/i,
    /\btheek\b/i,
    /\bkar do\b/i,
    /\bbhejo\b/i,
  ];

  // Signals that customer prefers SMS or doesn't have WhatsApp
  private readonly WHATSAPP_NO_SIGNALS = [
    // English
    /\bno\b/i,
    /\bnope\b/i,
    /don.t have/i,
    /not on whatsapp/i,
    /dont use whatsapp/i,
    /different number/i,
    /other number/i,
    /just.*text/i,
    /just.*sms/i,
    /text.*me/i,
    /sms.*fine/i,
    // Hindi (romanised)
    /\bnahi\b/i,
    /\bnah\b/i,
    /\bmat\b/i,
    /whatsapp nahi/i,
  ];

  /**
   * Check CRM for stored preference before asking the customer.
   * Returns null if no preference stored yet.
   */
  async getStoredPreference(
    leadId: string,
  ): Promise<"whatsapp" | "sms" | null> {
    const lead = await db.leads.findUnique({
      where: { id: leadId },
      select: {
        messagingPreference: true,
        messagingPreferenceDetectedAt: true,
      },
    });
    return (lead?.messagingPreference as "whatsapp" | "sms") || null;
  }

  /**
   * Parse customer's response to the WhatsApp question.
   * Called by ConversationBrain when waitingForChannelConfirmation is true.
   *
   * Returns 'unclear' if we can't confidently parse the answer.
   * ConversationBrain will ask one more time if 'unclear'.
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
  async savePreference(
    leadId: string,
    preference: "whatsapp" | "sms",
  ): Promise<void> {
    await db.leads.update({
      where: { id: leadId },
      data: {
        messagingPreference: preference,
        messagingPreferenceDetectedAt: new Date(),
      },
    });
  }
}
```

---

## CLASS 2: MessagingTriggerDetector

```typescript
/**
 * Detects when the AI's response should trigger a message send.
 * Runs on every AI response — synchronous pattern matching only.
 * Zero latency — never makes API calls.
 *
 * Trigger detection works on what the AI SAYS, not what the customer says.
 * When AI says "I'm sending you the pricing now" → trigger fires.
 * This matches the natural flow: AI commits to sending, then we send.
 */
class MessagingTriggerDetector {
  detect(aiResponse: string): MessageType | null {
    const triggers: Array<{ pattern: RegExp; type: MessageType }> = [
      // Pricing triggers
      {
        pattern: /send.*pric|pric.*send|sending.*breakdown|breakdown.*send/i,
        type: "pricing",
      },
      // Demo booking triggers
      {
        pattern:
          /send.*calendar|send.*booking|send.*demo|book.*send|calendar.*link/i,
        type: "demo_booking",
      },
      // Case study triggers
      {
        pattern:
          /send.*case study|case study.*send|send.*example|send.*results/i,
        type: "case_study",
      },
      // Competitor comparison triggers
      {
        pattern: /send.*comparison|comparison.*send|send.*vs|send.*compare/i,
        type: "competitor_comparison",
      },
      // Call summary triggers
      {
        pattern: /send.*summary|summary.*send|send.*recap|sending.*next steps/i,
        type: "call_summary",
      },
      // Contract / agreement triggers
      {
        pattern:
          /send.*agreement|agreement.*send|send.*contract|contract.*send/i,
        type: "contract_link",
      },
    ];

    for (const trigger of triggers) {
      if (trigger.pattern.test(aiResponse)) {
        return trigger.type;
      }
    }

    return null; // No trigger detected
  }
}

type MessageType =
  | "pricing"
  | "demo_booking"
  | "case_study"
  | "competitor_comparison"
  | "call_summary"
  | "contract_link";
```

---

## CLASS 3: InCallMessagingService

```typescript
/**
 * Orchestrates all message sending during active calls.
 * One instance per call session — lives inside ConversationBrain.
 *
 * CRITICAL: Every send method is fire-and-forget.
 * Never await any send operation from the call hot path.
 * Failures are caught and logged silently — call never notices.
 *
 * Flow per call:
 * 1. MessagingTriggerDetector fires → handleTrigger() called
 * 2. Check stored preference → if known, send immediately
 * 3. If unknown → set state to waitingForChannelConfirmation
 *                  inject WhatsApp question into AI response
 *                  store pendingMessageType
 * 4. Customer answers → processChannelResponse() called
 * 5. Save preference → send pendingMessageType → clear state
 */
class InCallMessagingService {
  private channelPreference: "whatsapp" | "sms" | null = null;
  private waitingForChannelConfirmation: boolean = false;
  private clarificationAttempts: number = 0;
  private pendingMessageType: MessageType | null = null;
  private readonly MAX_CLARIFICATION_ATTEMPTS = 1;

  constructor(
    private readonly twilioClient: Twilio,
    private readonly channelPrefManager: ChannelPreferenceManager,
    private readonly messageBuilder: MessageBuilder,
    private readonly context: CallContext,
  ) {}

  /**
   * Main entry point — called by ConversationBrain when trigger detected.
   * Handles the full preference check + send or question flow.
   */
  async handleTrigger(messageType: MessageType): Promise<void> {
    // Already waiting for answer — queue this type (last one wins)
    if (this.waitingForChannelConfirmation) {
      this.pendingMessageType = messageType;
      return;
    }

    // Check CRM for stored preference first
    const stored = await this.channelPrefManager.getStoredPreference(
      this.context.leadId,
    );

    if (stored) {
      // Known preference — send immediately
      this.channelPreference = stored;
      this.sendInBackground(messageType, stored);
      return;
    }

    // Unknown preference — ask naturally
    this.pendingMessageType = messageType;
    this.waitingForChannelConfirmation = true;
    this.clarificationAttempts = 0;

    // Return the question to inject into AI response
    // ConversationBrain reads this and includes it in next turn
    return this.getChannelQuestion(messageType);
  }

  /**
   * Get the natural question to ask the customer.
   * Context-aware — different phrasing for different message types.
   */
  getChannelQuestion(messageType: MessageType): string {
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
   * Called by ConversationBrain when waitingForChannelConfirmation is true
   * and a customer utterance arrives.
   *
   * Returns the AI's follow-up line after the preference is confirmed.
   */
  async processChannelResponse(
    transcript: string,
  ): Promise<{ aiLine: string; resolved: boolean }> {
    const detected = this.channelPrefManager.detectFromResponse(transcript);

    if (detected === "unclear") {
      this.clarificationAttempts++;

      // Tried once already — default to SMS and move on
      if (this.clarificationAttempts > this.MAX_CLARIFICATION_ATTEMPTS) {
        return this.resolveWithChannel("sms");
      }

      // Ask one more time, simpler
      return {
        aiLine: "Sorry — WhatsApp or regular text message?",
        resolved: false,
      };
    }

    return this.resolveWithChannel(detected);
  }

  /**
   * Resolve channel, save preference, fire pending message.
   */
  private async resolveWithChannel(
    channel: "whatsapp" | "sms",
  ): Promise<{ aiLine: string; resolved: boolean }> {
    this.channelPreference = channel;
    this.waitingForChannelConfirmation = false;

    // Persist to CRM — never ask again
    await this.channelPrefManager.savePreference(this.context.leadId, channel);

    // Fire the pending message
    if (this.pendingMessageType) {
      this.sendInBackground(this.pendingMessageType, channel);
      this.pendingMessageType = null;
    }

    const aiLine =
      channel === "whatsapp"
        ? "Perfect — sending it to WhatsApp now."
        : "Got it — sending you a text now.";

    return { aiLine, resolved: true };
  }

  /**
   * Fire-and-forget send. NEVER await this from the call path.
   * Any failure is caught and logged — call is never affected.
   */
  sendInBackground(
    messageType: MessageType,
    channel: "whatsapp" | "sms",
  ): void {
    this.doSend(messageType, channel).catch((err) => {
      logger.warn("In-call message failed — call unaffected", {
        callId: this.context.callId,
        messageType,
        channel,
        error: err.message,
      });
    });
  }

  private async doSend(
    messageType: MessageType,
    channel: "whatsapp" | "sms",
  ): Promise<void> {
    const message = this.messageBuilder.build(
      messageType,
      channel,
      this.context,
    );

    if (channel === "whatsapp") {
      await this.twilioClient.messages.create({
        from: `whatsapp:${process.env.WHATSAPP_NUMBER}`,
        to: `whatsapp:${this.context.leadPhone}`,
        body: message.text,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
      });
    } else {
      await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: this.context.leadPhone,
        body: message.text,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
      });
    }

    // Log to CRM — which message was sent, when, on which channel
    await db.callMessages.create({
      data: {
        callId: this.context.callId,
        leadId: this.context.leadId,
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
   * This is the one case where we send without asking first.
   */
  async sendCallSummary(): Promise<void> {
    const channel =
      this.channelPreference ||
      (await this.channelPrefManager.getStoredPreference(
        this.context.leadId,
      )) ||
      "sms"; // Default to SMS for end-of-call summary

    this.sendInBackground("call_summary", channel);
  }

  isWaitingForChannelConfirmation(): boolean {
    return this.waitingForChannelConfirmation;
  }
}
```

---

## CLASS 4: MessageBuilder

```typescript
/**
 * Builds formatted messages for WhatsApp and SMS.
 *
 * WhatsApp messages:
 * - Rich formatting using WhatsApp markdown (*bold*, _italic_)
 * - Emoji used contextually — not excessively
 * - Can be long — WhatsApp handles it well
 * - Can include mediaUrl for images and PDFs
 * - Line breaks and structure make it easy to scan
 *
 * SMS messages:
 * - Under 160 characters per segment (avoid multi-part billing)
 * - First name + core info + link + brief CTA
 * - No emoji (renders inconsistently across carriers)
 * - One link maximum per SMS
 *
 * Both versions feel personal — never like a broadcast.
 * Always use customer's first name. Always have a clear next step.
 */
class MessageBuilder {
  build(
    type: MessageType,
    channel: "whatsapp" | "sms",
    ctx: CallContext,
  ): BuiltMessage {
    return channel === "whatsapp"
      ? this.whatsapp(type, ctx)
      : this.sms(type, ctx);
  }

  // ─────────────────────────────────────────────
  // WHATSAPP — rich, detailed, formatted
  // ─────────────────────────────────────────────

  private whatsapp(type: MessageType, ctx: CallContext): BuiltMessage {
    const map: Record<MessageType, BuiltMessage> = {
      pricing: {
        text:
          `Hi ${ctx.firstName}! 👋\n\n` +
          `Here's the full pricing breakdown we discussed:\n\n` +
          `*📦 Starter — $99/month*\n` +
          `• Up to 5 users\n` +
          `• Core features\n` +
          `• Email support\n\n` +
          `*📦 Pro — $299/month*\n` +
          `• Up to 25 users\n` +
          `• Advanced automation\n` +
          `• Priority support\n` +
          `• Full API access\n\n` +
          `*📦 Enterprise — Custom pricing*\n` +
          `• Unlimited users\n` +
          `• Dedicated account manager\n` +
          `• Custom integrations\n` +
          `• SLA guarantee\n\n` +
          `*💰 ROI Calculator:*\n` +
          `${ctx.pricingUrl}\n\n` +
          `Based on teams your size, most customers see ` +
          `full ROI within 6–8 weeks.\n\n` +
          `Questions? Just reply here — happy to help! 😊`,
        mediaUrl: ctx.pricingImageUrl || null,
      },

      demo_booking: {
        text:
          `Hi ${ctx.firstName}! 🎯\n\n` +
          `Excited to show you around.\n\n` +
          `*📅 Book your demo here:*\n` +
          `${ctx.calendarUrl}\n\n` +
          `*The demo covers:*\n` +
          `✅ Full product walkthrough (20 mins)\n` +
          `✅ Your specific use case\n` +
          `✅ Live Q&A\n` +
          `✅ Custom pricing for your team\n\n` +
          `Slots available this week — pick whatever works! 👆`,
        mediaUrl: null,
      },

      case_study: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Here's the ${ctx.industry || "customer"} case study I mentioned:\n\n` +
          `*🏆 ${ctx.caseStudyCompany || "Customer Story"}*\n` +
          `_"${ctx.caseStudyQuote || "This transformed how our team works."}"_\n\n` +
          `*Results after 90 days:*\n` +
          `📈 ${ctx.caseStudyResult1 || "Significant time savings"}\n` +
          `📈 ${ctx.caseStudyResult2 || "Improved team efficiency"}\n` +
          `📈 ${ctx.caseStudyResult3 || "Strong ROI"}\n\n` +
          `Full case study: ${ctx.caseStudyUrl}\n\n` +
          `Their situation was very similar to yours — ` +
          `happy to walk through it if helpful!`,
        mediaUrl: ctx.caseStudyImageUrl || null,
      },

      competitor_comparison: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Quick comparison vs ${ctx.competitor || "alternatives"}:\n\n` +
          `${
            ctx.comparisonPoints
              ?.map(
                (p) =>
                  `• *${p.feature}:* Us ✅  |  ` +
                  `${ctx.competitor} ${p.theyHave ? "✅" : "❌"}`,
              )
              .join("\n") || "• See the full comparison at the link below"
          }\n\n` +
          `*Price comparison:*\n` +
          `• Us: ${ctx.ourPrice || "from $99/mo"}\n` +
          `• ${ctx.competitor}: ${ctx.competitorPrice || "typically higher"}\n\n` +
          `Full comparison: ${ctx.comparisonUrl}\n\n` +
          `Happy to answer any questions! 🙌`,
        mediaUrl: ctx.comparisonImageUrl || null,
      },

      call_summary: {
        text:
          `Hi ${ctx.firstName}! Great speaking with you today 😊\n\n` +
          `*📋 Summary of our call:*\n\n` +
          `${
            ctx.summaryPoints?.map((p) => `✅ ${p}`).join("\n") ||
            "✅ Discussed your requirements\n✅ Covered pricing options"
          }\n\n` +
          `*🎯 Next step:*\n` +
          `${ctx.nextStep || "I'll follow up with more details shortly"}\n\n` +
          `Any questions before then — just reply here!\n\n` +
          `Have a great day! 👋`,
        mediaUrl: null,
      },

      contract_link: {
        text:
          `Hi ${ctx.firstName}!\n\n` +
          `Here's the agreement we discussed:\n\n` +
          `📄 ${ctx.contractUrl}\n\n` +
          `*What's included:*\n` +
          `✅ ${ctx.planName || "Selected plan"}\n` +
          `✅ ${ctx.contractDuration || "12-month"} agreement\n` +
          `✅ Onboarding support included\n\n` +
          `Takes about 2 minutes to review and sign.\n\n` +
          `Any questions — just reply here! 😊`,
        mediaUrl: null,
      },
    };

    return map[type];
  }

  // ─────────────────────────────────────────────
  // SMS — short, clean, one link
  // Target: under 160 chars (one SMS segment)
  // ─────────────────────────────────────────────

  private sms(type: MessageType, ctx: CallContext): BuiltMessage {
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

interface BuiltMessage {
  text: string;
  mediaUrl: string | null;
}
```

---

## DATABASE ADDITIONS

```sql
-- Add to leads table
ALTER TABLE leads
  ADD COLUMN messaging_preference VARCHAR(10)
    CHECK (messaging_preference IN ('whatsapp', 'sms')),
  ADD COLUMN messaging_preference_detected_at TIMESTAMPTZ;

-- New table to log every message sent during calls
CREATE TABLE call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id),
  lead_id UUID REFERENCES leads(id),
  message_type VARCHAR(30) NOT NULL,
  channel VARCHAR(10) CHECK (channel IN ('whatsapp', 'sms')) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  preview VARCHAR(100),
  delivered BOOLEAN DEFAULT NULL,
  read BOOLEAN DEFAULT NULL
);

CREATE INDEX idx_call_messages_call_id ON call_messages(call_id);
CREATE INDEX idx_call_messages_lead_id ON call_messages(lead_id);
```

---

## ENVIRONMENT VARIABLES

```bash
# Add to .env

# US Twilio number (voice + SMS — already bought)
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# WhatsApp Business number (same US number after Meta approval)
# Apply at: business.whatsapp.com
# Twilio WhatsApp sandbox available for testing before approval:
# from: whatsapp:+14155238886 (Twilio sandbox number)
WHATSAPP_NUMBER=+1XXXXXXXXXX

# Content URLs to include in messages
PRICING_URL=https://yourapp.com/pricing
CALENDAR_URL=https://calendly.com/yourteam
COMPARISON_URL=https://yourapp.com/compare
```

---

## HOW ConversationBrain USES THIS MODULE

Add this to ConversationBrain — the integration point between
the LLM response and the messaging system:

```typescript
// Inside ConversationBrain.processAIResponse():

// Step 1: Check if AI response triggered a message send
const triggerType = this.triggerDetector.detect(aiResponse);

if (triggerType) {
  // Step 2: Check preference and handle accordingly
  const question = await this.messagingService.handleTrigger(triggerType);

  if (question) {
    // Preference unknown — append question to AI response naturally
    // Gemini will say the answer + the question in the same turn
    this.pendingInjection = `After your response, naturally say: "${question}"
       Then stop and wait for the customer's answer.
       Do not continue pitching until they answer.`;
  }
  // If no question returned, message was sent directly (preference known)
}

// Step 3: If we're waiting for channel confirmation,
// process this utterance as an answer to the WhatsApp question
if (this.messagingService.isWaitingForChannelConfirmation()) {
  const result =
    await this.messagingService.processChannelResponse(customerTranscript);

  if (result.resolved) {
    // Inject short confirmation line into AI's next response
    this.pendingInjection =
      `Start your response with: "${result.aiLine}" ` +
      `Then continue the conversation naturally.`;
  }
  // If not resolved, ask clarification question from result.aiLine
}
```

---

## CONVERSATION STATE

Add these fields to CallSession to track messaging state:

```typescript
interface CallSession {
  // ... existing fields ...

  // Messaging state
  messagingChannelConfirmed: boolean;
  messagingPreference: "whatsapp" | "sms" | null;
  waitingForChannelAnswer: boolean;
  pendingMessageType: MessageType | null;
  messagesSentThisCall: MessageType[];
}
```

---

## TESTING CHECKLIST

```
□ MessagingTriggerDetector fires on "I'm sending you the pricing"
□ MessagingTriggerDetector fires on "sending you the booking link"
□ MessagingTriggerDetector does NOT fire on unrelated AI responses
□ ChannelPreferenceManager detects "yes", "yeah", "haan", "bilkul" as WhatsApp
□ ChannelPreferenceManager detects "no", "nahi", "just text" as SMS
□ ChannelPreferenceManager returns 'unclear' for ambiguous responses
□ Stored preference is read from CRM before asking customer
□ WhatsApp question is NOT asked if preference already stored
□ Message fires in background without blocking audio pipeline
□ Voice call continues perfectly if Twilio SMS API is down
□ WhatsApp message sends with correct formatting (* for bold)
□ SMS message is under 160 characters for all types
□ Preference saved to CRM after first confirmed answer
□ Second call to same customer skips the WhatsApp question
□ call_messages table row created after every send
□ End-of-call summary sends to correct channel
□ Twilio sandbox WhatsApp works for testing before Meta approval
```

---

## WHAT COPILOT MUST NEVER DO IN THIS MODULE

- Never await sendInBackground() — it must always be fire and forget
- Never throw errors from sendInBackground() — catch everything silently
- Never send a message before channel preference is confirmed
  (exception: call_summary at end of call — default to SMS)
- Never ask the WhatsApp question if preference is already in CRM
- Never ask the WhatsApp question more than once per call
- Never use the customer's full name in messages — first name only
- Never send more than one of the same message type per call
- Never block the Twilio WebSocket audio handler for any messaging work
- Never hardcode phone numbers or URLs — always use environment variables
- Never log message body in full — preview only (first 100 chars)
