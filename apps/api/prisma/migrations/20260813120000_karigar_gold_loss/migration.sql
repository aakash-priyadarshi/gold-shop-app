-- Workshop gold ledger: stages, casting trees, append-only metal movements.
-- Does not alter invoice / catalogue billing wastage.

CREATE TYPE "KarigarStage" AS ENUM ('CASTING', 'FILING', 'POLISHING', 'SETTING', 'FINAL_POLISH', 'QC');
CREATE TYPE "KarigarMovementType" AS ENUM ('ISSUE', 'TRANSFER', 'RETURN_FINISHED', 'RETURN_SPRUE', 'SCRAP', 'DUST', 'ADJUST');

ALTER TABLE "KarigarJob" ADD COLUMN "workshopId" TEXT;
ALTER TABLE "KarigarJob" ADD COLUMN "metalKey" TEXT NOT NULL DEFAULT 'goldGrains24k';
ALTER TABLE "KarigarJob" ADD COLUMN "allowedWastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 1;

CREATE TABLE "KarigarJobStage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workshopId" TEXT,
    "stage" "KarigarStage" NOT NULL,
    "goldInGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goldOutGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dustGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowedWastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KarigarJobStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KarigarCastingTree" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Tree',
    "metalKey" TEXT NOT NULL DEFAULT 'goldGrains24k',
    "purity" TEXT NOT NULL DEFAULT '24K',
    "issuedGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finishedGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sprueButtonGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recoverableGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowedWastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KarigarCastingTree_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KarigarCastingTreeLine" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weightGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KarigarCastingTreeLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KarigarMetalMovement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "workshopId" TEXT,
    "jobId" TEXT,
    "treeId" TEXT,
    "stage" "KarigarStage",
    "type" "KarigarMovementType" NOT NULL,
    "metalKey" TEXT NOT NULL DEFAULT 'goldGrains24k',
    "weightGrams" DOUBLE PRECISION NOT NULL,
    "purity" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KarigarMetalMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KarigarJobStage_jobId_stage_key" ON "KarigarJobStage"("jobId", "stage");
CREATE INDEX "KarigarJobStage_shopId_jobId_idx" ON "KarigarJobStage"("shopId", "jobId");
CREATE INDEX "KarigarJob_workshopId_idx" ON "KarigarJob"("workshopId");
CREATE INDEX "KarigarCastingTree_shopId_jobId_idx" ON "KarigarCastingTree"("shopId", "jobId");
CREATE INDEX "KarigarCastingTreeLine_treeId_idx" ON "KarigarCastingTreeLine"("treeId");
CREATE INDEX "KarigarMetalMovement_shopId_createdAt_idx" ON "KarigarMetalMovement"("shopId", "createdAt");
CREATE INDEX "KarigarMetalMovement_jobId_idx" ON "KarigarMetalMovement"("jobId");
CREATE INDEX "KarigarMetalMovement_workshopId_idx" ON "KarigarMetalMovement"("workshopId");

ALTER TABLE "KarigarJob" ADD CONSTRAINT "KarigarJob_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "KarigarWorkshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarJobStage" ADD CONSTRAINT "KarigarJobStage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarJobStage" ADD CONSTRAINT "KarigarJobStage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarJobStage" ADD CONSTRAINT "KarigarJobStage_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "KarigarWorkshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarCastingTree" ADD CONSTRAINT "KarigarCastingTree_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarCastingTree" ADD CONSTRAINT "KarigarCastingTree_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarCastingTreeLine" ADD CONSTRAINT "KarigarCastingTreeLine_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarMetalMovement" ADD CONSTRAINT "KarigarMetalMovement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarMetalMovement" ADD CONSTRAINT "KarigarMetalMovement_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "KarigarWorkshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KarigarMetalMovement" ADD CONSTRAINT "KarigarMetalMovement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KarigarMetalMovement" ADD CONSTRAINT "KarigarMetalMovement_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE SET NULL ON UPDATE CASCADE;
