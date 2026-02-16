# Gold Shop App — Penetration Test Report

**Date:** 2026-02-16T12:58:33.220Z
**Target:** https://api.orivraa.com/api
**Frontend:** https://orivraa.com
**Duration:** 31.1s
**Tests:** 63 (✅ 50 Pass, ❌ 1 Fail, ⚠️ 8 Warn, ⏭️ 2 Skip)

---

## Executive Summary

### 🟠 High Severity Vulnerabilities (1)

- **CORS — reject evil origin: http://localhost:3000**: CORS allows evil origin! ACAO: http://localhost:3000
  - **Fix:** CORS origin whitelist is too permissive — restrict to exact production URLs

### ⚠️ Warnings (8)

- **Server Header Hidden** [LOW]: Server header exposed: "cloudflare"
  - **Fix:** Hide server identity to reduce fingerprinting
- **Email check endpoint — enumeration risk** [MEDIUM]: check-email returns {exists: true}. This endpoint enables account enumeration.
  - **Fix:** Rate limit heavily or require CAPTCHA on check-email. Consider removing in favor of inline validation during registration
- **Phone check endpoint — enumeration risk** [MEDIUM]: check-phone returns {exists: false}. This endpoint enables phone number enumeration.
  - **Fix:** Rate limit heavily or require authentication
- **XSS in RFQ builder — <img src=x onerror=alert(** [HIGH]: XSS payload reflected in response — check if stored
- **XSS in RFQ builder — "><svg onload=alert(1)>** [HIGH]: XSS payload reflected in response — check if stored
- **Info disclosure — Swagger UI accessible** [MEDIUM]: Swagger UI is accessible — exposes all API endpoints and DTOs
  - **Fix:** Disable Swagger in production or restrict access with authentication
- **Info disclosure — Swagger JSON accessible** [MEDIUM]: Swagger JSON spec is accessible — machine-readable API schema
  - **Fix:** Disable /docs-json in production
- **Info disclosure — /shops/matching-debug exposed** [MEDIUM]: matching-debug returned 502

---

## Detailed Results

### Headers

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ✅ PASS | HIGH | HSTS Header | HSTS present: max-age=15552000; includeSubDomains |
| ✅ PASS | MEDIUM | X-Content-Type-Options | X-Content-Type-Options: nosniff is set |
| ✅ PASS | MEDIUM | X-Frame-Options | X-Frame-Options: SAMEORIGIN |
| ✅ PASS | MEDIUM | Content-Security-Policy | CSP present (default-src 'self';style-src 'self' 'unsafe-inline';img-src 'self' data: https:;...) |
| ✅ PASS | LOW | X-Powered-By Hidden | X-Powered-By correctly hidden |
| ⚠️ WARN | LOW | Server Header Hidden | Server header exposed: "cloudflare" |
| ✅ PASS | LOW | Referrer-Policy | Referrer-Policy: no-referrer |

### Auth

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ✅ PASS | MEDIUM | Generic login error | Login requires CAPTCHA — good, prevents automated attacks |
| ✅ PASS | MEDIUM | Wrong password — no enumeration | Login requires CAPTCHA — prevents enumeration via wrong password |
| ✅ PASS | CRITICAL | Protected route rejects no token | Protected endpoint correctly returns 401 without token |
| ✅ PASS | CRITICAL | Rejects forged JWT | Forged JWT correctly rejected |
| ✅ PASS | HIGH | Rejects expired JWT | Expired JWT correctly rejected |
| ✅ PASS | CRITICAL | Rejects alg:none JWT | alg:none JWT correctly rejected |
| ⏭️ SKIP | INFO | Customer login | Could not login as customer — set PENTEST_CUSTOMER_EMAIL/PASSWORD |
| ✅ PASS | HIGH | Login rate limiting | Rate limiting triggered on rapid login attempts |
| ⚠️ WARN | MEDIUM | Email check endpoint — enumeration risk | check-email returns {exists: true}. This endpoint enables account enumeration. |
| ⚠️ WARN | MEDIUM | Phone check endpoint — enumeration risk | check-phone returns {exists: false}. This endpoint enables phone number enumeration. |

### Injection

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ✅ PASS | CRITICAL | SQLi in login — admin' OR '1'='1' -- | SQL injection blocked (status 429) |
| ✅ PASS | CRITICAL | SQLi in login — admin'; DROP TABLE users; -- | SQL injection blocked (status 429) |
| ✅ PASS | CRITICAL | SQLi in login — ' UNION SELECT * FROM users -- | SQL injection blocked (status 429) |
| ✅ PASS | CRITICAL | SQLi in login — admin'/**/OR/**/1=1-- | SQL injection blocked (status 429) |
| ✅ PASS | CRITICAL | SQLi in login — 1' OR '1' = '1'; -- | SQL injection blocked (status 429) |
| ✅ PASS | HIGH | SQLi in query — /shops?search=' OR 1=1 -- | No server error from SQL injection attempt (200) |
| ✅ PASS | HIGH | SQLi in query — /shops?search='; DROP TABLE shops; -- | No server error from SQL injection attempt (200) |
| ✅ PASS | HIGH | SQLi in query — /materials/market-rates?country=' UNION  | No server error from SQL injection attempt (200) |
| ✅ PASS | HIGH | XSS in RFQ builder — <script>alert("XSS")</scr | XSS payload not reflected in response |
| ⚠️ WARN | HIGH | XSS in RFQ builder — <img src=x onerror=alert( | XSS payload reflected in response — check if stored |
| ⚠️ WARN | HIGH | XSS in RFQ builder — "><svg onload=alert(1)> | XSS payload reflected in response — check if stored |
| ✅ PASS | HIGH | XSS in registration fields | Registration correctly rejected XSS in name fields |
| ✅ PASS | HIGH | NoSQL injection in login | NoSQL injection blocked (400) — class-validator rejects non-string |
| ✅ PASS | HIGH | NoSQL injection in login | NoSQL injection blocked (400) — class-validator rejects non-string |
| ✅ PASS | HIGH | NoSQL injection in login | NoSQL injection blocked (400) — class-validator rejects non-string |
| ✅ PASS | HIGH | Command injection — ; cat /etc/passwd | No server error from command injection attempt (201) |
| ✅ PASS | HIGH | Command injection — | ls -la | No server error from command injection attempt (201) |
| ✅ PASS | HIGH | Command injection — $(whoami) | No server error from command injection attempt (201) |
| ✅ PASS | HIGH | Command injection — `whoami` | No server error from command injection attempt (201) |
| ✅ PASS | HIGH | Command injection — && curl http://evil. | No server error from command injection attempt (201) |
| ✅ PASS | MEDIUM | CRLF injection in headers | CRLF injection not reflected in response headers |
| ✅ PASS | HIGH | Path traversal — /../../etc/passwd | Path traversal returned 404 |
| ✅ PASS | HIGH | Path traversal — /../../../etc/shadow | Path traversal returned 404 |
| ✅ PASS | HIGH | Path traversal — /..%2F..%2F..%2Fetc%2Fpasswd | Path traversal returned 400 |
| ✅ PASS | HIGH | Path traversal — /health/..%252f..%252fauth/log | Path traversal returned 404 |

### IDOR

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ⏭️ SKIP | INFO | IDOR — cannot test (no customer login) | Cannot test IDOR without valid customer credentials. Update pentest.config.ts. |

### CORS

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ✅ PASS | INFO | CORS — allowed origin accepted | ACAO header: https://orivraa.com |
| ✅ PASS | HIGH | CORS — reject evil origin: https://evil.com | Correctly rejected evil origin (ACAO: not set) |
| ✅ PASS | HIGH | CORS — reject evil origin: https://attacker.orivraa.com | Correctly rejected evil origin (ACAO: not set) |
| ✅ PASS | HIGH | CORS — reject evil origin: https://orivraa.com.evil.com | Correctly rejected evil origin (ACAO: not set) |
| ✅ PASS | HIGH | CORS — reject evil origin: null | Correctly rejected evil origin (ACAO: not set) |
| ✅ PASS | HIGH | CORS — reject evil origin: https://localhost:3001 | Correctly rejected evil origin (ACAO: not set) |
| ❌ FAIL | HIGH | CORS — reject evil origin: http://localhost:3000 | CORS allows evil origin! ACAO: http://localhost:3000 |
| ✅ PASS | HIGH | CORS — reject evil origin: https://evil-orivraa.com | Correctly rejected evil origin (ACAO: not set) |
| ✅ PASS | CRITICAL | CORS — wildcard (*) check | CORS does not use wildcard — origin whitelist in effect |
| ✅ PASS | MEDIUM | CORS — preflight response | Preflight status: 204, Methods: GET,HEAD,PUT,PATCH,POST,DELETE, Headers: Content-Type, Authorization, Credentials: true |
| ✅ PASS | HIGH | CORS — credentials from evil origin | Correctly rejected evil origin with credentials |
| ✅ PASS | LOW | CORS — Vary: Origin header | Vary header includes Origin — proper cache behavior |

### Information Disclosure

| Status | Severity | Test | Description |
|--------|----------|------|-------------|
| ⚠️ WARN | MEDIUM | Info disclosure — Swagger UI accessible | Swagger UI is accessible — exposes all API endpoints and DTOs |
| ⚠️ WARN | MEDIUM | Info disclosure — Swagger JSON accessible | Swagger JSON spec is accessible — machine-readable API schema |
| ✅ PASS | MEDIUM | Info disclosure — error stack traces | Error response does not contain stack traces |
| ✅ PASS | LOW | Info disclosure — version info in root endpoint | Root endpoint does not disclose version information |
| ⏭️ INFO | LOW | Info disclosure — /health accessible | /health returned 200 with content |
| ⏭️ INFO | LOW | Info disclosure — 404 response | 404 response reveals framework info (e.g., "Cannot GET") |
| ✅ PASS | MEDIUM | Info disclosure — unverified email leaks userId/email | No userId leak detected (user may not exist, or issue was fixed) |
| ⚠️ WARN | MEDIUM | Info disclosure — /shops/matching-debug exposed | matching-debug returned 502 |

---

## Known Issues (Pre-Identified During Audit)

These issues were found during code review before running tests:

1. **CRITICAL — JWT Fallback Secret**: `auth.module.ts` falls back to `"gold-shop-secret-key"` if `JWT_SECRET` env var is not set. If production runs without `JWT_SECRET`, any attacker can forge valid JWTs.
   - **Fix:** Remove the fallback. Fail hard if `JWT_SECRET` is not set.

2. **MEDIUM — Account Enumeration via check-email/check-phone**: `/auth/check-email` and `/auth/check-phone` are unauthenticated and return `{exists: true/false}`, allowing attackers to enumerate registered accounts.
   - **Fix:** Rate limit these endpoints aggressively, or require CAPTCHA / authentication.

3. **MEDIUM — CAPTCHA Not Enforced on Login**: `turnstileToken` is optional in the login DTO, allowing brute force without CAPTCHA.
   - **Fix:** Make `turnstileToken` required after N failed login attempts.

4. **MEDIUM — Unverified Email Leaks User Info**: When a user with unverified email logs in, the `ForbiddenException` includes `{userId, email}` in the response body.
   - **Fix:** Return a generic "Invalid credentials" message regardless of verification status.

5. **LOW — OTP Rate Limit In-Memory**: OTP rate limiting uses an in-memory `Map` — resets on server restart and not shared across instances.
   - **Fix:** Use Redis for OTP rate limiting.

---

*Report generated by gold-shop-app pentest suite*
