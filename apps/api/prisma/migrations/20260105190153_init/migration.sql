-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SHOPKEEPER', 'CUSTOMER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('PRECIOUS_METAL', 'JEWELLERY_ALLOY', 'BASE_METAL', 'FINISH_COATING', 'GEMSTONE');

-- CreateEnum
CREATE TYPE "JewelleryType" AS ENUM ('RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT', 'CHAIN', 'ANKLET', 'NOSE_PIN', 'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SENT_TO_SHOPS', 'OFFERS_RECEIVED', 'OFFER_SELECTED', 'BOOKING_PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BuildMethod" AS ENUM ('METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COUNTERED', 'DECLINED', 'SELECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('INVENTORY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'PACKED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('CAD_APPROVED', 'CASTING_STARTED', 'STONE_SETTING', 'POLISHING', 'QUALITY_CHECK', 'PACKAGING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RFQ_SENT', 'RFQ_RECEIVED', 'OFFER_RECEIVED', 'OFFER_COUNTERED', 'OFFER_SELECTED', 'BOOKING_REMINDER', 'BOOKING_EXPIRED', 'PAYMENT_RECEIVED', 'PRODUCTION_STARTED', 'PRODUCTION_MILESTONE', 'QC_COMPLETED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopNameNe" TEXT,
    "shopNameHi" TEXT,
    "description" TEXT,
    "descriptionNe" TEXT,
    "descriptionHi" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NP',
    "state" TEXT,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "whatsappNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDocuments" JSONB,
    "bisLicenseNumber" TEXT,
    "panNumber" TEXT,
    "vatNumber" TEXT,
    "supportedJewelleryTypes" TEXT[],
    "supportedMethods" TEXT[],
    "supportedMaterials" TEXT[],
    "supportedFinishes" TEXT[],
    "minOrderValueNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxOrderValueNpr" DOUBLE PRECISION,
    "maxWeightGrams" DOUBLE PRECISION,
    "acceptsComplexOrders" BOOLEAN NOT NULL DEFAULT true,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "codMaxValueNpr" DOUBLE PRECISION,
    "bankAccountDetails" JSONB,
    "makingChargePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopMetalRate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "metalType" TEXT NOT NULL,
    "ratePerGramNpr" DOUBLE PRECISION NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopMetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopFinishPricing" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "finishType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "priceNpr" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ShopFinishPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT,
    "nameHi" TEXT,
    "descriptionEn" TEXT,
    "descriptionNe" TEXT,
    "descriptionHi" TEXT,
    "purity" DOUBLE PRECISION,
    "allowedMethods" TEXT[],
    "complianceFlags" TEXT[],
    "baseUnit" TEXT NOT NULL DEFAULT 'gram',
    "marketRateNpr" DOUBLE PRECISION,
    "lastMarketUpdate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "jewelleryType" "JewelleryType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT,
    "nameHi" TEXT,
    "descriptionEn" TEXT,
    "descriptionNe" TEXT,
    "descriptionHi" TEXT,
    "buildMethod" TEXT NOT NULL,
    "composition" JSONB NOT NULL,
    "totalWeightGrams" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB,
    "gemstones" JSONB,
    "metalValueNpr" DOUBLE PRECISION NOT NULL,
    "makingChargeNpr" DOUBLE PRECISION NOT NULL,
    "gemstoneValueNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPriceNpr" DOUBLE PRECISION NOT NULL,
    "images" TEXT[],
    "videos" TEXT[],
    "certificateUrl" TEXT,
    "hallmarkNumber" TEXT,
    "hallmarkDate" TIMESTAMP(3),
    "purityCertUrl" TEXT,
    "labels" TEXT[],
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "stockQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jewelleryType" "JewelleryType" NOT NULL,
    "buildMethod" "BuildMethod" NOT NULL,
    "composition" JSONB NOT NULL,
    "targetTotalWeightG" DOUBLE PRECISION,
    "targetGoldWeightG" DOUBLE PRECISION,
    "budgetMinNpr" DOUBLE PRECISION,
    "budgetMaxNpr" DOUBLE PRECISION,
    "preferredDeliveryDays" INTEGER,
    "specialInstructions" TEXT,
    "referenceImages" TEXT[],
    "estimatedPriceMinNpr" DOUBLE PRECISION,
    "estimatedPriceMaxNpr" DOUBLE PRECISION,
    "broadcastSnapshot" JSONB,
    "broadcastAt" TIMESTAMP(3),
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "selectedOfferId" TEXT,
    "mandatoryLabels" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqShopTarget" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "RfqShopTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqOffer" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "declineReason" TEXT,
    "confirmedComposition" JSONB NOT NULL,
    "confirmedTotalWeightG" DOUBLE PRECISION,
    "confirmedGoldWeightG" DOUBLE PRECISION,
    "metalCostNpr" DOUBLE PRECISION NOT NULL,
    "makingChargeNpr" DOUBLE PRECISION NOT NULL,
    "finishCostNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gemstoneCostNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPriceNpr" DOUBLE PRECISION NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "productionStartDate" TIMESTAMP(3),
    "bookingFeeNpr" DOUBLE PRECISION NOT NULL,
    "bookingFeePercent" DOUBLE PRECISION NOT NULL,
    "paymentDeadline" TIMESTAMP(3),
    "shopNotes" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "parentOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "rfqOfferId" TEXT,
    "productSnapshot" JSONB NOT NULL,
    "subtotalNpr" DOUBLE PRECISION NOT NULL,
    "taxNpr" DOUBLE PRECISION NOT NULL,
    "shippingNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountNpr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNpr" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "bookingFeePaidNpr" DOUBLE PRECISION,
    "balanceDueNpr" DOUBLE PRECISION NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "bookingExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMilestone" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "evidenceUrls" TEXT[],
    "notes" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountNpr" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "paymentGateway" TEXT NOT NULL,
    "gatewayPaymentId" TEXT,
    "gatewayOrderId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRating" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "quality" INTEGER,
    "communication" INTEGER,
    "delivery" INTEGER,
    "accuracy" INTEGER,
    "reviewText" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "titleKey" TEXT NOT NULL,
    "titleParams" JSONB,
    "bodyKey" TEXT NOT NULL,
    "bodyParams" JSONB,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "channels" TEXT[],
    "deliveredVia" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRate" (
    "id" TEXT NOT NULL,
    "metalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "ratePerGram" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_userId_key" ON "Shop"("userId");

-- CreateIndex
CREATE INDEX "Shop_country_city_idx" ON "Shop"("country", "city");

-- CreateIndex
CREATE INDEX "Shop_isActive_isVerified_idx" ON "Shop"("isActive", "isVerified");

-- CreateIndex
CREATE INDEX "ShopMetalRate_shopId_idx" ON "ShopMetalRate"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopMetalRate_shopId_metalType_key" ON "ShopMetalRate"("shopId", "metalType");

-- CreateIndex
CREATE INDEX "ShopFinishPricing_shopId_idx" ON "ShopFinishPricing"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopFinishPricing_shopId_finishType_tier_key" ON "ShopFinishPricing"("shopId", "finishType", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE INDEX "Material_code_idx" ON "Material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_shopId_status_idx" ON "InventoryItem"("shopId", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_jewelleryType_idx" ON "InventoryItem"("jewelleryType");

-- CreateIndex
CREATE INDEX "InventoryItem_buildMethod_idx" ON "InventoryItem"("buildMethod");

-- CreateIndex
CREATE UNIQUE INDEX "RfqRequest_selectedOfferId_key" ON "RfqRequest"("selectedOfferId");

-- CreateIndex
CREATE INDEX "RfqRequest_customerId_idx" ON "RfqRequest"("customerId");

-- CreateIndex
CREATE INDEX "RfqRequest_status_idx" ON "RfqRequest"("status");

-- CreateIndex
CREATE INDEX "RfqShopTarget_shopId_idx" ON "RfqShopTarget"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqShopTarget_rfqId_shopId_key" ON "RfqShopTarget"("rfqId", "shopId");

-- CreateIndex
CREATE INDEX "RfqOffer_rfqId_idx" ON "RfqOffer"("rfqId");

-- CreateIndex
CREATE INDEX "RfqOffer_shopId_idx" ON "RfqOffer"("shopId");

-- CreateIndex
CREATE INDEX "RfqOffer_status_idx" ON "RfqOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_shopId_idx" ON "Order"("shopId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderMilestone_orderId_idx" ON "OrderMilestone"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_gatewayPaymentId_idx" ON "Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "ShopRating_shopId_idx" ON "ShopRating"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRating_orderId_key" ON "ShopRating"("orderId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "MarketRate_metalCode_country_idx" ON "MarketRate"("metalCode", "country");

-- CreateIndex
CREATE INDEX "MarketRate_validFrom_idx" ON "MarketRate"("validFrom");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopMetalRate" ADD CONSTRAINT "ShopMetalRate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopFinishPricing" ADD CONSTRAINT "ShopFinishPricing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRequest" ADD CONSTRAINT "RfqRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqRequest" ADD CONSTRAINT "RfqRequest_selectedOfferId_fkey" FOREIGN KEY ("selectedOfferId") REFERENCES "RfqOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqShopTarget" ADD CONSTRAINT "RfqShopTarget_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "RfqOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMilestone" ADD CONSTRAINT "OrderMilestone_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRating" ADD CONSTRAINT "ShopRating_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
