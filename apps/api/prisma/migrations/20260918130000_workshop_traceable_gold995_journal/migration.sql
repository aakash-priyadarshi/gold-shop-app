-- TRACEABLE workshop metal journal (Gold 995 scale-backed posting).
-- Additive. Does not rewrite KarigarMetalMovement / vault Float columns.
-- Gold 995 (goldGrains995, 0.995) is distinct from goldGrains24k (24K / 0.999).

CREATE TYPE "WorkshopLedgerVersion" AS ENUM ('LEGACY', 'TRACEABLE');
CREATE TYPE "WorkshopScalePurpose" AS ENUM ('GOLD', 'STONE');
CREATE TYPE "WorkshopScaleCaptureMethod" AS ENUM ('SIMULATOR', 'DEVICE');
CREATE TYPE "WorkshopWeighingSessionStatus" AS ENUM ('OPEN', 'STABLE_CAPTURED', 'POSTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "WorkshopMetalJournalStatus" AS ENUM ('DRAFT', 'POSTED');
CREATE TYPE "WorkshopMetalJournalReferenceType" AS ENUM ('GOLD995_OPENING_BALANCE', 'GOLD995_ISSUE_TO_TREE', 'REVERSAL');
CREATE TYPE "WorkshopMetalAccountKey" AS ENUM ('GOLD995_VAULT', 'CASTING_TREE_WIP', 'OPENING_EQUITY');

ALTER TABLE "Shop" ADD COLUMN "workshopLedgerVersion" "WorkshopLedgerVersion" NOT NULL DEFAULT 'LEGACY';

CREATE TABLE "WorkshopMetalAccount" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "systemKey" "WorkshopMetalAccountKey" NOT NULL,
    "materialKey" TEXT NOT NULL,
    "purity" DECIMAL(10,6) NOT NULL,
    "balanceGrams" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopMetalAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopScaleDevice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" "WorkshopScalePurpose" NOT NULL,
    "precisionGrams" DECIMAL(10,6) NOT NULL,
    "adapterKind" VARCHAR(32) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopScaleDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopWeighingSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "jobId" TEXT,
    "treeId" TEXT NOT NULL,
    "materialKey" TEXT NOT NULL,
    "requiredPurpose" "WorkshopScalePurpose" NOT NULL,
    "status" "WorkshopWeighingSessionStatus" NOT NULL DEFAULT 'OPEN',
    "captureMethod" "WorkshopScaleCaptureMethod" NOT NULL,
    "actorUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopWeighingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopScaleReading" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "purpose" "WorkshopScalePurpose" NOT NULL,
    "weightGrams" DECIMAL(20,6) NOT NULL,
    "unit" VARCHAR(8) NOT NULL DEFAULT 'g',
    "precisionGrams" DECIMAL(10,6) NOT NULL,
    "stable" BOOLEAN NOT NULL,
    "sequence" INTEGER NOT NULL,
    "rawFrame" TEXT,
    "readingAt" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "captureMethod" "WorkshopScaleCaptureMethod" NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopScaleReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopMetalJournal" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "entryNumber" VARCHAR(64) NOT NULL,
    "status" "WorkshopMetalJournalStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceType" "WorkshopMetalJournalReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "description" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightGrams" DECIMAL(20,6) NOT NULL,
    "materialKey" TEXT NOT NULL,
    "jobId" TEXT,
    "treeId" TEXT,
    "weighingSessionId" TEXT,
    "scaleReadingId" TEXT,
    "actorUserId" TEXT,
    "captureMethod" "WorkshopScaleCaptureMethod",
    "reversalOfId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopMetalJournal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopMetalJournalLine" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debitGrams" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "creditGrams" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopMetalJournalLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkshopMetalAccount_shopId_systemKey_key" ON "WorkshopMetalAccount"("shopId", "systemKey");
CREATE UNIQUE INDEX "WorkshopMetalAccount_shopId_code_key" ON "WorkshopMetalAccount"("shopId", "code");
CREATE INDEX "WorkshopMetalAccount_shopId_isActive_idx" ON "WorkshopMetalAccount"("shopId", "isActive");

CREATE UNIQUE INDEX "WorkshopScaleDevice_shopId_name_key" ON "WorkshopScaleDevice"("shopId", "name");
CREATE INDEX "WorkshopScaleDevice_shopId_purpose_isActive_idx" ON "WorkshopScaleDevice"("shopId", "purpose", "isActive");

CREATE INDEX "WorkshopWeighingSession_shopId_status_idx" ON "WorkshopWeighingSession"("shopId", "status");
CREATE INDEX "WorkshopWeighingSession_treeId_idx" ON "WorkshopWeighingSession"("treeId");
CREATE INDEX "WorkshopWeighingSession_jobId_idx" ON "WorkshopWeighingSession"("jobId");

CREATE UNIQUE INDEX "WorkshopScaleReading_sessionId_key" ON "WorkshopScaleReading"("sessionId");
CREATE UNIQUE INDEX "WorkshopScaleReading_deviceId_sequence_key" ON "WorkshopScaleReading"("deviceId", "sequence");
CREATE INDEX "WorkshopScaleReading_shopId_capturedAt_idx" ON "WorkshopScaleReading"("shopId", "capturedAt");
CREATE INDEX "WorkshopScaleReading_deviceId_idx" ON "WorkshopScaleReading"("deviceId");

CREATE UNIQUE INDEX "WorkshopMetalJournal_weighingSessionId_key" ON "WorkshopMetalJournal"("weighingSessionId");
CREATE UNIQUE INDEX "WorkshopMetalJournal_scaleReadingId_key" ON "WorkshopMetalJournal"("scaleReadingId");
CREATE UNIQUE INDEX "WorkshopMetalJournal_reversalOfId_key" ON "WorkshopMetalJournal"("reversalOfId");
CREATE UNIQUE INDEX "WorkshopMetalJournal_shopId_entryNumber_key" ON "WorkshopMetalJournal"("shopId", "entryNumber");
CREATE UNIQUE INDEX "WorkshopMetalJournal_shopId_idempotencyKey_key" ON "WorkshopMetalJournal"("shopId", "idempotencyKey");
CREATE UNIQUE INDEX "WorkshopMetalJournal_shopId_referenceType_referenceId_key" ON "WorkshopMetalJournal"("shopId", "referenceType", "referenceId");
CREATE INDEX "WorkshopMetalJournal_shopId_transactionDate_idx" ON "WorkshopMetalJournal"("shopId", "transactionDate");
CREATE INDEX "WorkshopMetalJournal_jobId_idx" ON "WorkshopMetalJournal"("jobId");
CREATE INDEX "WorkshopMetalJournal_treeId_idx" ON "WorkshopMetalJournal"("treeId");

CREATE INDEX "WorkshopMetalJournalLine_journalId_idx" ON "WorkshopMetalJournalLine"("journalId");
CREATE INDEX "WorkshopMetalJournalLine_accountId_idx" ON "WorkshopMetalJournalLine"("accountId");

ALTER TABLE "WorkshopMetalAccount" ADD CONSTRAINT "WorkshopMetalAccount_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopScaleDevice" ADD CONSTRAINT "WorkshopScaleDevice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WorkshopScaleDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopWeighingSession" ADD CONSTRAINT "WorkshopWeighingSession_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopScaleReading" ADD CONSTRAINT "WorkshopScaleReading_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopScaleReading" ADD CONSTRAINT "WorkshopScaleReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WorkshopScaleDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopScaleReading" ADD CONSTRAINT "WorkshopScaleReading_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkshopWeighingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KarigarJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "KarigarCastingTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_weighingSessionId_fkey" FOREIGN KEY ("weighingSessionId") REFERENCES "WorkshopWeighingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_scaleReadingId_fkey" FOREIGN KEY ("scaleReadingId") REFERENCES "WorkshopScaleReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournal" ADD CONSTRAINT "WorkshopMetalJournal_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "WorkshopMetalJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournalLine" ADD CONSTRAINT "WorkshopMetalJournalLine_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "WorkshopMetalJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopMetalJournalLine" ADD CONSTRAINT "WorkshopMetalJournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WorkshopMetalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkshopMetalAccount" ADD CONSTRAINT "WorkshopMetalAccount_nonnegative_balance" CHECK ("balanceGrams" >= 0);
ALTER TABLE "WorkshopMetalJournalLine" ADD CONSTRAINT "WorkshopMetalJournalLine_one_sided_positive" CHECK (
    ("debitGrams" > 0 AND "creditGrams" = 0) OR
    ("creditGrams" > 0 AND "debitGrams" = 0)
);

-- Match the financial ledger's database guard: lines are editable only while
-- the header is DRAFT, and a POSTED header and its lines never change.
CREATE FUNCTION workshop_metal_guard_line_mutation()
RETURNS TRIGGER AS $$
DECLARE
    parent_status "WorkshopMetalJournalStatus";
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT "status" INTO parent_status FROM "WorkshopMetalJournal" WHERE "id" = OLD."journalId";
        IF parent_status IS NULL OR parent_status = 'POSTED' THEN
            RAISE EXCEPTION 'Posted or missing workshop metal journal lines are immutable';
        END IF;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT "status" INTO parent_status FROM "WorkshopMetalJournal" WHERE "id" = NEW."journalId";
        IF parent_status IS NULL OR parent_status = 'POSTED' THEN
            RAISE EXCEPTION 'Cannot add lines to a posted or missing workshop metal journal';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WorkshopMetalJournalLine_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkshopMetalJournalLine"
FOR EACH ROW EXECUTE FUNCTION workshop_metal_guard_line_mutation();

CREATE FUNCTION workshop_metal_assert_balanced(entry_id TEXT)
RETURNS VOID AS $$
DECLARE
    expected DECIMAL(20,6);
    line_count INTEGER;
    total_debit DECIMAL(20,6);
    total_credit DECIMAL(20,6);
BEGIN
    SELECT "weightGrams" INTO expected FROM "WorkshopMetalJournal" WHERE "id" = entry_id;
    SELECT COUNT(*), COALESCE(SUM("debitGrams"), 0), COALESCE(SUM("creditGrams"), 0)
    INTO line_count, total_debit, total_credit
    FROM "WorkshopMetalJournalLine" WHERE "journalId" = entry_id;
    IF expected IS NULL OR expected <= 0 OR line_count < 2
       OR total_debit <> expected OR total_credit <> expected THEN
        RAISE EXCEPTION 'Workshop metal journal % is not balanced', entry_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION workshop_metal_guard_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."status" <> 'DRAFT' THEN
            RAISE EXCEPTION 'Workshop metal journals must be inserted as DRAFT';
        END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN
        IF OLD."status" = 'POSTED' THEN
            RAISE EXCEPTION 'Posted workshop metal journals are immutable';
        END IF;
        RETURN OLD;
    END IF;
    IF OLD."status" = 'DRAFT' AND NEW."status" = 'POSTED'
       AND (TO_JSONB(OLD) - 'status') = (TO_JSONB(NEW) - 'status') THEN
        PERFORM workshop_metal_assert_balanced(NEW."id");
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Workshop metal journal headers are immutable except for DRAFT to POSTED';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WorkshopMetalJournal_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkshopMetalJournal"
FOR EACH ROW EXECUTE FUNCTION workshop_metal_guard_journal_mutation();

-- A tree chosen for a traceable weighing session is marked Gold 995 under a
-- row lock. This guard serializes legacy inserts against that choice, even if
-- a client passed the default 24K material key before the tree was marked.
CREATE FUNCTION workshop_metal_guard_legacy_movement()
RETURNS TRIGGER AS $$
DECLARE
    ledger_version "WorkshopLedgerVersion";
    tree_material TEXT;
BEGIN
    SELECT "workshopLedgerVersion" INTO ledger_version
    FROM "Shop" WHERE "id" = NEW."shopId" FOR SHARE;
    IF ledger_version = 'TRACEABLE' THEN
        IF NEW."treeId" IS NOT NULL THEN
            SELECT "metalKey" INTO tree_material FROM "KarigarCastingTree"
            WHERE "id" = NEW."treeId" AND "shopId" = NEW."shopId" FOR SHARE;
        END IF;
        IF NEW."metalKey" = 'goldGrains995' OR tree_material = 'goldGrains995' THEN
            RAISE EXCEPTION 'Gold 995 movements require a WorkshopScaleReading and WorkshopMetalJournal';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "KarigarMetalMovement_traceable_gold995_guard"
BEFORE INSERT ON "KarigarMetalMovement"
FOR EACH ROW EXECUTE FUNCTION workshop_metal_guard_legacy_movement();
