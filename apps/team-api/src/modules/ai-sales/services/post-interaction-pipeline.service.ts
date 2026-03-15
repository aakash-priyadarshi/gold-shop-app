import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { LeadScoringService } from "./lead-scoring.service";
import { LeadStrategyService, StrategyRecommendation } from "./lead-strategy.service";
import { PostCallProcessor } from "./post-call-processor.service";

/**
 * PostInteractionPipeline — Unified pipeline that runs after EVERY interaction
 * (call, meeting, email) to keep lead data fresh and strategy current.
 *
 * Flow: Enrich Lead → Re-Score → Auto-Progress Stage → Generate Next Strategy
 *
 * This ensures every single touchpoint with a lead feeds back into the system,
 * updating their profile, score, and the AI's strategy — looping until conversion.
 */
@Injectable()
export class PostInteractionPipelineService {
  private readonly logger = new Logger(PostInteractionPipelineService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private leadScoring: LeadScoringService,
    private leadStrategy: LeadStrategyService,
    private postCallProcessor: PostCallProcessor,
  ) {}

  /**
   * Run the full pipeline after a CALL ends.
   * The call orchestrator already does enrichment, so we add:
   * - Central brain-aware scoring
   * - Stage auto-progression
   * - Strategy generation for next interaction
   */
  async afterCall(leadId: string, sessionId: string) {
    this.logger.log(`[Pipeline] After call — lead=${leadId}, session=${sessionId}`);
    try {
      await this.reScoreLead(leadId);
      await this.autoProgressStage(leadId);
      await this.generateAndSaveStrategy(leadId);
      this.logger.log(`[Pipeline] After-call pipeline complete for lead ${leadId}`);
    } catch (err: any) {
      this.logger.error(`[Pipeline] After-call failed for lead ${leadId}: ${err.message}`);
    }
  }

  /**
   * Run the full pipeline after a MEETING ends.
   * Handles: transcript enrichment → lead update → re-score → stage → strategy.
   */
  async afterMeeting(leadId: string, meetingSessionId: string, transcript?: string) {
    this.logger.log(`[Pipeline] After meeting — lead=${leadId}, session=${meetingSessionId}`);
    try {
      // 1. Extract personality + lead info from meeting transcript
      if (transcript && transcript.length > 50) {
        await this.enrichLeadFromTranscript(leadId, transcript);
      }

      // 2. Re-score (uses full lead data including new enrichment)
      await this.reScoreLead(leadId);

      // 3. Auto-progress stage
      await this.autoProgressStage(leadId);

      // 4. Generate strategy for next interaction
      await this.generateAndSaveStrategy(leadId);

      this.logger.log(`[Pipeline] After-meeting pipeline complete for lead ${leadId}`);
    } catch (err: any) {
      this.logger.error(`[Pipeline] After-meeting failed for lead ${leadId}: ${err.message}`);
    }
  }

  /**
   * Run the pipeline after an EMAIL is received or sent.
   * Lighter-weight: extract intent from email → re-score → strategy.
   */
  async afterEmail(leadId: string, emailContent: string, direction: "sent" | "received") {
    this.logger.log(`[Pipeline] After email ${direction} — lead=${leadId}`);
    try {
      // 1. Extract lead info from email content
      if (emailContent && emailContent.length > 20) {
        await this.enrichLeadFromEmail(leadId, emailContent, direction);
      }

      // 2. Re-score
      await this.reScoreLead(leadId);

      // 3. Auto-progress stage
      await this.autoProgressStage(leadId);

      // 4. Strategy
      await this.generateAndSaveStrategy(leadId);

      this.logger.log(`[Pipeline] After-email pipeline complete for lead ${leadId}`);
    } catch (err: any) {
      this.logger.error(`[Pipeline] After-email failed for lead ${leadId}: ${err.message}`);
    }
  }

  // ── Re-score a lead using the scoring service ─────────────────────────

  private async reScoreLead(leadId: string) {
    try {
      const score = await this.leadScoring.scoreLeead(leadId);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { score: score.total, temperature: score.tier },
      });
      this.logger.log(`[Pipeline] Lead ${leadId} re-scored: ${score.total} (${score.tier})`);
    } catch (err: any) {
      this.logger.warn(`[Pipeline] Re-scoring failed for ${leadId}: ${err.message}`);
    }
  }

  // ── Auto-progress lead stage based on score and interactions ──────────

  private async autoProgressStage(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        interactions: { orderBy: { createdAt: "desc" }, take: 5 },
        meetingSessions: { where: { status: "completed" }, take: 5 },
        callSessions: { where: { status: "COMPLETED" }, take: 10 },
      },
    });
    if (!lead || lead.stage === "WON" || lead.stage === "LOST") return;

    const score = lead.score || 0;
    const currentStage = lead.stage;
    const totalCalls = lead.totalCalls || 0;
    const totalMeetings = lead.meetingSessions?.length || 0;
    const totalInteractions = lead.interactions?.length || 0;

    // Stage progression rules (only move forward, never backward)
    const stageOrder = ["NEW", "CONTACTED", "QUALIFIED", "DEMO", "PROPOSAL", "NEGOTIATION", "WON"];
    const currentIdx = stageOrder.indexOf(currentStage);

    let newStage = currentStage;

    // NEW → CONTACTED: any interaction happened
    if (currentStage === "NEW" && totalInteractions > 0) {
      newStage = "CONTACTED";
    }

    // CONTACTED → QUALIFIED: score >= 40 and at least 2 interactions
    if (currentIdx <= 1 && score >= 40 && totalInteractions >= 2) {
      newStage = "QUALIFIED";
    }

    // QUALIFIED → DEMO: had a video meeting or score >= 60
    if (currentIdx <= 2 && (totalMeetings >= 1 || score >= 60) && totalInteractions >= 3) {
      newStage = "DEMO";
    }

    // DEMO → PROPOSAL: score >= 70 and buying signals detected
    if (currentIdx <= 3 && score >= 70) {
      const hasBuyingSignals = lead.callSessions?.some(
        (c: any) => c.buyingSignals && (c.buyingSignals as string[]).length > 0,
      );
      if (hasBuyingSignals || totalCalls >= 3) {
        newStage = "PROPOSAL";
      }
    }

    // PROPOSAL → NEGOTIATION: score >= 80 and budget discussed
    if (currentIdx <= 4 && score >= 80 && lead.budgetRange) {
      newStage = "NEGOTIATION";
    }

    // NEGOTIATION → WON: score >= 90 and explicit conversion signal
    // (This should be triggered manually or by explicit deal closure, not auto)

    if (newStage !== currentStage) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { stage: newStage as any },
      });
      this.logger.log(`[Pipeline] Lead ${leadId} stage: ${currentStage} → ${newStage}`);
    }
  }

  // ── Generate and save next strategy ───────────────────────────────────

  private async generateAndSaveStrategy(leadId: string) {
    try {
      const strategy = await this.leadStrategy.suggestNextAction(leadId);

      // Save strategy to lead's nextCallStrategy field
      const strategyText = `[${strategy.priority.toUpperCase()}] ${strategy.action}: ${strategy.reason}`;
      const updateData: any = {
        nextCallStrategy: strategyText,
      };

      // If strategy suggests a specific goal, save it
      if (strategy.suggestedGoal) {
        updateData.whatWorkedLastCall = updateData.whatWorkedLastCall || undefined;
      }

      await this.prisma.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      // Also record the strategy as a NOTE interaction for the timeline
      await this.prisma.leadInteraction.create({
        data: {
          leadId,
          type: "NOTE",
          channel: "ai-strategy",
          direction: "SYSTEM",
          summary: `AI Strategy: ${strategy.action} — ${strategy.reason}`,
          details: JSON.stringify(strategy),
          goalSet: strategy.suggestedGoal,
          metadata: {
            action: strategy.action,
            priority: strategy.priority,
            suggestedDelay: strategy.suggestedDelay,
            meetingSubject: strategy.meetingSubject,
          },
          agentName: "Central Intelligence",
        },
      });

      this.logger.log(`[Pipeline] Strategy generated for lead ${leadId}: ${strategy.action} (${strategy.priority})`);
      return strategy;
    } catch (err: any) {
      this.logger.warn(`[Pipeline] Strategy generation failed for ${leadId}: ${err.message}`);
      return null;
    }
  }

  // ── Enrich lead from meeting/call transcript ──────────────────────────

  private async enrichLeadFromTranscript(leadId: string, transcript: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    // Extract personality insights (already exists in PostCallProcessor)
    const personality = await this.postCallProcessor.extractPersonalityInsights(
      transcript, lead.name,
    );

    // Also extract business intelligence from transcript
    const bizIntel = await this.extractBusinessIntel(transcript, lead.name);

    // Merge into lead — only overwrite if we got new data
    const updateData: any = {};

    // Personality
    if (personality.communicationStyle) updateData.communicationStyle = personality.communicationStyle;
    if (personality.decisionStyle) updateData.decisionStyle = personality.decisionStyle;
    if (personality.pacePreference) updateData.pacePreference = personality.pacePreference;
    if (personality.tonePreference) updateData.tonePreference = personality.tonePreference;
    if (personality.respondsWellTo?.length) updateData.respondsWellTo = personality.respondsWellTo;
    if (personality.getsFrustratedBy?.length) updateData.getsFrustratedBy = personality.getsFrustratedBy;
    if (personality.familyDetails) updateData.familyDetails = personality.familyDetails;
    if (personality.hobbies) updateData.hobbies = personality.hobbies;
    if (personality.recentLifeEvents) updateData.recentLifeEvents = personality.recentLifeEvents;
    if (personality.notableQuotes) updateData.notableQuotes = personality.notableQuotes;
    if (personality.budgetRange) updateData.budgetRange = personality.budgetRange;
    if (personality.urgency) updateData.urgency = personality.urgency;

    // Business intel
    if (bizIntel.company && !lead.company) updateData.company = bizIntel.company;
    if (bizIntel.role && !lead.role) updateData.role = bizIntel.role;
    if (bizIntel.budgetRange) updateData.budgetRange = bizIntel.budgetRange;
    if (bizIntel.budgetApprover) updateData.budgetApprover = bizIntel.budgetApprover;
    if (bizIntel.urgency) updateData.urgency = bizIntel.urgency;
    if (bizIntel.dealValue) updateData.dealValue = bizIntel.dealValue;
    if (bizIntel.competitorsPros) updateData.competitorsPros = bizIntel.competitorsPros;
    if (bizIntel.predictedConcern) updateData.predictedConcern = bizIntel.predictedConcern;
    if (bizIntel.preferredCallTime) updateData.preferredCallTime = bizIntel.preferredCallTime;
    if (bizIntel.email && !lead.email) updateData.email = bizIntel.email;
    if (bizIntel.phone && !lead.phone) updateData.phone = bizIntel.phone;

    // Merge competitors mentioned
    if (bizIntel.competitors?.length) {
      const existing = lead.competitorsMentioned || [];
      const merged = [...new Set([...existing, ...bizIntel.competitors])];
      updateData.competitorsMentioned = merged;
    }

    // Merge objections
    if (bizIntel.objections?.length) {
      const existing = (lead.objectionsHistory as any[]) || [];
      const newObjList = bizIntel.objections.map((o: string) => ({
        objection: o,
        status: "open",
        detectedAt: new Date().toISOString(),
      }));
      updateData.objectionsHistory = [...existing, ...newObjList];
    }

    // Open loops
    if (bizIntel.openLoops?.length) {
      const existing = (lead.openLoops as any[]) || [];
      const newLoops = bizIntel.openLoops.map((l: string) => ({
        topic: l,
        status: "open",
        detectedAt: new Date().toISOString(),
      }));
      updateData.openLoops = [...existing, ...newLoops];
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.lead.update({ where: { id: leadId }, data: updateData });
      this.logger.log(
        `[Pipeline] Enriched lead ${leadId} with ${Object.keys(updateData).length} fields from transcript`,
      );
    }
  }

  // ── Enrich lead from email content ────────────────────────────────────

  private async enrichLeadFromEmail(
    leadId: string,
    emailContent: string,
    direction: "sent" | "received",
  ) {
    if (direction !== "received") return; // Only enrich from customer emails

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const emailIntel = await this.extractEmailIntel(emailContent, lead.name);
    if (!emailIntel) return;

    const updateData: any = {};

    // Fill missing contact/company info
    if (emailIntel.company && !lead.company) updateData.company = emailIntel.company;
    if (emailIntel.role && !lead.role) updateData.role = emailIntel.role;
    if (emailIntel.phone && !lead.phone) updateData.phone = emailIntel.phone;

    // Sentiment signals
    if (emailIntel.urgency) updateData.urgency = emailIntel.urgency;
    if (emailIntel.budgetRange) updateData.budgetRange = emailIntel.budgetRange;

    // Update predicted concern
    if (emailIntel.concerns) updateData.predictedConcern = emailIntel.concerns;

    // Merge competitors
    if (emailIntel.competitors?.length) {
      const existing = lead.competitorsMentioned || [];
      const merged = [...new Set([...existing, ...emailIntel.competitors])];
      updateData.competitorsMentioned = merged;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.lead.update({ where: { id: leadId }, data: updateData });
      this.logger.log(
        `[Pipeline] Enriched lead ${leadId} with ${Object.keys(updateData).length} fields from email`,
      );
    }
  }

  // ── AI extraction: business intelligence from transcript ──────────────

  private async extractBusinessIntel(
    transcript: string,
    leadName?: string,
  ): Promise<Record<string, any>> {
    const geminiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!geminiKey) return {};

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Extract business intelligence from this sales conversation transcript.
Customer name: ${leadName || "Customer"}

Transcript:
${transcript.substring(0, 8000)}

Return JSON with ONLY fields you are confident about (omit uncertain ones):
{
  "company": "company name if mentioned",
  "role": "job title/role if mentioned",
  "email": "email if mentioned",
  "phone": "phone number if mentioned",
  "budgetRange": "budget range if discussed (e.g. '50k-1L')",
  "budgetApprover": "who approves budget if mentioned",
  "urgency": "none|low|medium|high|urgent",
  "dealValue": 0,
  "competitorsPros": "what they like about competitors if mentioned",
  "competitors": ["competitor names mentioned"],
  "predictedConcern": "main concern/objection",
  "objections": ["specific objections raised"],
  "openLoops": ["unresolved topics that need follow-up"],
  "preferredCallTime": "preferred time for calls if mentioned"
}`,
              }],
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!res.ok) return {};
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return {};
      return JSON.parse(text);
    } catch (err: any) {
      this.logger.warn(`Business intel extraction failed: ${err.message}`);
      return {};
    }
  }

  // ── AI extraction: intel from email content ───────────────────────────

  private async extractEmailIntel(
    emailContent: string,
    leadName?: string,
  ): Promise<Record<string, any> | null> {
    const geminiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!geminiKey || emailContent.length < 30) return null;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Extract useful sales intelligence from this email.
From customer: ${leadName || "Unknown"}

Email content:
${emailContent.substring(0, 3000)}

Return JSON with ONLY fields you are confident about (omit uncertain ones):
{
  "company": "company name if mentioned",
  "role": "job title if in signature",
  "phone": "phone if in signature",
  "urgency": "none|low|medium|high|urgent",
  "budgetRange": "budget info if mentioned",
  "concerns": "main concern expressed",
  "competitors": ["competitor names mentioned"],
  "sentiment": "positive|neutral|negative",
  "buyingIntent": "none|low|medium|high"
}`,
              }],
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!res.ok) return null;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      return JSON.parse(text);
    } catch (err: any) {
      this.logger.warn(`Email intel extraction failed: ${err.message}`);
      return null;
    }
  }

  // ── Public: get the current strategy for a lead ───────────────────────

  async getCurrentStrategy(leadId: string): Promise<StrategyRecommendation | null> {
    return this.leadStrategy.suggestNextAction(leadId);
  }
}
