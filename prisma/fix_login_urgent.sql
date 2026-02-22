-- ============================================================
-- EMERGENCY FIX: Run this FIRST in Neon SQL Editor to fix login
-- Only adds the missing User columns. Safe to re-run.
-- ============================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiCreditsGrantedAt" TIMESTAMP(3);

-- ✅ Login should work now. Then run apply_pending_migrations.sql for the rest.
