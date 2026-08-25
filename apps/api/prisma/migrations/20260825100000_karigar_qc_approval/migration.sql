-- A completed QC stage must be distinguishable from a generic stage update.
-- Existing completed stages intentionally remain unapproved until QC is inspected.
ALTER TABLE "KarigarJobStage"
ADD COLUMN "qcApprovedAt" TIMESTAMP(3);
