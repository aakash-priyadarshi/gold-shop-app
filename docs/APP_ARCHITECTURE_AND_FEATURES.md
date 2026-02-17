# Gold Shop App — Architecture & Feature Inventory

_Last updated: 2026-02-18_

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
- Main route areas (folder-level):
  - Public pages: `about/`, `shops/`, `shop/`, `rfq/`, `designs/`, `cart/`, `checkout/`, `orders/`, `notifications/`, `auth/`.
  - Dashboards: `dashboard/customer/*`, `dashboard/shop/*`, `dashboard/admin/*`, `dashboard/sales/*`.

Dashboard route map (folder inventory):
- Customer dashboard (`apps/web/src/app/dashboard/customer`): `orders/`, `payments/`, `rfqs/`, `settings/`, `wishlist/`, `messages/`, `refunds/`.
- Shop dashboard (`apps/web/src/app/dashboard/shop`): `analytics/`, `commissions/`, `customers/`, `engagement/`, `inventory/`, `invoices/`, `orders/`, `pricing/`, `products/`, `profile/`, `quotes/`, `rfqs/`, `settings/`, `shop-profile/`, `tools/`, `messages/`, `variants/`.
- Admin dashboard (`apps/web/src/app/dashboard/admin`): `shops/`, `users/`, `verifications/`, `orders/`, `commissions/`, `intelligence/`, `reports/`, `settings/`, `profile/`, `support/`, `chat-monitoring/`, `refunds/`, `messages/`.
- Sales dashboard (`apps/web/src/app/dashboard/sales`): `shops/`, `orders/`, `messages/`, `profile/`.

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
- `chat`: anti-circumvention in-app messaging with **3-strike global blocking** (messages BLOCKED, not masked), dual-layer detection (regex + Gemini Flash AI deep scan including image analysis), per-user violation tracking, account suspension on 3rd strike, admin unblock; WebSocket real-time delivery
- `refunds`: metal-only refund policy enforcement, eligibility checks, refund lifecycle (request → approve/reject → process), commission reversal
- `support`: internal operations dashboard aggregating pending refunds, flagged conversations, KYC queue, and order monitoring
- `product-variants`: size variant management for rings/bangles/bracelets with SKU-level stock, price overrides, and standardised size charts

### Images (Cloudflare Worker + R2)

Worker implementation:
- `cloudflare-worker/src/index.ts`

Endpoints:
- `GET /health`: worker health
- `POST /upload`: upload image (supports multipart, raw bytes, or base64 JSON)
- `DELETE /delete/{key}`: delete original and variant keys
- `GET /images/{key}` and `GET /{type}/{filename}`: serve from R2

Upload types (worker-side variants defined):
- `product`, `profile`, `rfq`, `designs`, `kyc`

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

Enums represent key business states and supported options, e.g. `OrderStatus`, `DetailedOrderStatus` (includes `REFUND_REQUESTED`), `PaymentMethod`, `PaymentStatusEnum`, `RfqStatus`, `OfferStatus`, `RefundStatus`, `ConversationStatus`, `CommissionStatus` (includes `REVERSED`), `NotificationType` (includes `NEW_MESSAGE`, `CONVERSATION_LOCKED`, `REFUND_REQUESTED`, `REFUND_APPROVED`, `REFUND_REJECTED`, `REFUND_PROCESSED`), `UserRole` (ADMIN, SHOPKEEPER, CUSTOMER, SUPPORT, SALES), and multiple material/finish/gem enums.

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

### 4.9 Order state machine

- `StateMachineService` defines explicit transition maps for both `OrderStatus` and `RefundStatus`.
- `validateOrderTransition(from, to)` and `validateRefundTransition(from, to)` throw `BadRequestException` on illegal transitions.
- Terminal states: `CANCELLED`, `REFUNDED`, `EXPIRED` (order); `PROCESSED` (refund).

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
- Orders queue for attention/processing
- Flagged conversations review
- Pending KYC verifications queue
- Recent audit activity feed

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

WebSocket gateway: namespace `/chat`, events: `joinConversation`, `leaveConversation`, `sendMessage`, `typing`, `markRead`.

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

Frontend (`apps/web`):
- `NEXT_PUBLIC_IMAGE_WORKER_URL` (defaults to `https://images.orivraa.com`)

Worker (`cloudflare-worker`):
- `ALLOWED_ORIGINS`
- `UPLOAD_SECRET` (optional)

---

## 9) Changelog

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



