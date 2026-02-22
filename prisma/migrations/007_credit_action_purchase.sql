-- Add PURCHASE value to CreditAction enum
ALTER TYPE "CreditAction" ADD VALUE IF NOT EXISTS 'PURCHASE';
