import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { Job } from "bull";
import {
  DELIVER_RECOVERY_OFFER_JOB,
  RECOVERY_OFFERS_QUEUE,
  RecoveryOfferDeliveryJob,
  RecoveryOffersService,
} from "./recovery-offers.service";

@Injectable()
@Processor(RECOVERY_OFFERS_QUEUE)
export class RecoveryOfferProcessor {
  constructor(private readonly recoveryOffers: RecoveryOffersService) {}

  @Process(DELIVER_RECOVERY_OFFER_JOB)
  async deliver(job: Job<RecoveryOfferDeliveryJob>) {
    try {
      return await this.recoveryOffers.deliverQueuedOffer(job.data);
    } catch (error) {
      const totalAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 >= totalAttempts) {
        const tokenHash = createHash("sha256")
          .update(job.data.rawToken)
          .digest("hex");
        await this.recoveryOffers.markDeliveryFailed(
          job.data.offerId,
          tokenHash,
          error instanceof Error ? error.message : "Email delivery failed",
        );
      }
      throw error;
    }
  }
}
