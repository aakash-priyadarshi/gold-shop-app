import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { PostCallProcessor } from "./post-call-processor.service";
import { LeadInteractionService } from "./lead-interaction.service";
import { LeadScoringService } from "./lead-scoring.service";

@Injectable()
export class CallOrchestratorService {
  private readonly logger = new Logger(CallOrchestratorService.name);
  private twilioClient: any;
  private readonly fromNumber: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private postCallProcessor: PostCallProcessor,
    private interactionService: LeadInteractionService,
    private leadScoring: LeadScoringService,
  ) {
    const accountSid = this.config.get("TWILIO_ACCOUNT_SID");
    const authToken = this.config.get("TWILIO_AUTH_TOKEN");
    this.fromNumber = this.config.get("TWILIO_PHONE_NUMBER") || "";

    if (accountSid && authToken) {
      // Dynamic import to avoid crash if twilio isn't needed yet
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require("twilio");
        this.twilioClient = twilio(accountSid, authToken);
        this.logger.log("Twilio client initialized");
      } catch {
        this.logger.warn("Twilio SDK not available — calls disabled");
      }
    } else {
      this.logger.warn("Twilio credentials missing — calls disabled");
    }
  }

  /** Initiate an outbound call to a lead */
  async initiateCall(params: {
    agentId: string;
    leadId: string;
    campaignId?: string;
    webhookBaseUrl: string;
    goal?: string;
  }) {
    const lead = await this.prisma.lead.findUnique({ where: { id: params.leadId } });
    if (!lead?.phone) throw new Error("Lead has no phone number");

    if (lead.doNotCall) throw new Error("Lead is on Do Not Call list");

    // Create the call session record first
    const session = await this.prisma.callSession.create({
      data: {
        agentId: params.agentId,
        leadId: params.leadId,
        campaignId: params.campaignId,
        direction: "OUTBOUND",
        status: "RINGING",
        fromNumber: this.fromNumber,
        toNumber: lead.phone,
        goalForCall: params.goal,
      },
    });

    if (!this.twilioClient) {
      this.logger.warn("No Twilio client — simulating call for dev mode");
      return session;
    }

    try {
      const twilioCall = await this.twilioClient.calls.create({
        to: lead.phone,
        from: this.fromNumber,
        url: `${params.webhookBaseUrl}/api/ai-sales/twilio/voice/${session.id}`,
        statusCallback: `${params.webhookBaseUrl}/api/ai-sales/twilio/status/${session.id}`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        record: true,
        recordingStatusCallback: `${params.webhookBaseUrl}/api/ai-sales/twilio/recording/${session.id}`,
      });

      await this.prisma.callSession.update({
        where: { id: session.id },
        data: { twilioCallSid: twilioCall.sid },
      });

      // Update lead's last contact
      await this.prisma.lead.update({
        where: { id: params.leadId },
        data: {
          lastContactedAt: new Date(),
        },
      });

      return { ...session, twilioCallSid: twilioCall.sid };
    } catch (err: any) {
      this.logger.error(`Failed to initiate call: ${err.message}`);
      await this.prisma.callSession.update({
        where: { id: session.id },
        data: { status: "FAILED" },
      });
      // Surface a user-friendly message for Twilio trial limitations
      if (err.message?.includes("unverified")) {
        throw new Error(
          `This number is unverified. Twilio trial accounts can only call verified numbers. ` +
          `Go to Twilio Console → Verified Caller IDs to add this number, or upgrade to a paid Twilio account.`,
        );
      }
      throw err;
    }
  }

  /** End an active call */
  async endCall(sessionId: string, summary?: {
    sentiment?: string;
    transcript?: string;
    summary?: string;
    emotionArc?: any;
    objectionsEncountered?: string[];
    buyingSignals?: string[];
    keyTopics?: string[];
    callPhaseReached?: string;
    followUpNeeded?: boolean;
    followUpNotes?: string;
    costLlm?: number;
    costTts?: number;
    costStt?: number;
  }) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Call session not found");

    // Calculate duration
    const duration = session.startedAt
      ? Math.round((Date.now() - session.startedAt.getTime()) / 1000)
      : 0;

    // End Twilio call if active
    if (this.twilioClient && session.twilioCallSid) {
      try {
        await this.twilioClient.calls(session.twilioCallSid).update({ status: "completed" });
      } catch (err: any) {
        this.logger.warn(`Could not end Twilio call: ${err.message}`);
      }
    }

    // Estimate Twilio cost (~$0.014/min outbound)
    const costTwilio = duration > 0 ? Math.ceil(duration / 60) * 0.014 : 0;
    const totalCost =
      costTwilio +
      (summary?.costLlm || 0) +
      (summary?.costTts || 0) +
      (summary?.costStt || 0);

    const updated = await this.prisma.callSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        duration,
        sentiment: summary?.sentiment as any,
        transcript: summary?.transcript,
        summary: summary?.summary,
        emotionArc: summary?.emotionArc,
        objectionsEncountered: summary?.objectionsEncountered,
        buyingSignals: summary?.buyingSignals,
        keyTopics: summary?.keyTopics,
        callPhaseReached: summary?.callPhaseReached,
        followUpNeeded: summary?.followUpNeeded,
        followUpNotes: summary?.followUpNotes,
        costTwilio,
        costLlm: summary?.costLlm,
        costTts: summary?.costTts,
        costStt: summary?.costStt,
        totalCost,
      },
    });

    // Update lead stage based on outcome
    if (session.leadId && summary?.buyingSignals?.length) {
      const lead = await this.prisma.lead.findUnique({ where: { id: session.leadId } });
      if (lead && lead.stage === "NEW") {
        await this.prisma.lead.update({
          where: { id: session.leadId },
          data: { stage: "CONTACTED" },
        });
      }
    }

    // ── Post-call processing: update lead, create remark, record interaction ──
    if (session.leadId) {
      this.runPostCallProcessing(session.leadId, sessionId, updated).catch((err) =>
        this.logger.error(`Post-call processing failed: ${err.message}`),
      );
    }

    return updated;
  }

  /** Run post-call processing asynchronously */
  private async runPostCallProcessing(leadId: string, sessionId: string, session: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const agent = session.agentId
      ? await this.prisma.agentVoice.findUnique({ where: { id: session.agentId } })
      : null;

    // 1. Generate call report from transcript
    let report: any = null;
    if (session.transcript) {
      report = await this.postCallProcessor.generateCallReport({
        transcript: session.transcript,
        durationSeconds: session.duration || 0,
        leadName: lead.name,
        agentName: agent?.name,
      });
    }

    // 2. Extract personality insights
    let personality: Record<string, any> = {};
    if (session.transcript) {
      personality = await this.postCallProcessor.extractPersonalityInsights(
        session.transcript, lead.name,
      );
    }

    // 3. Evaluate call goal
    let goalResult: { achieved: boolean; notes: string } | null = null;
    if (session.goalForCall && session.transcript) {
      goalResult = await this.postCallProcessor.evaluateGoal(
        session.transcript, session.goalForCall,
      );
      await this.prisma.callSession.update({
        where: { id: sessionId },
        data: {
          goalAchieved: goalResult.achieved,
          goalNotes: goalResult.notes,
        },
      });
    }

    // 4. Update lead profile with insights
    const leadUpdate: any = {
      totalCalls: { increment: 1 },
      lastContactedAt: new Date(),
    };
    if (report) {
      leadUpdate.lastCallSummary = report.summary;
    }
    if (session.summary) {
      leadUpdate.lastCallSummary = session.summary;
    }
    // Merge personality insights (only overwrite if we got new data)
    if (personality.communicationStyle) leadUpdate.communicationStyle = personality.communicationStyle;
    if (personality.decisionStyle) leadUpdate.decisionStyle = personality.decisionStyle;
    if (personality.pacePreference) leadUpdate.pacePreference = personality.pacePreference;
    if (personality.tonePreference) leadUpdate.tonePreference = personality.tonePreference;
    if (personality.respondsWellTo?.length) leadUpdate.respondsWellTo = personality.respondsWellTo;
    if (personality.getsFrustratedBy?.length) leadUpdate.getsFrustratedBy = personality.getsFrustratedBy;
    if (personality.familyDetails) leadUpdate.familyDetails = personality.familyDetails;
    if (personality.hobbies) leadUpdate.hobbies = personality.hobbies;
    if (personality.recentLifeEvents) leadUpdate.recentLifeEvents = personality.recentLifeEvents;
    if (personality.notableQuotes) leadUpdate.notableQuotes = personality.notableQuotes;
    if (personality.budgetRange) leadUpdate.budgetRange = personality.budgetRange;
    if (personality.urgency) leadUpdate.urgency = personality.urgency;

    // Set AI strategy notes
    if (report?.recommendedNextSteps?.length) {
      leadUpdate.nextCallStrategy = report.recommendedNextSteps.join("; ");
    }
    if (report?.objectionsRaised?.length) {
      leadUpdate.whatToAvoidNextCall = `Previous objections: ${report.objectionsRaised.join(", ")}`;
    }
    if (session.buyingSignals?.length) {
      leadUpdate.whatWorkedLastCall = `Buying signals: ${session.buyingSignals.join(", ")}`;
    }

    await this.prisma.lead.update({ where: { id: leadId }, data: leadUpdate });

    // 5. Re-score the lead
    try {
      const score = await this.leadScoring.scoreLeead(leadId);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { score: score.total, temperature: score.tier },
      });
    } catch (err: any) {
      this.logger.warn(`Lead re-scoring failed: ${err.message}`);
    }

    // 6. Create CallRemark
    const existingRemarks = await this.prisma.callRemark.count({ where: { leadId } });
    await this.prisma.callRemark.create({
      data: {
        leadId,
        callSessionId: sessionId,
        callNumber: existingRemarks + 1,
        personaUsed: agent?.name,
        personaId: agent?.id,
        summary: report?.summary || session.summary || "Call completed",
        keyTopics: report?.keyTopics || session.keyTopics || [],
        objectionsRaised: report?.objectionsRaised || session.objectionsEncountered || [],
        buyingSignals: report?.buyingSignals || session.buyingSignals || [],
        whatWorked: session.buyingSignals?.length ? ["Detected buying signals"] : [],
        nextCallStrategy: report?.recommendedNextSteps?.join("; "),
        personalDetailsCaptured: Object.keys(personality).filter(
          (k) => !["communicationStyle", "decisionStyle", "pacePreference", "tonePreference"].includes(k),
        ),
        openLoops: report?.recommendedNextSteps?.map((s: string) => ({ topic: s, status: "open" })) || [],
      },
    });

    // 7. Record interaction on timeline
    await this.interactionService.recordCallInteraction({
      leadId,
      callSessionId: sessionId,
      summary: report?.summary || session.summary,
      durationSeconds: session.duration,
      sentiment: session.sentiment,
      agentName: agent?.name,
      goalSet: session.goalForCall,
      goalAchieved: goalResult?.achieved,
      goalNotes: goalResult?.notes,
    });

    this.logger.log(`Post-call processing complete for lead ${leadId}, session ${sessionId}`);
  }

  /** Handle Twilio status webhook */
  async handleStatusCallback(sessionId: string, status: string, callSid: string) {
    const statusMap: Record<string, string> = {
      initiated: "RINGING",
      ringing: "RINGING",
      "in-progress": "IN_PROGRESS",
      answered: "IN_PROGRESS",
      completed: "COMPLETED",
      failed: "FAILED",
      busy: "NO_ANSWER",
      "no-answer": "NO_ANSWER",
      canceled: "FAILED",
    };

    const mappedStatus = (statusMap[status] || "FAILED") as any;
    await this.prisma.callSession.update({
      where: { id: sessionId },
      data: {
        status: mappedStatus,
        twilioCallSid: callSid,
        ...(status === "answered" ? { startedAt: new Date() } : {}),
      },
    });
  }

  /** Generate TwiML for Twilio voice webhook — connects to WebSocket for media streaming */
  generateTwiML(sessionId: string, wsBaseUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsBaseUrl}/ai-sales-audio">
      <Parameter name="sessionId" value="${sessionId}" />
    </Stream>
  </Connect>
</Response>`;
  }

  /** Get active calls count */
  async getActiveCalls(): Promise<number> {
    return this.prisma.callSession.count({
      where: { status: "IN_PROGRESS" },
    });
  }

  /** Get detailed call stats with cost tracking */
  async getDetailedStats(dateRange?: { from: Date; to: Date }) {
    const where: any = {};
    if (dateRange) {
      where.startedAt = { gte: dateRange.from, lte: dateRange.to };
    }

    const [total, completed, noAnswer, failed, costs] = await Promise.all([
      this.prisma.callSession.count({ where }),
      this.prisma.callSession.count({ where: { ...where, status: "COMPLETED" } }),
      this.prisma.callSession.count({ where: { ...where, status: "NO_ANSWER" } }),
      this.prisma.callSession.count({ where: { ...where, status: "FAILED" } }),
      this.prisma.callSession.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { totalCost: true, costTwilio: true, costLlm: true, costTts: true, costStt: true },
        _avg: { duration: true, totalCost: true },
      }),
    ]);

    return {
      total,
      completed,
      noAnswer,
      failed,
      answerRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDuration: Math.round(costs._avg.duration || 0),
      costs: {
        total: +(costs._sum.totalCost || 0).toFixed(4),
        twilio: +(costs._sum.costTwilio || 0).toFixed(4),
        llm: +(costs._sum.costLlm || 0).toFixed(4),
        tts: +(costs._sum.costTts || 0).toFixed(4),
        stt: +(costs._sum.costStt || 0).toFixed(4),
        avgPerCall: +(costs._avg.totalCost || 0).toFixed(4),
      },
    };
  }
}
