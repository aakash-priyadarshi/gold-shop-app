-- ── AI Sales CRM ────────────────────────────────────────────────
-- AddAiSalesCrmModels

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL_SENT', 'EMAIL_RECEIVED', 'GMEET', 'FOLLOW_UP', 'NOTE');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('SENT', 'RECEIVED');

-- CreateTable
CREATE TABLE "AgentVoice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "voiceId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "accent" TEXT,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "pitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "tone" TEXT,
    "agentEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'COLD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "timezone" TEXT,
    "countryCode" TEXT,
    "communicationStyle" TEXT,
    "decisionStyle" TEXT,
    "pacePreference" TEXT,
    "tonePreference" TEXT,
    "respondsWellTo" TEXT[],
    "getsFrustratedBy" TEXT[],
    "preferredName" TEXT,
    "familyDetails" TEXT,
    "hobbies" TEXT[],
    "recentLifeEvents" TEXT[],
    "notableQuotes" TEXT[],
    "preferredCallDays" TEXT[],
    "budgetRange" TEXT,
    "dealValue" DOUBLE PRECISION,
    "budgetApprover" TEXT,
    "urgency" TEXT,
    "competitorsPros" TEXT[],
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "lastCallSummary" TEXT,
    "whatWorkedLastCall" TEXT,
    "whatToAvoidNextCall" TEXT,
    "nextCallStrategy" TEXT,
    "openLoops" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "leadId" TEXT,
    "agentId" TEXT,
    "agentVoiceId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "goalForCall" TEXT,
    "goalAchieved" BOOLEAN,
    "goalNotes" TEXT,
    "totalCost" DOUBLE PRECISION,
    "costTwilio" DOUBLE PRECISION,
    "costLlm" DOUBLE PRECISION,
    "costTts" DOUBLE PRECISION,
    "costStt" DOUBLE PRECISION,
    "buyingSignals" TEXT[],
    "objectionsEncountered" TEXT[],
    "keyTopics" TEXT[],
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadInteraction" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "callSessionId" TEXT,
    "emailId" TEXT,
    "type" "InteractionType" NOT NULL,
    "channel" TEXT,
    "summary" TEXT,
    "details" JSONB,
    "goalSet" TEXT,
    "goalAchieved" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEmail" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "goalForEmail" TEXT,
    "meetLink" TEXT,
    "meetScheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentVoice_shopId_isActive_idx" ON "AgentVoice"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "Lead_shopId_idx" ON "Lead"("shopId");

-- CreateIndex
CREATE INDEX "Lead_shopId_stage_idx" ON "Lead"("shopId", "stage");

-- CreateIndex
CREATE INDEX "Lead_shopId_temperature_idx" ON "Lead"("shopId", "temperature");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "CallSession_shopId_status_idx" ON "CallSession"("shopId", "status");

-- CreateIndex
CREATE INDEX "CallSession_shopId_createdAt_idx" ON "CallSession"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "CallSession_leadId_idx" ON "CallSession"("leadId");

-- CreateIndex
CREATE INDEX "LeadInteraction_leadId_createdAt_idx" ON "LeadInteraction"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadInteraction_shopId_createdAt_idx" ON "LeadInteraction"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEmail_leadId_createdAt_idx" ON "LeadEmail"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEmail_shopId_direction_idx" ON "LeadEmail"("shopId", "direction");

-- AddForeignKey
ALTER TABLE "AgentVoice" ADD CONSTRAINT "AgentVoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_agentVoiceId_fkey" FOREIGN KEY ("agentVoiceId") REFERENCES "AgentVoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmail" ADD CONSTRAINT "LeadEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
