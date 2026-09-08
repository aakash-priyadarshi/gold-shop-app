-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'SUPPORT_ACCESS';

-- CreateTable
CREATE TABLE "SupportAccessGrant" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SupportAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAccessSession" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,

    CONSTRAINT "SupportAccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAccessAuditEvent" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAccessAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportAccessGrant_sellerId_createdAt_idx" ON "SupportAccessGrant"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportAccessGrant_adminId_status_idx" ON "SupportAccessGrant"("adminId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAccessSession_tokenHash_key" ON "SupportAccessSession"("tokenHash");

-- CreateIndex
CREATE INDEX "SupportAccessSession_grantId_idx" ON "SupportAccessSession"("grantId");

-- CreateIndex
CREATE INDEX "SupportAccessAuditEvent_grantId_createdAt_idx" ON "SupportAccessAuditEvent"("grantId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "SupportAccessGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessAuditEvent" ADD CONSTRAINT "SupportAccessAuditEvent_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "SupportAccessGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessAuditEvent" ADD CONSTRAINT "SupportAccessAuditEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SupportAccessSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
