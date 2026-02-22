# Gold Shop App — Architecture & Feature Inventory

_Last updated: 2026-02-25_

This document is a code-informed overview of the system architecture and the major product features implemented in this repository.

## 1) Repository layout (monorepo)

- `apps/web`: Next.js (App Router) frontend
- `apps/api`: NestJS backend API
- `cloudflare-worker`: Cloudflare Worker for image upload/serve backed by R2
- `packages/*`: shared packages (if any)
- `docs/*`: product/ops notes and internal docs
- `security/*`: pentest harness/scripts and reports

Build tooling:
- pnpm workspaces (`pnpm-workspace.yaml`)
- Turborepo task orchestration (`turbo.json`)

## 2) System context (runtime components)

```mermaid
flowchart LR
  Browser[Customer/Admin/Seller Browser]
  Web[Next.js Web (apps/web)]
  API[NestJS API (apps/api)
  prefix: /api]
  DB[(PostgreSQL
  via Prisma)]
  Redis[(Redis
  cache + Bull)]
  Images[Cloudflare Worker
  images.orivraa.com]
  R2[(Cloudflare R2 Bucket)]
  Email[Email Provider
  (Resend / SMTP)]
  Payments[Payment Gateways
  (method enums in DB)]

  Browser --> Web
  Web --> API
  API --> DB
  API --> Redis
  Web --> Images
  Images --> R2
  API --> Email
  API --> Payments
```

### Frontend (Next.js)

- Uses Next.js App Router under `apps/web/src/app`.
- Vercel Speed Insights integrated (`@vercel/speed-insights`) for Core Web Vitals monitoring.
- Main route areas (folder-level):
  - Public pages: `about/`, `shops/`, `shop/`, `rfq/`, `designs/`, `cart/`, `checkout/`, `orders/`, `notifications/`, `auth/`, `help/`, `platform-guidelines/`, `c/` (public catalogues).
  - Dashboards: `dashboard/customer/*`, `dashboard/shop/*`, `dashboard/admin/*`, `dashboard/sales/*`, `dashboard/support/*`.

Dashboard route map (folder inventory):
- Customer dashboard (`apps/web/src/app/dashboard/customer`): `orders/`, `payments/`, `rfqs/`, `settings/`, `wishlist/`, `messages/`, `refunds/`.
- Shop dashboard (`apps/web/src/app/dashboard/shop`): `analytics/`, `billing/`, `catalogues/`, `commissions/`, `customers/`, `engagement/`, `enterprise/`, `inventory/`, `invoices/`, `orders/`, `pos/`, `pricing/`, `products/`, `profile/`, `quotes/`, `rfqs/`, `settings/`, `shop-profile/`, `tools/`, `messages/`, `variants/`.
- Admin dashboard (`apps/web/src/app/dashboard/admin`): `billing/`, `shops/`, `users/`, `verifications/`, `orders/`, `commissions/`, `intelligence/`, `reports/`, `settings/`, `profile/`, `support/`, `chat-monitoring/`, `refunds/`, `messages/`.
- Sales dashboard (`apps/web/src/app/dashboard/sales`): `shops/`, `orders/`, `messages/`, `profile/`.
- Support dashboard (`apps/web/src/app/dashboard/support`): `tickets/`, `page.tsx` (overview).

### Backend (NestJS)

Entry points:
- `apps/api/src/main.ts`: HTTP bootstrap, security middleware, CORS allowlist, global validation, Swagger (disabled in production), global prefix `api`.
- `apps/api/src/app.module.ts`: module wiring (feature modules, global throttling, Redis/Bull).

Cross-cutting backend behavior:
- Global prefix: `/api`.
- Validation: global `ValidationPipe` with whitelist + forbid non-whitelisted + transform.
- Rate limiting: global `@nestjs/throttler` guard.
- Security headers: Helmet with a basic CSP.
- Production host allowlist validation.
- Swagger: enabled only outside production.

Backend module inventory (`apps/api/src/modules/*`):
- `auth`: authentication + token flows
- `users`: user profiles, preferences, account state
- `shops`: shop onboarding/profile management, shop directory-related data
- `inventory`: listing & managing inventory items
- `rfq`: custom order requests (Request For Quote)
- `offers`: shop offers against RFQs
- `orders`: order lifecycle for inventory + custom orders; includes `StateMachineService` for validated state transitions
- `payments`: payment tracking/verification
- `invoices`: invoices + invoice settings
- `notifications`: in-app notifications
- `materials`, `market-rates`, `fx-rates`: market inputs for pricing
- `pricing`: pricing engine + configs/logging
- `commission`: commission ledger
- `shop-quotes`: walk-in/offline quote workflow
- `designs`: design gallery + likes
- `seller-performance`: seller KPI rollups/badges
- `customer-crm`: customer notes / customer analytics primitives
- `market-config`, `platform-config`: system settings & per-market configuration
- `audit`: audit log
- `jobs`: background jobs (Bull)
- `mail`: email sending
- `health`: health endpoints
- `admin`, `marketplace-intelligence`, `i18n`: admin tools + intelligence + localization support
- `chat`: anti-circumvention in-app messaging with **3-strike global blocking** (messages BLOCKED, not masked), dual-layer detection (regex + Gemini Flash AI deep scan including image analysis), per-user violation tracking, account suspension on 3rd strike, admin unblock; WebSocket real-time delivery; **online presence tracking** (30s polling), **file attachments** (images, video ≤10s, documents via R2), type-specific violation warnings (13 types with English+Hindi labels)
- `refunds`: metal-only refund policy enforcement, eligibility checks, refund lifecycle (request → approve/reject → process), commission reversal
- `support`: internal operations dashboard aggregating pending refunds, flagged conversations, KYC queue, and order monitoring; **ticket system** (SupportTicket + TicketMessage models, real-time WebSocket `/support` namespace, claim/resolve/close lifecycle, internal notes, auto-priority, **plan-based priority escalation** — `dedicatedSupport` → URGENT, `prioritySupport` → HIGH); **AI chatbot** (Gemini Flash 2.0 for public help queries with escalation to tickets)
- `product-variants`: size variant management for rings/bangles/bracelets with SKU-level stock, price overrides, and standardised size charts
- `catalogue`: seller catalogue system — shareable product catalogues with showroom mode, password protection, walk-in RFQ creation, analytics, and chat integration (product cards, catalogue links, showroom sessions)
- `pos`: POS basket from customer likes/picks — session-based basket with stock reservations, checkout-to-invoice, 30-min expiry via Bull cron
- `subscriptions`: admin-configurable subscription plans (FREE/PRO/PRO_PLUS/ENTERPRISE per country in local currency), seller subscription lifecycle (subscribe/cancel/activate/renew), Stripe webhook integration, plan-based commission rates; **feature gating system** — `PlanLimitsService` with `checkFeature()` / `hasFeature()` / `getActiveFeatures()`, `@RequireFeature()` decorator + `FeatureGateGuard` (admins bypass), `FeatureNotEnabledException` with upgrade prompt metadata; 15 features backend-enforced, 13 display-only
- `ai-credits`: atomic AI credit debit/refund with `SELECT FOR UPDATE`, Redis idempotency + rate limiting (20/hr, 100/day), monthly grant with rollover cap logic, admin adjustments; **credit purchase** (PURCHASE action via payment gateway), **auto-recharge** configuration (threshold + top-up amount)
- `payment-gateway`: multi-gateway routing (Stripe/Razorpay/PhonePe/eSewa/Khalti) with priority-based country selection, `envKeyLabel` pattern (secrets never stored in DB), admin gateway config CRUD; **wired to order payments** (inventory + custom orders) and **AI credit purchases** (one-time PaymentIntents via unified flow)
- `enterprise`: enterprise-tier features — multi-branch management, staff accounts & roles, API key generation, webhook subscriptions, white-label/custom domain, scheduled reports, bulk import/export, demand forecasting, automated repricing; protected by `FeatureGateGuard` with per-feature `@RequireFeature()` decorators (e.g. `bulkUpload`, `multiBranch`, `staffAccounts`, `apiAccess`, `webhookSubscriptions`, `customBranding`, `scheduledReports`, `demandForecasting`, `aiPriceOptimization`); admin bypass remains

### Images (Cloudflare Worker + R2)

Worker implementation:
- `cloudflare-worker/src/index.ts`

Endpoints:
- `GET /health`: worker health
- `POST /upload`: upload image (supports multipart, raw bytes, or base64 JSON)
- `DELETE /delete/{key}`: delete original and variant keys
- `GET /images/{key}` and `GET /{type}/{filename}`: serve from R2

Upload types (worker-side variants defined):
- `product` (1200/600/200px, images only, 10MB)
- `profile` (400/200px, images only, 10MB)
- `rfq` (1200/600px, images only, 10MB)
- `designs` (1200/600/200px, images only, 10MB)
- `kyc` (1200px, images only, 10MB)
- `chat` (1200/600/200px, images 10MB + video mp4/webm 25MB + documents pdf/doc/docx 15MB)
- `shop` (800/400px, images only, 10MB)
- `user` (400/200px, images only, 10MB)

Frontend upload helper:
- `apps/web/src/lib/image-upload.ts`: client-side resize/compress + upload via `X-Upload-Type` header
- `apps/web/src/hooks/useImageUpload.ts`: React hook wrapper used by RFQ/product/quotes/etc.

Notes:
- The worker currently stores the uploaded object as-is in R2 and returns URLs that can use Cloudflare Image Resizing query params (e.g. `?w=600`) if enabled.

### Security / testing utilities

- `security/*`: includes a pentest harness (`run-pentest.ts`) and reports (e.g. `security-report-2026-02-16.md`).

## 3) Data model (Prisma / PostgreSQL)

Schema location:
- `apps/api/prisma/schema.prisma`

Core domain aggregates (high-level):

**Identity & access**
- `User`, `RefreshToken`, `ApiToken`, `Session`, `OtpVerification`

**Shops & seller operations**
- `Shop`, `SellerPerformance`, `SellerBadge`, `ShopRating`
- Shop pricing overrides: `ShopMetalRate`, `ShopGemstoneRate`, `ShopFinishPricing`, `ShopPriceOverride`

**Inventory commerce**
- `InventoryItem`, `ProductVariant`, `SizeChart`
- `Order`, `Payment`, `OrderMilestone`, `OrderVersion`
- `Invoice`, `InvoiceSettings`

**Custom manufacturing (RFQ → Offer → Order)**
- `RfqRequest`, `RfqGemstone`, `RfqShopTarget`, `RfqOffer`
- Intelligence/monitoring models: `RfqOrderInsight`, `QuoteAnomaly`, `AiPhaseMilestone`

**Pricing engine & market inputs**
- Market snapshots/config: `MarketRate`, `MarketRateSnapshot`, `FxRateSnapshot`, `MarketConfig`
- Catalog + configs: `Material`, `MaterialRate`, `FinishPrice`, `GemstoneCatalog`, `SettingPrice`, `JewelleryTemplate`, `GemstonePreset`, `PlatingOption`
- Engine configs/logs: `SystemPriceConfig`, `MarketAdjustmentConfig`, `TaxRuleConfig`, `GemPriceConfig`, `FinishPriceConfig`, `BaseMetalPriceConfig`, `MetalPurityConfig`, `RoundingRuleConfig`, `PriceCalculationLog`

**Trust & governance**
- `VerificationRequest` (links to `User` and/or `Shop`)
- `Report`
- `AuditLog`, `SystemNotification`, `SystemConfig`

**CRM**
- Customer notes: `CustomerNote`
- Customer addresses/stats: `CustomerAddress`, `CustomerPurchaseStats`

**Messaging & anti-circumvention**
- `Conversation`: per-order or per-RFQ chat thread between buyer and shop; statuses: `ACTIVE`, `LOCKED`, `ARCHIVED`
- `Message`: individual messages with `maskedContent` (PII-scrubbed), `isBlocked` flag (blocked messages are stored but never delivered to recipient), violation flags (`hasViolation`, `violationType`), attachment support, read tracking

**Refunds**
- Refund fields on `Order`: `refundStatus` (enum `RefundStatus`: `NONE`, `REQUESTED`, `APPROVED`, `REJECTED`, `PROCESSED`), `refundableAmount`, `refundReason`, `refundRequestedAt`, `refundProcessedAt`, `refundProcessedById`, `refundIdempotencyKey`

**Product variants**
- `ProductVariant`: per-`InventoryItem` size/SKU entries with independent stock counts and optional price overrides
- `SizeChart`: standardised reference data per jewellery type and sizing system (US, UK, EU, Indian, JP)

**Seller Catalogues**
- `Catalogue`: shop-owned catalogue with name, slug (globally unique), description, mode (`NORMAL`/`SHOWROOM`), `passwordHash` (bcrypt), `isPublic`, `expiresAt`, soft-delete via `deletedAt`
- `CatalogueItem`: junction linking `Catalogue` ↔ `InventoryItem` with `sortOrder`, optional `overridePrice`, `isHidden` flag
- `CatalogueViewEvent`: lightweight analytics — `catalogueId`, `viewedAt`, `viewerIpHash` (sha256, no raw IP), `userAgent`, `referrer`, `count`; deduplicated by (catalogue + ipHash + hour bucket)
- `ShowroomSession`: conversation-linked item selection — `conversationId`, `shopId`, `status` (ACTIVE/COMPLETED/ARCHIVED), `items` (JSON array)
- `InventoryVisibility` enum added to `InventoryItem`: `PUBLIC` (default, shown everywhere), `CATALOGUE_ONLY` (hidden from marketplace, visible in catalogues), `HIDDEN` (not visible anywhere publicly)
- `RfqSource` enum added to `RfqRequest`: `ONLINE` (default), `WALK_IN`; plus `createdByShopId` and `walkInMeta` (JSON) fields
- `MessageType` enum extended: `TEXT`, `ATTACHMENT`, `SYSTEM`, `PRODUCT_CARD`, `CATALOGUE_LINK`, `SHOWROOM_SESSION`, `RFQ_ACTION`; `Message.payload` (JSON) for structured card data; `Message.isSystemGenerated` flag

**Support & Tickets**
- `SupportTicket`: id, ticketNumber (unique, `TKT-XXXXX`), userId?, guestEmail?, guestName?, type (TicketType), subject, description, status (TicketStatus, default OPEN), priority (TicketPriority, default MEDIUM), assigneeId?, claimedAt?, orderId?, conversationId?, resolvedAt?, closedAt?, resolutionNote?, timestamps; indexed on userId, assigneeId, status, type, priority, createdAt, ticketNumber
- `TicketMessage`: id, ticketId, senderId?, senderRole (string: CUSTOMER/SUPPORT/ADMIN/SYSTEM/GUEST/AI_BOT), senderName?, content, attachmentUrl?, attachmentType?, isInternal (bool, default false — staff-only notes), timestamps; indexed on ticketId, senderId

**Subscription & billing**
- `SubscriptionPlan`: admin-configurable per-country plans. Fields: name+country (@@unique), displayName, description, country (MarketRegion), currency (CurrencyCode), monthlyPrice, annualPrice, catalogueLimit (null=unlimited), commissionPercent, includesAi, monthlyAiCredits, rolloverCap, extraCreditPrice, overageBehavior (BLOCK|AUTO_CHARGE), features (JSON — feature flags like prioritySupport, analytics, apiAccess, whiteLabel), isActive, sortOrder. Indexed on [country, isActive] and [isActive, sortOrder].
- `SellerSubscription`: shopId + planId, status (SubscriptionStatus: ACTIVE, PAST_DUE, CANCELLED, EXPIRED, TRIALING), billingCycle (MONTHLY|ANNUAL), currentPeriodStart/End, autoRenew, stripeCustomerId/SubscriptionId (optional), cancellationReason. Indexed on [shopId, status].
- `SubscriptionPayment`: per-period payment tracking with gateway info, amount, currency, PaymentStatus.
- `AiCreditLedger`: immutable credit transaction ledger. Fields: userId, shopId, action (CreditAction: GRANT, DEBIT, REFUND, EXPIRE, ADMIN_ADJUST, OVERAGE, PURCHASE), amount, balanceBefore, balanceAfter, reason, referenceId, idempotencyKey (@unique). Indexed on [userId, action, createdAt].
- `PaymentGatewayConfig`: per-gateway routing config. Fields: gatewayName (@unique), displayName, isEnabled, envKeyLabel (string reference to env var — never the actual secret), webhookEndpoint, supportedCountries (MarketRegion[]), supportedMethods (PaymentMethod[]), priority (Int). Indexed on [isEnabled, priority].
- User model additions: `aiCreditsBalance` (Int, default 0), `aiCreditsGrantedAt` (DateTime?).
- New enums: `SubscriptionStatus`, `CreditAction`, `OverageBehavior`, `CurrencyCode` (NPR, INR, AED, GBP, USD, EUR).

**Enterprise features (ENTERPRISE-tier only)**
- `ShopBranch`: multi-branch management — branchCode, name, type (HQ/BRANCH/WAREHOUSE/KIOSK), address, phone, email, isActive; @@unique [shopId, branchCode]
- `StaffAccount`: staff roles & permissions — userId, shopId, branchId (optional), role (StaffRole: MANAGER, CASHIER, SALES_ASSOCIATE, INVENTORY_CLERK, ACCOUNTANT, VIEWER), permissions (JSON — granular per-module flags), inviteToken, inviteStatus (PENDING/ACCEPTED/REVOKED/EXPIRED), invitedByUserId
- `ShopApiKey`: API key management — keyHash (sha256, unique), prefix (`ovrk_`), label, scopes (String[]), expiresAt, isActive, lastUsedAt; raw key returned only on creation
- `WebhookSubscription`: event-driven webhook delivery — url, events (WebhookEvent[]: ORDER_CREATED, ORDER_STATUS_CHANGED, PAYMENT_RECEIVED, INVENTORY_LOW, RFQ_RECEIVED, OFFER_ACCEPTED, REFUND_PROCESSED, COMMISSION_CHARGED), secret (HMAC signing), isActive, consecutiveFailures, lastDeliveredAt; auto-disabled after 10 consecutive failures
- `WhiteLabelConfig`: custom branding — logoUrl, faviconUrl, primaryColor, secondaryColor, customDomain, customCss, footerHtml; @@unique [shopId]
- `ScheduledReport`: automated report generation — reportType (ReportType: SALES_SUMMARY, INVENTORY_STATUS, COMMISSION_STATEMENT, CUSTOMER_ANALYTICS, TAX_REPORT, PROFIT_LOSS), frequency (ReportFrequency: DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY), format (ReportFormat: PDF, CSV, XLSX), recipients (String[]), filters (JSON), nextRunAt, lastRunAt, isActive
- `BulkImportJob`: bulk data import/export — importType (BulkImportType: INVENTORY_ITEMS, CUSTOMER_LIST, PRICE_SHEET, ORDER_HISTORY), status (BulkJobStatus: PENDING, PROCESSING, COMPLETED, FAILED), fileUrl, totalRows, processedRows, successRows, failedRows, errors (JSON)
- `DemandForecast`: demand prediction — category, forecastMonth, predictedDemand (Int), confidenceScore (Float), seasonalFactor (Float), recommendation (String)
- `RepricingRule`: automated price adjustment — name, ruleType (RepricingType: GOLD_RATE_CHANGE, LOW_STOCK, COMPETITOR_MATCH, TIME_BASED, DEMAND_BASED), conditions (JSON), adjustmentPercent (Float), maxAdjustment (Float), isActive, priority (Int), lastTriggeredAt

New enterprise enums: `StaffRole`, `WebhookEvent`, `ReportType`, `ReportFrequency`, `ReportFormat`, `BulkImportType`, `BulkJobStatus`, `RepricingType`.

Enums represent key business states and supported options, e.g. `OrderStatus`, `DetailedOrderStatus` (includes `REFUND_REQUESTED`), `PaymentMethod`, `PaymentStatusEnum`, `RfqStatus`, `OfferStatus`, `RefundStatus`, `ConversationStatus`, `CommissionStatus` (includes `REVERSED`), `NotificationType` (includes `NEW_MESSAGE`, `CONVERSATION_LOCKED`, `REFUND_REQUESTED`, `REFUND_APPROVED`, `REFUND_REJECTED`, `REFUND_PROCESSED`, `TICKET_CREATED`, `TICKET_CLAIMED`, `TICKET_UPDATED`, `TICKET_MESSAGE`, `TICKET_RESOLVED`, `TICKET_CLOSED`), `UserRole` (ADMIN, SHOPKEEPER, CUSTOMER, SUPPORT, SALES), `TicketType` (ACCOUNT_SUSPENSION, LOGIN_ISSUE, PASSWORD_RECOVERY, HACKED_ACCOUNT, ORDER_ISSUE, REFUND_ISSUE, PAYMENT_ISSUE, PRODUCT_ISSUE, SHIPPING_ISSUE, SELLER_COMPLAINT, BUYER_COMPLAINT, PLATFORM_BUG, FEATURE_REQUEST, KYC_VERIFICATION, OTHER), `TicketStatus` (OPEN, CLAIMED, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED), `TicketPriority` (LOW, MEDIUM, HIGH, URGENT), and multiple material/finish/gem enums.

## 4) Key business flows

### 4.1 Inventory order flow

1. Customer browses shop(s) and inventory items.
2. Customer places an `Order` (`OrderType = INVENTORY`).
3. Payment is captured/verified (`Payment` and order payment fields).
4. Seller fulfills and updates shipping/tracking and milestone events (`OrderMilestone`).
5. Order completes; ratings/reviews may be recorded (`ShopRating`).

### 4.2 Custom manufacturing flow (RFQ)

1. Customer drafts and submits an `RfqRequest` (including optional reference images).
2. RFQ is routed to shops (`RfqShopTarget`).
3. Shops respond with `RfqOffer` proposals.
4. Customer selects an offer; a custom `Order` is created (`OrderType = CUSTOM`).
5. Iteration can be tracked via `OrderVersion` (proposals/changes) and milestones via `OrderMilestone`.

### 4.3 Shop verification (KYC)

- Verification requests are tracked in `VerificationRequest` with a flexible `details` JSON payload.
- Requests can be attached to either a `Shop`, a `User`, or both (optional foreign keys).

### 4.4 Image upload/serving

1. Web app compresses/resizes client-side (`compressImage`).
2. Web app uploads to the worker (`POST /upload`) with `X-Upload-Type`.
3. Worker stores to R2 and returns a stable CDN URL under `https://images.orivraa.com/{key}`.
4. Web app stores the returned `key/url` in its relevant entity data (product/RFQ/profile/etc.).

### 4.5 Notifications and audit

- User-facing notifications are stored in `Notification`.
- Sensitive/important changes are tracked in `AuditLog`.

### 4.6 In-app messaging (anti-circumvention & 3-strike blocking)

1. A `Conversation` is created when a buyer initiates contact about an order or RFQ.
2. Every message passes through a **dual-layer detection pipeline**:
   - **Layer 1 — Regex**: expanded patterns for emails, phone numbers, WhatsApp/Telegram/Instagram/Facebook/Viber/Signal handles, spaced-out digits, obfuscated numbers ("nine eight seven…"), and contact-sharing phrases.
   - **Layer 2 — Gemini Flash AI**: deep scan via `gemini-2.0-flash` catches obfuscated attempts, coded language, creative spelling, and contextual contact sharing that regex misses. Falls back gracefully to regex-only on API failure.
   - **Image analysis**: attached images are scanned by Gemini's vision model for screenshots of phone numbers, QR codes, or contact cards.
3. If a violation is detected, the message is **BLOCKED** (stored with `isBlocked: true` but never delivered to the recipient). The sender receives a warning with their current strike count.
4. Violations are tracked **per-user globally** (across all conversations, not per-conversation):
   - **Strike 1**: Warning message to sender.
   - **Strike 2**: Warning + admin notification (`CONTACT_VIOLATION_WARNING`).
   - **Strike 3**: Account blocked — `Shop.isOnHold = true` and/or `User.status = SUSPENDED`. Admin notification (`ACCOUNT_BLOCKED_VIOLATIONS`).
5. After 5 violations on a single conversation, it is auto-locked (`ConversationStatus.LOCKED`).
6. Admins can **unblock users** (resets `isOnHold`/`status`, creates audit log entry) and **view per-user violation history** including original blocked message content.
7. Real-time delivery via WebSocket gateway (`/chat` namespace, Socket.IO) with JWT authentication. Blocked messages are only echoed back to the sender (not broadcast to conversation room).
8. REST endpoints for CRUD, admin violation stats, per-user violation history, blocked message retrieval, user unblock, and conversation unlocking.

### 4.7 Refund system (metal-only policy)

1. Customer checks eligibility via `RefundEligibilityService`:
   - Order must be `DELIVERED`, within 7-day return window
   - Product composition is inspected: only gold/silver content is refundable; diamond, gemstone, custom-cut stone, and pearl are non-refundable
   - Mixed compositions get partial refunds based on metal percentage
2. Customer submits refund request with reason; `refundIdempotencyKey` prevents duplicates.
3. Support/Admin reviews and approves or rejects.
4. Admin processes the refund: commission is reversed (`CommissionStatus.REVERSED`), seller performance updated, order marked `REFUNDED`.
5. `StateMachineService` enforces valid transitions: `NONE → REQUESTED → APPROVED/REJECTED → PROCESSED`; re-request after rejection is allowed.

### 4.8 Product size variants

1. Shop enables `hasSizes` on an inventory item (toggle endpoint).
2. Variants are created with `sizeLabel`, optional `sizeSystem`/`sizeValue`, unique `sku`, independent `stock`, and optional `priceOverride`.
3. `SizeChart` provides reference data for standard sizes per jewellery type and region.
4. Frontend `SizeVariantSelector` component allows customers to pick a size; out-of-stock sizes are disabled.

### 4.9 Account suspension UX

Instead of logging suspended users out:
1. Login succeeds but returns `isSuspended: true` flag.
2. `getMe()` includes `isOnHold`/`holdReason` for shops.
3. **SuspendedOverlay** (z-index 100) renders over the entire dashboard:
   - Dark backdrop with SVG chain lines from all 4 corners to center (animated, pulsing).
   - Chain link decorations at each corner.
   - Large lock icon center-screen.
   - Bilingual explanation text (English + Hindi).
   - "Contact Support" button → `/help`.
   - "Read Platform Guidelines" link → `/platform-guidelines`.
   - "Sign Out" button.
4. User cannot interact with any dashboard functionality while suspended.

### 4.10 Support ticket system

**Lifecycle**: `OPEN → CLAIMED → IN_PROGRESS ⇄ WAITING_USER → RESOLVED → CLOSED`

1. Users create tickets from `/dashboard/{role}/support` or via AI chatbot escalation on `/help`.
2. Guest users (non-authenticated) can create tickets with email from `/help`.
3. New tickets emit `newTicket` via WebSocket to all online SUPPORT/ADMIN staff.
4. Staff claim tickets (`OPEN → CLAIMED`); only one assignee per ticket.
5. Staff manage tickets: add messages, internal notes (staff-only), change status.
6. Users reply in ticket chat; auto-transitions `WAITING_USER → IN_PROGRESS`.
7. Resolution adds a note; closing sets `closedAt`.
8. All lifecycle events create system messages and in-app notifications.
9. Auto-priority: `HACKED_ACCOUNT` and `ACCOUNT_SUSPENSION` types auto-set to `HIGH`.
10. **Plan-based priority escalation**: when a logged-in user creates a ticket, their active subscription plan is checked. If `dedicatedSupport` feature is enabled → priority auto-escalated to `URGENT`. If `prioritySupport` → auto-escalated to `HIGH`. An internal-only system message is created noting the boost reason, visible only to support staff.

**15 ticket types**: Account Suspension, Login Issue, Password Recovery, Hacked Account, Order Issue, Refund Issue, Payment Issue, Product Issue, Shipping Issue, Seller Complaint, Buyer Complaint, Platform Bug, Feature Request, KYC Verification, Other.

### 4.11 Public help page + AI chatbot

- Public page at `/help` — no authentication required.
- **AI chatbot** powered by Gemini Flash 2.0:
  - System prompt defines OriVraa context, rules, and response format.
  - Returns structured JSON: `{ reply, shouldEscalate, suggestedTicketType, confidence }`.
  - Handles: order queries, payment questions, account help, platform rules.
  - Escalates: account issues, specific orders, refunds, security → suggests appropriate `TicketType`.
  - Conversation history (last 6 messages) maintained for context.
  - Fallback: keyword-based rule engine when Gemini is unavailable.
- **Quick topic cards**: Orders, Payments, Account, Chat.
- **Seamless escalation**: AI suggests creating ticket → pre-filled form with chat context.
- **Guest ticket creation**: email + name fields for unauthenticated users.
- Link to `/platform-guidelines` for self-service.

### 4.12 Order state machine

- `StateMachineService` defines explicit transition maps for both `OrderStatus` and `RefundStatus`.
- `validateOrderTransition(from, to)` and `validateRefundTransition(from, to)` throw `BadRequestException` on illegal transitions.
- Terminal states: `CANCELLED`, `REFUNDED`, `EXPIRED` (order); `PROCESSED` (refund).

### 4.13 Seller Catalogue system

**Catalogue lifecycle**:
1. Seller creates a catalogue (name, description, mode, optional password, optional expiry) → slug auto-generated (`slugify(name)-XXXXX`).
2. Seller adds items from shop inventory. Items can be reordered, hidden, or given override prices.
3. Catalogue is shared via link (`/c/<slug>`) or QR code.
4. Public visitors can view items, request quotes (login required), or message the shop (login required).
5. Showroom Mode provides a full-screen swipe-friendly UI for tablet/mobile product presentation.
6. Staff can create Walk-in RFQs from Showroom Mode — 3-step inline modal (select items → request details → customer info).

**Password protection**:
- Optional bcrypt-hashed password. Unlock issues short-lived HMAC token (30 min, `X-Catalogue-Token` header).
- Password change invalidates old tokens via password-version (`pv`) mismatch.

**Walk-in RFQ flow** (staff only, no customer login required):
1. Staff opens catalogue in Showroom Mode → selects items into session.
2. Clicks "Create Walk-in RFQ" → 3-step modal:
   - Step 1: Confirm items, select variant sizes, set quantities.
   - Step 2: Jewellery type, budget range, timeline, notes, measurements.
   - Step 3: Internal customer info (name, phone, notes) — privacy-protected, never shown to buyers.
3. Submit → `POST /api/rfq/walk-in` → creates `RfqRequest` with `source=WALK_IN`, `walkInMeta` JSON.

**Chat integration**:
- Sellers can share catalogues (`CATALOGUE_LINK` message), individual products (`PRODUCT_CARD` message), create showroom sessions, and initiate walk-in RFQs from chat.
- Rich message cards render in customer chat with "Open Catalogue" / "View Details" CTAs.
- System-generated messages bypass PII detection.

**Analytics**:
- View events tracked with deduplicated IP hashing. Dashboard shows total views, unique viewers, and 7-day trend.

### 4.14 Subscription & billing system

**Four-tier plan model** (all configurable from Admin Billing dashboard):
- **FREE**: 20-item catalogue limit, 5% commission, no AI credits. Available in all 6 markets.
- **PRO**: 200-item catalogue, 3% commission, 50 AI credits/month with 100 rollover cap. Priced in local currency (e.g. NPR 1,999/mo, INR 999/mo, USD 35/mo, GBP 29/mo, AED 99/mo, EUR 29/mo).
- **PRO_PLUS**: 500-item catalogue, 2% commission, 200 AI credits/month, priority support, CRM suite, advanced analytics. Priced between PRO and ENTERPRISE.
- **ENTERPRISE**: Unlimited catalogue, 1.5% commission, 500 AI credits/month, AUTO_CHARGE overage, dedicated support, API access, white-label. Priced per-country (e.g. NPR 9,999/mo, USD 199/mo).
- Admin can create/update/disable plans anytime; all pricing, commission rates, features, and AI credit allocations are fully configurable per country.
- **28 feature flags** across 6 categories (Marketplace, CRM & Business, AI & Intelligence, Analytics & Reports, Support & Integration). Each plan's `features` JSON toggles individual flags. Admin billing page annotates which features are **Enforced** (backend blocks access) vs **Display only** (shown on pricing page).

**Seller subscription lifecycle**:
1. When a seller creates a shop (registration, OAuth setup, or manual creation), the FREE plan is **automatically activated** — no manual subscription required.
2. Seller can upgrade from the Billing page → `POST /seller-subscriptions/subscribe`.
3. FREE plans activate immediately. Paid plans create a Stripe payment intent → seller completes payment.
4. Stripe webhook (`payment_intent.succeeded`) activates the subscription.
5. Commission rate is automatically read from the seller's active plan (fallback to platform default 5%).
6. At period end: auto-renew creates new payment, or subscription expires if `autoRenew=false`.
7. Admin can override any seller's plan, manually activate subscriptions, or view MRR stats.
8. Available Plans tab shows which plan is currently active (highlighted card with "Current Plan" badge).

**AI credit system** (server-authoritative):
- Credits granted monthly via Bull cron job. Rollover cap enforced — excess credits expire.
- Debit uses `SELECT FOR UPDATE` in Prisma `$transaction` for atomicity.
- Redis idempotency keys (24h TTL) + DB unique constraint on `idempotencyKey` prevent double-debit.
- Rate limiting: 20 ops/hour, 100 ops/day per user via Redis counters.
- Admin can manually adjust credits (add/remove) with audit trail.

**Payment gateway routing**:
- `PaymentGatewayConfig` table stores per-gateway metadata (supported countries, payment methods, priority).
- Gateway secrets stored as `envKeyLabel` references (e.g. `"STRIPE_SECRET_KEY"`) — actual secrets read from `process.env` at runtime; **never stored in the database**.
- Priority-based selection per country: highest-priority enabled gateway for the seller's region is used.
- Stripe and Razorpay adapters with graceful fallback when keys not configured.

**Security boundaries**:
- All money/credit/commission logic is server-authoritative. Client cannot set rates, amounts, or balances.
- All admin mutations are audit-logged via `AuditService`.
- Stripe webhooks verified via `constructEvent` with raw body + signature.

### 4.15 Enterprise features (ENTERPRISE-tier only)

All enterprise endpoints are protected by `FeatureGateGuard` with granular `@RequireFeature()` decorators — each endpoint specifies the exact feature key required (e.g. `@RequireFeature('bulkUpload')`, `@RequireFeature('multiBranch')`). This replaces the earlier blanket `EnterpriseGuard`. Admin role bypasses all feature checks.

**Multi-branch management**:
1. ENTERPRISE seller creates branches (`HQ`, `BRANCH`, `WAREHOUSE`, `KIOSK`) with unique branch codes per shop.
2. Each branch has address, phone, email, manager assignment, operating hours.
3. Staff accounts can be optionally scoped to a specific branch.

**Staff accounts & roles**:
1. Seller invites staff by email with a role and optional branch assignment.
2. Roles: `MANAGER`, `INVENTORY`, `CASHIER`, `VIEWER`, `AUDITOR`.
3. Permissions stored as JSON — granular flags per module (inventory, orders, pricing, reports, etc.).
4. Invited user accepts via token → `PENDING` → `ACCEPTED`. Seller can revoke access.

**API key management**:
1. Seller generates API keys — format: `ovrk_` + 24 random hex bytes.
2. Key is hashed (sha256) before storage; raw key returned only once on creation.
3. Keys have scoped access (e.g. `inventory:read`, `orders:write`, `pricing:read`), optional expiry.
4. Validation endpoint for external integrations to verify key validity and check scopes.

**Webhook subscriptions**:
1. Seller registers webhook URLs with selected event types (ORDER_CREATED, PAYMENT_RECEIVED, INVENTORY_LOW, etc.).
2. Events are delivered via HTTP POST with HMAC-SHA256 signature (`v1=<hex>` in `X-Signature` header).
3. 10-second timeout per delivery attempt.
4. Consecutive failures tracked; webhook auto-disabled after 10 failures.
5. Other services call `webhookService.fireEvent(shopId, event, payload)` to trigger delivery.

**White-label / custom domain**:
1. Seller configures custom branding: logo, favicon, primary/secondary colors, custom CSS, footer HTML.
2. Optional custom domain mapping — `WhiteLabelConfig.customDomain` resolved by middleware.

**Scheduled reports**:
1. Seller creates report schedules: type (SALES_SUMMARY, INVENTORY_STATUS, COMMISSION_STATEMENT, CUSTOMER_ANALYTICS, TAX_REPORT, PROFIT_LOSS), frequency (DAILY to QUARTERLY), format (PDF/CSV/XLSX), recipients (email list), filters.
2. `nextRunAt` auto-calculated based on frequency.
3. On-demand report generation also available — returns data directly.

**Bulk import/export**:
1. Import: upload file (INVENTORY_ITEMS, CUSTOMER_LIST, PRICE_SHEET, ORDER_HISTORY) → job queued → processed asynchronously.
2. Export: on-demand data export with formatted output for inventory, customers, price sheets.

**Demand forecasting**:
1. Analyzes last 6 months of delivered orders by category (jewellery type).
2. Applies seasonal factors (wedding/festival months get 1.2x multiplier).
3. Generates per-category predictions with confidence scores and stock recommendations.

**Automated repricing**:
1. Seller defines repricing rules: type (GOLD_RATE_CHANGE, LOW_STOCK, COMPETITOR_MATCH, TIME_BASED, DEMAND_BASED), conditions (JSON), adjustment percentage, max adjustment cap, priority.
2. `evaluateRules()` engine processes active rules by priority — checks conditions against current inventory/market data.
3. Returns list of price adjustments for review before application.

### 4.16 Feature gating system

**Architecture**: `PlanLimitsService` (in `SubscriptionPlansModule`) provides both quantitative limit checks (products, invoices, catalogues, orders) and per-feature boolean gating.

**Components**:
- `PlanLimitsService.checkFeature(shopId, featureKey)` — throws `FeatureNotEnabledException` (HTTP 403, error code `FEATURE_NOT_ENABLED`) with feature key, label, and plan name for frontend upgrade prompts.
- `PlanLimitsService.hasFeature(shopId, featureKey)` — non-throwing boolean check (used for conditional logic like ticket priority).
- `PlanLimitsService.getActiveFeatures(shopId)` — returns all 28 features with enabled/disabled state, labels, and categories.
- `@RequireFeature(...features)` decorator — sets metadata on NestJS route handlers/controllers.
- `FeatureGateGuard` — `CanActivate` guard that reads `@RequireFeature()` metadata and calls `checkFeature()`. Admin role bypasses all checks.
- `FeatureNotEnabledException` — structured error response with `featureKey`, `featureLabel`, `planName` for client-side upgrade prompts.

**28 features** across 6 categories:
1. **Marketplace**: marketplace, priorityListing, bulkUpload
2. **CRM & Business**: crm, invoicing, inventoryManagement, customerManagement, customBranding, staffAccounts, multiBranch
3. **AI & Intelligence**: purchasableAiCredits, aiDesignGeneration, aiSmartRecommendations, aiPriceOptimization, demandForecasting
4. **Analytics & Reports**: basicAnalytics, advancedAnalytics, scheduledReports, auditLogExport
5. **Support & Integration**: prioritySupport, dedicatedSupport, dedicatedAccountManager, apiAccess, webhookSubscriptions, whiteLabel, customDomain, customIntegrations

**15 features are backend-enforced** (access blocked when disabled):
- bulkUpload, crm, invoicing, customBranding, staffAccounts, multiBranch, purchasableAiCredits, aiDesignGeneration, aiPriceOptimization, demandForecasting, scheduledReports, apiAccess, webhookSubscriptions, prioritySupport, dedicatedSupport

**13 features are display-only** (shown on pricing page but not enforced by backend):
- marketplace, priorityListing, inventoryManagement, customerManagement, aiSmartRecommendations, basicAnalytics, advancedAnalytics, auditLogExport, dedicatedAccountManager, whiteLabel, customDomain, customIntegrations

**Admin billing page** annotates each feature checkbox with "Enforced" (green badge) or "Display only" (gray badge), with a legend explaining the difference.

**Wired controllers** (13 feature gates):
- Enterprise: bulk-import (`bulkUpload`), branches (`multiBranch`), staff (`staffAccounts`), api-keys (`apiAccess`), webhooks (`webhookSubscriptions`), white-label (`customBranding`), reports (`scheduledReports`), forecasting (`demandForecasting`), repricing (`aiPriceOptimization`)
- Business: invoices (`invoicing`), customer-crm (`crm`)
- AI: ai-credits purchase (`purchasableAiCredits`), designs create (`aiDesignGeneration`)
- Support: ticket priority escalation (`prioritySupport`, `dedicatedSupport`)

### 4.17 Payment gateway — order & credit purchase wiring

The `PaymentGatewayModule` is wired (via `forwardRef`) to both `OrdersModule` and `AiCreditsModule`:

**Order payments**:
1. When an order is created (inventory or custom), a payment intent is created via the unified gateway flow.
2. Gateway adapter (Stripe/PhonePe/eSewa/Khalti/Razorpay) is selected based on seller's country + priority.
3. On payment confirmation (webhook or redirect), order status transitions to confirmed.

**AI credit purchases**:
1. Seller clicks "Buy Credits" on billing page → `POST /ai-credits/purchase` with credit amount.
2. Backend calculates price from plan's `extraCreditPrice`, creates PaymentIntent via gateway.
3. On payment success, credits are added to balance with `PURCHASE` action in ledger.
4. **Auto-recharge**: sellers configure a threshold balance and top-up amount. When credits drop below threshold during a debit, auto-recharge triggers a new purchase.

**Frontend**:
- Buy Credits dialog on billing page with credit amount input and price preview.
- Auto-recharge toggle with threshold and top-up amount configuration.
- Admin can adjust credits manually with audit trail.

## 5) Feature inventory (by role)

### Customers

- Browse shops and shop directories
- Create RFQs for custom jewellery; upload reference images
- Receive offers and select a shop
- Place orders (inventory + custom) and track status
- Manage delivery addresses and profile settings
- Wishlist and notifications
- In-app messaging with shops (contact info blocked, 3-strike system)
- Request refunds on delivered metal-only orders within 7-day window
- Select product sizes (rings, bangles, etc.) with variant-level stock visibility
- **Public catalogues**: browse shop catalogues via shareable links, unlock password-protected catalogues, request quotes, message shop; view rich product cards in chat

### Shopkeepers (Sellers)

- Shop profile management
- Product/inventory management with image uploads
- RFQ handling: respond to RFQs, create offers, manage custom timelines
- Orders fulfillment: milestones, shipping/tracking, paid-at-shop confirmations
- Invoices and invoice settings
- Pricing tools and shop-level overrides
- Customer CRM notes (shop staff notes about customers)
- Commissions and analytics areas
- In-app messaging with customers (contact info blocked, 3-strike system — account suspended on 3rd violation)
- Size variant management: enable sizes, create/edit/delete variants, manage per-size stock and price overrides
- **Seller Catalogues**: create/manage multiple catalogues per shop; add inventory items with sort order, override prices, hidden flags; share via link/QR; showroom mode for walk-in presentation; password protection with expiry; create walk-in RFQs (3-step modal: items → details → customer info); view analytics (views, unique visitors); share catalogues and products as rich cards in chat
- **Billing**: view current subscription plan with all 28 features (enabled/disabled indicators grouped by category), AI credit balance + transaction ledger, browse and subscribe to available plans, cancel subscription, **buy AI credits** (one-time purchase via payment gateway), **auto-recharge** configuration (trigger threshold + top-up amount)
- **Enterprise features** (ENTERPRISE-tier only): multi-branch management (HQ/branch/warehouse/kiosk), staff accounts with role-based permissions (6 roles), API key generation with scoped access, webhook subscriptions (8 event types) with HMAC signing, white-label branding (logo/colors/CSS/custom domain), scheduled reports (6 types, 5 frequencies, 3 formats), bulk import/export (inventory/customers/price sheets), demand forecasting with seasonal analysis, automated repricing rules (5 rule types); 7-tab dashboard at `/dashboard/shop/enterprise`

### Admin

- Shop directory + seller management
- KYC & verification workflow
- Orders oversight and payment verification
- Commission oversight
- Reports moderation
- Marketplace intelligence (anomaly/insight primitives)
- System settings/platform configuration
- Chat monitoring: violation stats, per-user violation history with strike meter, view original blocked messages, unblock suspended users, unlock locked conversations; tabbed UI with stat cards
- Refund management: review/approve/reject/process refund requests, commission reversal
- Messages: full admin messaging page to view/respond in all conversations
- **Billing & Plans**: 4-tab admin dashboard — (1) Plans: create/update/toggle subscription plans per country with local-currency pricing, commission rates, AI credit allocations, feature flags; (2) Subscriptions: view all seller subscriptions, MRR stats, status breakdown; (3) AI Credits: system-wide credit stats (granted/used/refunded/in-circulation), trigger monthly grant; (4) Payment Gateways: enable/disable gateways, view env key labels and supported countries

### Sales

- Sales dashboard with stat cards (shops, orders, pending orders, messages)
- Shop directory browsing with search and pagination
- Seller CRM access (reuses AdminSellerCRM): seller directory, profiles, health score, onboarding progress, milestones, RFQ funnel, notes (read + write)
- Order listing with status filters, search, and pagination (read-only)
- In-app messaging: view all conversations, respond to customers/sellers
- Profile management
- Shared RBAC permissions: read-only access to users, shops, inventory, orders (+ update status), RFQs, offers, notifications (+ create), market rates, materials, reports

### Support (Internal Operations)

- Dashboard with real-time stats: pending refunds, active/locked conversations, violations (24h), total orders
- **Ticket management**: claim/assign tickets, manage lifecycle (in-progress/waiting/resolve/close), internal notes, real-time WebSocket updates
- **Ticket stats overview**: 6 cards (open, claimed, in-progress, waiting, resolved, closed) with counts
- Ticket list with filters: status, type, priority, search, assignee
- Orders queue for attention/processing
- Flagged conversations review
- Pending KYC verifications queue
- Recent audit activity feed

### All roles (shared features)

- **Help & Support**: ticket creation/tracking from dashboard sidebar
- **Public help page** (`/help`): AI chatbot + ticket creation (guest or authenticated)
- **Platform guidelines** (`/platform-guidelines`): bilingual rules page
- In-app chat via `ChatPopupWidget` with online indicators, file attachments
- **Account suspension**: locked dashboard overlay instead of forced logout

## 6) New API endpoints (added 2026-02-18)

### Chat (`/api/chat`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/conversations` | Any authenticated | Create or get conversation for order/RFQ |
| GET | `/chat/conversations` | Any authenticated | List conversations (role-filtered) |
| GET | `/chat/conversations/:id/messages` | Participant | Get paginated messages |
| POST | `/chat/conversations/:id/messages` | Participant | Send message (auto-masked) |
| PATCH | `/chat/conversations/:id/read` | Participant | Mark messages as read |
| GET | `/chat/admin/violations` | ADMIN | Violation statistics |
| GET | `/chat/admin/violations/user/:userId` | ADMIN | Per-user violation history (messages, strikes, block status) |
| GET | `/chat/admin/messages/:messageId` | ADMIN | Retrieve original content of a blocked message |
| PATCH | `/chat/admin/conversations/:id/unlock` | ADMIN | Unlock a locked conversation |
| PATCH | `/chat/admin/users/:userId/unblock` | ADMIN | Unblock a suspended user (resets Shop.isOnHold / User.status) |

WebSocket gateway: namespace `/chat`, events: `joinConversation`, `leaveConversation`, `sendMessage`, `typing`, `markRead`, `checkOnline`.
  - New events: `onlineStatus` (server→client), `newMessage` (server→room), `messageBlocked` (server→sender).

### Tickets (`/api/tickets`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tickets` | JWT | Create ticket (authenticated user) |
| POST | `/tickets/guest` | Public | Create ticket (guest with email) |
| POST | `/tickets/ai-chat` | Public | AI chatbot query |
| GET | `/tickets/my` | JWT | List my tickets |
| GET | `/tickets/:id` | JWT | Get ticket with messages |
| POST | `/tickets/:id/messages` | JWT | Add message to ticket |
| GET | `/tickets` | SUPPORT, ADMIN | List all tickets (filtered) |
| PATCH | `/tickets/:id/claim` | SUPPORT, ADMIN | Claim a ticket |
| PATCH | `/tickets/:id/status` | SUPPORT, ADMIN | Update ticket status |
| PATCH | `/tickets/:id/resolve` | SUPPORT, ADMIN | Resolve ticket with note |
| PATCH | `/tickets/:id/close` | SUPPORT, ADMIN | Close ticket |
| GET | `/tickets/stats/overview` | SUPPORT, ADMIN | Ticket statistics (counts by status) |

WebSocket gateway: namespace `/support`, events: `joinTicket`, `leaveTicket`, `ticketMessage`, `claimTicket`, `updateTicketStatus`.
  - Server broadcasts: `newTicket` (→staff room), `ticketClaimed`, `ticketStatusChanged`, `newTicketMessage` (→ticket room), `ticketUpdated`.

### Refunds (`/api/refunds`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/refunds/request` | CUSTOMER | Submit refund request |
| GET | `/refunds/eligibility/:orderId` | CUSTOMER | Check refund eligibility |
| GET | `/refunds/requests` | SUPPORT, ADMIN | List all refund requests |
| PATCH | `/refunds/:orderId/approve` | SUPPORT, ADMIN | Approve a refund |
| PATCH | `/refunds/:orderId/reject` | SUPPORT, ADMIN | Reject a refund |
| PATCH | `/refunds/:orderId/process` | ADMIN | Process refund (commission reversal) |

### Support (`/api/support`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/dashboard` | SUPPORT, ADMIN | Aggregated dashboard stats |
| GET | `/support/orders` | SUPPORT, ADMIN | Paginated orders queue |
| GET | `/support/flagged-conversations` | SUPPORT, ADMIN | Locked/violated conversations |
| GET | `/support/pending-verifications` | SUPPORT, ADMIN | Pending KYC verifications |
| GET | `/support/activity` | SUPPORT, ADMIN | Recent audit log entries |

### Product Variants (`/api/inventory/:itemId/variants`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/inventory/:itemId/variants/toggle-sizes` | SHOPKEEPER | Enable/disable sizes on item |
| POST | `/inventory/:itemId/variants` | SHOPKEEPER | Create single variant |
| POST | `/inventory/:itemId/variants/bulk` | SHOPKEEPER | Bulk create variants |
| PATCH | `/inventory/:itemId/variants/:variantId` | SHOPKEEPER | Update variant |
| DELETE | `/inventory/:itemId/variants/:variantId` | SHOPKEEPER | Delete variant |
| GET | `/inventory/:itemId/variants` | Public | List active variants |

### Size Charts (`/api/size-charts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/size-charts/:jewelleryType` | Public | Get size chart for jewellery type |

### Catalogues — Seller Management (`/api/catalogues`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/catalogues` | SHOPKEEPER | Create catalogue (name, mode, password, expiry) |
| GET | `/catalogues/my` | SHOPKEEPER | List my shop's catalogues (paginated) |
| GET | `/catalogues/:id` | SHOPKEEPER | Get catalogue with items and inventory details |
| PATCH | `/catalogues/:id` | SHOPKEEPER | Update catalogue settings |
| DELETE | `/catalogues/:id` | SHOPKEEPER | Soft-delete catalogue |
| POST | `/catalogues/:id/items` | SHOPKEEPER | Add inventory item to catalogue |
| DELETE | `/catalogues/:id/items/:itemId` | SHOPKEEPER | Remove item from catalogue |
| PATCH | `/catalogues/:id/items/:itemId` | SHOPKEEPER | Update item (sortOrder, overridePrice, isHidden) |
| POST | `/catalogues/:id/items/reorder` | SHOPKEEPER | Bulk reorder items (atomic transaction) |
| GET | `/catalogues/:id/analytics` | SHOPKEEPER | View analytics (total views, unique viewers, 7-day trend) |
| PATCH | `/inventory/:itemId/visibility` | SHOPKEEPER | Set inventory item visibility (PUBLIC, CATALOGUE_ONLY, HIDDEN) |

### Catalogues — Public (`/api/public/catalogues`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/catalogues/:slug` | Public | Get catalogue metadata + shop branding |
| POST | `/public/catalogues/:slug/unlock` | Public | Unlock password-protected catalogue (returns HMAC token) |
| GET | `/public/catalogues/:slug/items` | Public* | Get catalogue items (*requires `X-Catalogue-Token` if password-protected) |
| POST | `/public/catalogues/:slug/view` | Public | Record view event (rate-limited, IP hash dedupe) |
| POST | `/public/catalogues/:slug/request-quote` | CUSTOMER | Request quote from catalogue items |
| POST | `/public/catalogues/:slug/message-shop` | CUSTOMER | Open conversation with shop about catalogue |

### Walk-in RFQ (`/api/rfq`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rfq/walk-in` | SHOPKEEPER | Create walk-in RFQ from catalogue items |
| GET | `/rfq/shop-requests?source=WALK_IN` | SHOPKEEPER | Filter RFQs by source (WALK_IN / ONLINE) |

### Chat Catalogue Integration (`/api/chat`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/conversations/:id/share-catalogue` | SHOPKEEPER | Share catalogue link in conversation |
| POST | `/chat/conversations/:id/share-products` | SHOPKEEPER | Share product cards in conversation |
| POST | `/chat/conversations/:id/walk-in-rfq` | SHOPKEEPER | Create walk-in RFQ from chat |

### Subscription Plans (`/api/subscription-plans`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription-plans/available?country=NP` | Public | List active plans for a country |
| GET | `/subscription-plans` | ADMIN | List all plans (filterable by country, isActive) |
| GET | `/subscription-plans/:id` | ADMIN | Get plan details |
| POST | `/subscription-plans` | ADMIN | Create plan (audit-logged) |
| PATCH | `/subscription-plans/:id` | ADMIN | Update plan fields (audit-logged) |
| PATCH | `/subscription-plans/:id/toggle` | ADMIN | Enable/disable plan (audit-logged) |

### Seller Subscriptions (`/api/seller-subscriptions`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/seller-subscriptions/subscribe` | SHOPKEEPER | Subscribe to a plan (FREE=instant, paid=Stripe intent) |
| POST | `/seller-subscriptions/:id/cancel` | SHOPKEEPER | Cancel subscription (at period end or immediately) |
| GET | `/seller-subscriptions/my-subscription` | SHOPKEEPER | Get current active subscription |
| GET | `/seller-subscriptions/my-features` | SHOPKEEPER | Get all 28 features with enabled/disabled state for active plan |
| GET | `/seller-subscriptions/my-history` | SHOPKEEPER | Get subscription history |
| GET | `/seller-subscriptions/admin/all` | ADMIN | List all subscriptions (paginated, filterable) |
| POST | `/seller-subscriptions/admin/override` | ADMIN | Override seller's plan (audit-logged) |
| POST | `/seller-subscriptions/admin/:id/activate` | ADMIN | Manually activate a subscription |
| GET | `/seller-subscriptions/admin/stats` | ADMIN | MRR, status breakdown, plan distribution |
| POST | `/seller-subscriptions/webhooks/stripe` | Stripe (sig-verified) | Stripe webhook handler |

### AI Credits (`/api/ai-credits`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ai-credits/balance` | JWT | Get current credit balance |
| GET | `/ai-credits/ledger` | JWT | Get credit transaction history |
| POST | `/ai-credits/purchase` | SHOPKEEPER | Buy AI credits (creates PaymentIntent; requires `purchasableAiCredits` feature) |
| GET | `/ai-credits/auto-recharge` | SHOPKEEPER | Get auto-recharge configuration |
| PUT | `/ai-credits/auto-recharge` | SHOPKEEPER | Set auto-recharge threshold and top-up amount |
| GET | `/ai-credits/admin/user/:userId` | ADMIN | Get user's credit balance |
| GET | `/ai-credits/admin/user/:userId/ledger` | ADMIN | Get user's credit ledger |
| POST | `/ai-credits/admin/adjust` | ADMIN | Admin credit adjustment (audit-logged) |
| POST | `/ai-credits/admin/monthly-grant` | ADMIN | Trigger monthly credit grant for all subscribers |
| GET | `/ai-credits/admin/stats` | ADMIN | System-wide credit stats |

### Payment Gateways (`/api/payment-gateways`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payment-gateways/configs` | ADMIN | List all gateway configs |
| GET | `/payment-gateways/configs/:id` | ADMIN | Get gateway config details |
| POST | `/payment-gateways/configs` | ADMIN | Upsert gateway config (audit-logged) |
| PATCH | `/payment-gateways/configs/:id/toggle` | ADMIN | Enable/disable gateway (audit-logged) |

### Enterprise — Branches (`/api/enterprise/branches`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/branches` | SHOPKEEPER (ENTERPRISE) | Create branch |
| GET | `/enterprise/branches` | SHOPKEEPER (ENTERPRISE) | List shop branches |
| PATCH | `/enterprise/branches/:id` | SHOPKEEPER (ENTERPRISE) | Update branch |
| DELETE | `/enterprise/branches/:id` | SHOPKEEPER (ENTERPRISE) | Delete branch |

### Enterprise — Staff (`/api/enterprise/staff`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/staff/invite` | SHOPKEEPER (ENTERPRISE) | Invite staff member |
| GET | `/enterprise/staff` | SHOPKEEPER (ENTERPRISE) | List staff accounts |
| PATCH | `/enterprise/staff/:id` | SHOPKEEPER (ENTERPRISE) | Update staff role/permissions |
| DELETE | `/enterprise/staff/:id` | SHOPKEEPER (ENTERPRISE) | Remove staff member |
| POST | `/enterprise/staff/accept/:token` | JWT | Accept staff invite |

### Enterprise — API Keys (`/api/enterprise/api-keys`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/api-keys` | SHOPKEEPER (ENTERPRISE) | Generate API key (returns raw key once) |
| GET | `/enterprise/api-keys` | SHOPKEEPER (ENTERPRISE) | List API keys (no secrets) |
| DELETE | `/enterprise/api-keys/:id` | SHOPKEEPER (ENTERPRISE) | Revoke API key |
| POST | `/enterprise/api-keys/validate` | Public | Validate API key and check scopes |

### Enterprise — Webhooks (`/api/enterprise/webhooks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/webhooks` | SHOPKEEPER (ENTERPRISE) | Create webhook subscription |
| GET | `/enterprise/webhooks` | SHOPKEEPER (ENTERPRISE) | List webhook subscriptions |
| PATCH | `/enterprise/webhooks/:id` | SHOPKEEPER (ENTERPRISE) | Update webhook |
| DELETE | `/enterprise/webhooks/:id` | SHOPKEEPER (ENTERPRISE) | Delete webhook |

### Enterprise — White Label (`/api/enterprise/white-label`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/enterprise/white-label` | SHOPKEEPER (ENTERPRISE) | Upsert branding config |
| GET | `/enterprise/white-label` | SHOPKEEPER (ENTERPRISE) | Get branding config |

### Enterprise — Reports (`/api/enterprise/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/reports/schedules` | SHOPKEEPER (ENTERPRISE) | Create scheduled report |
| GET | `/enterprise/reports/schedules` | SHOPKEEPER (ENTERPRISE) | List scheduled reports |
| PATCH | `/enterprise/reports/schedules/:id` | SHOPKEEPER (ENTERPRISE) | Update scheduled report |
| DELETE | `/enterprise/reports/schedules/:id` | SHOPKEEPER (ENTERPRISE) | Delete scheduled report |
| POST | `/enterprise/reports/generate` | SHOPKEEPER (ENTERPRISE) | Generate on-demand report |

### Enterprise — Bulk Import/Export (`/api/enterprise/bulk`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/bulk/import` | SHOPKEEPER (ENTERPRISE) | Create import job |
| GET | `/enterprise/bulk/jobs` | SHOPKEEPER (ENTERPRISE) | List import jobs |
| GET | `/enterprise/bulk/jobs/:id` | SHOPKEEPER (ENTERPRISE) | Get job status |
| POST | `/enterprise/bulk/export` | SHOPKEEPER (ENTERPRISE) | Export data (inventory/customers/prices) |

### Enterprise — Repricing (`/api/enterprise/repricing`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enterprise/repricing/rules` | SHOPKEEPER (ENTERPRISE) | Create repricing rule |
| GET | `/enterprise/repricing/rules` | SHOPKEEPER (ENTERPRISE) | List repricing rules |
| PATCH | `/enterprise/repricing/rules/:id` | SHOPKEEPER (ENTERPRISE) | Update repricing rule |
| DELETE | `/enterprise/repricing/rules/:id` | SHOPKEEPER (ENTERPRISE) | Delete repricing rule |
| POST | `/enterprise/repricing/evaluate` | SHOPKEEPER (ENTERPRISE) | Evaluate rules (preview adjustments) |

### Enterprise — Forecasting (`/api/enterprise/forecasts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/enterprise/forecasts` | SHOPKEEPER (ENTERPRISE) | Get demand forecasts |
| GET | `/enterprise/forecasts/history` | SHOPKEEPER (ENTERPRISE) | Get forecast history |

## 7) Operations & CI/CD notes

- CI/CD guidance is documented in `docs/CI-CD-PIPELINE.md`.
- Production-safe DB workflow is emphasized in internal docs; deployment uses Prisma deploy-style migrations (`prisma migrate deploy`) rather than dev migrations.
- Root scripts include:
  - `smoke-test`, `check-migrations`, `clear-cache`, `warm-cache`

## 8) Key environment variables (common)

Backend (`apps/api`):
- `DATABASE_URL`, `DIRECT_DATABASE_URL`
- `FRONTEND_URL`
- `REDIS_HOST`, `REDIS_PORT`
- `NODE_ENV`
- `PREFER_IPV4` (optional; helps Windows DNS behavior)
- `GEMINI_API_KEY` (Google AI — used by `ContactMaskingService` for Gemini Flash deep scan and image analysis)
- `CATALOGUE_TOKEN_SECRET` (HMAC secret for password-protected catalogue tokens)
- `IP_HASH_SALT` (salt for hashing viewer IPs in catalogue analytics)
- `STRIPE_SECRET_KEY` (Stripe API secret — used by seller subscriptions and payment gateway; gracefully mocked when absent)
- `STRIPE_WEBHOOK_SECRET` (Stripe webhook signature verification)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Razorpay gateway — optional, for IN/NP markets)

Frontend (`apps/web`):
- `NEXT_PUBLIC_IMAGE_WORKER_URL` (defaults to `https://images.orivraa.com`)

Worker (`cloudflare-worker`):
- `ALLOWED_ORIGINS`
- `UPLOAD_SECRET` (optional)

---

## 9) Changelog

### 2026-02-25 — Feature gating system, ticket priority escalation, payment wiring

**Feature gating system** (replaces blanket EnterpriseGuard):
- `PlanLimitsService`: `checkFeature()` / `hasFeature()` / `getActiveFeatures()` for all 28 plan features.
- `@RequireFeature()` decorator + `FeatureGateGuard`: NestJS guard reads metadata, calls `checkFeature()`, admins bypass.
- `FeatureNotEnabledException`: structured 403 response with `featureKey`, `featureLabel`, `planName` for frontend upgrade prompts.
- Wired to 13 controllers (15 feature gates): enterprise bulk-import, branches, staff, api-keys, webhooks, white-label, reports, forecasting, repricing; business invoices, customer-crm; AI credit purchase, design generation.
- `GET /seller-subscriptions/my-features`: returns all 28 features with enabled/disabled state, labels, categories.
- Seller billing "My Plan" tab now displays all features grouped by category with enabled/disabled indicators.
- Admin billing plan editor annotates each feature checkbox with "Enforced" (green) or "Display only" (gray) badge.

**Plan-based ticket priority escalation**:
- `TicketsService.createTicket()` now checks the user's active plan features via `PlanLimitsService`.
- `dedicatedSupport` enabled → ticket auto-escalated to `URGENT`.
- `prioritySupport` enabled → ticket auto-escalated to `HIGH`.
- Internal-only system message created noting the boost reason (visible to support staff only).
- `SupportModule` now imports `SubscriptionPlansModule` for plan feature lookups.
- Graceful fallback: if plan lookup fails, ticket proceeds at normal priority.

**Payment gateway wiring to orders & credits**:
- `PaymentGatewayModule` wired (via `forwardRef`) to `OrdersModule` and `AiCreditsModule`.
- 5 gateway adapters: Stripe, PhonePe, eSewa, Khalti, Razorpay.
- Order payments: unified flow creates payment intent on order creation, gateway selected by country + priority.
- AI credit purchases: `POST /ai-credits/purchase` creates PaymentIntent; on success, credits added with `PURCHASE` action.
- Auto-recharge: threshold + top-up config (`GET/PUT /ai-credits/auto-recharge`); triggers on credit debit below threshold.
- `CreditAction` enum extended with `PURCHASE`.

### 2026-02-24 — Auto free plan, subscription UX, security fix

**Auto-activate FREE plan on shop creation**:
- When a seller creates a shop (via registration, OAuth setup, or manual creation), the FREE subscription plan for their country is automatically activated. No manual subscription step required.
- `SellerSubscriptionsService.autoActivateFreePlan()` method — finds FREE plan by country, creates ACTIVE subscription, silently fails if no plan exists (doesn't block shop creation).
- Wired into: `AuthService.register()`, `ShopsService.setupShopForOAuthUser()`, `ShopsService.create()`.
- Module dependency: `SubscriptionPlansModule` imported into `ShopsModule` and `AuthModule`.

**Available Plans tab — current plan indicator**:
- Available Plans tab now fetches the current subscription alongside plans.
- Active plan card highlighted with primary border + ring, "Current" badge, and disabled "Current Plan" button.
- After subscribing, tab auto-refreshes to show updated state.

**Security fix — cancel subscription ownership check**:
- `POST /seller-subscriptions/:id/cancel` now verifies the subscription belongs to the caller's shop via JWT `shopId`.
- Previously, any authenticated SHOPKEEPER could cancel any subscription by ID (IDOR vulnerability).

**Cleanup**:
- Deleted 4 one-time manual migration SQL files that were already applied to production: `prisma/apply_pending_migrations.sql`, `prisma/fix_login_urgent.sql`, `prisma/migrations/002_enterprise_features.sql`, `apps/api/prisma/_mark_applied.sql`.

**Doc corrections**:
- Fixed `StaffRole` enum values: `MANAGER, INVENTORY, CASHIER, VIEWER, AUDITOR` (was incorrectly listed as `MANAGER, CASHIER, SALES_ASSOCIATE, INVENTORY_CLERK, ACCOUNTANT, VIEWER`).
- Fixed model name in changelog: `AiCreditLedger` (was incorrectly listed as `AiCreditBalance / AiCreditTransaction`).

### 2026-02-23 — Enterprise features + Vercel Speed Insights

**New backend module** — `EnterpriseModule` (9 services, 9 controllers, 1 guard)

**Schema additions** — nine new models:
- `ShopBranch` — multi-branch management (HQ, BRANCH, WAREHOUSE, KIOSK)
- `StaffAccount` — role-based staff access with JSON permissions and invite flow
- `ShopApiKey` — API key generation with sha256 hashing and scoped access
- `WebhookSubscription` — event-driven webhooks with HMAC-SHA256 signing, auto-disable after 10 failures
- `WhiteLabelConfig` — custom branding (logo, colors, CSS, custom domain)
- `ScheduledReport` — automated report generation (6 types × 5 frequencies × 3 formats)
- `BulkImportJob` — bulk import/export lifecycle tracking
- `DemandForecast` — category-level demand prediction with seasonal analysis
- `RepricingRule` — automated price adjustment rules (5 rule types)

**New enums**: `StaffRole`, `WebhookEvent`, `ReportType`, `ReportFrequency`, `ReportFormat`, `BulkImportType`, `BulkJobStatus`, `RepricingType`.

**EnterpriseGuard** — all enterprise endpoints check for active ENTERPRISE subscription; admin role bypasses.

**Enterprise plan features expanded** — subscription seed updated with 11 enterprise-only feature flags: `multiBranch`, `staffAccounts`, `webhookSubscriptions`, `scheduledReports`, `demandForecasting`, `automatedRepricing`, `bulkImportExport`, `customDomain`, `auditLogExport`, `ssoIntegration` (planned), `dataResidency` (planned).

**Migration** — `002_enterprise_features.sql` with all 9 tables, 8 enums, indexes, and constraints.

**Frontend** — new `/dashboard/shop/enterprise` page with 7-tab interface:
- Branches: CRUD with type badges, HQ indicator
- Staff: invite/manage with role selection and status tracking
- API Keys: generate/revoke with scope management, masked display
- Webhooks: configure URLs and event subscriptions, failure count monitoring
- Branding: logo/favicon/color customization with live preview
- Repricing: rule CRUD with type/condition configuration, real-time evaluation
- Forecasts: category-level demand charts with confidence scores and recommendations

**Vercel Speed Insights** — `@vercel/speed-insights` (v1.3.1) integrated in root layout for Core Web Vitals monitoring.

### 2026-02-22 — Subscription & billing system

**New backend modules** — `SubscriptionPlansModule`, `SellerSubscriptionsModule`, `AiCreditsModule`, `PaymentGatewayModule`

**Schema additions** — five new models:
- `SubscriptionPlan` — tier/country/currency/price/features/limits; fully admin-configurable
- `SellerSubscription` — links Shop→Plan with lifecycle (`ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`)
- `AiCreditLedger` — immutable credit transaction ledger per user
- `PaymentGatewayConfig` — multi-gateway support (Stripe, Razorpay, eSewa, FonePay) per country

**Multi-country, multi-currency support** — plans seeded for 6 regions:
- Nepal (NPR), India (INR), UAE (AED), UK (GBP), USA (USD), EU (EUR)
- 3 tiers per region: FREE, PRO, ENTERPRISE — 18 plans total
- Local currency pricing, admin can create/edit/toggle plans per country

**Commission integration** — `CommissionsService` now checks active subscription tier; PRO sellers get reduced commission rates, ENTERPRISE sellers get further discounts.

**AI credit system** — monthly credit grants based on plan tier (FREE=50, PRO=500, ENTERPRISE=2000); admin can adjust credits manually; all mutations audit-logged with `AiCreditTransaction` ledger.

**Stripe integration** — `PaymentIntent` flow for paid subscriptions; webhook handler for `payment_intent.succeeded` / `customer.subscription.deleted`; signature-verified; graceful fallback when Stripe keys not configured.

**Frontend** — new pages:
- `/shop/dashboard/billing` — current plan, credit balance, usage graph, plan comparison, history
- `/admin/dashboard/billing` — 4-tab admin panel (Plans, Subscriptions, Credits, Gateways)

---

### 2026-02-17 — Chat moderation rework & bug fixes

**Bug fix: Railway crash** (`RefundsModule` DI)
- `RefundsModule` was missing `NotificationsModule` import, causing NestJS dependency injection failure on Railway startup. Added the import.

**Chat moderation: 3-strike global blocking system** (complete rework)
- **Detection pipeline upgraded to dual-layer**:
  - Layer 1 (regex): expanded patterns — added Facebook, Viber, Signal handle detection; obfuscated number words ("nine-eight-seven"); spaced-out digits; more contact-sharing phrases.
  - Layer 2 (AI): integrated Gemini Flash (`gemini-2.0-flash`) for deep scan of message text — catches coded language, creative spelling, contextual contact sharing attempts that bypass regex.
  - Image analysis: Gemini vision model scans attached images for phone number screenshots, QR codes, contact cards.
- **Messages are now BLOCKED, not masked**: violating messages are stored (`isBlocked: true`) but never delivered to the recipient. Previously, content was masked and still sent.
- **Per-user global strike system** (replaces per-conversation 5-violation lock):
  - Violations tracked globally per user across all conversations.
  - Strike 1: sender sees warning with strike count.
  - Strike 2: warning + admin notification (`CONTACT_VIOLATION_WARNING`).
  - Strike 3: account blocked — `Shop.isOnHold = true` and/or `User.status = SUSPENDED`; admin notification (`ACCOUNT_BLOCKED_VIOLATIONS`).
  - Per-conversation 5-violation auto-lock also retained as secondary safeguard.
- **Admin tools**:
  - New endpoint: `GET /chat/admin/violations/user/:userId` — per-user violation history with blocked message list.
  - New endpoint: `GET /chat/admin/messages/:messageId` — retrieve original content of any blocked message.
  - New endpoint: `PATCH /chat/admin/users/:userId/unblock` — unblock suspended user, reset `isOnHold`/`status`, audit-logged.
- **WebSocket behavior**: blocked messages are echoed only to the sender (not broadcast to conversation room).
- **Frontend admin chat-monitoring page**: tabbed layout (Overview / User History), 5 stat cards (total violations, blocked messages, locked conversations, blocked users, active conversations), recent violations table, per-user search with strike meter gauge, unblock button.
- **Schema changes**: added `Message.isBlocked` (Boolean, default false); new `NotificationType` enum values (`CONTACT_VIOLATION_WARNING`, `ACCOUNT_BLOCKED_VIOLATIONS`).

**Migration**: `20260217111051_chat_blocking_and_notifications` — full DDL diff applied to Neon PostgreSQL production database.

**Commits**: `b4c421f` (code), `cfca0a6` (migration), `ad977b3` (migration SQL update).

### 2026-02-18 — Chat accessibility, broken page fixes, SALES role

**Phase 1: Chat UI accessibility** (commit `e6ec6f6`)
- Added "Message" button on `/shops` page (replacing phone icon)
- Added "Message Shop" buttons on shop profile pages (`/shops/[id]`)
- Added Messages nav item in `DashboardLayout` sidebar for ADMIN, SHOPKEEPER, and CUSTOMER roles
- Added messages icon with unread badge in header (beside the 4-square-boxes icon)
- Added "Message Shop" button on order details page (`/orders/[orderId]`)
- Created admin messages page (`/dashboard/admin/messages`) with full chat interface
- Added ADMIN role to chat controller `createConversation` and `sendMessage` endpoints

**Phase 2: Fix broken pages** (commit `1d17dd5`)
- **Engagement page fix**: NestJS route ordering bug — `@Get(":id/kyc")` was shadowing `@Get("my-shop/kyc")` in shops controller; moved all `my-shop/*` routes above the `:id` catch-all. Converted `Promise.all` to `Promise.allSettled` in engagement page for resilient data loading.
- **Admin Seller CRM fix**: Replaced 5 instances of `throw new Error("Shop not found")` with `throw new NotFoundException("Shop not found")` in `seller-engagement.service.ts` (returns 404 instead of 500). Converted `getSellerProfile` to use `Promise.allSettled` with `.catch(() => null)` fallbacks. Fixed frontend field mismatches (`buyer → customer`, `totalPriceNpr → totalNpr`). Fixed brittle tab selector in AdminSellerCRM. Converted `openProfile` in AdminSellerCRM to `Promise.allSettled`.
- **Customer detail page CRM**: Added `handleMessageCustomer` function + "Message Customer" button in header. Added platform messaging prompt in Contact Info card. Fixed order field mismatches (`totalAmount → totalNpr`, `currency → displayCurrency`).

**Phase 3: SALES role implementation** (commit `fbf927f`)
- **Schema**: Added `SALES` to `UserRole` enum in Prisma schema. Migration `20260217125532_add_sales_role` (`ALTER TYPE "UserRole" ADD VALUE 'SALES'`) applied to production DB.
- **Shared RBAC** (`packages/shared/src/enums/roles.ts`): Added `SALES` to `UserRole` enum with permissions (USER:READ/LIST, SHOP:READ/LIST, INVENTORY_ITEM:READ/LIST, ORDER:READ/LIST/UPDATE_STATUS, RFQ:READ/LIST, OFFER:READ/LIST, NOTIFICATION:READ/LIST/CREATE, MARKET_RATE:READ, MATERIAL:READ/LIST, REPORT:READ/LIST) and tri-lingual descriptions (en/ne/hi).
- **Frontend auth**: Added `"SALES"` to `UserRole` type, `getDashboardRoute` switch case (`/dashboard/sales`), and `roleRoutes` in `useAuth.tsx`. Added `SalesGuard` in `RouteGuard.tsx`.
- **Navigation**: Added 5 SALES nav items in `DashboardLayout.tsx` (Dashboard, Shops & CRM, Orders, Messages, Profile). Added SALES role badge (yellow). Added SALES quick actions and messages route in `header.tsx`.
- **Sales dashboard pages** (5 new pages):
  - `/dashboard/sales` — Overview with stat cards and recent orders
  - `/dashboard/sales/shops` — Shop directory + Seller CRM (reuses `AdminSellerCRM` component)
  - `/dashboard/sales/orders` — Order listing with status filters and pagination
  - `/dashboard/sales/messages` — Full chat interface for sales agents
  - `/dashboard/sales/profile` — Profile management
- **Backend access**: Added SALES to chat controller (create/list conversations, send/read messages, mark as read). Added SALES to order controller (`admin/all`, `admin/stats` read access). Added SALES to admin seller CRM endpoints (sellers directory, stats, profile, health score, onboarding, milestones, RFQ funnel, notes read/write). Export and write operations (update seller, cancel order, etc.) remain admin-only.

### 2026-02-19 — Violation specificity, Chat UX, Suspension lock, Ticket system, AI chatbot

**Violation warning specificity** (commit TBD)
- Added `VIOLATION_DESCRIPTIONS` map with 13 violation types, each with English + Hindi specific messages.
- Violation warnings now include the exact type detected (e.g., "Phone number detected / फ़ोन नंबर पाया गया").
- Added `GUIDELINES_URL = "/platform-guidelines"` link in all warning messages.
- Created `/platform-guidelines` page — bilingual (English/Hindi) page covering contact sharing policy, warning system, allowed behaviors, marketplace rules.

**Chat UX improvements** (commit TBD)
- **Online presence**: Added `checkOnline` event to chat gateway. `ChatPopupWidget` polls online status every 30 seconds. Green dot + "Online"/"Offline" text per conversation.
- **"See full messages" link**: Redirects to `/dashboard/{role}/messages` from the popup widget.
- **File attachments**: 📎 button to attach images, video (mp4/webm ≤25MB), documents (pdf/doc/docx ≤15MB). Preview before send with clear button. Upload via R2 worker with `X-Upload-Type: chat`. Inline rendering: images as thumbnails, video with controls, documents as download links.
- **R2 worker update**: Added `chat` upload type (1200/600/200px variants for images), split `ALLOWED_TYPES` into IMAGE/VIDEO/DOC categories, per-type size limits, `/chat/` serve route.

**Account suspension lock screen** (commit TBD)
- Login no longer blocks suspended users; returns `isSuspended: true`.
- `SuspendedOverlay` component renders over entire dashboard (z-100): dark backdrop, SVG chains from 4 corners, lock icon, bilingual explanation, Contact Support / Guidelines / Sign Out buttons.
- `DashboardLayout` renders overlay when `user.status === "SUSPENDED"`.

**Support ticket system** (commit TBD)
- **Prisma schema**: Added `SupportTicket` and `TicketMessage` models with 3 new enums (`TicketType` 15 values, `TicketStatus` 6 values, `TicketPriority` 4 values). Added 6 new `NotificationType` values for ticket events.
- **Backend service** (`tickets.service.ts`): Full CRUD — `createTicket` (auto-number TKT-XXXXX, auto-priority for security types, notifies all staff), `listTickets` (filtered/sorted), `getTicket` (access control, internal note filtering), `claimTicket`, `updateTicketStatus`, `addMessage` (auto-transition WAITING_USER→IN_PROGRESS on user reply), `resolveTicket`, `closeTicket`, `getTicketStats`, `getMyTickets`.
- **Backend controller** (`tickets.controller.ts`): 12 REST endpoints (see API section). Public endpoints: guest ticket creation, AI chatbot. Auth endpoints: user ticket CRUD. Staff endpoints: list all, claim, status management, stats.
- **WebSocket gateway** (`tickets.gateway.ts`): Namespace `/support`. JWT auth on handshake. Auto-joins `support:staff` room for SUPPORT/ADMIN. Events: `joinTicket`/`leaveTicket`, `ticketMessage`, `claimTicket`, `updateTicketStatus`. Broadcasts to staff room + ticket rooms.
- **Frontend API** (`api.ts`): Full `ticketsApi` object with 12 methods.
- **Frontend hook** (`useTicketSocket.ts`): Socket.IO hook for `/support` namespace with shared singleton, event callbacks, room management.
- **User pages** (`UserSupportPage.tsx`): Shared component for customer/shop dashboards — ticket list with status/priority badges, create dialog, ticket detail with chat-style messages, real-time updates.
- **Staff pages** (`StaffTicketsPage.tsx`): Shared component for admin/support — stats overview (6 cards), filtered ticket list, pagination, ticket detail with claim/manage actions, internal notes (yellow highlight), real-time updates.
- **Support dashboard** (`/dashboard/support/page.tsx`): Stats cards + platform overview (pending refunds, orders, chats, violations).
- **Navigation updates**: Added SUPPORT role nav items (Dashboard, Tickets, Messages, Flagged Chats, Profile). Added "Help & Support" for Customer and Shopkeeper. Added Admin Tickets link.

**Public help page + AI chatbot** (commit TBD)
- **AI chatbot service** (`ai-chatbot.service.ts`): Gemini Flash 2.0 with system prompt defining OriVraa context. Returns structured JSON (`reply`, `shouldEscalate`, `suggestedTicketType`, `confidence`). Maintains conversation history (last 6 messages). Keyword-based fallback when Gemini unavailable.
- **Help page** (`/help/page.tsx`): Public page with AI chat interface, quick topic cards, quick question buttons. Escalation prompts when AI suggests ticket. Supports both authenticated and guest ticket creation. Guest form adds email/name. Chat context auto-included in ticket description. Link to platform guidelines.

**Schema changes**: `SupportTicket`, `TicketMessage` models; `TicketType`, `TicketStatus`, `TicketPriority` enums; 6 new `NotificationType` values; User relations for tickets.

### 2026-02-20 — Seller Catalogue feature

**New module: Catalogue** (26+ files, full end-to-end implementation)

**Prisma schema changes**:
- Added `Catalogue`, `CatalogueItem`, `CatalogueViewEvent`, `ShowroomSession` models.
- Added `InventoryVisibility` enum (`PUBLIC`, `CATALOGUE_ONLY`, `HIDDEN`) to `InventoryItem`.
- Added `RfqSource` enum (`ONLINE`, `WALK_IN`) + `createdByShopId`, `walkInMeta` fields to `RfqRequest`.
- Extended `MessageType` enum with `PRODUCT_CARD`, `CATALOGUE_LINK`, `SHOWROOM_SESSION`, `RFQ_ACTION`.
- Added `Message.payload` (Json?), `Message.isSystemGenerated` (Boolean).

**Backend — NestJS `catalogue` module**:
- `catalogue.module.ts`, `catalogue.controller.ts` (11 seller endpoints), `catalogue.public.controller.ts` (6 public endpoints), `catalogue.service.ts`.
- DTOs: `create-catalogue.dto.ts`, `update-catalogue.dto.ts`, `add-item.dto.ts`, `reorder-items.dto.ts`, `unlock-catalogue.dto.ts`.
- `catalogue.token.ts`: HMAC token generation/verification for password-protected catalogues.
- Field mapping transform layer: backend Prisma fields (nameEn, shopName, jewelleryType, etc.) mapped to API contract names (title, name, metal, etc.) in service response methods.
- Analytics: view recording with IP hash deduplication.
- RBAC: SHOPKEEPER for seller endpoints, public for view endpoints, CUSTOMER for quote/message endpoints.
- Audit logging for all create/update/delete operations.

**Backend — RFQ walk-in support**:
- `POST /api/rfq/walk-in`: seller-only endpoint for creating walk-in RFQs.
- `CreateCatalogueWalkInRfqDto`: items, jewellery type, budget, deadline, measurements, walk-in customer info.
- Source filter on `GET /api/rfq/shop-requests?source=WALK_IN|ONLINE`.
- Privacy filtering: `walkInMeta.customerPhone` stripped for non-staff roles.

**Backend — Chat catalogue integration**:
- `POST /chat/conversations/:id/share-catalogue`: share catalogue link as rich card.
- `POST /chat/conversations/:id/share-products`: share product cards.
- `POST /chat/conversations/:id/walk-in-rfq`: create walk-in RFQ from chat.
- System-generated messages bypass PII detection.

**Frontend — Seller dashboard catalogue pages**:
- `/dashboard/shop/catalogues/page.tsx`: list catalogues with stats (items count, views, mode, public/private).
- `/dashboard/shop/catalogues/new/page.tsx`: create catalogue form.
- `/dashboard/shop/catalogues/[id]/page.tsx`: manage catalogue — edit settings, share link + QR, add/remove items from inventory, toggle hidden, analytics dashboard.
- "Catalogues" navigation item added to shop dashboard sidebar.

**Frontend — Public catalogue view**:
- `/c/[slug]/page.tsx`: public catalogue page with shop branding, item grid, variant sizes, price display.
- Password gate: unlock form → stores token in localStorage → sends via `X-Catalogue-Token` header.
- Showroom Mode: full-screen swipe carousel, session management (add/remove items), session sidebar.
- Normal Mode: responsive grid with item cards, variant chips, price display.
- "Request Quote" (sends all visible items), "Message Shop" CTAs (both require login).
- Staff floating "Open Showroom" button when owner is viewing.

**Frontend — Walk-in RFQ inline modal** (3-step):
- Step 1: Confirm items, select variant sizes, adjust quantities.
- Step 2: Jewellery type, budget range, timeline, notes, measurements (ring, wrist, chain, bangle).
- Step 3: Walk-in customer info (name, phone, notes) with privacy disclaimer.
- Submit calls `POST /api/rfq/walk-in` → success toast + redirect to RFQ list.

**Frontend — RFQ walk-in filter**:
- Filter pills [All] [Online] [Walk-in] on `/dashboard/shop/rfqs`.
- "Walk-in" badge and "Created from Catalogue: <slug>" tag on RFQ cards.

**Frontend — Chat integration**:
- `RichMessageCard` component renders `PRODUCT_CARD`, `CATALOGUE_LINK`, `SHOWROOM_SESSION`, `RFQ_ACTION` messages.
- Chat API client methods: `shareCatalogue`, `shareProducts`, `createWalkInRfq`.

**Bug fixes applied in this release**:
- Fixed `Cannot find module 'bcrypt'` Railway crash: `catalogue.service.ts` and `two-factor.service.ts` imported native `bcrypt` instead of `bcryptjs`.
- Fixed field mapping mismatches: backend transform layer maps Prisma field names to frontend API contract names.
- Fixed `handleRequestQuote` sending empty body: now sends all visible catalogue items.
- Fixed manage page inventory search using wrong field names: uses fallback (`nameEn || title`).

**New env vars**: `CATALOGUE_TOKEN_SECRET`, `IP_HASH_SALT`.

---

### 4.14 POS Basket (from Customer Likes/Picks)

**Purpose**: Allows shopkeepers to build a point-of-sale basket from items a customer has liked/wishlisted, then checkout to create an invoice and decrement stock in one flow.

**Data models** (Prisma):
- `WishlistItem`: `userId` + `inventoryItemId` (unique constraint), customer's liked items
- `PosSession`: time-limited basket (30 min) per shop — `shopId`, `customerId?`, `conversationId?`, `status` (`ACTIVE`/`CHECKED_OUT`/`CANCELLED`/`EXPIRED`), `expiresAt`
- `PosSessionItem`: line items in session — `inventoryItemId`, `variantId?`, `qty`, `unitPrice` (locked at add-time), `lineTotal`
- `StockReservation`: soft reservation per session — `inventoryItemId`, `variantId?`, `qty`, `expiresAt`; prevents overselling across concurrent sessions
- `PosSessionStatus` enum: `ACTIVE`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED`
- `NotificationType` extended: `POS_SESSION_CREATED`, `POS_CHECKOUT_COMPLETED`

**Backend** (`apps/api/src/modules/pos/`):
- `PosModule` → `PosController` + `PosService`
- Endpoints (all `@Roles("SHOPKEEPER")`):
  - `GET /pos/customer-picks/:customerId` — returns wishlist items belonging to this shop (relationship-gated: requires conversation or order)
  - `GET /pos/session/active` — get current active POS session
  - `POST /pos/session` — create session (auto-cancels any existing active session)
  - `POST /pos/session/:id/items` — add items to basket (reserves stock)
  - `PATCH /pos/session/:id/items/:itemId` — update qty (qty=0 removes)
  - `POST /pos/session/:id/checkout` — create invoice via `InvoicesService`, decrement stock, release reservations
  - `DELETE /pos/session/:id` — cancel session, release reservations
- Stock reservation: separate `StockReservation` table, not fields on `ProductVariant`; aggregated check before each add; released on checkout/cancel/expire
- Price locking: `unitPrice` captured at add-time from `InventoryItem.totalPriceNpr` or `ProductVariant.priceOverride`

**Background job** (`apps/api/src/modules/jobs/processors/pos-expiry.processor.ts`):
- Cron: every 5 minutes, finds `ACTIVE` sessions past `expiresAt`, releases reservations, marks `EXPIRED`
- Also available as Bull job (`pos-expiry` queue, `expire-sessions` process)

**Frontend** (`apps/web/src/app/dashboard/shop/pos/page.tsx`):
- Customer picker → loads wishlist items via `GET /pos/customer-picks/:id`
- Basket panel with qty +/- controls, variant display, running totals
- Checkout dialog: customer name, phone, email, tax rate, discount, notes → creates invoice
- Auto-session from chat: URL params `?customerId=...&conversationId=...` auto-create session and load picks
- Nav item: "POS Basket" with `ScanLine` icon in shopkeeper sidebar (after "Walk-in Quotes")

**Chat integration** (`apps/web/src/app/dashboard/shop/messages/page.tsx`):
- "Load Picks to POS" button in conversation header → navigates to `/dashboard/shop/pos?customerId=...&conversationId=...`

**Tests** (`apps/api/src/modules/pos/pos.spec.ts`):
- Relationship gating (ForbiddenException when no conversation/order)
- Stock reservation conflicts (BadRequestException on insufficient stock)
- Checkout flow (invoice creation, stock decrement, reservation cleanup)
- Session cancellation and expiry cleanup

