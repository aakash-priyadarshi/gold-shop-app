-- Committee chit fund (manual winner MVP).
-- Separate from individual SavingsMember gold savings schemes.
-- Do NOT run migrate deploy without explicit confirmation (production DB).

CREATE TYPE "ChitGroupStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ChitCycleStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "ChitGroup" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chitValue" DOUBLE PRECISION NOT NULL,
    "memberSlots" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "foremanCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'NPR',
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "ChitGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChitGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChitMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "hasWon" BOOLEAN NOT NULL DEFAULT false,
    "wonCycleNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChitMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChitCycle" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChitCycleStatus" NOT NULL DEFAULT 'OPEN',
    "winnerMemberId" TEXT,
    "netPrize" DOUBLE PRECISION,
    "foremanCommission" DOUBLE PRECISION,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChitCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChitCyclePayment" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChitCyclePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChitGroup_shopId_idx" ON "ChitGroup"("shopId");
CREATE INDEX "ChitGroup_shopId_status_idx" ON "ChitGroup"("shopId", "status");
CREATE INDEX "ChitMember_groupId_idx" ON "ChitMember"("groupId");
CREATE UNIQUE INDEX "ChitMember_groupId_ticketNumber_key" ON "ChitMember"("groupId", "ticketNumber");
CREATE INDEX "ChitCycle_groupId_status_idx" ON "ChitCycle"("groupId", "status");
CREATE UNIQUE INDEX "ChitCycle_groupId_cycleNumber_key" ON "ChitCycle"("groupId", "cycleNumber");
CREATE INDEX "ChitCyclePayment_cycleId_idx" ON "ChitCyclePayment"("cycleId");
CREATE INDEX "ChitCyclePayment_memberId_idx" ON "ChitCyclePayment"("memberId");
CREATE UNIQUE INDEX "ChitCyclePayment_clientId_key" ON "ChitCyclePayment"("clientId");
CREATE UNIQUE INDEX "ChitCyclePayment_cycleId_memberId_key" ON "ChitCyclePayment"("cycleId", "memberId");

ALTER TABLE "ChitGroup" ADD CONSTRAINT "ChitGroup_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChitMember" ADD CONSTRAINT "ChitMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChitCycle" ADD CONSTRAINT "ChitCycle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChitCycle" ADD CONSTRAINT "ChitCycle_winnerMemberId_fkey" FOREIGN KEY ("winnerMemberId") REFERENCES "ChitMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChitCyclePayment" ADD CONSTRAINT "ChitCyclePayment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ChitCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChitCyclePayment" ADD CONSTRAINT "ChitCyclePayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ChitMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
