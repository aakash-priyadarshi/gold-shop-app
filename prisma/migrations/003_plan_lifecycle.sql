-- Plan Lifecycle: successor, migration status, and indexes
-- Run on Neon production database AFTER 002_plan_limits.sql

-- ── Plan Succession ─────────────────────────────────────────────────
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "successorPlanId" TEXT;

-- Self-referencing FK for successor plan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SubscriptionPlan_successorPlanId_fkey'
  ) THEN
    ALTER TABLE "SubscriptionPlan"
      ADD CONSTRAINT "SubscriptionPlan_successorPlanId_fkey"
      FOREIGN KEY ("successorPlanId") REFERENCES "SubscriptionPlan"("id");
  END IF;
END $$;

-- ── Plan Migration Fields on SellerSubscription ─────────────────────

-- Create the MigrationStatus enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MigrationStatus') THEN
    CREATE TYPE "MigrationStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED');
  END IF;
END $$;

ALTER TABLE "SellerSubscription"
  ADD COLUMN IF NOT EXISTS "migrationStatus"        "MigrationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "migrationNotifiedAt"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "migrationNotifyCount"   INT NOT NULL DEFAULT 0;

-- ── Subscription Notification Types ─────────────────────────────────
-- Add plan migration notification types to NotificationType enum
-- (safe: ALTER TYPE ... ADD VALUE IF NOT EXISTS requires PG 9.3+)
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLAN_MIGRATION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLAN_MIGRATION_REMINDER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLAN_MIGRATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLAN_DOWNGRADED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SellerSubscription_migrationStatus_idx"
  ON "SellerSubscription" ("migrationStatus");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "SubscriptionPlan_isActive_sortOrder_idx"
  ON "SubscriptionPlan" ("isActive", "sortOrder");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "SubscriptionPlan_country_isActive_idx"
  ON "SubscriptionPlan" ("country", "isActive");
