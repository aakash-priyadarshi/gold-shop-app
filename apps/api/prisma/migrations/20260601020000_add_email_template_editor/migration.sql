CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "direction" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "userId" TEXT,
  "adminId" TEXT,
  "threadId" TEXT,
  "messageId" TEXT,
  "provider" TEXT,
  "templateKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "templateKey" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_userId_fkey'
  ) THEN
    ALTER TABLE "EmailLog"
      ADD CONSTRAINT "EmailLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_direction_idx" ON "EmailLog"("direction");
CREATE INDEX IF NOT EXISTS "EmailLog_templateKey_idx" ON "EmailLog"("templateKey");
CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "audience" TEXT NOT NULL,
  "trigger" TEXT,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "text" TEXT,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "replyTo" TEXT,
  "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_key_key" ON "EmailTemplate"("key");
CREATE INDEX IF NOT EXISTS "EmailTemplate_audience_idx" ON "EmailTemplate"("audience");
CREATE INDEX IF NOT EXISTS "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

CREATE TABLE IF NOT EXISTS "EmailTemplateVersion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "text" TEXT,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "replyTo" TEXT,
  "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplateVersion_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailTemplateVersion_templateId_fkey'
  ) THEN
    ALTER TABLE "EmailTemplateVersion"
      ADD CONSTRAINT "EmailTemplateVersion_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplateVersion_templateId_version_key" ON "EmailTemplateVersion"("templateId", "version");
CREATE INDEX IF NOT EXISTS "EmailTemplateVersion_templateId_createdAt_idx" ON "EmailTemplateVersion"("templateId", "createdAt");

CREATE TABLE IF NOT EXISTS "BackupSchedule" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "cronExp" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BackupSchedule_isActive_idx" ON "BackupSchedule"("isActive");
CREATE INDEX IF NOT EXISTS "BackupSchedule_createdAt_idx" ON "BackupSchedule"("createdAt");