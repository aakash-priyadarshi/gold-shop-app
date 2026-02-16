# Security Fixes Applied — Gold Shop App

**Date:** 2025-02-16  
**Commit:** `444dcea`  
**Author:** Pen Test Security Audit

---

## Summary of Vulnerabilities Found & Fixed

### 1. CRITICAL — JWT Fallback Secret (FIXED)
- **File:** `apps/api/src/modules/auth/auth.module.ts`  
- **Issue:** JWT configuration fell back to hardcoded `"gold-shop-secret-key"` if `JWT_SECRET` env var was not set. Any attacker who knows this default could forge valid JWTs.
- **Fix:** Removed the fallback entirely. The app now throws a fatal error on startup if `JWT_SECRET` is not configured.

### 2. HIGH — CORS Allows localhost in Production (FIXED)
- **File:** `apps/api/src/main.ts`  
- **Issue:** `http://localhost:3000` was always in the CORS whitelist, even in production. This could allow CSRF-style attacks from a local malicious page.
- **Fix:** localhost is now only included when `NODE_ENV !== 'production'`.

### 3. MEDIUM — Swagger API Docs Exposed in Production (FIXED)
- **File:** `apps/api/src/main.ts`  
- **Issue:** Swagger UI at `/api/docs` was always available, leaking all API endpoints, parameter schemas, and response types to anyone.
- **Fix:** Swagger is now only initialized when `NODE_ENV !== 'production'`.

### 4. MEDIUM — matching-debug Endpoint Exposed (FIXED)
- **File:** `apps/api/src/modules/shops/shops.controller.ts`  
- **Issue:** `GET /api/shops/matching-debug` was publicly accessible with no authentication, exposing internal matching logic, shop scores, and business data.
- **Fix:** Added `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(UserRole.ADMIN)` — now admin-only.

### 5. MEDIUM — Account Enumeration via check-email/check-phone (FIXED)
- **File:** `apps/api/src/modules/auth/auth.controller.ts`  
- **Issue:** `GET /api/auth/check-email` and `GET /api/auth/check-phone` were completely unauthenticated and had no rate limiting, allowing attackers to enumerate registered accounts at high speed.
- **Fix:** Added `@Throttle({ default: { ttl: 60000, limit: 5 } })` — max 5 requests per minute per IP. Also added ThrottlerGuard as a global `APP_GUARD` so `@Throttle()` decorators are universally enforced.

### 6. MEDIUM — Information Leak in Login Error (FIXED)
- **File:** `apps/api/src/modules/auth/auth.service.ts`  
- **Issue:** When a user with an unverified email tried to login, the `ForbiddenException` response included `userId` and `email` in the JSON body, leaking internal user details.
- **Fix:** Removed `userId` and `email` from the exception. Response now only contains `message` and `code`.

### 7. Global Rate Limiting Enforcement (NEW)
- **File:** `apps/api/src/app.module.ts`  
- **Issue:** `ThrottlerModule` was configured (100 req/min) but `ThrottlerGuard` was never applied globally — meaning the rate limit was not enforced on any endpoint unless explicitly guarded.
- **Fix:** Added `ThrottlerGuard` as `APP_GUARD` provider. All endpoints now respect the global 100 req/min limit, and individual endpoints can override with `@Throttle()`.

### 8. HIGH — Shop Orders IDOR (FIXED)
- **Files:** `apps/api/src/modules/orders/orders.controller.ts`, `apps/api/src/modules/inventory/inventory.controller.ts`, `apps/api/src/modules/commission/commission.controller.ts`
- **Issue:** `GET /orders/shop/:shopId`, `GET /orders/shop/:shopId/stats`, `GET /inventory/shop/:shopId/stats`, `GET /commission/shop/:shopId/summary`, `GET /commission/shop/:shopId/ledger` only checked `@Roles('SHOPKEEPER')` but did NOT verify the shopkeeper owned the requested shop. Any shopkeeper could query any shop's orders, stats, and commission data.
- **Fix:** Added ownership check — `if (userRole === 'SHOPKEEPER' && shopId !== userShopId) throw new ForbiddenException()`. Admins bypass the check.

---

## Pre-Existing Security Features (Good)

These were already in place and working correctly:

- **Helmet** with CSP headers configured
- **bcryptjs** with 12 salt rounds for password hashing
- **Turnstile CAPTCHA** enforced on registration
- **ValidationPipe** with `whitelist: true` and `forbidNonWhitelisted: true`
- **Host validation middleware** in production
- **Email verification** required before login
- **Role-based access control** (RBAC) on admin endpoints
- **Cloudflare WAF** in front of production with additional rate limiting

---

## Remaining Recommendations (Not Yet Fixed)

1. **CAPTCHA on Login** — `turnstileToken` is optional in the login DTO. Consider requiring it after N failed attempts to prevent brute force.
2. **OTP Rate Limit in Redis** — OTP rate limiting currently uses in-memory `Map`, which resets on restart and isn't shared across instances. Move to Redis.
3. **XSS in AI RFQ Builder** — AI-generated HTML responses from the RFQ builder may reflect user input. Consider sanitizing AI output before displaying.
4. **Refresh Token Rotation** — Implement refresh token rotation to limit token reuse window.
5. **Security Headers Enhancement** — Consider adding `Permissions-Policy` header.

---

## Test Accounts Created

For penetration testing, verified accounts were created via `prisma/seed-pentest.ts`:

| Role | Email | Password |
|------|-------|----------|
| CUSTOMER | pentest-customer@orivraa.com | PenTest123!@# |
| SHOPKEEPER | pentest-shop@orivraa.com | PenTest123!@# |
| ADMIN | pentest-admin@orivraa.com | PenTest123!@# |

All accounts have `emailVerified: true` to allow login.

---

*Generated as part of security audit for gold-shop-app*
