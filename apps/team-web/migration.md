# AI Sales Agent — Migration Change Instructions for GitHub Copilot

# File: .github/instructions/migration-v2.instructions.md

#

# PURPOSE: This document instructs Copilot on EXACTLY what to change

# from the original build. Do NOT rewrite from scratch. Make surgical

# changes only. Everything not mentioned here stays as-is.

#

# ORIGINAL STACK: Claude (live LLM) + Deepgram (STT) + ElevenLabs (TTS)

# NEW STACK: Gemini 2.5 Flash-Lite (live) + Claude Sonnet 4.6 (pre-call)

# + Thinking Toggle + Optional Gemini Live API (native audio)

# + Inworld AI TTS (benchmark vs ElevenLabs)

---

## CHANGE SUMMARY (Read This First)

```
WHAT CHANGES:
  1. LLM client: ClaudeStreamingClient → GeminiStreamingClient
  2. New feature: Thinking Budget Toggle (dynamic per turn)
  3. New service: PreCallBrainService (Claude Sonnet runs BEFORE the call)
  4. New option: Gemini Live API mode (native audio — skips Deepgram)
  5. TTS: Add InworldTTSClient alongside ElevenLabsStreamingClient
  6. Timeouts: Update to match Gemini latency profile
  7. Model routing: Add ModelRouter for live → Claude escalation on high-value close
  8. Post-call: Switch to Gemini Flash-Lite (separate cheaper instance)

WHAT STAYS EXACTLY THE SAME:
  - AudioPipeline class structure and state machine
  - FillerAudioManager (all filler files and library)
  - BackchannelEngine (all logic unchanged)
  - CrossfadeManager (all logic unchanged)
  - SentencePredictor (all logic unchanged)
  - EmotionDetector, FrustrationMonitor, BuyingSignalDetector
  - ToneAdaptationEngine and all emotion→adaptation mappings
  - All database schema (no changes)
  - All API endpoints (no changes)
  - Twilio WebSocket handling (no changes)
  - Mulaw audio format (no changes)
  - Error handling patterns (no changes)
  - Compliance/DNC logic (no changes)
```

---

## CHANGE 1: Replace ClaudeStreamingClient with GeminiStreamingClient

### File to change

Wherever `ClaudeStreamingClient` is defined and instantiated.

### Remove this class entirely

```typescript
// DELETE THIS — ClaudeStreamingClient is no longer used for live calls
class ClaudeStreamingClient {
  // ... entire class
}
```

### Replace with this new class

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

/**
 * Streaming LLM client for Gemini 2.5 Flash-Lite.
 * Replaces ClaudeStreamingClient for all live call conversations.
 *
 * KEY DIFFERENCE from Claude client:
 * - Has a thinkingBudget parameter that dynamically controls reasoning depth
 * - thinkingBudget: 0 = ultra-fast (no reasoning, ~350ms TTFT)
 * - thinkingBudget: 1-8000 = thinking mode (handles objections, technical questions)
 * - Filler audio MUST play when thinkingBudget > 0 — covers the extra latency
 *
 * Model: gemini-2.5-flash-lite-preview-06-17
 * Fallback: gemini-2.5-flash (if lite unavailable)
 */
class GeminiStreamingClient {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private conversationHistory: GeminiMessage[] = [];

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({
      model: "gemini-2.5-flash-lite-preview-06-17",
    });
  }

  /**
   * Stream a response for the current turn.
   *
   * CRITICAL: thinkingBudget must be determined BEFORE calling this.
   * Use ThinkingBudgetManager.calculate() to get the right budget.
   * If thinkingBudget > 0, caller must have already started filler audio.
   *
   * @param transcript - what the customer just said
   * @param systemPrompt - the full pre-call brief from PreCallBrainService
   * @param thinkingBudget - 0 for instant, 1-8000 for deep reasoning turns
   */
  async *streamResponse(
    transcript: string,
    systemPrompt: string,
    thinkingBudget: number = 0,
  ): AsyncGenerator<string> {
    // Add customer turn to history
    this.conversationHistory.push({
      role: "user",
      parts: [{ text: transcript }],
    });

    const chat = this.model.startChat({
      history: this.conversationHistory,
      systemInstruction: systemPrompt,
      generationConfig: {
        // Thinking toggle — the core new feature
        // 0 = off (sub-400ms), >0 = thinking mode (better reasoning)
        thinkingConfig: {
          thinkingBudget: thinkingBudget,
          includeThoughts: false, // Never stream thoughts to audio
        },
        // Streaming optimizations
        temperature: 0.85, // Slightly creative for natural conversation
        maxOutputTokens: 300, // Sales turns should be short — enforce it
        stopSequences: ["\n\n"], // Stop at double newline — prevents rambling
      },
    });

    const result = await chat.sendMessageStream(transcript);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        yield text;
      }
    }

    // Add AI response to history for context continuity
    this.conversationHistory.push({
      role: "model",
      parts: [{ text: fullResponse }],
    });
  }

  /**
   * Reset conversation history.
   * Called at start of each new call — never carry history across calls.
   */
  resetHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Inject the pre-call brief as the first assistant turn.
   * This primes Gemini with the full customer context before
   * the first customer utterance arrives.
   *
   * Called by PreCallBrainService after generating the brief.
   */
  primeWithBrief(brief: PreCallBrief): void {
    this.conversationHistory = [
      {
        role: "user",
        parts: [
          { text: "Call starting now. Use the system prompt for context." },
        ],
      },
      {
        role: "model",
        parts: [
          { text: `Understood. Ready to connect with ${brief.customerName}.` },
        ],
      },
    ];
  }
}

// Update AudioPipeline to use new client
// Change this line in AudioPipeline class:
// BEFORE: private llmClient: ClaudeStreamingClient;
// AFTER:  private llmClient: GeminiStreamingClient;
```

---

## CHANGE 2: Add ThinkingBudgetManager (New Class)

### Add this new file: `src/llm/thinking-budget-manager.ts`

```typescript
/**
 * Determines the Gemini thinking budget for each conversation turn.
 *
 * This is the feature that makes Gemini punch above its weight class.
 * Standard turns get 0 (instant). Complex turns get thinking time.
 * The filler audio system covers the latency gap on thinking turns.
 *
 * RULE: If thinkingBudget > 0, FillerAudioManager.playImmediate()
 * MUST have already been called. Never return >0 without filler running.
 */
class ThinkingBudgetManager {
  /**
   * Calculate the appropriate thinking budget for this turn.
   * Called synchronously BEFORE the LLM call — must be fast.
   *
   * Returns 0 for most turns (ultra-fast path).
   * Returns 2000-8000 for turns that need real reasoning.
   */
  calculate(
    transcript: string,
    emotionState: EmotionState,
    callPhase: CallPhase,
    conversationHistory: GeminiMessage[],
  ): number {
    // === INSTANT PATH (budget: 0) ===
    // These turns need speed, not reasoning
    if (this.isSmallTalk(transcript)) return 0;
    if (this.isSimpleAcknowledgement(transcript)) return 0;
    if (callPhase === "WARM_OPEN") return 0;
    if (emotionState.primary === "excited" && callPhase === "DISCOVERY")
      return 0;

    // === MEDIUM THINKING (budget: 2000) ===
    // Needs some reasoning but filler can't be too long
    if (this.isObjection(transcript)) return 2000;
    if (emotionState.primary === "skeptical") return 2000;
    if (emotionState.primary === "hesitant") return 2000;
    if (callPhase === "OBJECTION_HANDLING") return 2000;

    // === DEEP THINKING (budget: 5000) ===
    // Complex questions — filler audio + "let me check that" buys full time
    if (this.isTechnicalQuestion(transcript)) return 5000;
    if (this.isCompetitorComparison(transcript)) return 5000;
    if (emotionState.primary === "frustrated") return 4000;
    if (callPhase === "CLOSING") return 4000;

    // === MAXIMUM THINKING (budget: 8000) ===
    // Only for critical moments — escalation-level complexity
    if (this.isHighStakesObjection(transcript)) return 8000;
    if (this.isBudgetNegotiation(transcript)) return 8000;

    // Default: no thinking
    return 0;
  }

  /**
   * Get the appropriate filler context for a given thinking budget.
   * Higher budget = longer, more substantive filler phrase.
   * FillerAudioManager uses this to pick the right file.
   */
  getFillerContext(budget: number): FillerContext {
    if (budget === 0) return "transition"; // "Right, and..."
    if (budget <= 2000) return "thinking"; // "Hmm..."
    if (budget <= 5000) return "technical"; // "Good question, let me check..."
    return "technical"; // "Give me just a second..."
  }

  // Detection helpers — keep these fast (no LLM calls)
  private isObjection(text: string): boolean {
    const patterns = [
      /too expensive/i,
      /can't afford/i,
      /not the right time/i,
      /already use/i,
      /need to think/i,
      /not sure/i,
      /competitor/i,
      /why should i/i,
      /prove it/i,
      /what's the roi/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  private isTechnicalQuestion(text: string): boolean {
    const patterns = [
      /how does.*work/i,
      /integrate/i,
      /api/i,
      /security/i,
      /gdpr/i,
      /compliance/i,
      /data.*stored/i,
      /uptime/i,
      /sla/i,
      /migration/i,
      /export/i,
      /import/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  private isCompetitorComparison(text: string): boolean {
    const patterns = [
      /compared to/i,
      /better than/i,
      /vs\b/i,
      /versus/i,
      /salesforce/i,
      /hubspot/i,
      /zoho/i,
      /pipedrive/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  private isHighStakesObjection(text: string): boolean {
    const patterns = [
      /cancel/i,
      /not interested/i,
      /remove.*list/i,
      /never call again/i,
      /waste of time/i,
      /lawsuit/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  private isBudgetNegotiation(text: string): boolean {
    const patterns = [
      /discount/i,
      /lower.*price/i,
      /better deal/i,
      /negotiate/i,
      /what.*best.*price/i,
      /can you do/i,
    ];
    return patterns.some((p) => p.test(text));
  }

  private isSmallTalk(text: string): boolean {
    return (
      text.trim().split(" ").length < 8 &&
      !this.isObjection(text) &&
      !this.isTechnicalQuestion(text)
    );
  }

  private isSimpleAcknowledgement(text: string): boolean {
    const acks = [
      "yes",
      "no",
      "ok",
      "okay",
      "sure",
      "right",
      "got it",
      "i see",
      "understood",
      "makes sense",
    ];
    return acks.some((a) => text.toLowerCase().trim() === a);
  }
}
```

---

## CHANGE 3: Update onUtteranceEnd to Use Thinking Budget

### File: wherever `onUtteranceEnd` is implemented in AudioPipeline

### Find this block and replace it:

```typescript
// BEFORE (original — Claude, no thinking budget):
async onUtteranceEnd(transcript: string, emotionHint: EmotionHint): Promise<void> {
  const [_, llmStream] = await Promise.all([
    this.fillerManager.playImmediate('thinking', this),
    this.llmClient.streamResponse(transcript, this.systemPrompt)
  ]);
  // ... rest of method
}
```

```typescript
// AFTER (Gemini with thinking budget):
async onUtteranceEnd(transcript: string, emotionHint: EmotionHint): Promise<void> {

  // Step 1: Calculate thinking budget BEFORE anything else (synchronous, fast)
  const thinkingBudget = this.thinkingBudgetManager.calculate(
    transcript,
    this.emotionEngine.getCurrentState(),
    this.callPhase,
    this.llmClient.getHistory()
  );

  // Step 2: Get matching filler context for this budget level
  const fillerContext = this.thinkingBudgetManager.getFillerContext(thinkingBudget);

  // Step 3: PARALLEL — filler plays instantly while Gemini thinks
  // If thinkingBudget > 0, filler audio MUST play (covers the thinking time)
  // If thinkingBudget = 0, filler still plays (covers base LLM latency)
  const [_, llmStream] = await Promise.all([
    this.fillerManager.playImmediate(fillerContext, this),
    this.llmClient.streamResponse(
      transcript,
      this.systemPrompt,
      thinkingBudget  // NEW — pass thinking budget to Gemini
    )
  ]);

  // Step 4: Check if ModelRouter wants to escalate to Claude Sonnet
  // (only on high-value close signals)
  if (this.modelRouter.shouldEscalateToClause(
    this.emotionEngine.getCurrentState(),
    this.buyingSignalDetector.getIntentScore(),
    this.callPhase
  )) {
    await this.modelRouter.escalateToClaudeSonnet(transcript, this.systemPrompt);
    return;
  }

  // Step 5: Stream TTS as before (unchanged from original)
  for await (const textChunk of llmStream) {
    if (this.crossfadeManager.isReady()) {
      await this.crossfadeManager.execute(this.currentFillerPlayback, llmStream, this);
      break;
    }
  }
}
```

---

## CHANGE 4: Add PreCallBrainService (New Service — Runs Before Every Call)

### Add this new file: `src/services/pre-call-brain.service.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";

/**
 * Runs BEFORE the call connects. Uses Claude Sonnet 4.6 to generate
 * the emotional playbook and personalization brief that Gemini executes.
 *
 * This is the "Claude thinks, Gemini talks" architecture.
 * Claude's superior emotional intelligence generates the strategy.
 * Gemini's speed and low cost executes it in real-time.
 *
 * TIMING: Call this 30-60 seconds before the scheduled call time.
 * The brief is generated async — call connects only after brief is ready.
 * Worst case: brief generation fails → use a minimal default brief.
 * Never delay a call because of pre-call brief generation failure.
 *
 * COST: ~$0.008 per call (Claude Sonnet input/output for brief generation)
 * This is fixed cost regardless of call length — worth every penny.
 */
class PreCallBrainService {
  private claude: Anthropic;

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Generate the complete emotional playbook for this call.
   * Returns a structured PreCallBrief that becomes the Gemini system prompt.
   *
   * Uses Claude Sonnet 4.6 — NOT Haiku. The quality difference matters here.
   * This brief determines the entire emotional arc of the call.
   */
  async generateBrief(
    lead: Lead,
    product: Product,
    campaign: Campaign,
    previousCalls: Call[],
  ): Promise<PreCallBrief> {
    const prompt = this.buildBriefPrompt(
      lead,
      product,
      campaign,
      previousCalls,
    );

    const response = await this.claude.messages.create({
      model: "claude-sonnet-4-20250514", // Always Sonnet — not Haiku
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: `You are a world-class sales coach preparing a briefing for an AI sales agent.
      
You have deep expertise in emotional intelligence, persuasion psychology, and sales.
Your job is to analyze the customer data provided and write a precise, actionable brief
that tells the AI exactly how to approach this specific person.

Be specific and concrete. Vague instructions are useless.
Write as if briefing a highly skilled human salesperson before a critical call.

Respond ONLY with a valid JSON object matching the PreCallBrief schema.
No markdown, no preamble, no explanation — only the JSON object.`,
    });

    const briefText =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    try {
      const brief = JSON.parse(briefText) as PreCallBrief;
      brief.generatedAt = new Date();
      brief.leadId = lead.id;
      return brief;
    } catch {
      // Brief generation failed — use safe minimal brief
      return this.buildMinimalBrief(lead, product);
    }
  }

  private buildBriefPrompt(
    lead: Lead,
    product: Product,
    campaign: Campaign,
    previousCalls: Call[],
  ): string {
    return `
CUSTOMER DATA:
Name: ${lead.firstName} ${lead.lastName}
Company: ${lead.company}
Role: ${lead.role}
Country: ${lead.countryCode}
Language: ${lead.languagePrimary}
Lead Temperature: ${lead.leadTemperature}
Lead Score: ${lead.leadScore}/100

BEHAVIORAL SIGNALS:
Pricing page visits: ${lead.pricingPageViews}
Demo watched: ${lead.demoWatched}
Emails opened: ${lead.emailsOpened}
Pages visited: ${JSON.stringify(lead.pagesVisited?.slice(-5))}

PERSONAL DATA CAPTURED IN PREVIOUS INTERACTIONS:
${JSON.stringify(lead.zeroPartyData)}

PREVIOUS CALL HISTORY:
${previousCalls
  .map(
    (c) => `
  Date: ${c.startedAt}
  Outcome: ${c.outcome}
  Objections raised: ${c.objectionsRaised?.join(", ")}
  Buying signals: ${c.buyingSignalsDetected?.join(", ")}
  Emotional arc: ${JSON.stringify(c.emotionArc?.slice(0, 3))}
  Personal details shared: ${JSON.stringify(c.personalDataCaptured)}
`,
  )
  .join("\n")}

PRODUCT BEING SOLD:
${product.name}: ${product.description}
Key benefits: ${product.keyBenefits?.join(", ")}
Pricing: ${JSON.stringify(product.pricing)}

CAMPAIGN CONTEXT:
${campaign.name}: ${campaign.callScriptTemplate?.substring(0, 200)}

Generate a PreCallBrief JSON with these fields:
{
  "customerName": "first name only",
  "openingLine": "exact first sentence AI should say — personal, warm, references something real",
  "personalMemory": "reference to something personal from previous interaction if exists",
  "predictedPrimaryConcern": "the ONE thing most likely blocking them",
  "predictedSecondaryObjection": "backup objection to prepare for",
  "emotionalApproach": "2-3 sentences on HOW to make this person feel comfortable",
  "culturalNotes": "specific cultural rules for this person's background",
  "keyValueProposition": "the ONE benefit most relevant to THIS person's situation",
  "competitorToAddress": "competitor they likely considered and how to handle it",
  "personalHook": "personal detail to reference that will create connection",
  "closingStrategy": "recommended micro-commitment to attempt",
  "doList": ["3-4 specific DOs for this call"],
  "dontList": ["3-4 specific DON'Ts for this call"],
  "systemPromptInjection": "full paragraph to inject into Gemini system prompt — emotionally rich, specific to this person"
}
    `;
  }

  /**
   * Convert a PreCallBrief into the full Gemini system prompt.
   * This is what gets passed to GeminiStreamingClient.streamResponse().
   *
   * The brief's systemPromptInjection becomes the core of the prompt.
   * Wrapped with standard agent persona, product details, and rules.
   */
  buildGeminiSystemPrompt(
    brief: PreCallBrief,
    product: Product,
    culturalProfile: CulturalProfile,
  ): string {
    return `
You are ${process.env.AGENT_NAME}, a sales representative at ${process.env.COMPANY_NAME}.
This is a PHONE CALL. Respond as you would speak aloud — naturally, conversationally.

## THIS CUSTOMER
${brief.systemPromptInjection}

Personal memory to use: ${brief.personalMemory}
Their most likely concern: ${brief.predictedPrimaryConcern}
Cultural context: ${brief.culturalNotes}

## YOUR OPENING
Your first line should be: "${brief.openingLine}"

## PRODUCT
${product.name}: ${product.keyBenefits?.slice(0, 3).join(", ")}
Pricing: ${JSON.stringify(product.pricing)}
Key differentiator vs ${brief.competitorToAddress}: focus on ${brief.keyValueProposition}

## CULTURAL RULES FOR THIS CALL
${culturalProfile.rules}
${culturalProfile.doNotDo}

## YOUR APPROACH THIS CALL
DO: ${brief.doList?.join(" | ")}
DON'T: ${brief.dontList?.join(" | ")}
Closing goal: ${brief.closingStrategy}

## VOICE RULES (NEVER BREAK THESE)
- Contractions always: don't, I'll, we've, that's, it's
- Never say: "Certainly!", "Absolutely!", "Of course!" — AI tells
- Short sentences when excited. Longer when explaining.
- Use "honestly", "look", "here's the thing" for sincerity
- Occasionally trail off... then continue
- Maximum 3 sentences before pausing for response
- After asking any question — STOP. Do not add more words.
- After price reveal — SILENCE. Never fill it.

## CALL PHASES
Track your phase: WARM_OPEN → DISCOVERY → INSIGHT → SOFT_PITCH → 
OBJECTION_HANDLING → MICRO_CLOSE → NEXT_STEP
Never rush. Stay in DISCOVERY as long as customer needs.

## CURRENT CONVERSATION
(conversation history managed externally — injected per turn)
    `.trim();
  }

  private buildMinimalBrief(lead: Lead, product: Product): PreCallBrief {
    return {
      leadId: lead.id,
      generatedAt: new Date(),
      customerName: lead.firstName,
      openingLine: `Hi ${lead.firstName}, how are you doing today?`,
      personalMemory: "",
      predictedPrimaryConcern: "unclear — discover during call",
      predictedSecondaryObjection: "price",
      emotionalApproach: "Warm, curious, patient. Ask questions first.",
      culturalNotes: `Standard approach for ${lead.countryCode}`,
      keyValueProposition: product.keyBenefits?.[0] || product.name,
      competitorToAddress: "general market",
      personalHook: "",
      closingStrategy: "Ask for a follow-up demo",
      doList: [
        "Listen more than talk",
        "Ask about their situation",
        "Be patient",
      ],
      dontList: ["Rush to pitch", "Use jargon", "Oversell"],
      systemPromptInjection: `You are calling ${lead.firstName} at ${lead.company}. Be warm and curious. Discover their needs before pitching.`,
    };
  }
}

interface PreCallBrief {
  leadId: string;
  generatedAt: Date;
  customerName: string;
  openingLine: string;
  personalMemory: string;
  predictedPrimaryConcern: string;
  predictedSecondaryObjection: string;
  emotionalApproach: string;
  culturalNotes: string;
  keyValueProposition: string;
  competitorToAddress: string;
  personalHook: string;
  closingStrategy: string;
  doList: string[];
  dontList: string[];
  systemPromptInjection: string;
}
```

---

## CHANGE 5: Add ModelRouter (High-Value Close Escalation)

### Add this new file: `src/llm/model-router.ts`

```typescript
/**
 * Routes LLM calls between Gemini Flash-Lite (default) and
 * Claude Sonnet 4.6 (high-stakes escalation).
 *
 * 99% of the call runs on Gemini (cheap + fast).
 * When a genuine closing opportunity is detected, escalate to Claude
 * for the final 3-5 minutes — zero mistakes when money is on the table.
 *
 * Cost impact: Adding Claude for closing adds ~$0.05-0.08 per escalated call.
 * Only escalate on deal value > threshold to keep economics sensible.
 */
class ModelRouter {
  private escalated: boolean = false;
  private claudeClient: ClaudeSonnetClient | null = null;
  private dealValueThreshold: number;

  constructor(dealValueThreshold: number = 500) {
    // Only escalate for deals above this value ($)
    this.dealValueThreshold = dealValueThreshold;
  }

  /**
   * Check if this turn should be escalated to Claude Sonnet.
   * Called on every turn — must be synchronous and fast.
   *
   * Escalation is STICKY — once escalated, stays on Claude for the call.
   * Never switch back to Gemini mid-close (jarring tone change).
   */
  shouldEscalateToClause(
    emotionState: EmotionState,
    buyingIntentScore: number,
    callPhase: CallPhase,
    estimatedDealValue?: number,
  ): boolean {
    // Already escalated — stay on Claude
    if (this.escalated) return true;

    // Check deal value threshold
    if (estimatedDealValue && estimatedDealValue < this.dealValueThreshold) {
      return false; // Not worth the cost for small deals
    }

    // Strong buying signal + closing phase = escalate
    if (buyingIntentScore >= 75 && callPhase === "MICRO_CLOSE") return true;

    // Customer explicitly asked about next steps = escalate
    if (emotionState.primary === "buying" && buyingIntentScore >= 60)
      return true;

    return false;
  }

  /**
   * Execute a turn on Claude Sonnet instead of Gemini.
   * Called when shouldEscalateToClause() returns true.
   *
   * Initializes Claude client lazily — only pay for it if actually needed.
   * Carries full conversation history from Gemini for continuity.
   */
  async escalateToClaudeSonnet(
    transcript: string,
    systemPrompt: string,
    conversationHistory: Message[],
  ): AsyncGenerator<string> {
    if (!this.claudeClient) {
      this.claudeClient = new ClaudeSonnetClient(
        process.env.ANTHROPIC_API_KEY!,
      );
      this.escalated = true;
    }

    // Pass full conversation history for continuity
    // Customer should not feel any change in the agent
    return this.claudeClient.streamResponse(
      transcript,
      systemPrompt,
      conversationHistory,
    );
  }

  isEscalated(): boolean {
    return this.escalated;
  }

  reset(): void {
    this.escalated = false;
    this.claudeClient = null;
  }
}

/**
 * Claude Sonnet client — used ONLY for high-value closing turns.
 * Same interface as GeminiStreamingClient for drop-in compatibility.
 */
class ClaudeSonnetClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamResponse(
    transcript: string,
    systemPrompt: string,
    history: Message[],
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      stream: true,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: transcript },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
```

---

## CHANGE 6: Add InworldTTSClient (Benchmark vs ElevenLabs)

### Add this new file: `src/tts/inworld-tts-client.ts`

```typescript
/**
 * Inworld AI TTS client — benchmark this against ElevenLabs in production.
 *
 * Inworld AI is reportedly the lowest-latency TTS option in 2026,
 * built specifically for real-time voice agents and games.
 *
 * Target first chunk: < 150ms (vs ElevenLabs Turbo: ~200ms)
 *
 * HOW TO BENCHMARK:
 * Run both clients on identical text for 100 calls each.
 * Measure: first_chunk_ms, total_stream_ms, naturalness_score (human eval).
 * Keep whichever scores better on naturalness at acceptable latency.
 *
 * This client has the SAME interface as ElevenLabsStreamingClient
 * so it's a drop-in replacement — no other code changes needed.
 */
class InworldTTSClient {
  private apiKey: string;
  private voiceMap: Record<string, string> = {};

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Stream TTS audio — identical interface to ElevenLabsStreamingClient.
   * Drop-in replacement — AudioPipeline calls this without knowing which TTS is active.
   */
  async *streamFromGenerator(
    textGenerator: AsyncGenerator<string>,
    voiceId: string,
    toneConfig: ToneConfig,
  ): AsyncGenerator<Buffer> {
    for await (const text of textGenerator) {
      if (!text.trim()) continue;

      const response = await fetch("https://api.inworld.ai/v1/tts/stream", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId,
          outputFormat: "mulaw_8000", // Match Twilio format
          speed: toneConfig.speedMultiplier,
          stability: toneConfig.stability,
        }),
      });

      if (!response.body) continue;

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield Buffer.from(value);
      }
    }
  }

  getVoiceForLanguage(language: string): string {
    return this.voiceMap[language] || this.voiceMap["en"] || "default";
  }

  async prewarmConnection(language: string): Promise<void> {
    // Send a tiny warm-up request to establish connection
    const warmupGen = async function* () {
      yield "Hello.";
    };
    const stream = this.streamFromGenerator(
      warmupGen(),
      this.getVoiceForLanguage(language),
      { speedMultiplier: 1.0, stability: 0.5 } as ToneConfig,
    );
    // Drain one chunk then discard
    await stream.next();
  }
}

/**
 * TTS Factory — selects which TTS client to use.
 * Controlled by environment variable TTS_PROVIDER.
 * Allows A/B testing without code changes.
 */
function createTTSClient(provider: "elevenlabs" | "inworld"): TTSClient {
  if (provider === "inworld") {
    return new InworldTTSClient(process.env.INWORLD_API_KEY!);
  }
  return new ElevenLabsStreamingClient(process.env.ELEVENLABS_API_KEY!);
}

// In AudioPipeline constructor, replace:
// BEFORE: this.ttsClient = new ElevenLabsStreamingClient(apiKey);
// AFTER:  this.ttsClient = createTTSClient(process.env.TTS_PROVIDER as any || 'elevenlabs');
```

---

## CHANGE 7: Update Timeout Values

### Find all timeout constants and update them

```typescript
// BEFORE (tuned for Claude):
const LLM_TIMEOUTS = {
  firstToken: 10000, // Claude could be slow
  totalResponse: 30000,
};

// AFTER (tuned for Gemini — much faster):
const LLM_TIMEOUTS = {
  // Gemini Flash-Lite: budget=0 → first token in ~350-400ms
  // With thinking budget: up to 8000ms thinking + ~400ms response = allow 10s
  firstToken: thinkingBudget > 0 ? 10000 : 1500,
  totalResponse: thinkingBudget > 0 ? 15000 : 8000,

  // If Gemini times out, fallback response plays immediately
  fallbackTriggerMs: thinkingBudget > 0 ? 12000 : 2000,
};

// Update ElevenLabs timeout (unchanged):
const TTS_TIMEOUTS = {
  firstChunk: 3000, // Same as before
  totalStream: 15000,
};

// Update Deepgram timeout (unchanged):
const STT_TIMEOUTS = {
  connect: 5000,
  reconnect: 2000,
};
```

---

## CHANGE 8: Add Gemini Live API Option (Optional — Native Audio Mode)

### Add this new file: `src/audio/gemini-live-client.ts`

```typescript
/**
 * OPTIONAL: Gemini Live API — native audio processing.
 *
 * When enabled, this REPLACES the Deepgram STT + Gemini LLM combination
 * with a single Gemini API call that handles both STT and LLM in one hop.
 *
 * Benefits:
 * - Eliminates Deepgram cost (~$0.004/min saved)
 * - Removes one network hop (~100-150ms latency saved)
 * - Native audio = Gemini can detect sighs, breath, tone directly
 *   (the raw audio emotion signals your EmotionDetector wants)
 *
 * Trade-off:
 * - Less control over STT vs Deepgram
 * - Deepgram has better accuracy on accented English currently
 * - Recommendation: Test both and measure accuracy on your specific markets
 *
 * ENABLE WITH: AUDIO_MODE=gemini_live in environment variables
 * DISABLE WITH: AUDIO_MODE=deepgram (default — uses separate Deepgram + Gemini)
 *
 * When AUDIO_MODE=gemini_live, AudioPipeline skips DeepgramStreamingClient
 * entirely and routes audio directly to this client instead.
 */
class GeminiLiveClient {
  private apiKey: string;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Open a Gemini Live session for this call.
   * Establishes persistent WebSocket to Gemini Live API.
   * Call once at start of call, keep open throughout.
   */
  async openSession(systemPrompt: string, language: string): Promise<void> {
    // Implementation: Gemini Live API WebSocket connection
    // See: https://ai.google.dev/gemini-api/docs/live
    // Session config includes: system prompt, language, audio format

    this.ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`,
    );

    await this.sendSetupMessage(systemPrompt, language);
  }

  /**
   * Feed raw audio directly to Gemini — no STT step needed.
   * Gemini processes audio natively.
   * Emits events:
   *   'transcript'     → customer speech transcribed
   *   'response_audio' → AI response audio chunk (skip TTS — Gemini generates it)
   *   'emotion_hint'   → Gemini's native emotion detection from audio
   *   'turn_end'       → customer finished speaking
   */
  feedAudio(chunk: Buffer): void {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        realtime_input: {
          media_chunks: [
            {
              data: chunk.toString("base64"),
              mime_type: "audio/pcm;rate=16000",
            },
          ],
        },
      }),
    );
  }

  /**
   * When using Gemini Live, TTS is also handled by Gemini.
   * The response comes back as audio, not text.
   * This means ElevenLabs/Inworld TTS is NOT used in this mode.
   *
   * Trade-off: Less voice customization, but fewer hops = lower latency.
   * Gemini Live voice quality has improved significantly in 2026.
   */
  onResponseAudio(callback: (audioChunk: Buffer) => void): void {
    // Attach callback for response audio chunks from Gemini
  }

  async closeSession(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
  }

  private async sendSetupMessage(
    systemPrompt: string,
    language: string,
  ): Promise<void> {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        setup: {
          model: "models/gemini-2.5-flash-live",
          generation_config: {
            response_modalities: ["AUDIO"],
            speech_config: {
              language_code: language,
              voice_config: { prebuilt_voice_config: { voice_name: "Charon" } },
            },
          },
          system_instruction: { parts: [{ text: systemPrompt }] },
        },
      }),
    );
  }
}

// In AudioPipeline constructor:
// if (process.env.AUDIO_MODE === 'gemini_live') {
//   this.geminiLiveClient = new GeminiLiveClient(process.env.GEMINI_API_KEY);
//   // Skip: this.deepgramClient = new DeepgramStreamingClient(...)
//   // Skip: this.ttsClient = createTTSClient(...)
//   // Gemini Live handles both STT and TTS natively
// }
```

---

## CHANGE 9: Update Post-Call Processing to Use Flash-Lite

### Find where post-call CRM updates and reports are generated

```typescript
// BEFORE: Used Claude or same LLM as live call
// AFTER: Use cheapest possible model — no latency requirements here

class PostCallProcessor {
  // Use Gemini Flash-Lite for all post-call work
  // Cost: ~$0.002 per call for all post-call processing
  private geminiLite = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  async generateCallReport(call: CompletedCall): Promise<CallReport> {
    const model = this.geminiLite.getGenerativeModel({
      model: "gemini-2.5-flash-lite-preview-06-17",
      generationConfig: {
        responseMimeType: "application/json", // Force JSON output
        thinkingConfig: { thinkingBudget: 1024 }, // Small budget — structured task
      },
    });

    // Extract: emotion arc, objections, buying signals, CRM fields, next action
    // All structured extraction — Flash-Lite handles this perfectly
    // ...
  }
}
```

---

## CHANGE 10: Update Environment Variables

### Update `.env.example` — add new vars, keep existing ones

```bash
# === EXISTING — KEEP UNCHANGED ===
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
DATABASE_URL=
REDIS_URL=

# === CHANGED: LLM Keys ===
# Remove or keep ANTHROPIC_API_KEY — now used for pre-call brief only
ANTHROPIC_API_KEY=          # Claude Sonnet — pre-call brief + high-value closing

# NEW: Gemini is now the primary live call LLM
GEMINI_API_KEY=             # Gemini 2.5 Flash-Lite — live conversations

# === NEW: Feature Flags ===
# Audio mode: 'deepgram' (default) or 'gemini_live' (experimental)
AUDIO_MODE=deepgram

# TTS provider: 'elevenlabs' (default) or 'inworld' (benchmark)
TTS_PROVIDER=elevenlabs

# Deal value threshold for Claude escalation ($)
CLAUDE_ESCALATION_THRESHOLD=500

# Inworld AI (optional — for TTS benchmarking)
INWORLD_API_KEY=

# Agent identity
AGENT_NAME=Sarah
COMPANY_NAME=YourCompany
```

---

## CHANGE 11: Update Package Dependencies

### Run these commands

```bash
# ADD new dependencies
npm install @google/generative-ai   # Gemini SDK

# KEEP existing dependencies (do not remove)
npm install @anthropic-ai/sdk       # Still needed for pre-call + closing
npm install @deepgram/sdk           # Still needed unless AUDIO_MODE=gemini_live
npm install elevenlabs              # Still needed unless TTS_PROVIDER=inworld

# No other dependency changes needed
```

---

## WHAT COPILOT MUST NOT CHANGE

When working in this codebase, Copilot must preserve these exactly:

```
✅ PRESERVE — DO NOT TOUCH:
  - All EmotionDetector logic and detection thresholds
  - All FrustrationMonitor trigger phrases and soften responses
  - All BuyingSignalDetector phrases and weights
  - All ToneAdaptationEngine emotion→config mappings
  - All ElevenLabsStreamingClient logic (keep alongside Inworld)
  - All FillerAudioManager filler library and selection logic
  - All BackchannelEngine timing rules
  - All CrossfadeManager audio transition logic
  - All SentencePredictor pre-warming logic
  - All database schema and migrations
  - All Twilio WebSocket audio handling
  - All mulaw encoding/decoding
  - All state machine transitions
  - All compliance/DNC checking logic
  - All CRM sync logic
  - All warm handoff logic
  - All cultural profile definitions
  - All API endpoint definitions
```

---

## MIGRATION TESTING CHECKLIST

After making these changes, verify in order:

```
□ 1. GeminiStreamingClient returns streaming text (unit test)
□ 2. ThinkingBudgetManager returns 0 for small talk (unit test)
□ 3. ThinkingBudgetManager returns >0 for objections (unit test)
□ 4. PreCallBrainService generates valid JSON brief (integration test)
□ 5. onUtteranceEnd parallel execution still works (no sequential awaits)
□ 6. Filler audio plays before Gemini responds (timing test)
□ 7. Full call flow: dial → speak → filler → Gemini response → audio plays
□ 8. Thinking toggle: objection turn takes longer but filler covers gap
□ 9. ModelRouter escalates at intent score > 75 (unit test)
□ 10. Claude Sonnet responds in escalated turns (integration test)
□ 11. Post-call report generates with Flash-Lite (integration test)
□ 12. TTS_PROVIDER=inworld switches client without other changes
□ 13. AUDIO_MODE=gemini_live skips Deepgram (feature flag test)
□ 14. All emotion detection still fires correctly (regression test)
□ 15. Full 5-minute test call with real phone — measure perceived latency
```
