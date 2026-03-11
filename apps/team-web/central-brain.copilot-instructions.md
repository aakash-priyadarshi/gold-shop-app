# Central Intelligence Brain — GitHub Copilot Instructions

# File: .github/instructions/central-brain.instructions.md

# Apply to: **/intelligence/**, **/brain/**, \**/*brain\*.ts,

# **/_learning_.ts, **/_pattern_.ts, \**/*insights\*.ts

---

## WHAT THE CENTRAL BRAIN IS

```
Every other module handles ONE call with ONE person.
The Central Brain watches ALL calls across ALL people
and learns what actually works.

Individual call:   Sarah adapts to Priya's frustration in real time
Central Brain:     After 500 calls, Sarah knows that Indian CFOs who
                   mention "vendor lock-in" respond 73% better to the
                   flexibility reframe than the ROI reframe

Individual call:   AI picks the fintech case study
Central Brain:     After 200 calls, system knows the fintech story
                   converts 2.3x better than the retail story for
                   Series A startups with 10-50 employees

This is the difference between a good salesperson and a great one.
Great salespeople build intuition from thousands of conversations.
The Central Brain gives Sarah that intuition from day one at scale.
```

---

## THE FIVE LEARNING SYSTEMS

```
┌─────────────────────────────────────────────────────────┐
│  1. WINNING PATTERNS LIBRARY                            │
│     Lead profile + situation → what worked → outcome   │
│     Grows after every converted call                    │
├─────────────────────────────────────────────────────────┤
│  2. LOST DEAL AUTOPSY BANK                              │
│     Why we lost → what preceded it → what to do instead │
│     Grows after every lost deal                         │
├─────────────────────────────────────────────────────────┤
│  3. CONVERSATION MOMENT LIBRARY                         │
│     Exact phrases that changed the trajectory of a call │
│     Ranked by conversion rate — best ones surface first │
├─────────────────────────────────────────────────────────┤
│  4. PERSONA PERFORMANCE INTELLIGENCE                    │
│     Which voice persona converts which segment          │
│     Which persona + language combination works best     │
├─────────────────────────────────────────────────────────┤
│  5. TIMING & BEHAVIOURAL INTELLIGENCE                   │
│     Best time/day to call each segment                  │
│     Re-engagement windows for dormant leads             │
│     Silence patterns, response patterns                 │
└─────────────────────────────────────────────────────────┘
```

---

## FILE STRUCTURE

```
/src/intelligence/
  central-brain.service.ts         ← main orchestrator
  pattern-extractor.ts             ← extracts patterns from call data
  winning-patterns.service.ts      ← manages winning patterns library
  lost-deal-analyser.ts            ← manages lost deal autopsy bank
  conversation-library.ts          ← manages phrase/moment library
  timing-intelligence.ts           ← call timing optimisation
  re-engagement-engine.ts          ← when/how to re-engage dormant leads
  competitor-tracker.ts            ← tracks competitor mention trends
  brain-query.service.ts           ← answers questions for PreCallBrain
  brain-update.service.ts          ← processes post-call data
  mood-calendar.service.ts         ← seasonal/cyclical patterns
```

---

## CLASS 1: CentralBrainService

```typescript
/**
 * CentralBrainService — the main orchestrator.
 *
 * Two modes of operation:
 *
 * READ MODE (before every call):
 *   PreCallBrainService calls queryForLead()
 *   Returns insights relevant to this specific lead profile
 *   Must be fast — cached in Redis, <100ms response
 *
 * WRITE MODE (after every call):
 *   PostCallProcessor calls recordCallOutcome()
 *   Analyses transcript, extracts patterns, updates all libraries
 *   Runs async — no latency requirements
 *
 * The brain never directly modifies lead profiles.
 * It only manages aggregate intelligence across all leads.
 * Lead-specific data stays in the Lead Manager.
 */
class CentralBrainService {
  /**
   * READ — called by PreCallBrainService before every call.
   * Returns everything the AI needs from collective experience.
   * Result is included in Claude Sonnet's pre-call prompt.
   *
   * Response cached per segment — not per individual lead.
   * Cache TTL: 30 minutes (fresh enough, fast enough)
   */
  async queryForLead(lead: Lead): Promise<CentralBrainInsights> {
    const segment = this.buildSegmentKey(lead);
    const cacheKey = `brain:insights:${segment}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      winningPattern,
      lostDealWarnings,
      bestConversationMoments,
      personaRecommendation,
      timingInsights,
      reEngagementNotes,
      competitorAlerts,
    ] = await Promise.all([
      this.winningPatterns.getBestFor(segment),
      this.lostDeals.getWarningsFor(segment),
      this.conversationLibrary.getTopMomentsFor(lead),
      this.personaIntel.getRecommendationFor(lead),
      this.timingIntel.getInsightsFor(lead),
      lead.dealStage === "dormant"
        ? this.reEngagement.getStrategyFor(lead)
        : null,
      this.competitorTracker.getAlertsFor(lead),
    ]);

    const insights: CentralBrainInsights = {
      // What approach works for this segment
      recommendedOpeningStyle: winningPattern?.openingStyle,
      recommendedPitchStyle: winningPattern?.pitchStyle,
      recommendedClosingApproach: winningPattern?.closingApproach,
      avgCallsToCloseForSegment: winningPattern?.avgCallsToClose,
      segmentConversionRate: winningPattern?.conversionRate,

      // Risk warnings from similar lost deals
      riskWarnings: lostDealWarnings,

      // Best phrases to use
      topConversationMoments: bestConversationMoments,

      // Which persona and why
      recommendedPersona: personaRecommendation,

      // When to call and follow up
      optimalCallTime: timingInsights?.bestTimeLocal,
      optimalCallDay: timingInsights?.bestDay,
      expectedAnswerRate: timingInsights?.answerRate,

      // Re-engagement strategy if dormant
      reEngagementStrategy: reEngagementNotes,

      // Competitor context
      competitorAlerts,

      // Meta
      segmentSampleSize: winningPattern?.sampleSize || 0,
      confidenceScore: winningPattern?.confidence || 0,
      lastUpdated: new Date(),
    };

    // Cache for 30 minutes
    await redis.setex(cacheKey, 1800, JSON.stringify(insights));
    return insights;
  }

  /**
   * WRITE — called by PostCallProcessor after every call.
   * Extracts patterns and updates all five learning systems.
   * Runs completely async — never blocks the call pipeline.
   */
  async recordCallOutcome(payload: CallOutcomePayload): Promise<void> {
    const {
      lead,
      call,
      transcript,
      emotionArc,
      remarksGenerated,
      outcome,
      personaUsed,
      personaSwitchEvents,
    } = payload;

    // Run all updates in parallel — they're independent
    await Promise.all([
      // Update winning patterns if converted
      outcome.result === "converted"
        ? this.winningPatterns.record(lead, call, transcript, outcome)
        : null,

      // Update lost deal bank if lost
      outcome.result === "lost"
        ? this.lostDeals.record(lead, call, transcript, outcome)
        : null,

      // Extract and store conversation moments regardless of outcome
      // (even failed calls contain useful phrase data)
      this.conversationLibrary.extractAndStore(transcript, emotionArc, outcome),

      // Update persona performance
      this.personaIntel.recordOutcome(
        personaUsed,
        lead,
        outcome,
        personaSwitchEvents,
      ),

      // Update timing intelligence
      this.timingIntel.recordCallAttempt(
        lead,
        call.startedAt,
        outcome.customerAnswered,
      ),

      // Update competitor tracking
      this.competitorTracker.updateFromCall(
        lead.sales.competitorsMentioned,
        outcome,
      ),

      // Update mood calendar
      this.moodCalendar.recordOutcome(
        lead.countryCode,
        call.startedAt,
        outcome,
      ),
    ]);

    // Invalidate relevant cache entries
    const segment = this.buildSegmentKey(lead);
    await redis.del(`brain:insights:${segment}`);
  }

  /**
   * Build a segment key from lead attributes.
   * This groups similar leads so pattern learning is shared.
   * More specific = more accurate but less data.
   * Balance: country + industry + size + seniority
   */
  private buildSegmentKey(lead: Lead): string {
    return [
      lead.countryCode || "XX",
      lead.industry?.toLowerCase().replace(/\s+/g, "_") || "unknown",
      lead.companySize || "unknown",
      lead.seniorityLevel || "unknown",
    ].join(":");
    // e.g. "IN:saas:small:founder"
    //      "GB:fintech:medium:c_suite"
    //      "AE:retail:enterprise:vp_director"
  }
}
```

---

## CLASS 2: WinningPatternsService

```typescript
/**
 * Stores and retrieves what actually works for each segment.
 *
 * A "winning pattern" is extracted from every converted call:
 *   - What opening approach was used?
 *   - How long was rapport before pitch?
 *   - Which objections came up and how were they handled?
 *   - Which story/case study was told?
 *   - What was the closing question?
 *   - How many calls did it take?
 *
 * Over time, patterns emerge per segment.
 * The brain surfaces the highest-confidence patterns.
 */
class WinningPatternsService {
  async record(
    lead: Lead,
    call: Call,
    transcript: string,
    outcome: CallOutcome,
  ): Promise<void> {
    // Extract pattern elements from transcript using Gemini Flash-Lite
    const extracted = await this.extractPattern(transcript, lead, outcome);

    // Find or create pattern record for this segment
    const segment = this.buildSegment(lead);

    await db.winningPatterns.upsert({
      where: { segmentKey: segment.key },
      update: {
        totalConverted: { increment: 1 },
        totalCalls: { increment: 1 },
        conversionRate: await this.recalculateRate(segment.key),

        // Update averages
        avgRapportMinutes: await this.updateAvg(
          segment.key,
          "avgRapportMinutes",
          extracted.rapportMinutes,
        ),
        avgCallsToClose: await this.updateAvg(
          segment.key,
          "avgCallsToClose",
          outcome.callNumber,
        ),
        avgDealValue: await this.updateAvg(
          segment.key,
          "avgDealValue",
          outcome.dealValue,
        ),

        // Merge approach data (what worked most often)
        openingStyles: await this.mergeApproach(
          segment.key,
          "openingStyles",
          extracted.openingStyle,
        ),
        pitchStyles: await this.mergeApproach(
          segment.key,
          "pitchStyles",
          extracted.pitchStyle,
        ),
        closingApproaches: await this.mergeApproach(
          segment.key,
          "closingApproaches",
          extracted.closingApproach,
        ),
        effectiveStories: await this.mergeApproach(
          segment.key,
          "effectiveStories",
          extracted.storyUsed,
        ),

        confidence: await this.recalculateConfidence(segment.key),
        lastUpdated: new Date(),
      },
      create: {
        segmentKey: segment.key,
        countryCode: segment.country,
        industry: segment.industry,
        companySize: segment.size,
        seniorityLevel: segment.seniority,
        totalConverted: 1,
        totalCalls: 1,
        conversionRate: 1.0,
        avgRapportMinutes: extracted.rapportMinutes,
        avgCallsToClose: outcome.callNumber,
        avgDealValue: outcome.dealValue,
        openingStyles: [extracted.openingStyle],
        pitchStyles: [extracted.pitchStyle],
        closingApproaches: [extracted.closingApproach],
        effectiveStories: extracted.storyUsed ? [extracted.storyUsed] : [],
        confidence: 0.1, // Low until more data
      },
    });
  }

  async getBestFor(segmentKey: string): Promise<WinningPattern | null> {
    // Try exact match first
    let pattern = await db.winningPatterns.findUnique({
      where: { segmentKey },
    });

    // Fall back to broader segment (drop seniority, then size)
    if (!pattern || pattern.confidence < 0.3) {
      const parts = segmentKey.split(":");
      pattern =
        (await db.winningPatterns.findFirst({
          where: {
            countryCode: parts[0],
            industry: parts[1],
            companySize: parts[2],
          },
          orderBy: { confidence: "desc" },
        })) || pattern;
    }

    return pattern;
  }

  /**
   * Extract pattern elements from call transcript.
   * Uses Gemini Flash-Lite — cheap for async post-call use.
   */
  private async extractPattern(
    transcript: string,
    lead: Lead,
    outcome: CallOutcome,
  ): Promise<ExtractedPattern> {
    const result = await geminiLite.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Analyse this sales call transcript and extract:
1. OPENING_STYLE: How the AI opened (rapport/direct/question/story)
2. RAPPORT_MINUTES: Approx minutes before first pitch
3. PITCH_STYLE: How the product was introduced
4. STORY_USED: Which customer story/case study was mentioned (if any)
5. CLOSING_APPROACH: How the AI tried to close
6. KEY_OBJECTION: Main objection raised
7. OBJECTION_RESPONSE: How it was handled

Respond in JSON only. No preamble.

TRANSCRIPT:
${transcript.substring(0, 4000)}
          `,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 200 },
    });

    return JSON.parse(result.text());
  }
}
```

---

## CLASS 3: LostDealAnalyser

```typescript
/**
 * Learns from every lost deal.
 * Identifies the patterns that preceded a loss.
 * Turns failures into warnings for future similar leads.
 *
 * After 20+ losses with similar profiles, the brain starts
 * generating specific risk warnings:
 * "Leads like this go cold when price is revealed before
 *  the team-size pain point is fully established"
 */
class LostDealAnalyser {
  async record(
    lead: Lead,
    call: Call,
    transcript: string,
    outcome: CallOutcome,
  ): Promise<void> {
    // Extract what led to the loss
    const analysis = await this.analyseTranscript(
      transcript,
      outcome.lostReason,
    );

    await db.lostDealPatterns.create({
      data: {
        segmentKey: this.buildSegmentKey(lead),
        countryCode: lead.countryCode,
        industry: lead.industry,
        companySize: lead.companySize,
        seniorityLevel: lead.seniorityLevel,

        // Why did we lose?
        lostReason: outcome.lostReason,
        // 'price'|'timing'|'competitor'|'no_fit'|'no_authority'|'ghosted'

        // What signals appeared before the loss?
        precedingSignals: analysis.precedingSignals,
        // e.g. ['mentioned budget 3 times',
        //        'asked about cheapest option',
        //        'long pauses after price reveal']

        // What did the AI do that didn't help?
        whatAiDid: analysis.whatAiDid,

        // What should be done differently?
        whatToDoInstead: analysis.whatToDoInstead,

        // How early was the loss foreseeable?
        lossSignalCallNumber: analysis.signalFirstSeenCallNumber,
        // Were the warning signs there from call 1?

        competitorLostTo: outcome.competitorLostTo,
        callNumber: outcome.callNumber,
        occurredAt: new Date(),
      },
    });

    // Rebuild warning summaries for this segment
    await this.rebuildWarnings(this.buildSegmentKey(lead));
  }

  async getWarningsFor(segmentKey: string): Promise<LostDealWarning[]> {
    // Get aggregated warnings — patterns seen 3+ times
    const patterns = await db.lostDealPatterns.groupBy({
      by: ["lostReason", "whatToDoInstead"],
      where: {
        segmentKey: { startsWith: segmentKey.split(":")[0] },
        // Match at least country level
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: 3 } },
        // Only surface patterns seen 3+ times
      },
    });

    return patterns.map((p) => ({
      warning: `Risk: ${p.lostReason} (seen ${p._count.id} times in similar leads)`,
      action: p.whatToDoInstead,
      frequency: p._count.id,
    }));
  }

  private async analyseTranscript(
    transcript: string,
    lostReason: string,
  ): Promise<LostDealAnalysis> {
    const result = await geminiLite.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
This sales call ended as a LOST DEAL. Reason given: ${lostReason}

Analyse the transcript and identify:
1. PRECEDING_SIGNALS: List of 3-5 specific signals that appeared
   before the loss (customer phrases, hesitations, patterns)
2. WHAT_AI_DID: What the AI did that didn't help or hurt
3. WHAT_TO_DO_INSTEAD: Specific alternative approach
4. SIGNAL_FIRST_SEEN_CALL_NUMBER: Which call number the warning
   signs first appeared (1 = first call)

JSON only. No preamble.

TRANSCRIPT:
${transcript.substring(0, 4000)}
          `,
            },
          ],
        },
      ],
    });

    return JSON.parse(result.text());
  }
}
```

---

## CLASS 4: ConversationLibrary

```typescript
/**
 * Stores the exact phrases and moments that change calls.
 *
 * Every call has turning points — moments where the customer's
 * mood shifted, where an objection dissolved, where they leaned in.
 *
 * This library captures:
 *   - What was said right before the shift
 *   - What the AI said that caused the shift
 *   - What happened to sentiment after
 *   - Whether the call converted
 *
 * Over time, it surfaces the phrases with highest conversion lift.
 * PreCallBrainService injects the top 3 for each situation.
 */
class ConversationLibrary {
  async extractAndStore(
    transcript: string,
    emotionArc: EmotionArc[],
    outcome: CallOutcome,
  ): Promise<void> {
    // Find sentiment shift moments in the emotion arc
    const shifts = this.findSentimentShifts(emotionArc);

    for (const shift of shifts) {
      if (Math.abs(shift.sentimentDelta) < 0.2) continue;
      // Only record meaningful shifts

      // Get transcript context around this moment
      const context = this.extractTranscriptContext(
        transcript,
        shift.timestamp,
        30, // 30 seconds before and after
      );

      // Use Gemini to identify what caused the shift
      const moment = await this.analyseShift(context, shift, outcome);

      if (!moment.aiPhrase) continue;

      // Store or update the phrase
      await db.conversationMoments.upsert({
        where: {
          phraseHash: this.hashPhrase(moment.aiPhrase),
        },
        update: {
          timesUsed: { increment: 1 },
          conversions:
            outcome.result === "converted" ? { increment: 1 } : undefined,
          conversionRate: await this.recalcRate(
            this.hashPhrase(moment.aiPhrase),
          ),
          avgSentimentLiftAfter: await this.updateAvgLift(
            this.hashPhrase(moment.aiPhrase),
            shift.sentimentDelta,
          ),
        },
        create: {
          phraseHash: this.hashPhrase(moment.aiPhrase),
          aiPhrase: moment.aiPhrase,
          context: moment.context,
          situationType: moment.situationType,
          // 'objection_handling'|'rapport_building'|
          // 'price_discussion'|'closing'|'recovery'
          customerSaidBefore: moment.customerSaidBefore,
          sentimentBefore: shift.sentimentBefore,
          sentimentAfter: shift.sentimentAfter,
          sentimentDelta: shift.sentimentDelta,
          timesUsed: 1,
          conversions: outcome.result === "converted" ? 1 : 0,
          conversionRate: outcome.result === "converted" ? 1.0 : 0.0,
          avgSentimentLiftAfter: shift.sentimentDelta,
          applicableRegions: [], // Will be filled with more data
          applicableSegments: [],
        },
      });
    }
  }

  async getTopMomentsFor(lead: Lead): Promise<ConversationMoment[]> {
    return db.conversationMoments.findMany({
      where: {
        timesUsed: { gte: 5 }, // Only proven phrases
        conversionRate: { gte: 0.3 }, // At least 30% conversion
        OR: [
          { applicableRegions: { isEmpty: true } },
          { applicableRegions: { has: lead.countryCode } },
        ],
      },
      orderBy: [{ conversionRate: "desc" }, { timesUsed: "desc" }],
      take: 5,
    });
  }

  private findSentimentShifts(arc: EmotionArc[]): SentimentShift[] {
    const shifts: SentimentShift[] = [];

    for (let i = 1; i < arc.length; i++) {
      const delta = arc[i].sentimentScore - arc[i - 1].sentimentScore;
      if (Math.abs(delta) >= 0.15) {
        shifts.push({
          timestamp: arc[i].timestamp,
          sentimentBefore: arc[i - 1].sentimentScore,
          sentimentAfter: arc[i].sentimentScore,
          sentimentDelta: delta,
          direction: delta > 0 ? "positive" : "negative",
        });
      }
    }

    return shifts;
  }
}
```

---

## CLASS 5: ReEngagementEngine

```typescript
/**
 * Determines when and how to re-engage dormant leads.
 *
 * Dormant = no response for 14+ days after positive engagement
 *
 * The brain learns:
 *   - How long silence typically lasts before leads come back
 *   - What trigger event tends to re-open conversations
 *   - What message/approach re-activates each segment
 *   - Seasonal patterns (budget cycles, new year energy etc)
 *
 * This is how leads lost in September close in January.
 */
class ReEngagementEngine {
  async getStrategyFor(lead: Lead): Promise<ReEngagementStrategy> {
    const daysDormant = this.daysSince(lead.lastContactAt);
    const segment = this.buildSegmentKey(lead);

    // Check if this segment has a known re-engagement window
    const pattern = await db.reEngagementPatterns.findFirst({
      where: { segmentKey: { startsWith: segment.split(":")[0] } },
      orderBy: { successRate: "desc" },
    });

    // Check seasonal trigger
    const seasonalTrigger = await this.moodCalendar.getUpcomingTrigger(
      lead.countryCode,
    );

    // Check if lead has shown any passive signals
    // (e.g., opened a WhatsApp message, visited pricing page)
    const passiveSignals = await this.getPassiveSignals(lead.id);

    return {
      shouldReEngage: this.shouldReEngage(
        daysDormant,
        pattern,
        seasonalTrigger,
        passiveSignals,
      ),
      recommendedTiming: this.calcTiming(
        pattern,
        seasonalTrigger,
        passiveSignals,
      ),
      recommendedApproach: pattern?.bestApproach || "value_add_message",
      recommendedMessage: this.buildReEngagementMessage(
        lead,
        pattern,
        seasonalTrigger,
      ),
      recommendedChannel: pattern?.bestChannel || "whatsapp",
      reason: this.buildReason(
        daysDormant,
        pattern,
        seasonalTrigger,
        passiveSignals,
      ),
    };
  }

  /**
   * The re-engagement message is NOT a "just checking in".
   * It provides genuine value — a new insight, a relevant story,
   * a question triggered by something real.
   */
  private buildReEngagementMessage(
    lead: Lead,
    pattern: ReEngagementPattern | null,
    trigger: SeasonalTrigger | null,
  ): string {
    // Trigger-based: something real happened
    if (trigger) {
      return trigger.messageTemplate.replace("{firstName}", lead.preferredName);
    }

    // Pattern-based: segment typically re-engages this way
    if (pattern?.bestMessageTemplate) {
      return pattern.bestMessageTemplate.replace(
        "{firstName}",
        lead.preferredName,
      );
    }

    // Value-add default — never "just checking in"
    return (
      `Hi ${lead.preferredName} — ` +
      `thought of you when I saw this. ` +
      `Relevant given what you mentioned about ` +
      `${
        lead.zeroPartyData.professionalFrustrations?.[0] || "scaling your team"
      }. ` +
      `Worth a 10-minute chat if timing's better now?`
    );
  }
}
```

---

## CLASS 6: MoodCalendarService

```typescript
/**
 * Tracks cyclical and seasonal patterns in call outcomes.
 *
 * Some patterns are universal:
 *   Monday mornings → guarded, not receptive
 *   Friday afternoons → distracted, hard to close
 *   Last week of quarter → CFOs unreachable
 *
 * Some are regional:
 *   Indian leads → harder to reach during Diwali week
 *   UK leads → ghost in August (holiday season)
 *   UAE leads → Ramadan = different hours entirely
 *
 * Some are company-specific (learned over time):
 *   This particular company → budget resets in April
 *   This lead → always answers Tuesday 10am
 *
 * The brain learns all of these and feeds them to CallScheduler.
 */
class MoodCalendarService {
  async recordOutcome(
    countryCode: string,
    calledAt: Date,
    outcome: {
      customerAnswered: boolean;
      sentiment?: number;
      converted?: boolean;
    },
  ): Promise<void> {
    const hour = calledAt.getHours(); // Local hour
    const dayOfWeek = calledAt.getDay(); // 0=Sunday
    const weekOfMonth = Math.ceil(calledAt.getDate() / 7);
    const month = calledAt.getMonth();

    await db.moodCalendarData.upsert({
      where: {
        countryCode_hour_dayOfWeek: { countryCode, hour, dayOfWeek },
      },
      update: {
        totalCalls: { increment: 1 },
        answered: outcome.customerAnswered ? { increment: 1 } : undefined,
        conversions: outcome.converted ? { increment: 1 } : undefined,
        answerRate: await this.recalcAnswerRate(countryCode, hour, dayOfWeek),
        avgSentiment: outcome.sentiment
          ? await this.updateAvgSentiment(
              countryCode,
              hour,
              dayOfWeek,
              outcome.sentiment,
            )
          : undefined,
      },
      create: {
        countryCode,
        hour,
        dayOfWeek,
        weekOfMonth,
        month,
        totalCalls: 1,
        answered: outcome.customerAnswered ? 1 : 0,
        conversions: outcome.converted ? 1 : 0,
        answerRate: outcome.customerAnswered ? 1.0 : 0.0,
        avgSentiment: outcome.sentiment || null,
      },
    });
  }

  async getBestCallTime(countryCode: string): Promise<BestCallTime> {
    const data = await db.moodCalendarData.findMany({
      where: {
        countryCode,
        totalCalls: { gte: 20 }, // Statistically meaningful
      },
      orderBy: { answerRate: "desc" },
      take: 5,
    });

    if (!data.length) return this.getRegionalDefault(countryCode);

    const best = data[0];
    return {
      hour: best.hour,
      dayOfWeek: best.dayOfWeek,
      answerRate: best.answerRate,
      avgSentiment: best.avgSentiment,
      confidence: Math.min(best.totalCalls / 100, 1.0),
    };
  }

  async getUpcomingTrigger(
    countryCode: string,
  ): Promise<SeasonalTrigger | null> {
    const now = new Date();
    const upcoming = await db.seasonalTriggers.findFirst({
      where: {
        countryCode,
        triggerDate: {
          gte: now,
          lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          // Within next 14 days
        },
        isReEngagementOpportunity: true,
      },
      orderBy: { triggerDate: "asc" },
    });

    return upcoming;
  }
}
```

---

## CLASS 7: CompetitorTracker

```typescript
/**
 * Tracks competitor mention trends across all calls.
 *
 * When competitor X suddenly gets mentioned 40% more than last month:
 *   → They may have launched something new
 *   → Pricing may have changed
 *   → Their marketing is working
 *
 * System alerts sales team automatically.
 * Sarah's competitor reframe scripts update accordingly.
 */
class CompetitorTracker {
  async updateFromCall(
    competitorsMentioned: LeadCompetitorMention[],
    outcome: CallOutcome,
  ): Promise<void> {
    for (const mention of competitorsMentioned) {
      await db.competitorMentionLog.create({
        data: {
          competitorName: mention.name,
          sentiment: mention.sentiment,
          context: mention.context,
          callOutcome: outcome.result,
          mentionedAt: new Date(),
        },
      });

      // Update rolling 30-day trend
      await this.updateTrend(mention.name);
    }
  }

  async updateTrend(competitorName: string): Promise<void> {
    const last30Days = await db.competitorMentionLog.count({
      where: {
        competitorName,
        mentionedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const prev30Days = await db.competitorMentionLog.count({
      where: {
        competitorName,
        mentionedAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const trend = prev30Days > 0 ? (last30Days - prev30Days) / prev30Days : 0;

    await db.competitorTrends.upsert({
      where: { competitorName },
      update: {
        mentionsLast30Days: last30Days,
        mentionsPrev30Days: prev30Days,
        trendDirection:
          trend > 0.2 ? "rising" : trend < -0.2 ? "falling" : "stable",
        trendPercentage: trend * 100,
        lastUpdated: new Date(),
        alertSent: trend > 0.4 ? false : undefined,
        // Reset alert flag if new spike
      },
      create: {
        competitorName,
        mentionsLast30Days: last30Days,
        mentionsPrev30Days: prev30Days,
        trendDirection: "stable",
        trendPercentage: 0,
      },
    });

    // Alert if 40%+ spike
    if (trend > 0.4) {
      await this.sendTrendAlert(competitorName, trend, last30Days);
    }
  }

  async getAlertsFor(lead: Lead): Promise<CompetitorAlert[]> {
    const mentioned = lead.sales.competitorsMentioned.map((c) => c.name);
    if (!mentioned.length) return [];

    return db.competitorTrends
      .findMany({
        where: {
          competitorName: { in: mentioned },
          trendDirection: "rising",
        },
      })
      .then((trends) =>
        trends.map((t) => ({
          competitor: t.competitorName,
          alert: `${t.competitorName} mentions up ${t.trendPercentage.toFixed(0)}% — may have new offer`,
          action: "Check competitor_intelligence table for latest reframe",
        })),
      );
  }
}
```

---

## DATABASE SCHEMA

```sql
-- Winning patterns per segment
CREATE TABLE winning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key VARCHAR(200) NOT NULL UNIQUE,
  country_code CHAR(2),
  industry VARCHAR(100),
  company_size VARCHAR(20),
  seniority_level VARCHAR(50),
  total_converted INTEGER DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  avg_rapport_minutes DECIMAL(4,1),
  avg_calls_to_close DECIMAL(4,1),
  avg_deal_value DECIMAL(10,2),
  opening_styles JSONB DEFAULT '[]',
  pitch_styles JSONB DEFAULT '[]',
  closing_approaches JSONB DEFAULT '[]',
  effective_stories JSONB DEFAULT '[]',
  confidence DECIMAL(3,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Lost deal patterns
CREATE TABLE lost_deal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key VARCHAR(200),
  country_code CHAR(2),
  industry VARCHAR(100),
  company_size VARCHAR(20),
  seniority_level VARCHAR(50),
  lost_reason VARCHAR(50),
  preceding_signals TEXT[],
  what_ai_did TEXT,
  what_to_do_instead TEXT,
  loss_signal_call_number INTEGER,
  competitor_lost_to VARCHAR(255),
  call_number INTEGER,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation moments library
CREATE TABLE conversation_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_hash VARCHAR(64) NOT NULL UNIQUE,
  ai_phrase TEXT NOT NULL,
  context VARCHAR(50),
  situation_type VARCHAR(30),
  customer_said_before TEXT,
  sentiment_before DECIMAL(3,2),
  sentiment_after DECIMAL(3,2),
  sentiment_delta DECIMAL(3,2),
  times_used INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  avg_sentiment_lift_after DECIMAL(3,2),
  applicable_regions TEXT[],
  applicable_segments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mood calendar data
CREATE TABLE mood_calendar_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  hour INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  week_of_month INTEGER,
  month INTEGER,
  total_calls INTEGER DEFAULT 0,
  answered INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  answer_rate DECIMAL(5,2),
  avg_sentiment DECIMAL(3,2),
  UNIQUE(country_code, hour, day_of_week)
);

-- Seasonal triggers
CREATE TABLE seasonal_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  trigger_name VARCHAR(100) NOT NULL,
  trigger_date DATE NOT NULL,
  description TEXT,
  is_re_engagement_opportunity BOOLEAN DEFAULT FALSE,
  message_template TEXT,
  avoid_calling BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-engagement patterns
CREATE TABLE re_engagement_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key VARCHAR(200),
  avg_dormancy_before_return_days INTEGER,
  best_approach VARCHAR(50),
  best_channel VARCHAR(20),
  best_message_template TEXT,
  success_rate DECIMAL(5,2),
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor mention log
CREATE TABLE competitor_mention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name VARCHAR(255) NOT NULL,
  sentiment VARCHAR(30),
  context TEXT,
  call_outcome VARCHAR(20),
  mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor trends (rolling)
CREATE TABLE competitor_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name VARCHAR(255) NOT NULL UNIQUE,
  mentions_last_30_days INTEGER DEFAULT 0,
  mentions_prev_30_days INTEGER DEFAULT 0,
  trend_direction VARCHAR(10) DEFAULT 'stable',
  trend_percentage DECIMAL(6,2),
  alert_sent BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast reads
CREATE INDEX idx_winning_patterns_segment
  ON winning_patterns(segment_key);
CREATE INDEX idx_lost_patterns_segment
  ON lost_deal_patterns(segment_key);
CREATE INDEX idx_conv_moments_conversion
  ON conversation_moments(conversion_rate DESC, times_used DESC)
  WHERE times_used >= 5;
CREATE INDEX idx_mood_calendar_country
  ON mood_calendar_data(country_code, answer_rate DESC);
CREATE INDEX idx_competitor_log_name
  ON competitor_mention_log(competitor_name, mentioned_at DESC);
```

---

## CRITICAL RULES FOR THIS MODULE

- NEVER run brain updates synchronously during a live call
- NEVER query the brain without checking Redis cache first
- NEVER surface a pattern with fewer than 5 data points
  (low confidence = noise, not signal)
- NEVER modify lead profiles from brain modules
  (brain reads leads, never writes to them directly)
- NEVER use brain insights as hard rules — always as suggestions
  (PreCallBrainService frames them as recommendations, not commands)
- ALWAYS invalidate relevant cache after every write
- ALWAYS include confidence score with every insight returned
- ALWAYS fall back gracefully if no pattern exists for a segment
  (use broader segment or regional defaults)
- ALWAYS log which brain insights were used in a call
  (so we can track if brain recommendations actually help)
