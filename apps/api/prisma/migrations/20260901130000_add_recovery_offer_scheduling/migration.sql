-- Makes delayed recovery-offer delivery visible and queryable by administrators.
ALTER TABLE "RecoveryOffer" ADD COLUMN "scheduledFor" TIMESTAMP(3);

CREATE INDEX "RecoveryOffer_status_scheduledFor_idx"
  ON "RecoveryOffer"("status", "scheduledFor");
