/*
  Warnings:

  - The values [AI_GENERATED,USER_UPLOADED,REFERENCE] on the enum `DesignImageSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `aiDescription` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryStones` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `style` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Design` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Design` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.
  - Made the column `creatorId` on table `Design` required. This step will fail if there are existing NULL values in that column.
  - Made the column `imageHash` on table `Design` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `jewelryType` on the `Design` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `buildMethod` to the `Design` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InventoryVisibility" AS ENUM ('PUBLIC', 'CATALOGUE_ONLY', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CatalogueMode" AS ENUM ('NORMAL', 'SHOWROOM');

-- CreateEnum
CREATE TYPE "RfqSource" AS ENUM ('ONLINE', 'WALK_IN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'ATTACHMENT', 'SYSTEM', 'PRODUCT_CARD', 'CATALOGUE_LINK', 'SHOWROOM_SESSION', 'RFQ_ACTION');

-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'ELITE');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('VERIFIED', 'ELITE_SELLER', 'TOP_CHOICE', 'CAMPAIGN_PARTICIPANT', 'ESCROW_PARTNER', 'EXPRESS_SHIPPING', 'HALLMARK_CERTIFIED', 'TRUSTED_SELLER');

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('ACCOUNT_SUSPENSION', 'LOGIN_ISSUE', 'PASSWORD_RECOVERY', 'HACKED_ACCOUNT', 'ORDER_ISSUE', 'REFUND_ISSUE', 'PAYMENT_ISSUE', 'PRODUCT_ISSUE', 'SHIPPING_ISSUE', 'SELLER_COMPLAINT', 'BUYER_COMPLAINT', 'PLATFORM_BUG', 'FEATURE_REQUEST', 'KYC_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLAIMED', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'INVENTORY', 'CASHIER', 'VIEWER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'PAYMENT_RECEIVED', 'INVENTORY_LOW_STOCK', 'INVENTORY_UPDATED', 'RFQ_RECEIVED', 'OFFER_ACCEPTED', 'PRICE_ALERT', 'SUBSCRIPTION_CHANGED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SALES_SUMMARY', 'INVENTORY_STATUS', 'COMMISSION_STATEMENT', 'CUSTOMER_ANALYTICS', 'REVENUE_TREND', 'TAX_REPORT', 'STAFF_PERFORMANCE');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');

-- CreateEnum
CREATE TYPE "BulkImportType" AS ENUM ('INVENTORY_ITEMS', 'PRODUCT_VARIANTS', 'CUSTOMER_LIST', 'PRICE_SHEET', 'CATALOGUE_ITEMS');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepricingType" AS ENUM ('GOLD_RATE_CHANGE', 'LOW_STOCK', 'COMPETITOR_MATCH', 'TIME_BASED', 'DEMAND_BASED');

-- CreateEnum
CREATE TYPE "PlatformReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SIGNED_UP', 'PLAN_PURCHASED', 'COMPLETED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "CreditAction" ADD VALUE 'PURCHASE';

-- AlterEnum
BEGIN;
CREATE TYPE "DesignImageSource_new" AS ENUM ('GENERATED', 'UPLOADED', 'REFINED');
ALTER TABLE "Design" ALTER COLUMN "imageSource" DROP DEFAULT;
ALTER TABLE "Design" ALTER COLUMN "imageSource" TYPE "DesignImageSource_new" USING ("imageSource"::text::"DesignImageSource_new");
ALTER TYPE "DesignImageSource" RENAME TO "DesignImageSource_old";
ALTER TYPE "DesignImageSource_new" RENAME TO "DesignImageSource";
DROP TYPE "DesignImageSource_old";
ALTER TABLE "Design" ALTER COLUMN "imageSource" SET DEFAULT 'GENERATED';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JewelleryType" ADD VALUE 'BROOCH';
ALTER TYPE "JewelleryType" ADD VALUE 'TIE_PIN';
ALTER TYPE "JewelleryType" ADD VALUE 'CUFFLINKS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CLOSED';
ALTER TYPE "NotificationType" ADD VALUE 'CATALOGUE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'CATALOGUE_SHARED';
ALTER TYPE "NotificationType" ADD VALUE 'WALKIN_RFQ_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_FROM_CATALOGUE';
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_MIGRATION';
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_MIGRATION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_MIGRATED';
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_DOWNGRADED';
ALTER TYPE "NotificationType" ADD VALUE 'POS_SESSION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'POS_CHECKOUT_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_INVITE_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_SIGNUP';
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_REWARD_GRANTED';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'PHONEPE';

-- DropForeignKey
ALTER TABLE "Design" DROP CONSTRAINT "Design_creatorId_fkey";

-- AlterTable
ALTER TABLE "AiCreditLedger" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Design" DROP COLUMN "aiDescription",
DROP COLUMN "description",
DROP COLUMN "prompt",
DROP COLUMN "secondaryStones",
DROP COLUMN "style",
DROP COLUMN "tags",
DROP COLUMN "title",
ADD COLUMN     "additionalSpecs" JSONB,
ADD COLUMN     "creatorName" TEXT,
ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "generationPrompt" TEXT,
ADD COLUMN     "hasGemstones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metalColor" TEXT,
ADD COLUMN     "ordersCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "settingStyle" TEXT,
ADD COLUMN     "stoneCarat" DOUBLE PRECISION,
ADD COLUMN     "stoneColor" TEXT,
ADD COLUMN     "stoneCut" TEXT,
ADD COLUMN     "surfaceFinish" TEXT,
ADD COLUMN     "weightCategory" "WeightCategory",
ALTER COLUMN "creatorId" SET NOT NULL,
ALTER COLUMN "imageHash" SET NOT NULL,
DROP COLUMN "jewelryType",
ADD COLUMN     "jewelryType" "JewelleryType" NOT NULL,
DROP COLUMN "buildMethod",
ADD COLUMN     "buildMethod" "BuildMethod" NOT NULL,
ALTER COLUMN "imageSource" SET DEFAULT 'GENERATED',
ALTER COLUMN "isPublic" SET DEFAULT true,
ALTER COLUMN "isApproved" SET DEFAULT true;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "visibility" "InventoryVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN     "commissionInfo" TEXT,
ADD COLUMN     "envKeysRequired" JSONB,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RfqRequest" ADD COLUMN     "createdByShopId" TEXT,
ADD COLUMN     "source" "RfqSource" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "walkInMeta" JSONB;

-- AlterTable
ALTER TABLE "SellerSubscription" ADD COLUMN     "migrationNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "migrationNotifyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "migrationStatus" "MigrationStatus" NOT NULL DEFAULT 'NONE',
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "about" TEXT,
ADD COLUMN     "autoRechargeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoRechargePack" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "autoRechargeThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "disputeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eliteFastTracked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstSaleAt" TIMESTAMP(3),
ADD COLUMN     "makingChargeCap" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "sellerTier" "SellerTier" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "supportedAlloys" TEXT[],
ADD COLUMN     "supportedBaseMetals" TEXT[],
ADD COLUMN     "supportedPlatingTypes" TEXT[],
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tierLockedReason" TEXT,
ADD COLUMN     "tierUnlockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShopRating" ADD COLUMN     "deleteRequestAt" TIMESTAMP(3),
ADD COLUMN     "deleteRequestReason" TEXT,
ADD COLUMN     "deleteRequestStatus" TEXT DEFAULT 'NONE',
ADD COLUMN     "deleteRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleteReviewedAt" TIMESTAMP(3),
ADD COLUMN     "deleteReviewedBy" TEXT,
ADD COLUMN     "sellerRepliedAt" TIMESTAMP(3),
ADD COLUMN     "sellerReply" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "badgeText" TEXT,
ADD COLUMN     "buttonColor" TEXT,
ADD COLUMN     "maxCatalogues" INTEGER,
ADD COLUMN     "maxInvoicesPerMonth" INTEGER,
ADD COLUMN     "maxOrdersPerMonth" INTEGER,
ADD COLUMN     "maxProducts" INTEGER,
ADD COLUMN     "stripeAnnualPriceId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeProductId" TEXT,
ADD COLUMN     "successorPlanId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleAddressRaw" JSONB,
ADD COLUMN     "googleBirthday" TEXT,
ADD COLUMN     "googleGender" TEXT,
ADD COLUMN     "googleLocale" TEXT,
ADD COLUMN     "googlePhoneRaw" TEXT,
ADD COLUMN     "googlePicture" TEXT,
ADD COLUMN     "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinSetAt" TIMESTAMP(3),
ADD COLUMN     "preferredCity" TEXT,
ADD COLUMN     "preferredState" TEXT;

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopGemstoneRate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'NATURAL',
    "sizeCategory" TEXT NOT NULL,
    "qualityTier" TEXT NOT NULL DEFAULT 'MEDIUM',
    "pricePerStone" DOUBLE PRECISION NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopGemstoneRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPerformance" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "successfulOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "refundedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating60Days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positiveFeedbackRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeDispatchRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSaleAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerBadge" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "awardedBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "SellerBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "shopQuoteId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxLabel" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopNameOnBill" TEXT,
    "shopLogoUrl" TEXT,
    "tagline" TEXT,
    "shopAddress" TEXT,
    "shopPhone" TEXT,
    "shopEmail" TEXT,
    "gstin" TEXT,
    "licenseNumber" TEXT,
    "footerNote" TEXT,
    "termsText" TEXT,
    "shopNamePosition" TEXT NOT NULL DEFAULT 'TOP',
    "logoPosition" TEXT NOT NULL DEFAULT 'TOP',
    "taglinePosition" TEXT NOT NULL DEFAULT 'TOP',
    "addressPosition" TEXT NOT NULL DEFAULT 'TOP',
    "phonePosition" TEXT NOT NULL DEFAULT 'TOP',
    "emailPosition" TEXT NOT NULL DEFAULT 'TOP',
    "gstinPosition" TEXT NOT NULL DEFAULT 'TOP',
    "licensePosition" TEXT NOT NULL DEFAULT 'TOP',
    "footerPosition" TEXT NOT NULL DEFAULT 'BOTTOM',
    "termsPosition" TEXT NOT NULL DEFAULT 'BOTTOM',
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showGstin" BOOLEAN NOT NULL DEFAULT true,
    "showLicense" BOOLEAN NOT NULL DEFAULT false,
    "showFooter" BOOLEAN NOT NULL DEFAULT true,
    "showTerms" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "type" "TicketType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "conversationId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentType" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catalogue" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "mode" "CatalogueMode" NOT NULL DEFAULT 'NORMAL',
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueItem" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "overridePrice" DOUBLE PRECISION,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueViewEvent" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerIpHash" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CatalogueViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowroomSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT,
    "conversationId" TEXT,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSessionItem" (
    "id" TEXT NOT NULL,
    "posSessionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "posSessionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "qty" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopBranch" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHeadquarter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffRole" "StaffRole" NOT NULL,
    "permissions" JSONB NOT NULL,
    "branchIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopApiKey" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastHttpStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteLabelConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customDomain" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "fontFamily" TEXT,
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "hideOrivraa" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteLabelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "recipients" TEXT[],
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "filters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "importType" "BulkImportType" NOT NULL,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT NOT NULL,
    "totalRows" INTEGER,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "resultFileUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "predictedDemand" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "factors" JSONB,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepricingRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleType" "RepricingType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricsSnapshot" (
    "id" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLatency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95Latency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p99Latency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryMB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpuSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rfqsCreated" INTEGER NOT NULL DEFAULT 0,
    "ordersCreated" INTEGER NOT NULL DEFAULT 0,
    "wsConnections" INTEGER NOT NULL DEFAULT 0,
    "inFlight" INTEGER NOT NULL DEFAULT 0,
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronJobLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronJobConfig" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "recommended" INTEGER NOT NULL,
    "minInterval" INTEGER NOT NULL DEFAULT 1,
    "maxInterval" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "impact" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronJobConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAgent" TEXT,
    "details" JSONB,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "autoBlock" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelistedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhitelistedIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrashReport" (
    "id" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorStack" TEXT,
    "page" TEXT NOT NULL,
    "userAction" TEXT,
    "platform" TEXT NOT NULL,
    "userRole" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "ip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "userTriggered" BOOLEAN NOT NULL DEFAULT false,
    "userDescription" TEXT,
    "sessionToken" TEXT,
    "screenshotUrl" TEXT,
    "frustrationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrashReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'stable',
    "downloadUrl" TEXT,
    "fileSize" BIGINT,
    "fileName" TEXT,
    "changelog" TEXT,
    "githubChangelog" TEXT,
    "changelogSource" TEXT NOT NULL DEFAULT 'github',
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minOs" TEXT,
    "minRam" TEXT,
    "minDisk" TEXT,
    "architecture" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "arch" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "closedBy" TEXT,

    CONSTRAINT "DesktopSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformReview" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "reviewUrl" TEXT,
    "proofScreenshot" TEXT NOT NULL,
    "status" "PlatformReviewStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "adminNotes" TEXT,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "rewardGrantedAt" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerShopId" TEXT NOT NULL,
    "refereeShopId" TEXT,
    "refereeEmail" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referrerRewarded" BOOLEAN NOT NULL DEFAULT false,
    "refereeRewarded" BOOLEAN NOT NULL DEFAULT false,
    "referrerRewardedAt" TIMESTAMP(3),
    "refereeRewardedAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedUpAt" TIMESTAMP(3),
    "planPurchasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "freeMonths" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "aiCreditsReward" INTEGER NOT NULL DEFAULT 50,
    "expirationDays" INTEGER NOT NULL DEFAULT 90,
    "maxReferralsPerShop" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[],
    "canonicalUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "tags" TEXT[],
    "author" TEXT NOT NULL DEFAULT 'Orivraa Team',
    "authorRole" TEXT,
    "readTime" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportContact" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryFlag" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actionTaken" TEXT,
    "confidence" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "role" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "referrer" TEXT,
    "closedBy" TEXT,

    CONSTRAINT "WebSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerNote_shopId_idx" ON "CustomerNote"("shopId");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_shopId_idx" ON "CustomerNote"("customerId", "shopId");

-- CreateIndex
CREATE INDEX "ShopGemstoneRate_shopId_idx" ON "ShopGemstoneRate"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopGemstoneRate_shopId_stoneType_origin_sizeCategory_quali_key" ON "ShopGemstoneRate"("shopId", "stoneType", "origin", "sizeCategory", "qualityTier");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPerformance_shopId_key" ON "SellerPerformance"("shopId");

-- CreateIndex
CREATE INDEX "SellerPerformance_shopId_idx" ON "SellerPerformance"("shopId");

-- CreateIndex
CREATE INDEX "SellerPerformance_avgRating60Days_idx" ON "SellerPerformance"("avgRating60Days");

-- CreateIndex
CREATE INDEX "SellerPerformance_cancellationRate_idx" ON "SellerPerformance"("cancellationRate");

-- CreateIndex
CREATE INDEX "SellerBadge_shopId_idx" ON "SellerBadge"("shopId");

-- CreateIndex
CREATE INDEX "SellerBadge_badgeType_isActive_idx" ON "SellerBadge"("badgeType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SellerBadge_shopId_badgeType_key" ON "SellerBadge"("shopId", "badgeType");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_shopId_idx" ON "Invoice"("shopId");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSettings_shopId_key" ON "InvoiceSettings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_assigneeId_idx" ON "SupportTicket"("assigneeId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_type_idx" ON "SupportTicket"("type");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_ticketNumber_idx" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_senderId_idx" ON "TicketMessage"("senderId");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_slug_key" ON "StaticPage"("slug");

-- CreateIndex
CREATE INDEX "StaticPage_slug_idx" ON "StaticPage"("slug");

-- CreateIndex
CREATE INDEX "StaticPage_isPublished_idx" ON "StaticPage"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Catalogue_slug_key" ON "Catalogue"("slug");

-- CreateIndex
CREATE INDEX "Catalogue_shopId_idx" ON "Catalogue"("shopId");

-- CreateIndex
CREATE INDEX "Catalogue_slug_idx" ON "Catalogue"("slug");

-- CreateIndex
CREATE INDEX "Catalogue_shopId_deletedAt_idx" ON "Catalogue"("shopId", "deletedAt");

-- CreateIndex
CREATE INDEX "CatalogueItem_catalogueId_idx" ON "CatalogueItem"("catalogueId");

-- CreateIndex
CREATE INDEX "CatalogueItem_inventoryItemId_idx" ON "CatalogueItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "CatalogueItem_catalogueId_sortOrder_idx" ON "CatalogueItem"("catalogueId", "sortOrder");

-- CreateIndex
CREATE INDEX "CatalogueViewEvent_catalogueId_viewedAt_idx" ON "CatalogueViewEvent"("catalogueId", "viewedAt");

-- CreateIndex
CREATE INDEX "CatalogueViewEvent_catalogueId_viewerIpHash_idx" ON "CatalogueViewEvent"("catalogueId", "viewerIpHash");

-- CreateIndex
CREATE INDEX "ShowroomSession_shopId_idx" ON "ShowroomSession"("shopId");

-- CreateIndex
CREATE INDEX "ShowroomSession_conversationId_idx" ON "ShowroomSession"("conversationId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_inventoryItemId_idx" ON "WishlistItem"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_inventoryItemId_key" ON "WishlistItem"("userId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "PosSession_shopId_status_idx" ON "PosSession"("shopId", "status");

-- CreateIndex
CREATE INDEX "PosSession_expiresAt_idx" ON "PosSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PosSessionItem_posSessionId_idx" ON "PosSessionItem"("posSessionId");

-- CreateIndex
CREATE INDEX "StockReservation_posSessionId_idx" ON "StockReservation"("posSessionId");

-- CreateIndex
CREATE INDEX "StockReservation_expiresAt_idx" ON "StockReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "StockReservation_inventoryItemId_variantId_idx" ON "StockReservation"("inventoryItemId", "variantId");

-- CreateIndex
CREATE INDEX "ShopBranch_shopId_isActive_idx" ON "ShopBranch"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "ShopBranch_country_city_idx" ON "ShopBranch"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "ShopBranch_shopId_branchCode_key" ON "ShopBranch"("shopId", "branchCode");

-- CreateIndex
CREATE INDEX "StaffAccount_shopId_isActive_idx" ON "StaffAccount"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "StaffAccount_userId_idx" ON "StaffAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccount_shopId_userId_key" ON "StaffAccount"("shopId", "userId");

-- CreateIndex
CREATE INDEX "ShopApiKey_shopId_isActive_idx" ON "ShopApiKey"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "ShopApiKey_keyPrefix_idx" ON "ShopApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "WebhookSubscription_shopId_isActive_idx" ON "WebhookSubscription"("shopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteLabelConfig_shopId_key" ON "WhiteLabelConfig"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteLabelConfig_customDomain_key" ON "WhiteLabelConfig"("customDomain");

-- CreateIndex
CREATE INDEX "ScheduledReport_shopId_isActive_idx" ON "ScheduledReport"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "ScheduledReport_nextRunAt_idx" ON "ScheduledReport"("nextRunAt");

-- CreateIndex
CREATE INDEX "BulkImportJob_shopId_status_idx" ON "BulkImportJob"("shopId", "status");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "DemandForecast_shopId_period_idx" ON "DemandForecast"("shopId", "period");

-- CreateIndex
CREATE INDEX "DemandForecast_category_idx" ON "DemandForecast"("category");

-- CreateIndex
CREATE INDEX "RepricingRule_shopId_isActive_idx" ON "RepricingRule"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "MetricsSnapshot_createdAt_idx" ON "MetricsSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "CronJobLog_jobName_createdAt_idx" ON "CronJobLog"("jobName", "createdAt");

-- CreateIndex
CREATE INDEX "CronJobLog_app_createdAt_idx" ON "CronJobLog"("app", "createdAt");

-- CreateIndex
CREATE INDEX "CronJobLog_createdAt_idx" ON "CronJobLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CronJobConfig_jobName_key" ON "CronJobConfig"("jobName");

-- CreateIndex
CREATE INDEX "SecurityEvent_ip_createdAt_idx" ON "SecurityEvent"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_createdAt_idx" ON "SecurityEvent"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_ip_idx" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_expiresAt_idx" ON "BlockedIp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhitelistedIp_ip_key" ON "WhitelistedIp"("ip");

-- CreateIndex
CREATE INDEX "WhitelistedIp_ip_idx" ON "WhitelistedIp"("ip");

-- CreateIndex
CREATE INDEX "CrashReport_status_createdAt_idx" ON "CrashReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CrashReport_platform_createdAt_idx" ON "CrashReport"("platform", "createdAt");

-- CreateIndex
CREATE INDEX "CrashReport_userId_idx" ON "CrashReport"("userId");

-- CreateIndex
CREATE INDEX "CrashReport_userTriggered_createdAt_idx" ON "CrashReport"("userTriggered", "createdAt");

-- CreateIndex
CREATE INDEX "AppRelease_platform_isLatest_idx" ON "AppRelease"("platform", "isLatest");

-- CreateIndex
CREATE INDEX "AppRelease_platform_isActive_publishedAt_idx" ON "AppRelease"("platform", "isActive", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppRelease_version_platform_key" ON "AppRelease"("version", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopSession_sessionToken_key" ON "DesktopSession"("sessionToken");

-- CreateIndex
CREATE INDEX "DesktopSession_userId_idx" ON "DesktopSession"("userId");

-- CreateIndex
CREATE INDEX "DesktopSession_startedAt_idx" ON "DesktopSession"("startedAt");

-- CreateIndex
CREATE INDEX "DesktopSession_userId_startedAt_idx" ON "DesktopSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PlatformReview_status_idx" ON "PlatformReview"("status");

-- CreateIndex
CREATE INDEX "PlatformReview_shopId_idx" ON "PlatformReview"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformReview_shopId_platform_key" ON "PlatformReview"("shopId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralCode_key" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_refereeEmail_idx" ON "Referral"("refereeEmail");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referrerShopId_idx" ON "Referral"("referrerShopId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerShopId_refereeEmail_key" ON "Referral"("referrerShopId", "refereeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_isPublished_publishedAt_idx" ON "BlogPost"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");

-- CreateIndex
CREATE INDEX "BlogPost_featured_idx" ON "BlogPost"("featured");

-- CreateIndex
CREATE INDEX "SupportContact_country_isActive_idx" ON "SupportContact"("country", "isActive");

-- CreateIndex
CREATE INDEX "AiChatLog_sessionId_idx" ON "AiChatLog"("sessionId");

-- CreateIndex
CREATE INDEX "AiChatLog_createdAt_idx" ON "AiChatLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebSession_sessionToken_key" ON "WebSession"("sessionToken");

-- CreateIndex
CREATE INDEX "WebSession_userId_idx" ON "WebSession"("userId");

-- CreateIndex
CREATE INDEX "WebSession_startedAt_idx" ON "WebSession"("startedAt");

-- CreateIndex
CREATE INDEX "WebSession_role_startedAt_idx" ON "WebSession"("role", "startedAt");

-- CreateIndex
CREATE INDEX "WebSession_userId_startedAt_idx" ON "WebSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Design_jewelryType_idx" ON "Design"("jewelryType");

-- CreateIndex
CREATE INDEX "Design_buildMethod_idx" ON "Design"("buildMethod");

-- CreateIndex
CREATE INDEX "InventoryItem_visibility_idx" ON "InventoryItem"("visibility");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_isEnabled_idx" ON "PaymentGatewayConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_isDefault_idx" ON "PaymentGatewayConfig"("isDefault");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_priority_idx" ON "PaymentGatewayConfig"("priority");

-- CreateIndex
CREATE INDEX "RfqRequest_source_createdAt_idx" ON "RfqRequest"("source", "createdAt");

-- CreateIndex
CREATE INDEX "RfqRequest_createdByShopId_createdAt_idx" ON "RfqRequest"("createdByShopId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerSubscription_migrationStatus_idx" ON "SellerSubscription"("migrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_sellerTier_idx" ON "Shop"("sellerTier");

-- CreateIndex
CREATE INDEX "ShopRating_customerId_idx" ON "ShopRating"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopGemstoneRate" ADD CONSTRAINT "ShopGemstoneRate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRequest" ADD CONSTRAINT "RfqRequest_createdByShopId_fkey" FOREIGN KEY ("createdByShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPerformance" ADD CONSTRAINT "SellerPerformance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBadge" ADD CONSTRAINT "SellerBadge_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSettings" ADD CONSTRAINT "InvoiceSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catalogue" ADD CONSTRAINT "Catalogue_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueItem" ADD CONSTRAINT "CatalogueItem_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "Catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueItem" ADD CONSTRAINT "CatalogueItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueViewEvent" ADD CONSTRAINT "CatalogueViewEvent_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "Catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowroomSession" ADD CONSTRAINT "ShowroomSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSessionItem" ADD CONSTRAINT "PosSessionItem_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSessionItem" ADD CONSTRAINT "PosSessionItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSessionItem" ADD CONSTRAINT "PosSessionItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_successorPlanId_fkey" FOREIGN KEY ("successorPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopBranch" ADD CONSTRAINT "ShopBranch_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccount" ADD CONSTRAINT "StaffAccount_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccount" ADD CONSTRAINT "StaffAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopApiKey" ADD CONSTRAINT "ShopApiKey_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteLabelConfig" ADD CONSTRAINT "WhiteLabelConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepricingRule" ADD CONSTRAINT "RepricingRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesktopSession" ADD CONSTRAINT "DesktopSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformReview" ADD CONSTRAINT "PlatformReview_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerShopId_fkey" FOREIGN KEY ("referrerShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeShopId_fkey" FOREIGN KEY ("refereeShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSession" ADD CONSTRAINT "WebSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
