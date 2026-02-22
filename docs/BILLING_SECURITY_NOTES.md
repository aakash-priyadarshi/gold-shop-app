# Security Architecture — Subscription & Billing System

> Internal reference for Orivraa engineering. Last updated: 2026-02-24.

---

## 1. Payment Gateway Secrets — `envKeyLabel` Pattern

**Rule: NEVER store payment gateway secrets (API keys, webhook secrets) in the database.**

The `PaymentGatewayConfig` table stores only an `envKeyLabel` field — a _string reference_ to the environment variable name (e.g. `"STRIPE_SECRET_KEY"`, `"RAZORPAY_KEY_SECRET"`). At runtime, `PaymentGatewayService` reads the actual secret via `process.env[envKeyLabel]`.

This means:
- A database breach exposes _zero_ payment credentials.
- Secrets are managed via Railway/Vercel env vars, rotated without code deploys.
- Admin UI shows the env var label, never the actual value.

---

## 2. Server-Authoritative Money Logic

All financial calculations are server-side only:

| Domain | Enforcement |
|--------|------------|
| Commission rate | Read from `SubscriptionPlan.commissionPercent` via `SubscriptionPlansService.getActiveShopPlan()`, fallback to `PlatformConfigService`. Client never sends rate. |
| AI credit balance | `User.aiCreditsBalance` updated atomically via `SELECT FOR UPDATE` in Prisma `$transaction`. Client can only read balance, never set it. |
| Subscription pricing | Plan prices stored in DB, read server-side. Client requests a `planId`; server determines amount. |
| Overage billing | `overageBehavior` (BLOCK / AUTO_CHARGE) is plan-level config; server enforces, not client. |

---

## 3. Audit Trail

All admin mutations (plan create/update/toggle, gateway toggle, credit adjust, subscription override) are logged via `AuditService.log()`:

```typescript
this.auditService.log({
  userId: adminId,
  actorType: 'ADMIN',
  action: 'SUBSCRIPTION_PLAN_CREATED',
  resourceType: 'SUBSCRIPTION_PLAN',
  resourceId: plan.id,
  previousValue: null,
  newValue: sanitizedPlanData,
  metadata: { ... },
});
```

Fields recorded: `userId`, `actorType`, `action`, `resourceType`, `resourceId`, `previousValue` (JSON), `newValue` (JSON), `metadata`, `ipAddress`, `userAgent`.

The `AuditModule` is `@Global()` — available to all modules without explicit import.

---

## 4. Idempotency — AI Credit Operations

Credit debit/refund operations use two layers of idempotency:

1. **Redis check**: `SET ai_credit_idem:{idempotencyKey}` with 24h TTL. If key exists, return cached result.
2. **Prisma unique constraint**: `AiCreditLedger.idempotencyKey` is `@unique`. A duplicate insert fails at DB level.

This prevents double-debit from retry storms, webhook replays, or client bugs.

---

## 5. Rate Limiting — AI Credit Abuse Prevention

`AiCreditsService.enforceRateLimit(userId)` uses Redis counters:

- **Hourly**: `ai_rate:hourly:{userId}:{yyyyMMddHH}` — max 20 operations/hour
- **Daily**: `ai_rate:daily:{userId}:{yyyyMMdd}` — max 100 operations/day

Redis-based (not in-memory), so limits survive server restarts and work across multiple instances.

---

## 6. Stripe Webhook Verification

`SellerSubscriptionsController` verifies Stripe webhook signatures:

```typescript
@Post('webhooks/stripe')
async stripeWebhook(@Req() req, @Headers('stripe-signature') sig) {
  const event = stripe.webhooks.constructEvent(
    req.rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  // ...
}
```

The raw body is used (not parsed JSON) to ensure signature integrity.

---

## 7. Authorization Model

| Endpoint Pattern | Guard | Who |
|------------------|-------|-----|
| `POST /subscription-plans` | `@Roles(ADMIN)` | Admin only |
| `POST /seller-subscriptions/subscribe` | `@Roles(SHOPKEEPER)` | Seller for own shop (JWT shopId fallback) |
| `POST /seller-subscriptions/:id/cancel` | `@Roles(SHOPKEEPER)` | Seller for own shop (verifies subscription.shopId === JWT shopId) |
| `POST /ai-credits/admin/adjust` | `@Roles(ADMIN)` | Admin only |
| `GET /ai-credits/balance` | `JwtAuthGuard` | Any authenticated user |
| `POST /webhooks/stripe` | None (signature-verified) | Stripe servers |

All admin endpoints use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`.

---

## 8. Data Isolation

- `getMySubscription()` reads `shopId` from JWT token (`@CurrentUser('shopId')`), not from request body.
- `cancelSubscription()` verifies `subscription.shopId === JWT shopId` — prevents IDOR (any shopkeeper cancelling another's subscription).
- `subscribe()` falls back to JWT `shopId` when body `shopId` is empty — client sends `""`, server resolves from JWT.
- `getBalance()` reads `userId` from JWT token, not query params.
- Admin endpoints for specific users require explicit `userId`/`shopId` params but are guarded by `ADMIN` role.
- FREE plan auto-activated on shop creation — `autoActivateFreePlan()` runs after shop creation in auth registration, OAuth setup, and manual shop creation flows.

---

## 9. Graceful Degradation

- **Stripe unavailable**: Services check `STRIPE_SECRET_KEY` existence. If missing/placeholder, they return mock payment intents and log warnings. Subscriptions stay in `TRIALING` for manual admin activation.
- **Redis unavailable**: `RedisService.isAvailable()` check. Rate limiting and idempotency gracefully skip when Redis is down (logged as warning). Credit operations still rely on DB-level unique constraint as fallback.
- **Commission lookup failure**: If `SubscriptionPlansService.getActiveShopPlan()` throws, `CommissionService` falls back to `PlatformConfigService.getPlatformCommissionRate()` (default 5%).





double check the below features are implemented or not:

You are a senior full-stack engineer implementing a production-grade subscription + payment system for Orivraa.

Stack:
- Frontend: Next.js (Vercel)
- Backend: NestJS (Railway)
- DB: Postgres (Neon) via Prisma
- Cache/Jobs: Redis (Upstash) + Bull
- Edge: Cloudflare Workers
- Stripe integrated (keys in environment variables only)

CRITICAL RULES:
- NEVER store payment gateway secrets in the database.
- Secrets must live only in environment variables.
- All money/credits/commission logic must be server-authoritative.
- All admin changes must be audit-logged.

========================================================
A) SUBSCRIPTION PLANS — FULLY ADMIN CONFIGURABLE
========================================================

Remove any hardcoded plan definitions.

Implement dynamic plan system with these entities:

1) SubscriptionPlan (DB model)
Fields:
- id
- name (FREE, PRO, PRO_PLUS, etc.)
- country (e.g., IN, UK, EU, US, AE)
- currency
- monthlyPrice
- catalogLimit (nullable = unlimited)
- commissionPercent
- includesAi (boolean)
- monthlyAiCredits
- rolloverCap
- extraCreditPrice
- isActive (boolean)
- createdAt
- updatedAt

Admin must be able to:
- Create new plans
- Modify pricing
- Modify commission %
- Modify catalog limit
- Enable/disable AI
- Change monthly AI credits
- Change rollover cap
- Change extra credit price
- Enable/disable plan per country

All changes must:
- Create an AuditLog entry
- Store previous value and new value
- Store admin user id

========================================================
B) SELLER SUBSCRIPTIONS
========================================================

Implement SellerSubscription model:
- sellerId
- planId
- status (ACTIVE, CANCELLED, PAST_DUE)
- startedAt
- expiresAt
- stripeSubscriptionId (nullable)
- country
- autoRenew (boolean)

Commission logic:
- Order commission % must be read dynamically from the seller's active plan.
- Never trust client commission calculation.

========================================================
C) AI CREDIT SYSTEM (ADMIN CONFIGURABLE)
========================================================

AI credit rules must NOT be hardcoded.

Plan fields define:
- monthlyAiCredits
- rolloverCap
- extraCreditPrice

Implement:

1) AiCreditLedger (immutable)
- id
- userId or sellerId
- action (GRANT, DEBIT, REFUND, EXPIRE, ADMIN_ADJUST)
- amount
- balanceBefore
- balanceAfter
- referenceId
- createdAt

2) seller.aiCreditsBalance (int)

Monthly grant logic:
- On 1st of month (cron job):
    newBalance = min(currentBalance + monthlyAiCredits, rolloverCap)

Overage:
- If balance = 0 and seller generates:
    either:
      a) block
      OR
      b) auto-charge extraCreditPrice per generation via Stripe
Make this behavior configurable per plan.

Must include:
- Atomic debit (transaction with SELECT FOR UPDATE)
- Idempotency key for generation endpoint
- Redis rate limit (per hour + per day)

========================================================
D) ADMIN PANEL REQUIREMENTS
========================================================

Create secure admin panel with:

1) Plan Management:
- CRUD plans
- Country-specific pricing
- Toggle AI on/off
- Set commission %
- Set credit values
- Activate/deactivate plans

2) Gateway Management:
- Enable/disable Stripe per region
- Enable/disable PhonePe per region (future)
- Set routing priority per country
- Select ENV key label (not value)
- View last updated by

IMPORTANT:
- Admin panel must NOT expose any API secret.
- Payment keys live only in env variables.
- Gateway config DB stores:
    - gatewayName
    - enabled
    - supportedCountries
    - priority
    - envKeyLabel (string reference only)
    - updatedBy
    - updatedAt

Add:
- AuditLog model
- Middleware to log all admin config changes

========================================================
E) PAYMENT ROUTING SYSTEM
========================================================

Create PaymentGateway interface:
- createPaymentIntent()
- verifyWebhook()
- refund()

Create PaymentRouterService:
- route by buyer country + payment method
- India + UPI -> PhonePe (when enabled)
- UK/EU/US/UAE -> Stripe
- fallback to Stripe if others disabled

Log:
- buyer country
- issuer country (from Stripe response)
- selected gateway
for analytics.

Webhooks:
- idempotent
- verify signature
- update order state machine only server-side

========================================================
F) COST OPTIMISATION (IMPLEMENT WITH SUBSCRIPTIONS)
========================================================

1) Add Cache-Control headers to public read endpoints.
2) Implement pricing snapshot endpoint (5 min cache).
3) Client-side pricing estimation.
4) Precompute analytics snapshots hourly.
5) Request collapsing for FX/spot prices.

========================================================
G) DELIVERABLES
========================================================

1) Provide step-by-step PR plan.
2) Prisma schema updates.
3) Backend implementation (modules/services/controllers/guards/jobs).
4) Frontend implementation (seller billing + admin plan editor).
5) Unit tests:
   - credit debit atomicity
   - commission calculation per plan
   - payment routing logic
6) Security notes:
   - server-authoritative boundaries
   - secret handling
   - idempotency
   - abuse prevention

Before implementation, ask me for:
- Current Prisma schema
- Current Stripe flow
- Current Order model
Then proceed carefully in production-ready style.


Enterprise Solution Suggestions
Here are strategic features to offer Enterprise tier customers:

Dedicated Support & Account Management
Dedicated account manager — named point of contact for onboarding, support escalation, and quarterly business reviews
Priority support SLA — guaranteed 4-hour response, 24-hour resolution for critical issues (vs. 48h for PRO)
Private Slack/WhatsApp channel for real-time support
Custom Integrations
API access — expose REST/GraphQL endpoints for enterprise sellers to integrate with their own ERP, POS, or accounting systems (Tally, QuickBooks, Zoho)
Webhook subscriptions — push notifications for order status changes, price alerts, inventory events
Bulk import/export — CSV/Excel upload for catalog items, customer lists, price sheets
White-Label & Branding
Custom subdomain — enterprise-name.yourplatform.com
White-label storefront — remove platform branding, custom logo/colors/fonts
Custom email templates — branded transactional emails
Advanced Analytics & BI
BI dashboard — revenue trends, customer demographics, conversion funnels, inventory turnover
Custom reports — scheduled PDF/Excel reports delivered via email
Data export API — raw data access for their own analytics tools
Business Features
Negotiable commission rates — custom commission tiers based on volume (e.g., 0.5% instead of 2%)
Multi-branch support — single enterprise account managing multiple shop locations
Staff accounts & roles — sub-users with granular permissions (inventory manager, cashier, auditor)
Bulk RFQ priority queue — enterprise RFQs surface first for suppliers
Dedicated catalog slots — featured/promoted listings on marketplace homepage
Security & Compliance
SSO integration — SAML/OIDC for enterprise identity providers
Audit log export — downloadable compliance reports
Data residency options — choose data region (for UAE/EU regulatory compliance)
Two-factor enforcement — mandatory 2FA for all staff accounts
AI & Automation Extras
2,000 AI credits/month (already in your plan) + option to purchase additional packs
AI-powered demand forecasting — predict which designs/karats sell best by season
Automated repricing — rules-based price adjustments tied to live gold rate margins
These features create strong lock-in and justify the premium pricing (NPR 9,999 / USD 199 per month). Start by implementing multi-branch, staff roles, and API access — those are the highest-value differentiators for serious jewellers.