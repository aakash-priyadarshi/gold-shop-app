-- CreateEnum
CREATE TYPE "WorkshopAccountBucket" AS ENUM ('VAULT', 'WIP', 'PROCESS', 'TRANSIT', 'REUSABLE', 'SCRAP', 'RECOVERY_PENDING', 'REFINERY', 'FINISHED', 'TRANSFER_VARIANCE', 'PROCESS_VARIANCE', 'RECOVERY_VARIANCE', 'OPENING_EQUITY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'MATERIAL_OPENING_BALANCE';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'MATERIAL_ISSUE';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'LEGACY_WIP_ALLOCATION';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'PROCESS_INPUT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'PROCESS_OUTPUT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'MIXED_OUTPUT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'TRANSFER_DISPATCH';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'TRANSFER_RECEIPT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'RECOVERY_DEPOSIT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'RECOVERY_SEND';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'RECOVERY_RESULT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'FINISHED_RECEIPT';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'MANUAL_OVERRIDE';
ALTER TYPE "WorkshopMetalJournalReferenceType" ADD VALUE 'CORRECTION_REPLACEMENT';

-- AlterTable
ALTER TABLE "WorkshopMetalAccount" ADD COLUMN     "bucket" "WorkshopAccountBucket" NOT NULL DEFAULT 'VAULT',
ADD COLUMN     "scopeId" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "systemKey" DROP NOT NULL,
ALTER COLUMN "purity" DROP NOT NULL;

-- Preserve the identities of PR #54 accounts while introducing scoped,
-- material-specific buckets. Backfill before the new compound unique index.
UPDATE "WorkshopMetalAccount"
SET "bucket" = CASE "systemKey"
  WHEN 'CASTING_TREE_WIP' THEN 'WIP'::"WorkshopAccountBucket"
  WHEN 'OPENING_EQUITY' THEN 'OPENING_EQUITY'::"WorkshopAccountBucket"
  ELSE 'VAULT'::"WorkshopAccountBucket"
END;

-- AlterTable
ALTER TABLE "WorkshopMetalJournal" ADD COLUMN     "batchChildId" TEXT,
ADD COLUMN     "processRunId" TEXT,
ADD COLUMN     "recoveryContainerId" TEXT,
ADD COLUMN     "recoveryEventId" TEXT,
ADD COLUMN     "replacementForId" TEXT,
ADD COLUMN     "transferId" TEXT;

-- AlterTable
ALTER TABLE "WorkshopScaleDevice" ADD COLUMN     "profile" JSONB,
ADD COLUMN "nextSequence" INTEGER NOT NULL DEFAULT 1;
UPDATE "WorkshopScaleDevice" AS device
SET "nextSequence" = COALESCE((SELECT MAX(reading."sequence") + 1 FROM "WorkshopScaleReading" AS reading WHERE reading."deviceId" = device."id"), 1);

-- Preserve the stability evidence received with each physical capture.
ALTER TABLE "WorkshopScaleReading" ADD COLUMN "sampleFrames" JSONB;

-- One physically weighed finished receipt creates at most one inventory item.
ALTER TABLE "InventoryItem" ADD COLUMN "workshopReceiptJournalId" TEXT;
CREATE UNIQUE INDEX "InventoryItem_workshopReceiptJournalId_key" ON "InventoryItem"("workshopReceiptJournalId");
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_workshopReceiptJournalId_fkey" FOREIGN KEY ("workshopReceiptJournalId") REFERENCES "WorkshopMetalJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WorkshopWeighingSession" ADD COLUMN     "batchChildId" TEXT,
ADD COLUMN "assignedSequence" INTEGER,
ADD COLUMN     "destinationAccountId" TEXT,
ADD COLUMN     "movementKind" VARCHAR(40) NOT NULL DEFAULT 'GOLD995_ISSUE',
ADD COLUMN     "processRunId" TEXT,
ADD COLUMN     "recoveryContainerId" TEXT,
ADD COLUMN     "recoveryEventId" TEXT,
ADD COLUMN     "sourceAccountId" TEXT,
ADD COLUMN     "transferId" TEXT,
ALTER COLUMN "treeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WorkshopMaterial" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" TEXT NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "scalePurpose" "WorkshopScalePurpose" NOT NULL,
    "theoreticalPurity" DECIMAL(10,6),
    "composition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopAlloyRecipe" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "targetFineGoldFraction" DECIMAL(10,6) NOT NULL,
    "alloyFineGoldFraction" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "components" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopAlloyRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopProcessDefinition" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopProcessDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRouteTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopRouteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRouteStep" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "templateId" TEXT,
    "jobId" TEXT,
    "definitionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopRouteStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopWorkstation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "definitionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopWorkstation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopBatchChild" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeLineId" TEXT,
    "kind" VARCHAR(24) NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopBatchChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopProcessRun" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "batchChildId" TEXT,
    "definitionId" TEXT NOT NULL,
    "routeStepId" TEXT,
    "recipeId" TEXT,
    "targetWeightGrams" DECIMAL(20,6),
    "workstationId" TEXT,
    "department" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    "operatorUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "approvalUserId" TEXT,
    "approvalAt" TIMESTAMP(3),
    "approvalReason" TEXT,

    CONSTRAINT "WorkshopProcessRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopToleranceRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "movementKind" VARCHAR(40) NOT NULL,
    "materialKey" TEXT NOT NULL DEFAULT '',
    "scalePurpose" "WorkshopScalePurpose" NOT NULL,
    "maxDifferenceGrams" DECIMAL(20,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopToleranceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopTransfer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobId" TEXT,
    "treeId" TEXT,
    "materialKey" TEXT NOT NULL,
    "fromDepartment" TEXT NOT NULL,
    "toDepartment" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PREPARED',
    "dispatchReadingId" TEXT,
    "receiveReadingId" TEXT,
    "dispatchUserId" TEXT,
    "receiveUserId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "differenceGrams" DECIMAL(20,6),
    "toleranceRuleId" TEXT,
    "exceptionReason" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRecoveryContainer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "materialKey" TEXT NOT NULL,
    "sourceProcessRunId" TEXT,
    "workstationId" TEXT,
    "status" VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "destination" TEXT,

    CONSTRAINT "WorkshopRecoveryContainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRecoveryEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    "sendReadingId" TEXT,
    "sendAt" TIMESTAMP(3),
    "recoveredMaterialKey" TEXT,
    "varianceGrams" DECIMAL(20,6),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopRecoveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopMaterialAssay" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "recoveryEventId" TEXT,
    "fineGoldFraction" DECIMAL(10,6) NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" TEXT,
    "actorUserId" TEXT NOT NULL,
    "assayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopMaterialAssay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopMaterial_shopId_kind_isActive_idx" ON "WorkshopMaterial"("shopId", "kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopMaterial_shopId_key_key" ON "WorkshopMaterial"("shopId", "key");

-- CreateIndex
CREATE INDEX "WorkshopAlloyRecipe_shopId_isActive_idx" ON "WorkshopAlloyRecipe"("shopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopAlloyRecipe_shopId_name_version_key" ON "WorkshopAlloyRecipe"("shopId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopProcessDefinition_shopId_name_key" ON "WorkshopProcessDefinition"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRouteTemplate_shopId_name_key" ON "WorkshopRouteTemplate"("shopId", "name");

-- CreateIndex
CREATE INDEX "WorkshopRouteStep_shopId_jobId_position_idx" ON "WorkshopRouteStep"("shopId", "jobId", "position");

-- CreateIndex
CREATE INDEX "WorkshopRouteStep_templateId_position_idx" ON "WorkshopRouteStep"("templateId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopWorkstation_shopId_name_key" ON "WorkshopWorkstation"("shopId", "name");

-- CreateIndex
CREATE INDEX "WorkshopBatchChild_shopId_treeId_idx" ON "WorkshopBatchChild"("shopId", "treeId");

-- CreateIndex
CREATE INDEX "WorkshopProcessRun_shopId_jobId_startedAt_idx" ON "WorkshopProcessRun"("shopId", "jobId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkshopProcessRun_treeId_status_idx" ON "WorkshopProcessRun"("treeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopToleranceRule_shopId_movementKind_materialKey_scale_key" ON "WorkshopToleranceRule"("shopId", "movementKind", "materialKey", "scalePurpose");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopTransfer_dispatchReadingId_key" ON "WorkshopTransfer"("dispatchReadingId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopTransfer_receiveReadingId_key" ON "WorkshopTransfer"("receiveReadingId");

-- CreateIndex
CREATE INDEX "WorkshopTransfer_shopId_status_createdAt_idx" ON "WorkshopTransfer"("shopId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkshopRecoveryContainer_shopId_status_idx" ON "WorkshopRecoveryContainer"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRecoveryContainer_shopId_code_key" ON "WorkshopRecoveryContainer"("shopId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopRecoveryEvent_sendReadingId_key" ON "WorkshopRecoveryEvent"("sendReadingId");

-- CreateIndex
CREATE INDEX "WorkshopRecoveryEvent_shopId_status_idx" ON "WorkshopRecoveryEvent"("shopId", "status");

-- CreateIndex
CREATE INDEX "WorkshopMaterialAssay_shopId_materialId_assayedAt_idx" ON "WorkshopMaterialAssay"("shopId", "materialId", "assayedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopMetalAccount_shopId_materialKey_bucket_scopeId_key" ON "WorkshopMetalAccount"("shopId", "materialKey", "bucket", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopMetalJournal_replacementForId_key" ON "WorkshopMetalJournal"("replacementForId");

CREATE INDEX "WorkshopMetalJournal_recoveryEventId_idx" ON "WorkshopMetalJournal"("recoveryEventId");

CREATE INDEX "WorkshopWeighingSession_recoveryEventId_idx" ON "WorkshopWeighingSession"("recoveryEventId");

-- CreateIndex
CREATE INDEX "WorkshopMetalJournal_processRunId_idx" ON "WorkshopMetalJournal"("processRunId");

-- CreateIndex
CREATE INDEX "WorkshopMetalJournal_transferId_idx" ON "WorkshopMetalJournal"("transferId");

-- CreateIndex
CREATE INDEX "WorkshopMetalJournal_recoveryContainerId_idx" ON "WorkshopMetalJournal"("recoveryContainerId");

-- CreateIndex
CREATE INDEX "WorkshopMetalJournal_batchChildId_idx" ON "WorkshopMetalJournal"("batchChildId");

-- AddForeignKey
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_replacementForId_fkey" FOREIGN KEY ("replacementForId") REFERENCES "WorkshopMetalJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_processRunId_fkey" FOREIGN KEY ("processRunId") REFERENCES "WorkshopProcessRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WorkshopTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_recoveryContainerId_fkey" FOREIGN KEY ("recoveryContainerId") REFERENCES "WorkshopRecoveryContainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_recoveryEventId_fkey" FOREIGN KEY ("recoveryEventId") REFERENCES "WorkshopRecoveryEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_batchChildId_fkey" FOREIGN KEY ("batchChildId") REFERENCES "WorkshopBatchChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "WorkshopMetalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "WorkshopMetalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_processRunId_fkey" FOREIGN KEY ("processRunId") REFERENCES "WorkshopProcessRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WorkshopTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_recoveryContainerId_fkey" FOREIGN KEY ("recoveryContainerId") REFERENCES "WorkshopRecoveryContainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_recoveryEventId_fkey" FOREIGN KEY ("recoveryEventId") REFERENCES "WorkshopRecoveryEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_batchChildId_fkey" FOREIGN KEY ("batchChildId") REFERENCES "WorkshopBatchChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMaterial" ADD CONSTRAINT "WorkshopMaterial_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopAlloyRecipe" ADD CONSTRAINT "WorkshopAlloyRecipe_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessDefinition" ADD CONSTRAINT "WorkshopProcessDefinition_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRouteTemplate" ADD CONSTRAINT "WorkshopRouteTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRouteStep" ADD CONSTRAINT "WorkshopRouteStep_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRouteStep" ADD CONSTRAINT "WorkshopRouteStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkshopRouteTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRouteStep" ADD CONSTRAINT "WorkshopRouteStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRouteStep" ADD CONSTRAINT "WorkshopRouteStep_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkshopProcessDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWorkstation" ADD CONSTRAINT "WorkshopWorkstation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWorkstation" ADD CONSTRAINT "WorkshopWorkstation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkshopProcessDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBatchChild" ADD CONSTRAINT "WorkshopBatchChild_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBatchChild" ADD CONSTRAINT "WorkshopBatchChild_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBatchChild" ADD CONSTRAINT "WorkshopBatchChild_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBatchChild" ADD CONSTRAINT "WorkshopBatchChild_treeLineId_fkey" FOREIGN KEY ("treeLineId") REFERENCES "KarigarCastingTreeLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_batchChildId_fkey" FOREIGN KEY ("batchChildId") REFERENCES "WorkshopBatchChild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkshopProcessDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_routeStepId_fkey" FOREIGN KEY ("routeStepId") REFERENCES "WorkshopRouteStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "WorkshopAlloyRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProcessRun" ADD CONSTRAINT "WorkshopProcessRun_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "WorkshopWorkstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopToleranceRule" ADD CONSTRAINT "WorkshopToleranceRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_dispatchReadingId_fkey" FOREIGN KEY ("dispatchReadingId") REFERENCES "WorkshopScaleReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_receiveReadingId_fkey" FOREIGN KEY ("receiveReadingId") REFERENCES "WorkshopScaleReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTransfer" ADD CONSTRAINT "WorkshopTransfer_toleranceRuleId_fkey" FOREIGN KEY ("toleranceRuleId") REFERENCES "WorkshopToleranceRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryContainer" ADD CONSTRAINT "WorkshopRecoveryContainer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryContainer" ADD CONSTRAINT "WorkshopRecoveryContainer_sourceProcessRunId_fkey" FOREIGN KEY ("sourceProcessRunId") REFERENCES "WorkshopProcessRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryContainer" ADD CONSTRAINT "WorkshopRecoveryContainer_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "WorkshopWorkstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryEvent" ADD CONSTRAINT "WorkshopRecoveryEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryEvent" ADD CONSTRAINT "WorkshopRecoveryEvent_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "WorkshopRecoveryContainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRecoveryEvent" ADD CONSTRAINT "WorkshopRecoveryEvent_sendReadingId_fkey" FOREIGN KEY ("sendReadingId") REFERENCES "WorkshopScaleReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMaterialAssay" ADD CONSTRAINT "WorkshopMaterialAssay_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMaterialAssay" ADD CONSTRAINT "WorkshopMaterialAssay_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "WorkshopMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopMaterialAssay" ADD CONSTRAINT "WorkshopMaterialAssay_recoveryEventId_fkey" FOREIGN KEY ("recoveryEventId") REFERENCES "WorkshopRecoveryEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
