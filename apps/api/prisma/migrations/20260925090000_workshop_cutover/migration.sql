-- Existing posted TRACEABLE production remains usable. Shops with no physical
-- journal history remain in setup until an audited opening is posted.
ALTER TABLE "Shop" ADD COLUMN "workshopInitializedAt" TIMESTAMP(3);

UPDATE "Shop" AS shop
SET "workshopInitializedAt" = journal."postedAt"
FROM (
  SELECT "shopId", MIN("postedAt") AS "postedAt"
  FROM "WorkshopMetalJournal"
  WHERE "status" = 'POSTED'
  GROUP BY "shopId"
) AS journal
WHERE shop."id" = journal."shopId"
  AND shop."workshopLedgerVersion" = 'TRACEABLE';

ALTER TYPE "WorkshopScaleCaptureMethod" ADD VALUE 'MANUAL_OVERRIDE';
