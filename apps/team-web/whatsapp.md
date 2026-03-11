# Inbound Calls & WhatsApp Conversation AI — GitHub Copilot Instructions

# File: .github/instructions/inbound-whatsapp.instructions.md

# Apply to: **/whatsapp/**, **/inbound/**, **/_whatsapp_.ts, **/_inbound_.ts, \**/*callback\*.ts

---

## FEATURE OVERVIEW

This module handles two scenarios that happen AFTER the outbound AI sales call ends:

### Scenario 1 — Customer Calls Back the US Number

Customer received a WhatsApp message from +19843685289 (US number).
They call it back out of curiosity or to follow up.
AI picks up immediately, recognises them, continues the relationship.
Never leaves a customer in silence or confusion.

### Scenario 2 — Customer Messages on WhatsApp After the Call

Customer thinks about the call later and messages the WhatsApp number.
Could be hours or days after the original call.
AI responds 24/7 with full context of the previous conversation.
Handles questions, objections, follow-ups, and closes deals autonomously.
Notifies human rep instantly when buying signal detected.

---

## WHY THIS MODULE EXISTS

```
Without this module:
  Customer calls back US number → dead line → bad experience
  Customer messages WhatsApp at 10pm → no reply until morning → deal lost

With this module:
  Customer calls back → AI picks up, continues conversation
  Customer messages at 10pm → AI responds in 10 seconds
  Customer says "let's go" at 10pm → AI closes deal, notifies rep
  Zero human involvement needed for 80% of follow-up conversations
```

---

## HOW IT CONNECTS TO THE REST OF THE SYSTEM

```
OUTBOUND CALL (existing system)
  ↓ call ends
  ↓ PostCallProcessor saves: summary, concerns, outcome, lead score
  ↓ InCallMessagingService sends WhatsApp/SMS with info

INBOUND CALL (this module)
  Customer calls back US Twilio number
  ↓ Twilio fires POST /webhooks/twilio/inbound
  ↓ InboundCallHandler looks up caller in CRM
  ↓ If known lead → loads call context → full AI conversation
  ↓ If unknown → standard inbound sales flow
  ↓ Same AudioPipeline as outbound (reused, not rebuilt)

WHATSAPP CONVERSATION (this module)
  Customer messages US WhatsApp number any time
  ↓ Twilio fires POST /webhooks/whatsapp/inbound
  ↓ WhatsAppConversationHandler looks up sender in CRM
  ↓ Loads previous call context + thread history
  ↓ Gemini generates contextual response
  ↓ Sends WhatsApp reply within 10 seconds
  ↓ BuyingSignalDetector checks every message
  ↓ If buying signal → close deal + notify human rep
```

---

## NUMBER SETUP CONTEXT

```
+19843685289 (Twilio US number) does THREE jobs:
  1. Voice infrastructure for all outbound AI calls
  2. WhatsApp Business sender (messages come FROM this number)
  3. Inbound call receiver (when customers call back)

+91XXXXXXXXXX (Jio) — Verified Caller ID only
  → Customers SEE this when AI calls them
  → Does not receive calls in this system
  → Never handles WhatsApp

Airtel number — personal use only
  → Not used in this system at all
  → Keep for manual WhatsApp Business app
```

---

## FILE STRUCTURE

```
/src/inbound/
  inbound-call-handler.ts          ← handles calls TO your US number
  inbound-call-brain.ts            ← AI conversation for inbound calls

/src/whatsapp/
  whatsapp-conversation-handler.ts ← handles WhatsApp messages from customers
  whatsapp-thread-manager.ts       ← manages conversation history per customer
  whatsapp-response-generator.ts   ← Gemini generates contextual replies
  whatsapp-buying-signal.ts        ← detects purchase intent in messages
  whatsapp-notification.ts         ← notifies human rep on hot signals

/src/webhooks/
  twilio-inbound.webhook.ts        ← POST /webhooks/twilio/inbound
  whatsapp-inbound.webhook.ts      ← POST /webhooks/whatsapp/inbound
```

---

## CLASS 1: InboundCallHandler

```typescript
/**
 * Handles inbound calls to the Twilio US number.
 * Fired by Twilio webhook when someone calls +19843685289.
 *
 * Two paths:
 * 1. Known lead (called before or received WhatsApp from us)
 *    → Warm greeting using their name and call context
 *    → Full AI conversation using same AudioPipeline as outbound
 *
 * 2. Unknown caller
 *    → Standard inbound sales AI
 *    → Treats as new lead, qualifies and captures info
 *
 * IMPORTANT: This reuses the existing AudioPipeline and
 * GeminiStreamingClient — do NOT build a separate voice system.
 * Only the system prompt and opening line differ from outbound.
 */
class InboundCallHandler {
  /**
   * Main entry point — called by Twilio webhook controller.
   * Returns TwiML that connects the call to the AI stream.
   *
   * Must respond within 5 seconds or Twilio plays default message.
   * Keep this method fast — database lookup only, no LLM calls here.
   */
  async handle(callerNumber: string, twilioCallSid: string): Promise<string> {
    // Look up caller in CRM
    const lead = await db.leads.findFirst({
      where: { phone: callerNumber },
      include: {
        calls: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { emotions: true },
        },
      },
    });

    // Log inbound call attempt
    await db.calls.create({
      data: {
        twilioCallSid,
        leadId: lead?.id || null,
        status: "in_progress",
        direction: "inbound",
        startedAt: new Date(),
      },
    });

    if (lead) {
      return this.buildKnownLeadTwiML(lead, twilioCallSid);
    }

    return this.buildUnknownCallerTwiML(twilioCallSid);
  }

  /**
   * Known lead calling back.
   * Passes leadId and callType to the WebSocket stream handler.
   * AudioPipeline reads these params and loads appropriate context.
   */
  private buildKnownLeadTwiML(lead: Lead, callSid: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${process.env.BASE_URL}/calls/stream">
      <Parameter name="leadId" value="${lead.id}"/>
      <Parameter name="callType" value="inbound_callback"/>
      <Parameter name="callSid" value="${callSid}"/>
    </Stream>
  </Connect>
</Response>`;
  }

  /**
   * Unknown caller.
   * No lead context — AI introduces itself and qualifies.
   */
  private buildUnknownCallerTwiML(callSid: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${process.env.BASE_URL}/calls/stream">
      <Parameter name="callType" value="inbound_unknown"/>
      <Parameter name="callSid" value="${callSid}"/>
    </Stream>
  </Connect>
</Response>`;
  }
}
```

---

## CLASS 2: InboundCallBrain

```typescript
/**
 * Generates the system prompt for inbound callback calls.
 * Used by AudioPipeline when callType = 'inbound_callback'.
 *
 * Key difference from outbound:
 * - Customer called US — acknowledge this naturally
 * - More relaxed opening — they initiated, not us
 * - Full context from previous call loaded
 * - Tone: warm recognition, not sales pitch opening
 *
 * Uses Claude Sonnet 4.6 — same as PreCallBrainService.
 * Runs async while Twilio connects the call (~2-3 seconds available).
 */
class InboundCallBrain {
  /**
   * Generate system prompt for known lead calling back.
   * Must complete before first customer utterance arrives.
   * Fallback to minimal prompt if generation takes too long.
   */
  async generateInboundPrompt(lead: Lead, lastCall: Call): Promise<string> {
    const callSummary = lastCall?.transcript
      ? await this.summariseCall(lastCall)
      : "First contact via WhatsApp message";

    return `
You are ${process.env.AGENT_NAME}, a sales assistant at ${process.env.COMPANY_NAME}.
${lead.firstName} just called YOU on WhatsApp/phone — they initiated this contact.

THIS IS AN INBOUND CALLBACK — different tone from outbound:
- They called you — they're interested, don't oversell
- Open with warm recognition, not a pitch
- Let them lead — ask "what can I help you with?"
- They may have a specific question — answer it directly first
- Don't restart the sales process — continue where you left off

CONTEXT FROM PREVIOUS INTERACTION:
Call date: ${lastCall?.startedAt?.toDateString() || "Recent"}
Summary: ${callSummary}
Where things stood: ${lastCall?.outcome || "In discussion"}
Their main concern: ${lead.predictedConcern || "Unknown"}
Personal details: ${JSON.stringify(lead.zeroPartyData || {})}
Lead temperature: ${lead.leadTemperature}

YOUR OPENING LINE:
"Hi ${lead.firstName}! Good to hear from you —
 how can I help?"

Then STOP. Let them speak first.
Do not launch into any pitch.
Do not recap the previous call unprompted.
Just listen and respond to what they need.

VOICE RULES:
- Contractions always (don't, I'll, we've)
- Warm but not overly enthusiastic — they called you
- Short responses unless explaining something
- After any question — stop and wait

ESCALATION:
If they say they want to buy or move forward:
→ Send booking link via WhatsApp immediately
→ Notify human rep
→ "I'm sending you the link right now and
   someone from our team will be in touch shortly"
    `.trim();
  }

  /**
   * Generate system prompt for unknown inbound caller.
   * Qualifies the lead and captures contact info.
   */
  async generateUnknownCallerPrompt(): Promise<string> {
    return `
You are ${process.env.AGENT_NAME} at ${process.env.COMPANY_NAME}.
Someone called your business number — you don't know who they are yet.

YOUR OPENING:
"Hi! Thanks for calling ${process.env.COMPANY_NAME}.
 I'm ${process.env.AGENT_NAME} — how can I help you today?"

GOALS FOR THIS CALL:
1. Understand why they called
2. Get their name naturally ("Sorry, I didn't catch your name?")
3. Understand their situation and need
4. If relevant — pitch appropriately
5. Capture their WhatsApp/email for follow-up

VOICE RULES:
- Friendly, not scripted
- Let them explain themselves fully before responding
- Never interrupt
    `.trim();
  }

  private async summariseCall(call: Call): Promise<string> {
    if (!call.transcript) return "Previous call — details unavailable";

    // Use Gemini Flash-Lite for cheap summarisation
    const result = await geminiLite.generateContent(
      `Summarise this sales call in 2 sentences, 
       focusing on where the customer stood at the end:
       ${call.transcript.substring(0, 3000)}`,
    );
    return result.text();
  }
}
```

---

## CLASS 3: WhatsAppConversationHandler

```typescript
/**
 * Handles all inbound WhatsApp messages from customers.
 * Fired by Twilio webhook: POST /webhooks/whatsapp/inbound
 *
 * This is an ASYNC system — no voice latency requirements.
 * Target response time: under 10 seconds from message received.
 * Uses Gemini 2.5 Flash-Lite — cheap, fast enough for async.
 *
 * Every message goes through:
 * 1. Lead lookup (who is this?)
 * 2. Context loading (what do we know about them?)
 * 3. Thread loading (what have we messaged before?)
 * 4. Response generation (Gemini with full context)
 * 5. Reply sent via Twilio WhatsApp
 * 6. Buying signal check (should we close or notify rep?)
 * 7. Thread + CRM updated
 */
class WhatsAppConversationHandler {
  /**
   * Main entry point — called by webhook controller.
   * Must complete within Twilio's 10-second webhook timeout.
   */
  async handleInbound(
    from: string, // Customer's WhatsApp number e.g. whatsapp:+91XXXXXXX
    message: string, // Text they sent
    mediaUrls?: string[], // Images/docs they sent (optional)
  ): Promise<void> {
    const phone = from.replace("whatsapp:", "");

    // Parallel: load lead + thread simultaneously
    const [lead, thread] = await Promise.all([
      this.findLead(phone),
      this.threadManager.getThread(phone),
    ]);

    // Save inbound message to thread immediately
    await this.threadManager.addMessage(thread.id, {
      role: "customer",
      content: message,
      timestamp: new Date(),
      mediaUrls,
    });

    if (!lead) {
      await this.handleUnknownSender(phone, message, thread);
      return;
    }

    // Load call context for personalised response
    const callContext = await this.loadCallContext(lead.id);

    // Generate AI response
    const response = await this.responseGenerator.generate(
      message,
      lead,
      callContext,
      thread.messages,
      mediaUrls,
    );

    // Send reply
    await this.sendReply(from, response);

    // Save AI response to thread
    await this.threadManager.addMessage(thread.id, {
      role: "ai",
      content: response,
      timestamp: new Date(),
    });

    // Check for buying signals — runs in background
    this.buyingSignalDetector
      .check(message, lead, phone)
      .catch((err) => logger.warn("Buying signal check failed", { err }));

    // Update last contact timestamp
    await db.leads.update({
      where: { id: lead.id },
      data: { lastWhatsAppAt: new Date() },
    });
  }

  /**
   * Handle message from someone not in CRM.
   * Treat as new inbound lead — capture and qualify.
   */
  private async handleUnknownSender(
    phone: string,
    message: string,
    thread: Thread,
  ): Promise<void> {
    // Create a new lead record
    const newLead = await db.leads.create({
      data: {
        phone,
        leadTemperature: "cold",
        leadScore: 10,
        source: "whatsapp_inbound",
        firstContactAt: new Date(),
      },
    });

    const response =
      `Hi! Thanks for reaching out to ${process.env.COMPANY_NAME}. ` +
      `I'm ${process.env.AGENT_NAME} 👋\n\n` +
      `Happy to help — could I get your name first?`;

    await this.sendReply(`whatsapp:${phone}`, response);

    await this.threadManager.addMessage(thread.id, {
      role: "ai",
      content: response,
      timestamp: new Date(),
    });
  }

  private async findLead(phone: string): Promise<Lead | null> {
    return db.leads.findFirst({
      where: {
        OR: [{ phone }, { phone: phone.replace("+", "") }],
      },
    });
  }

  private async loadCallContext(leadId: string): Promise<CallContext> {
    const lastCall = await db.calls.findFirst({
      where: { leadId, status: "completed" },
      orderBy: { startedAt: "desc" },
      include: { messages: true },
    });

    if (!lastCall) return { hasHistory: false };

    return {
      hasHistory: true,
      callDate: lastCall.startedAt,
      summary: lastCall.aiSummary,
      mainConcern: lastCall.predictedConcern,
      outcome: lastCall.outcome,
      objectionsRaised: lastCall.objectionsRaised,
      buyingSignals: lastCall.buyingSignalsDetected,
      personalData: lastCall.personalDataCaptured,
    };
  }

  private async sendReply(to: string, message: string): Promise<void> {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.WHATSAPP_NUMBER}`,
      to,
      body: message,
    });
  }
}
```

---

## CLASS 4: WhatsAppResponseGenerator

```typescript
/**
 * Generates AI responses to WhatsApp messages.
 * Uses Gemini 2.5 Flash-Lite — no latency pressure, optimise for quality.
 *
 * WhatsApp response rules (different from live call responses):
 * - Can be longer than call responses (WhatsApp = async reading)
 * - Use WhatsApp formatting: *bold*, _italic_, line breaks
 * - Max 3 paragraphs — still respect their time
 * - One clear next step or question at the end
 * - Reference call context naturally — don't be creepy about it
 * - Emoji: 1-2 max, contextual, not decorative
 * - Never sound like a broadcast message — always personal
 */
class WhatsAppResponseGenerator {
  async generate(
    customerMessage: string,
    lead: Lead,
    callContext: CallContext,
    threadHistory: Message[],
    mediaUrls?: string[],
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(lead, callContext);
    const conversationHistory = this.buildHistory(threadHistory);

    const response = await geminiLite.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...conversationHistory,
        {
          role: "user",
          parts: [{ text: customerMessage }],
        },
      ],
      generationConfig: {
        // Thinking on for complex questions
        thinkingConfig: {
          thinkingBudget: this.getThinkingBudget(customerMessage),
        },
        maxOutputTokens: 300, // Keep replies concise
        temperature: 0.8,
      },
    });

    return response.text();
  }

  private buildSystemPrompt(lead: Lead, ctx: CallContext): string {
    return `
You are ${process.env.AGENT_NAME}, a sales assistant at ${process.env.COMPANY_NAME}.
You are having a WhatsApp conversation with ${lead.firstName}.

${
  ctx.hasHistory
    ? `
CONTEXT FROM YOUR RECENT CALL (${ctx.callDate?.toDateString()}):
- Summary: ${ctx.summary}
- Their main concern: ${ctx.mainConcern}
- Where things stood: ${ctx.outcome}
- Personal details they shared: ${JSON.stringify(ctx.personalData || {})}
- Buying signals detected: ${ctx.buyingSignals?.join(", ") || "none yet"}
`
    : `
This person reached out to you on WhatsApp — no previous call history.
Qualify naturally and understand their situation.
`
}

WHATSAPP RESPONSE RULES:
- This is WhatsApp — conversational, warm, not formal
- Use *bold* for key points only
- Max 3 short paragraphs
- End with ONE clear question or next step
- Reference call naturally if relevant ("as we discussed...")
- Never say "As an AI" or "I'm a bot"
- If they ask a question → answer it directly first, then context
- If they want to buy → send booking link immediately
- If complex → offer a quick call ("want me to call you quickly?")
- Emoji: maximum 2, only if they fit naturally
- Never sound like a template or broadcast

BUYING SIGNALS — if detected, respond with booking link:
${process.env.CALENDAR_URL}
    `.trim();
  }

  private buildHistory(messages: Message[]): GeminiMessage[] {
    // Last 10 messages only — keep context window lean
    return messages.slice(-10).map((m) => ({
      role: m.role === "customer" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
  }

  private getThinkingBudget(message: string): number {
    // Complex questions get thinking time
    // WhatsApp is async — 2-3 extra seconds is fine
    const needsThinking =
      /price|cost|how much|compare|vs |versus|integrate|api|security|contract/i.test(
        message,
      );

    return needsThinking ? 3000 : 0;
  }
}
```

---

## CLASS 5: WhatsAppBuyingSignalDetector

```typescript
/**
 * Detects purchase intent in WhatsApp messages.
 * Runs after every inbound message — async, non-blocking.
 *
 * On detection:
 * 1. Update lead score to 95 (hot)
 * 2. Send booking/contract link immediately via WhatsApp
 * 3. Notify human rep with full context
 * 4. Log to CRM with timestamp
 *
 * This is how deals close at 10pm without any human involvement.
 */
class WhatsAppBuyingSignalDetector {
  private readonly BUYING_SIGNALS = [
    // Direct intent
    /let.s do it/i,
    /i.m in/i,
    /ready to (start|go|proceed)/i,
    /move forward/i,
    /go ahead/i,
    /sign (me )?up/i,
    /yes.*proceed/i,
    /let.s proceed/i,

    // Action requests
    /send.*contract/i,
    /send.*agreement/i,
    /how do i (sign|start|pay)/i,
    /where do i (sign|pay)/i,
    /book.*demo/i,
    /schedule.*call/i,
    /set.*up.*call/i,

    // Price acceptance
    /that.*works for (me|us)/i,
    /price.*fine/i,
    /price.*ok/i,
    /budget.*approved/i,
    /that.s acceptable/i,

    // Urgency
    /when can (we|i) start/i,
    /how soon/i,
    /asap/i,
    /this week/i,
    /today/i,
  ];

  async check(message: string, lead: Lead, phone: string): Promise<void> {
    const isBuyingSignal = this.BUYING_SIGNALS.some((p) => p.test(message));

    if (!isBuyingSignal) return;

    // Parallel: update CRM + notify rep + send closing message
    await Promise.all([
      this.updateLeadScore(lead.id),
      this.notifyHumanRep(lead, message),
      this.sendClosingMessage(phone, lead),
    ]);
  }

  private async updateLeadScore(leadId: string): Promise<void> {
    await db.leads.update({
      where: { id: leadId },
      data: {
        leadScore: 95,
        leadTemperature: "hot",
        buyingSignalDetectedAt: new Date(),
        buyingSignalChannel: "whatsapp",
      },
    });
  }

  private async notifyHumanRep(
    lead: Lead,
    triggerMessage: string,
  ): Promise<void> {
    // Get available rep
    const rep = await db.humanReps.findFirst({
      where: { available: true },
      orderBy: { currentCalls: "asc" },
    });

    if (!rep) {
      logger.warn("No rep available for hot WhatsApp lead", {
        leadId: lead.id,
      });
      return;
    }

    // Notify rep via their preferred channel (SMS/email/Slack)
    await this.sendRepNotification(rep, {
      title: "🔥 HOT LEAD — Ready to Buy on WhatsApp",
      body:
        `${lead.firstName} (${lead.company}) just said:\n` +
        `"${triggerMessage}"\n\n` +
        `Lead score: 95/100\n` +
        `Previous call: ${lead.lastCallDate?.toDateString()}\n` +
        `Their concern was: ${lead.predictedConcern}\n\n` +
        `They've been sent the booking link.\n` +
        `Follow up within 30 minutes for best conversion.`,
      leadId: lead.id,
      phone: lead.phone,
    });
  }

  private async sendClosingMessage(phone: string, lead: Lead): Promise<void> {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
      body:
        `That's brilliant, ${lead.firstName}! 🎉\n\n` +
        `Here's the link to get everything set up:\n` +
        `${process.env.CALENDAR_URL}\n\n` +
        `Someone from our team will also reach out shortly ` +
        `to make sure your onboarding goes smoothly.\n\n` +
        `Really excited to have you on board! 🙌`,
    });
  }
}
```

---

## CLASS 6: WhatsAppThreadManager

```typescript
/**
 * Manages WhatsApp conversation threads per customer.
 * A thread is the full message history between AI and one customer.
 *
 * Threads persist indefinitely — customer can message months later
 * and AI has full history of every previous WhatsApp conversation.
 *
 * This is separate from call transcripts (which are in calls table).
 * WhatsApp threads = async text conversations only.
 */
class WhatsAppThreadManager {
  /**
   * Get existing thread or create new one for this phone number.
   */
  async getThread(phone: string): Promise<Thread> {
    const existing = await db.whatsappThreads.findFirst({
      where: { phone },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
          // Load last 20 messages for context
          take: -20,
        },
      },
    });

    if (existing) return existing;

    return db.whatsappThreads.create({
      data: {
        phone,
        createdAt: new Date(),
        messages: { create: [] },
      },
      include: { messages: true },
    });
  }

  async addMessage(
    threadId: string,
    message: {
      role: "customer" | "ai";
      content: string;
      timestamp: Date;
      mediaUrls?: string[];
    },
  ): Promise<void> {
    await db.whatsappMessages.create({
      data: {
        threadId,
        ...message,
        mediaUrls: message.mediaUrls || [],
      },
    });

    // Update thread last activity
    await db.whatsappThreads.update({
      where: { id: threadId },
      data: { lastMessageAt: message.timestamp },
    });
  }
}
```

---

## WEBHOOK CONTROLLERS

```typescript
// src/webhooks/twilio-inbound.webhook.ts
// POST /webhooks/twilio/inbound

router.post("/webhooks/twilio/inbound", async (req, res) => {
  // Validate request is from Twilio
  const twilioSignature = req.headers["x-twilio-signature"] as string;
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    `${process.env.BASE_URL}/webhooks/twilio/inbound`,
    req.body,
  );

  if (!isValid) {
    logger.warn("Invalid Twilio signature on inbound webhook");
    return res.status(403).send("Forbidden");
  }

  const { From: callerNumber, CallSid: callSid } = req.body;

  const twiml = await inboundCallHandler.handle(callerNumber, callSid);

  res.type("text/xml").send(twiml);
});

// src/webhooks/whatsapp-inbound.webhook.ts
// POST /webhooks/whatsapp/inbound

router.post("/webhooks/whatsapp/inbound", async (req, res) => {
  // Validate Twilio signature
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    req.headers["x-twilio-signature"] as string,
    `${process.env.BASE_URL}/webhooks/whatsapp/inbound`,
    req.body,
  );

  if (!isValid) return res.status(403).send("Forbidden");

  // Respond to Twilio immediately (within 5 seconds required)
  // Process message async — don't make Twilio wait
  res.status(200).send("");

  // Handle async — Twilio already got 200 OK
  const { From, Body, NumMedia, MediaUrl0 } = req.body;
  const mediaUrls = NumMedia > 0 ? [MediaUrl0] : undefined;

  await whatsAppHandler
    .handleInbound(From, Body, mediaUrls)
    .catch((err) => logger.error("WhatsApp handler failed", { err, From }));
});
```

---

## DATABASE ADDITIONS

```sql
-- WhatsApp conversation threads
CREATE TABLE whatsapp_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within threads
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES whatsapp_threads(id),
  role VARCHAR(10) CHECK (role IN ('customer', 'ai')) NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add to calls table
ALTER TABLE calls
  ADD COLUMN direction VARCHAR(10)
    CHECK (direction IN ('outbound', 'inbound')) DEFAULT 'outbound',
  ADD COLUMN inbound_type VARCHAR(20)
    CHECK (inbound_type IN ('callback', 'cold_inbound'));

-- Add to leads table
ALTER TABLE leads
  ADD COLUMN last_whatsapp_at TIMESTAMPTZ,
  ADD COLUMN buying_signal_detected_at TIMESTAMPTZ,
  ADD COLUMN buying_signal_channel VARCHAR(20);

CREATE INDEX idx_whatsapp_threads_phone ON whatsapp_threads(phone);
CREATE INDEX idx_whatsapp_messages_thread ON whatsapp_messages(thread_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
```

---

## ENVIRONMENT VARIABLES

```bash
# Add to existing .env

# Inbound call handling
INBOUND_CALL_ENABLED=true

# WhatsApp webhook
WHATSAPP_WEBHOOK_PATH=/webhooks/whatsapp/inbound

# Twilio webhook signature validation
BASE_URL=https://yourdomain.com   # Must be HTTPS — Twilio requires it

# Rep notification (for hot lead alerts)
REP_NOTIFICATION_EMAIL=yourteam@company.com
REP_NOTIFICATION_SMS=+44XXXXXXXXXX   # Your number for urgent alerts
```

---

## TWILIO CONSOLE SETUP

```
For inbound calls to work:

Twilio Console
  → Phone Numbers
  → Manage
  → Active Numbers
  → Click +19843685289
  → Voice Configuration
  → "A call comes in" → Webhook
  → URL: https://yourdomain.com/webhooks/twilio/inbound
  → HTTP Method: POST
  → Save

For WhatsApp inbound to work:

Twilio Console
  → Messaging
  → Senders
  → WhatsApp Senders
  → Click your number
  → "A message comes in" → Webhook
  → URL: https://yourdomain.com/webhooks/whatsapp/inbound
  → HTTP Method: POST
  → Save
```

---

## TESTING CHECKLIST

```
INBOUND CALLS:
□ Call +19843685289 from a number in CRM → AI greets by name
□ Call from unknown number → AI gives standard greeting
□ AI loads previous call context within 3 seconds of pickup
□ Full AI conversation works (same AudioPipeline as outbound)
□ Call logged to database with direction='inbound'

WHATSAPP CONVERSATIONS:
□ Send "hi" to WhatsApp number → AI responds within 10 seconds
□ Known lead gets personalised response referencing their call
□ Unknown sender gets qualification response asking for name
□ "Let's go ahead" triggers buying signal → booking link sent
□ "Let's go ahead" notifies human rep within 30 seconds
□ Lead score updates to 95 on buying signal
□ Thread saves both customer and AI messages
□ Second message in thread shows conversation history awareness
□ Media (image sent by customer) handled without crashing
□ Twilio signature validation rejects non-Twilio requests
□ 200 OK returned to Twilio before processing starts

EDGE CASES:
□ Customer messages at 2am → AI responds normally (24/7)
□ Customer sends voice note → handled gracefully (text reply)
□ Same customer messages twice quickly → no duplicate responses
□ Twilio webhook timeout (10s) → 200 returned first, then process
□ Gemini API down → fallback response sent, error logged
```

---

## WHAT COPILOT MUST NEVER DO IN THIS MODULE

- Never make the inbound webhook wait for AI generation before returning 200
  (Twilio times out after 10 seconds — return 200 immediately, process async)
- Never reuse call transcripts as WhatsApp thread history — they are separate
- Never send buying signal closing message without also notifying human rep
- Never store full media from customer (images etc) — store URL reference only
- Never skip Twilio signature validation — security critical
- Never load more than 20 messages of thread history into Gemini context
- Never block the webhook response with a synchronous AI call
- Never crash if lead is not found — handle unknown senders gracefully
- Never send more than one closing message for the same buying signal
- Never share personal data between different customers' threads
