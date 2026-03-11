# Voice Personas & Persona Intelligence Engine — GitHub Copilot Instructions

# File: .github/instructions/voice-personas.instructions.md

# Apply to: **/personas/**, **/_persona_.ts, **/_voice-switch_.ts,

# **/_persona-switch_.ts, **/_voice-persona_.ts

---

## WHAT VOICE PERSONAS ARE

```
A voice persona is NOT just an ElevenLabs voice ID.
It is a complete sales identity — a character with:

  → A name customers remember and ask for by name
  → A voice trained in specific languages
  → A distinct personality and communication style
  → A speciality (rapport / technical / closing / enterprise)
  → Emotion-specific voice parameter sets
  → Performance data from the central brain
  → A track record of what it converts best

Customers interact with personas as if they are real colleagues.
"Can I speak to James?" is a valid customer request.
The system honours it, switches seamlessly, and remembers the preference.

The magic: same underlying AI brain, different voice and personality.
Sarah and James share the same intelligence — different face.
```

---

## THE PERSONA ROSTER CONCEPT

```
You build a roster of named personas — typically 3-6.
Each covers different markets, languages, or customer types.

EXAMPLE ROSTER:

  Sarah   → Warm, relationship-first, English (IN/UK), Hindi
             Best for: Indian SMB founders, emotional buyers
             Speciality: Building trust, long rapport calls

  James   → Formal, data-driven, English (UK/US), German
             Best for: Enterprise CFOs, technical buyers, UK market
             Speciality: Authority, analytical, enterprise closing

  Priya   → Warm + culturally fluent, English (IN), Hindi, Tamil
             Best for: Indian market — any segment
             Speciality: Local cultural nuance, language switching

  Amir    → Respectful, relationship-first, English, Arabic
             Best for: UAE/Gulf market
             Speciality: Relationship-first Gulf business culture

Each persona has its OWN:
  - ElevenLabs voice ID
  - Personality description (AI reads this to "become" the persona)
  - Language capabilities with quality ratings
  - Emotion voice parameter overrides
  - Handoff phrases (what they say when switching in/out)
  - Performance history tracked by central brain
```

---

## HOW PERSONA SELECTION WORKS — 4 LAYERS

```
LAYER 1 — STORED PREFERENCE (highest priority)
  Customer asked for James on call 2?
  → All future calls start with James automatically
  → Loaded from lead_persona_preferences table
  → Never overridden by the brain

LAYER 2 — LANGUAGE MATCH
  Customer's phone number is +91 (India)
  → Score all personas by Hindi/Tamil capability
  → Priya scores 5/5 for Hindi, Sarah scores 3/5
  → Priya gets language match boost

LAYER 3 — SEGMENT PERFORMANCE (central brain)
  Lead: IN / SaaS / small / founder
  → Brain: Priya converts this segment at 48%, Sarah at 31%
  → Priya recommended with confidence 0.74

LAYER 4 — REGIONAL DEFAULT (fallback)
  No segment data yet (new market, few calls)
  → Use regional default from regional_intelligence table
  → India default: Priya
  → UK default: James
  → UAE default: Amir

LAYER 5 — SYSTEM DEFAULT (absolute fallback)
  No regional default set
  → Use persona marked is_default = TRUE in voice_personas table
```

---

## MID-CALL PERSONA SWITCHING — THE 5 TRIGGERS

```
TRIGGER 1 — CUSTOMER EXPLICIT REQUEST
  "Can I speak to someone else?"
  "Is there a James I can talk to?"
  "Can you get me your manager?"
  → Immediate switch — customer preference always honoured
  → PersonaSwitchManager executes seamlessly

TRIGGER 2 — LANGUAGE SWITCH
  Customer starts speaking Hindi mid-call
  Current persona doesn't support Hindi well (quality < 4)
  → Switch to Hindi-capable persona
  → Crossfade seamlessly — feels like colleague transfer

TRIGGER 3 — EMOTION-TRIGGERED
  Frustration score exceeds 0.80
  Current persona's frustration recovery rate < 40%
  → Switch to calmer, more reassuring voice
  → Brain checks: which available persona handles frustrated
    leads in this segment best?

TRIGGER 4 — TECHNICAL ESCALATION
  Customer asks deep technical/integration question
  Current persona is rapport-specialist (Sarah)
  → Switch to analytical persona (James)
  → Framing: "Let me bring in our technical colleague"

TRIGGER 5 — CENTRAL BRAIN PATTERN MATCH
  Brain has learned: "For IN enterprise leads who raise pricing
  objection on call 2, switching from Sarah to James at that
  moment increases conversion by 23%"
  → Brain proactively recommends switch mid-call
  → PersonaSwitchManager evaluates and executes
```

---

## THE SEAMLESS SWITCH — AUDIO SEQUENCE

```
WRONG (jarring, kills trust):
  [Sarah] "...the pricing is—"
  [500ms silence]
  [James] "Hello, this is James"
  Customer: "Something is wrong here"

RIGHT (natural, feels like a real team):
  [Sarah] "Actually, let me bring in James — he knows
           the technical side much better than I do"
  [150ms filler audio — "one moment"]
  [James fading in from 0 volume, 300ms crossfade]
           "Hi — James here. Sarah gave me the context.
            So on the integration question..."
  Customer: "Oh, she transferred me to a colleague — normal"

THE THREE REQUIREMENTS:
  1. Current persona sets up the switch with a natural line
     (never just cuts — always introduces the reason)
  2. Short filler audio covers the audio gap (same CrossfadeManager
     used for filler→TTS — reuse exactly)
  3. New persona opens by acknowledging context
     (never re-introduces from scratch — that's a tell)
```

---

## FILE STRUCTURE

```
/src/personas/
  persona-registry.service.ts       ← loads/manages all active personas
  persona-selector.service.ts       ← picks best persona for a call
  persona-switch-manager.ts         ← executes mid-call voice switches
  persona-switch-detector.ts        ← detects when a switch is needed
  persona-intelligence-engine.ts   ← brain connection, learning loop
  persona-tts-factory.ts            ← creates TTS client per persona
  persona-language-router.ts        ← handles language-triggered switches
```

---

## CLASS 1: PersonaRegistry

```typescript
/**
 * Loads and caches all active voice personas.
 * Single source of truth for the persona roster.
 *
 * Personas are loaded from the database (not .env or code).
 * Changes to personas (new voice ID, new language, new params)
 * take effect on next call without server restart.
 *
 * Cache TTL: 5 minutes — short enough to pick up admin changes,
 * long enough to not hammer the database.
 */
class PersonaRegistry {
  private cache: Map<string, VoicePersona> = new Map();
  private cacheExpiry: Date = new Date(0);

  async getAll(): Promise<VoicePersona[]> {
    await this.refreshIfStale();
    return Array.from(this.cache.values());
  }

  async getById(id: string): Promise<VoicePersona | null> {
    await this.refreshIfStale();
    return this.cache.get(id) || null;
  }

  async getByName(name: string): Promise<VoicePersona | null> {
    await this.refreshIfStale();
    return (
      Array.from(this.cache.values()).find(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      ) || null
    );
  }

  async getDefault(): Promise<VoicePersona> {
    await this.refreshIfStale();
    const defaultPersona = Array.from(this.cache.values()).find(
      (p) => p.isDefault,
    );
    if (!defaultPersona) throw new Error("No default persona configured");
    return defaultPersona;
  }

  private async refreshIfStale(): Promise<void> {
    if (new Date() < this.cacheExpiry) return;

    const personas = await db.voicePersonas.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    this.cache.clear();
    for (const p of personas) {
      this.cache.set(p.id, p);
    }

    // Cache for 5 minutes
    this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
  }
}
```

---

## CLASS 2: PersonaSelector

```typescript
/**
 * Selects the best persona before a call starts.
 * Called by PreCallBrainService — result included in call brief.
 *
 * Returns the persona ID + reason for selection.
 * PreCallBrainService passes this to AudioPipeline which
 * initialises the correct TTS client before the call connects.
 */
class PersonaSelector {
  async selectFor(
    lead: Lead,
    availablePersonas: VoicePersona[],
  ): Promise<PersonaSelection> {
    // LAYER 1: Stored preference
    const pref = await db.leadPersonaPreferences.findUnique({
      where: { leadId: lead.id },
      include: { preferredPersona: true },
    });

    if (pref?.preferredPersonaId) {
      const preferred = availablePersonas.find(
        (p) => p.id === pref.preferredPersonaId,
      );
      if (preferred) {
        return {
          persona: preferred,
          reason: "stored_customer_preference",
          confidence: 1.0,
          note: `Customer previously requested ${preferred.name}`,
        };
      }
    }

    // Score all personas across layers 2-4
    const scores = await Promise.all(
      availablePersonas.map(async (p) => ({
        persona: p,
        languageScore: this.scoreLanguageMatch(lead, p),
        segmentScore: await this.scoreSegmentPerformance(lead, p),
        regionalScore: await this.scoreRegionalMatch(lead, p),
      })),
    );

    // Weighted combination
    const weighted = scores.map((s) => ({
      persona: s.persona,
      totalScore:
        s.languageScore * 0.3 + s.segmentScore * 0.5 + s.regionalScore * 0.2,
      breakdown: s,
    }));

    weighted.sort((a, b) => b.totalScore - a.totalScore);
    const best = weighted[0];

    return {
      persona: best.persona,
      reason: this.describeReason(best),
      confidence: best.totalScore,
      alternatives: weighted.slice(1, 3).map((w) => w.persona),
    };
  }

  private scoreLanguageMatch(lead: Lead, persona: VoicePersona): number {
    const leadLang = this.inferLeadLanguage(lead);
    const supported = persona.supportedLanguages as LanguageEntry[];

    const match = supported.find(
      (l) => l.code === leadLang || l.code.startsWith(leadLang.split("-")[0]),
    );

    if (!match) return 0;
    return match.quality / 5; // quality is 1-5, normalise to 0-1
  }

  private async scoreSegmentPerformance(
    lead: Lead,
    persona: VoicePersona,
  ): Promise<number> {
    const perf = await db.personaSegmentPerformance.findFirst({
      where: {
        personaId: persona.id,
        OR: [
          {
            countryCode: lead.countryCode,
            industry: lead.industry,
          },
          {
            countryCode: lead.countryCode,
            industry: null,
          },
          {
            countryCode: null,
          },
        ],
      },
      orderBy: [
        { countryCode: "desc" }, // More specific first
        { industry: "desc" },
        { confidence_score: "desc" },
      ],
    });

    if (!perf || perf.totalCalls < 10) return 0.5; // neutral if no data
    return Math.min(perf.conversionRate / 100, 1.0);
  }

  private async scoreRegionalMatch(
    lead: Lead,
    persona: VoicePersona,
  ): Promise<number> {
    const bestRegions = persona.bestRegions as string[];
    return bestRegions.includes(lead.countryCode) ? 1.0 : 0.3;
  }

  private inferLeadLanguage(lead: Lead): string {
    if (lead.preferredLanguage) return lead.preferredLanguage;
    // Infer from country code
    const defaults: Record<string, string> = {
      IN: "en-IN",
      GB: "en-GB",
      US: "en-US",
      AE: "en",
      DE: "de",
      FR: "fr",
    };
    return defaults[lead.countryCode] || "en";
  }
}
```

---

## CLASS 3: PersonaSwitchDetector

```typescript
/**
 * Monitors the live call and decides if a persona switch is needed.
 * Called after every customer utterance — must be synchronous and fast.
 *
 * Returns a switch recommendation or null.
 * If recommendation returned, PersonaSwitchManager executes the switch.
 *
 * PRIORITY ORDER (highest to lowest):
 *   1. Explicit customer request (always honour)
 *   2. Language switch (customer changed language)
 *   3. Frustration threshold exceeded
 *   4. Technical escalation needed
 *   5. Central brain pattern match
 */
class PersonaSwitchDetector {
  // Phrases that explicitly request a different voice
  private readonly EXPLICIT_REQUEST_PATTERNS = [
    /can i (speak|talk) to (someone else|another|a different)/i,
    /is there (a |another |someone )(james|sarah|priya|amir|\w+)/i,
    /can you (get|transfer|connect) me (to|with)/i,
    /i('d like| want) to (speak|talk) to (someone|a person)/i,
    /can i (speak|talk) to (your )?manager/i,
    /is there (anyone|somebody) else/i,
    /someone more (senior|technical|experienced)/i,
  ];

  // Technical question signals
  private readonly TECHNICAL_SIGNALS = [
    /api|integration|webhook|sdk|endpoint/i,
    /how does (it|this) (connect|integrate|work with)/i,
    /technical|architecture|infrastructure|database/i,
    /compliance|gdpr|iso|soc2|security|encryption/i,
    /migration|import|export|data transfer/i,
  ];

  /**
   * Main detection method — called after every utterance.
   * Returns null if no switch needed.
   */
  detect(
    transcript: string,
    currentPersona: VoicePersona,
    callContext: LiveCallContext,
    availablePersonas: VoicePersona[],
  ): SwitchTrigger | null {
    // Priority 1: Explicit request
    const explicitRequest = this.detectExplicitRequest(transcript);
    if (explicitRequest) {
      return {
        type: "customer_request",
        priority: 100,
        detail: `Customer said: "${transcript.substring(0, 80)}"`,
        targetPersonaHint: this.extractRequestedName(transcript),
      };
    }

    // Priority 2: Language switch
    const languageSwitch = this.detectLanguageSwitch(
      transcript,
      currentPersona,
      callContext.detectedLanguage,
    );
    if (languageSwitch) return languageSwitch;

    // Priority 3: Frustration
    if (
      callContext.emotionState.frustrationScore > 0.8 &&
      currentPersona.speciality !== "calm_reassuring" &&
      callContext.callDurationSeconds > 60
      // Don't switch in first minute — let persona settle
    ) {
      return {
        type: "frustration_recovery",
        priority: 70,
        detail: `Frustration score: ${callContext.emotionState.frustrationScore}`,
      };
    }

    // Priority 4: Technical escalation
    if (
      this.TECHNICAL_SIGNALS.some((p) => p.test(transcript)) &&
      currentPersona.speciality !== "technical" &&
      currentPersona.speciality !== "enterprise"
    ) {
      return {
        type: "technical_escalation",
        priority: 60,
        detail:
          "Technical question detected, current persona is not technical specialist",
      };
    }

    return null;
  }

  private detectExplicitRequest(transcript: string): boolean {
    return this.EXPLICIT_REQUEST_PATTERNS.some((p) => p.test(transcript));
  }

  private detectLanguageSwitch(
    transcript: string,
    currentPersona: VoicePersona,
    detectedLanguage: string,
  ): SwitchTrigger | null {
    if (!detectedLanguage) return null;

    const supported = currentPersona.supportedLanguages as LanguageEntry[];
    const currentQuality =
      supported.find(
        (l) =>
          l.code === detectedLanguage ||
          detectedLanguage.startsWith(l.code.split("-")[0]),
      )?.quality || 0;

    // Only suggest switch if current persona is poor at this language
    if (currentQuality >= 4) return null;

    return {
      type: "language_switch",
      priority: 80,
      detail: `Language ${detectedLanguage} detected, current persona quality: ${currentQuality}/5`,
      targetLanguage: detectedLanguage,
    };
  }

  private extractRequestedName(transcript: string): string | null {
    const nameMatch = transcript.match(
      /(?:speak|talk) to (?:a |another )?(james|sarah|priya|amir)/i,
    );
    return nameMatch ? nameMatch[1] : null;
  }
}
```

---

## CLASS 4: PersonaSwitchManager

```typescript
/**
 * Executes the actual persona switch during a live call.
 *
 * The switch must feel like a human colleague handoff.
 * Audio must never cut or create silence.
 * New persona must acknowledge context — never restart from scratch.
 *
 * Uses the SAME CrossfadeManager already in the audio pipeline.
 * Uses the SAME FillerAudioManager already in the audio pipeline.
 * No new audio infrastructure — just new TTS client + new prompt.
 */
class PersonaSwitchManager {
  /**
   * Main switch method — called by AudioPipeline
   * when PersonaSwitchDetector returns a trigger.
   *
   * Full sequence:
   * 1. Find best replacement persona
   * 2. Current persona speaks handoff line
   * 3. Filler audio plays (covers gap)
   * 4. New TTS client initialised (pre-warmed during step 2-3)
   * 5. Crossfade from old TTS to new TTS
   * 6. New persona speaks opening line with context
   * 7. Switch logged to DB
   * 8. Lead persona preference updated if explicit request
   */
  async executeSwitch(
    trigger: SwitchTrigger,
    currentPersona: VoicePersona,
    currentContext: LiveCallContext,
    audioPipeline: AudioPipeline,
  ): Promise<VoicePersona> {
    // Find the best replacement
    const replacement = await this.findReplacement(
      trigger,
      currentPersona,
      currentContext,
    );

    if (!replacement) {
      logger.warn("No suitable replacement persona found", {
        trigger: trigger.type,
        callId: currentContext.callId,
      });
      return currentPersona; // Stay with current
    }

    // Step 1: Current persona sets up the switch naturally
    const handoffLine = this.selectHandoffLine(
      currentPersona,
      replacement,
      trigger,
    );
    await audioPipeline.speakLine(handoffLine, currentPersona);

    // Step 2: Start pre-warming new TTS (parallel with filler)
    const [newTTSClient] = await Promise.all([
      this.ttsFactory.createForPersona(replacement),
      audioPipeline.fillerManager.play("thinking"),
    ]);

    // Step 3: Crossfade to new voice
    await audioPipeline.crossfadeManager.transition(
      audioPipeline.currentTTSClient,
      newTTSClient,
      150, // 150ms crossfade
    );

    // Step 4: New persona acknowledges context
    const openingLine = this.buildOpeningLine(
      replacement,
      trigger,
      currentContext,
    );
    await newTTSClient.streamText(openingLine);

    // Step 5: Update pipeline
    audioPipeline.currentPersona = replacement;
    audioPipeline.currentTTSClient = newTTSClient;
    audioPipeline.systemPrompt = await this.buildPersonaPrompt(
      replacement,
      currentContext,
    );

    // Step 6: Log event (non-blocking)
    this.logSwitchEvent(
      trigger,
      currentPersona,
      replacement,
      currentContext,
    ).catch((err) => logger.warn("Switch log failed", { err }));

    // Step 7: Save preference if explicit request
    if (trigger.type === "customer_request") {
      this.savePersonaPreference(
        currentContext.leadId,
        replacement.id,
        "customer_request",
      ).catch((err) => logger.warn("Preference save failed", { err }));
    }

    return replacement;
  }

  /**
   * Find the best available replacement persona for this trigger.
   * Never returns the current persona.
   */
  private async findReplacement(
    trigger: SwitchTrigger,
    current: VoicePersona,
    ctx: LiveCallContext,
  ): Promise<VoicePersona | null> {
    const all = await this.registry.getAll();
    const candidates = all.filter((p) => p.id !== current.id);

    if (trigger.targetPersonaHint) {
      // Customer requested specific persona by name
      const requested = candidates.find(
        (p) =>
          p.name.toLowerCase() === trigger.targetPersonaHint!.toLowerCase(),
      );
      if (requested) return requested;
    }

    if (trigger.type === "language_switch" && trigger.targetLanguage) {
      // Find persona with best quality for this language
      return (
        candidates
          .map((p) => ({
            persona: p,
            quality:
              (p.supportedLanguages as LanguageEntry[]).find(
                (l) => l.code === trigger.targetLanguage,
              )?.quality || 0,
          }))
          .filter((s) => s.quality >= 4)
          .sort((a, b) => b.quality - a.quality)[0]?.persona || null
      );
    }

    if (trigger.type === "technical_escalation") {
      return (
        candidates.find(
          (p) => p.speciality === "technical" || p.speciality === "enterprise",
        ) || null
      );
    }

    if (trigger.type === "frustration_recovery") {
      return (
        candidates.find(
          (p) =>
            p.personalityType === "calm_reassuring" ||
            p.speciality === "rapport",
        ) || null
      );
    }

    return null;
  }

  private selectHandoffLine(
    from: VoicePersona,
    to: VoicePersona,
    trigger: SwitchTrigger,
  ): string {
    const handoffPhrases = from.handoffOutPhrases as string[];
    const triggerLines: Record<string, string[]> = {
      technical_escalation: [
        `${to.name} knows this area much better than I do — let me bring them in`,
        `This is exactly ${to.name}'s speciality — one second`,
        `Let me get ${to.name} on this — they'll give you a proper answer`,
      ],
      language_switch: [
        `Let me connect you with ${to.name} who can help you in that`,
        `${to.name} will be better placed here`,
      ],
      customer_request: [
        `Of course — ${to.name} is right here`,
        `Let me bring ${to.name} in for you`,
        `Sure, let me get ${to.name}`,
      ],
      frustration_recovery: [
        `Let me have ${to.name} pick this up — fresh perspective might help`,
        `${to.name} — my colleague — is better placed for this`,
      ],
    };

    const options = [
      ...(handoffPhrases || []),
      ...(triggerLines[trigger.type] || []),
    ];

    return (
      options[Math.floor(Math.random() * options.length)] ||
      `Let me bring in ${to.name}`
    );
  }

  private buildOpeningLine(
    persona: VoicePersona,
    trigger: SwitchTrigger,
    ctx: LiveCallContext,
  ): string {
    const handoffInPhrases = persona.handoffInPhrases as string[];
    const inLines: Record<string, string> = {
      technical_escalation:
        `Hi — ${persona.name} here. ` +
        `So on the ${ctx.lastTopicMentioned || "technical"} ` +
        `question — let me give you the proper answer on that`,

      language_switch: `Hi — ${persona.name} here, let's continue`,

      customer_request:
        `Hi — ${persona.name} speaking. ` +
        `I've been given the context. How can I help?`,

      frustration_recovery:
        `Hi ${ctx.lead.preferredName} — ${persona.name} here. ` +
        `I just want to make sure we get this right for you. ` +
        `Can you help me understand what's most important?`,
    };

    // Try persona's own handoff-in phrases first
    if (handoffInPhrases?.length) {
      return handoffInPhrases[
        Math.floor(Math.random() * handoffInPhrases.length)
      ];
    }

    return inLines[trigger.type] || `${persona.name} here — happy to help`;
  }

  private async buildPersonaPrompt(
    persona: VoicePersona,
    ctx: LiveCallContext,
  ): Promise<string> {
    return `
You are now ${persona.name}.
${persona.personalityDescription}

Your speciality: ${persona.specialityDescription}
Your signature phrases: ${(persona.signaturePhrases as string[]).join(", ")}
Never say: ${(persona.bannedPhrases as string[]).join(", ")}

CALL CONTEXT:
The previous colleague (${ctx.previousPersonaName}) has handed this call to you.
Customer: ${ctx.lead.preferredName}
What was discussed: ${ctx.callSummaryToNow}
Why you were brought in: ${ctx.switchReason}
Their current mood: ${ctx.emotionState.dominant}

Continue the conversation naturally from where ${ctx.previousPersonaName} left off.
Do NOT re-introduce the company or re-do the pitch.
Pick up exactly where they left off.
    `.trim();
  }

  private async logSwitchEvent(
    trigger: SwitchTrigger,
    from: VoicePersona,
    to: VoicePersona,
    ctx: LiveCallContext,
  ): Promise<void> {
    await db.personaSwitchEvents.create({
      data: {
        callId: ctx.callId,
        leadId: ctx.leadId,
        fromPersonaId: from.id,
        toPersonaId: to.id,
        switchTrigger: trigger.type,
        switchTriggerDetail: trigger.detail,
        callPhaseAtSwitch: ctx.callPhase,
        emotionAtSwitch: ctx.emotionState.dominant,
        sentimentScoreAtSwitch: ctx.emotionState.sentiment,
        callDurationAtSwitchSeconds: ctx.callDurationSeconds,
      },
    });
  }

  private async savePersonaPreference(
    leadId: string,
    personaId: string,
    source: string,
  ): Promise<void> {
    await db.leadPersonaPreferences.upsert({
      where: { leadId },
      update: {
        preferredPersonaId: personaId,
        preferenceDetectedAt: new Date(),
        preferenceSource: source,
      },
      create: {
        leadId,
        preferredPersonaId: personaId,
        preferenceDetectedAt: new Date(),
        preferenceSource: source,
      },
    });
  }
}
```

---

## CLASS 5: PersonaIntelligenceEngine

```typescript
/**
 * Connects voice personas to the central brain.
 * Tracks which persona converts which segment.
 * Tracks which switch events lead to better outcomes.
 * Feeds data back into persona selection over time.
 *
 * After 1,000 calls:
 *   System knows Priya converts IN/SaaS/founder at 48%
 *   System knows James→Sarah switch on frustration hurts IN leads
 *   System knows Amir→James switch for technical questions in UAE
 *   adds 2.1 minutes to call but +18% conversion
 */
class PersonaIntelligenceEngine {
  /**
   * Called by PostCallProcessor after every call ends.
   * Updates all persona performance tables.
   */
  async recordCallOutcome(
    personaId: string,
    lead: Lead,
    outcome: CallOutcome,
    switchEvents: PersonaSwitchEvent[],
  ): Promise<void> {
    await Promise.all([
      this.updateOverallStats(personaId, outcome),
      this.updateSegmentPerformance(personaId, lead, outcome),
      this.updateLanguagePerformance(personaId, outcome),
      ...switchEvents.map((e) => this.analyseSwitchOutcome(e, outcome)),
    ]);

    // Invalidate persona selection cache for this segment
    const segKey = this.buildSegmentKey(lead);
    await redis.del(`persona:recommendation:${segKey}`);
  }

  private async updateSegmentPerformance(
    personaId: string,
    lead: Lead,
    outcome: CallOutcome,
  ): Promise<void> {
    const where = {
      personaId,
      countryCode: lead.countryCode,
      industry: lead.industry,
      companySize: lead.companySize,
      seniorityLevel: lead.seniorityLevel,
    };

    const existing = await db.personaSegmentPerformance.findFirst({
      where,
    });

    if (existing) {
      const newTotal = existing.totalCalls + 1;
      const newConverted =
        outcome.result === "converted"
          ? existing.totalConverted + 1
          : existing.totalConverted;
      const newRate = (newConverted / newTotal) * 100;
      const confidence = Math.min(newTotal / 30, 1.0);
      // Full confidence at 30+ calls

      await db.personaSegmentPerformance.update({
        where: { id: existing.id },
        data: {
          totalCalls: newTotal,
          totalConverted: newConverted,
          conversionRate: newRate,
          avgDealValue: outcome.dealValue
            ? (existing.avgDealValue + outcome.dealValue) / 2
            : existing.avgDealValue,
          confidenceScore: confidence,
          lastUpdated: new Date(),
        },
      });
    } else {
      await db.personaSegmentPerformance.create({
        data: {
          personaId,
          ...where,
          totalCalls: 1,
          totalConverted: outcome.result === "converted" ? 1 : 0,
          conversionRate: outcome.result === "converted" ? 100 : 0,
          avgDealValue: outcome.dealValue || null,
          confidenceScore: 0.03, // Very low until more data
          lastUpdated: new Date(),
        },
      });
    }
  }

  private async analyseSwitchOutcome(
    switchEvent: PersonaSwitchEvent,
    outcome: CallOutcome,
  ): Promise<void> {
    // Did sentiment improve after the switch?
    const sentimentImproved =
      outcome.finalSentiment > (switchEvent.sentimentScoreAtSwitch || 0);

    // Update the switch event with the outcome
    await db.personaSwitchEvents.update({
      where: { id: switchEvent.id },
      data: {
        callOutcome: outcome.result,
        sentimentAfterSwitch: outcome.finalSentiment,
      },
    });

    // Update switch pattern intelligence
    const switchKey = `${switchEvent.fromPersonaId}→${switchEvent.toPersonaId}:${switchEvent.switchTrigger}`;

    await db.personaSwitchPatterns.upsert({
      where: { switchKey },
      update: {
        totalOccurrences: { increment: 1 },
        conversions:
          outcome.result === "converted" ? { increment: 1 } : undefined,
        sentimentImproved: sentimentImproved ? { increment: 1 } : undefined,
        conversionRate: await this.recalcSwitchRate(switchKey),
        sentimentImprovementRate: await this.recalcSentimentRate(switchKey),
      },
      create: {
        switchKey,
        fromPersonaId: switchEvent.fromPersonaId,
        toPersonaId: switchEvent.toPersonaId,
        switchTrigger: switchEvent.switchTrigger,
        totalOccurrences: 1,
        conversions: outcome.result === "converted" ? 1 : 0,
        sentimentImproved: sentimentImproved ? 1 : 0,
        conversionRate: outcome.result === "converted" ? 100 : 0,
        sentimentImprovementRate: sentimentImproved ? 100 : 0,
      },
    });
  }
}
```

---

## DATABASE SCHEMA

```sql
-- Voice personas (full identity — not just voice ID)
CREATE TABLE voice_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  description TEXT,

  -- ElevenLabs config
  elevenlabs_voice_id VARCHAR(100) NOT NULL UNIQUE,
  elevenlabs_model VARCHAR(100) DEFAULT 'eleven_turbo_v2_5',
  stability DECIMAL(3,2) DEFAULT 0.50,
  similarity_boost DECIMAL(3,2) DEFAULT 0.75,
  style DECIMAL(3,2) DEFAULT 0.00,
  use_speaker_boost BOOLEAN DEFAULT TRUE,
  speaking_rate DECIMAL(3,2) DEFAULT 1.0,

  -- Language capabilities
  -- [{"code": "en-IN", "name": "English (India)", "quality": 5}]
  supported_languages JSONB NOT NULL DEFAULT '[]',
  primary_language VARCHAR(10) NOT NULL DEFAULT 'en',

  -- Personality
  personality_type VARCHAR(30),
  personality_description TEXT,
  speaking_style TEXT,
  signature_phrases TEXT[],
  banned_phrases TEXT[],
  speciality VARCHAR(50),
  speciality_description TEXT,

  -- Targeting
  best_regions TEXT[],
  best_segments JSONB DEFAULT '[]',
  perceived_gender VARCHAR(20),

  -- Emotion voice overrides per emotional state
  -- {"frustrated": {"stability": 0.75, "style": 0.1, "rate": 0.82}}
  emotion_voice_params JSONB DEFAULT '{}',

  -- Handoff phrases
  handoff_out_phrases TEXT[],
  handoff_in_phrases TEXT[],

  -- Overall performance (denormalised for fast reads)
  total_calls INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  overall_conversion_rate DECIMAL(5,2),
  avg_deal_value DECIMAL(10,2),
  avg_call_duration_seconds INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_persona_default
  ON voice_personas(is_default) WHERE is_default = TRUE;

-- Performance by segment (central brain populates this)
CREATE TABLE persona_segment_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES voice_personas(id),
  country_code CHAR(2),
  industry VARCHAR(100),
  company_size VARCHAR(20),
  seniority_level VARCHAR(50),
  lead_temperature VARCHAR(20),
  lead_gender VARCHAR(20),
  total_calls INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  avg_deal_value DECIMAL(10,2),
  avg_call_duration_seconds INTEGER,
  avg_calls_to_close DECIMAL(4,1),
  confidence_score DECIMAL(3,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id, country_code, industry,
         company_size, seniority_level,
         lead_temperature, lead_gender)
);

-- Performance by language
CREATE TABLE persona_language_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES voice_personas(id),
  language_code VARCHAR(10) NOT NULL,
  total_calls_in_language INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  avg_customer_sentiment DECIMAL(3,2),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id, language_code)
);

-- Every switch event that happened
CREATE TABLE persona_switch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID,
  lead_id UUID REFERENCES leads(id),
  from_persona_id UUID REFERENCES voice_personas(id),
  to_persona_id UUID REFERENCES voice_personas(id),
  switch_trigger VARCHAR(30) NOT NULL,
  switch_trigger_detail TEXT,
  call_phase_at_switch VARCHAR(30),
  emotion_at_switch VARCHAR(30),
  sentiment_score_at_switch DECIMAL(3,2),
  call_duration_at_switch_seconds INTEGER,
  -- Filled in by PostCallProcessor
  call_outcome VARCHAR(20),
  sentiment_after_switch DECIMAL(3,2),
  switched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated switch patterns (what works, what doesn't)
CREATE TABLE persona_switch_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_key VARCHAR(200) NOT NULL UNIQUE,
  from_persona_id UUID REFERENCES voice_personas(id),
  to_persona_id UUID REFERENCES voice_personas(id),
  switch_trigger VARCHAR(30),
  total_occurrences INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  sentiment_improved INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  sentiment_improvement_rate DECIMAL(5,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Per-lead persona preferences
CREATE TABLE lead_persona_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) UNIQUE,
  preferred_persona_id UUID REFERENCES voice_personas(id),
  preference_detected_at TIMESTAMPTZ,
  preference_source VARCHAR(30),
  personas_used JSONB DEFAULT '[]',
  languages_detected TEXT[],
  preferred_language VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_persona_segment_perf
  ON persona_segment_performance(persona_id, country_code);
CREATE INDEX idx_switch_events_call
  ON persona_switch_events(call_id);
CREATE INDEX idx_switch_patterns_key
  ON persona_switch_patterns(switch_key);
CREATE INDEX idx_lead_persona_prefs_lead
  ON lead_persona_preferences(lead_id);
```

---

## ADMIN PANEL — PERSONA MANAGEMENT

```
/admin/personas — full roster management

CREATE PERSONA FORM:
  Name, Display Name
  ElevenLabs Voice ID  [+ 🔊 Test button]

  VOICE PARAMETERS (sliders 0-1):
    Stability, Similarity Boost, Style, Speaking Rate

  LANGUAGES (add/remove/rate):
    Language code, Language name, Quality (1-5 stars)

  PERSONALITY:
    Type dropdown, Speciality dropdown
    Personality description (text area — AI reads this)
    Speaking style (text area)
    Signature phrases (tags input)
    Banned phrases (tags input)

  TARGETING:
    Best regions (country code tags)
    Perceived gender

  EMOTION VOICE OVERRIDES (table):
    Emotion | Stability | Style | Rate
    frustrated | 0.75 | 0.10 | 0.82

  HANDOFF PHRASES:
    Out phrases (when handing off TO another persona)
    In phrases (when being handed the call FROM another persona)

  PERFORMANCE (read-only, from central brain):
    Total calls, Conversion rate, Best segment, Best language

PERSONA COMPARISON VIEW:
  Side-by-side conversion rates per region and segment
  Switch pattern analysis — which switches help/hurt
  Language performance breakdown
```

---

## CRITICAL RULES FOR THIS MODULE

- NEVER cut audio when switching personas — always crossfade
- NEVER let the new persona restart from scratch — acknowledge context
- NEVER switch persona more than once in the same call phase
  (one switch per phase maximum — prevents disorienting the customer)
- NEVER switch when customer is mid-sentence — wait for utterance end
- NEVER hardcode ElevenLabs voice IDs — always from voice_personas table
- NEVER switch to the same persona currently active
- ALWAYS log every switch event immediately (non-blocking)
- ALWAYS save customer's explicit persona request to preferences
- ALWAYS pre-warm new TTS client during the handoff line — not after
- ALWAYS give new persona the full call context to date
- ALWAYS use CrossfadeManager — never cut the audio stream directly
- NEVER switch based on central brain pattern alone without
  confidence score > 0.6 and sample size > 20 calls
