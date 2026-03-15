import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { PostInteractionPipelineService } from "./post-interaction-pipeline.service";

/**
 * Interaction Processing Queue
 *
 * Uses Redis-backed BullMQ to reliably process every interaction
 * (call, meeting, email) through the post-interaction pipeline.
 *
 * This ensures no interaction is lost even if the server restarts
 * mid-processing. Jobs are retried on failure with exponential backoff.
 *
 * Falls back to direct pipeline execution if Redis is unavailable.
 */
@Injectable()
export class InteractionQueueService {
  private readonly logger = new Logger(InteractionQueueService.name);

  constructor(
    @Optional() @InjectQueue("interaction-processing") private queue: Queue | null,
    private pipeline: PostInteractionPipelineService,
  ) {
    if (!queue) {
      this.logger.warn("Redis unavailable — interaction processing will run inline (no retry)");
    }
  }

  /** Enqueue a call interaction for processing */
  async enqueueCall(leadId: string, sessionId: string) {
    if (this.queue) {
      try {
        await this.queue.add(
          "process-call",
          { type: "call", leadId, sessionId },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
        this.logger.debug(`Enqueued call processing: lead=${leadId}, session=${sessionId}`);
        return;
      } catch (err: any) {
        this.logger.warn(`Queue unavailable, falling back to inline: ${err.message}`);
      }
    }
    // Fallback: run directly
    this.pipeline.afterCall(leadId, sessionId).catch(e =>
      this.logger.error(`Inline call processing failed: ${e.message}`),
    );
  }

  /** Enqueue a meeting interaction for processing */
  async enqueueMeeting(leadId: string, meetingSessionId: string, transcript?: string) {
    if (this.queue) {
      try {
        await this.queue.add(
          "process-meeting",
          { type: "meeting", leadId, meetingSessionId, transcript },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
        this.logger.debug(`Enqueued meeting processing: lead=${leadId}, session=${meetingSessionId}`);
        return;
      } catch (err: any) {
        this.logger.warn(`Queue unavailable, falling back to inline: ${err.message}`);
      }
    }
    // Fallback: run directly
    this.pipeline.afterMeeting(leadId, meetingSessionId, transcript).catch(e =>
      this.logger.error(`Inline meeting processing failed: ${e.message}`),
    );
  }

  /** Enqueue an email interaction for processing */
  async enqueueEmail(leadId: string, emailId: string, direction: "sent" | "received") {
    if (this.queue) {
      try {
        await this.queue.add(
          "process-email",
          { type: "email", leadId, emailId, direction },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
        this.logger.debug(`Enqueued email processing: lead=${leadId}, email=${emailId}`);
        return;
      } catch (err: any) {
        this.logger.warn(`Queue unavailable, falling back to inline: ${err.message}`);
      }
    }
    // Fallback: fetch email and run directly
    try {
      const prisma = (this as any).prisma;
      const email = prisma ? await prisma.leadEmail?.findUnique({ where: { id: emailId } }) : null;
      const content = email?.body || email?.subject || "";
      await this.pipeline.afterEmail(leadId, content, direction);
    } catch (e: any) {
      this.logger.error(`Inline email processing failed: ${e.message}`);
    }
  }
}

@Processor("interaction-processing")
export class InteractionQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(InteractionQueueProcessor.name);

  constructor(
    private pipeline: PostInteractionPipelineService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    const { type, leadId } = job.data;
    this.logger.log(`Processing ${type} interaction for lead ${leadId} (job ${job.id})`);

    try {
      switch (type) {
        case "call":
          await this.pipeline.afterCall(leadId, job.data.sessionId);
          break;

        case "meeting":
          await this.pipeline.afterMeeting(leadId, job.data.meetingSessionId, job.data.transcript);
          break;

        case "email": {
          // Fetch email content from DB
          const email = await this.prisma.leadEmail.findUnique({ where: { id: job.data.emailId } });
          const content = email?.body || email?.subject || "";
          await this.pipeline.afterEmail(leadId, content, job.data.direction || "sent");
          break;
        }

        default:
          this.logger.warn(`Unknown interaction type: ${type}`);
      }

      this.logger.log(`Completed ${type} processing for lead ${leadId}`);
    } catch (err: any) {
      this.logger.error(`Failed ${type} processing for lead ${leadId}: ${err.message}`);
      throw err; // BullMQ will retry
    }
  }
}
