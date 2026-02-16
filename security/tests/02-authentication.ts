/**
 * TEST 2: Authentication & Session Security
 *
 * Tests JWT handling, login security, session management.
 * OWASP: A01:2021 - Broken Access Control, A07:2021 - Identification and Auth Failures
 */

import { CONFIG } from "../pentest.config";
import { login, record, request, sleep } from "../pentest.utils";

export async function testAuthentication() {
  console.log("\n─── Authentication & Session Security ───");

  // ─── 2.1 Login with invalid creds returns generic error ───
  const badLogin = await request("POST", "/auth/login", {
    body: { email: "nonexistent@fake.com", password: "WrongPassword1!" },
  });
  record({
    name: "Generic login error",
    category: "Auth",
    severity: "MEDIUM",
    status:
      (badLogin.status === 401 &&
        !badLogin.raw.toLowerCase().includes("user not found") &&
        !badLogin.raw.toLowerCase().includes("no account")) ||
      (badLogin.status === 400 &&
        badLogin.raw.toLowerCase().includes("captcha"))
        ? "PASS"
        : "FAIL",
    description:
      badLogin.status === 400 && badLogin.raw.toLowerCase().includes("captcha")
        ? "Login requires CAPTCHA — good, prevents automated attacks"
        : badLogin.status === 401
          ? `Login returns 401 with generic message (no user enumeration)`
          : `Unexpected status ${badLogin.status}: ${JSON.stringify(badLogin.body).substring(0, 200)}`,
    recommendation:
      "Always return 'Invalid credentials' for both wrong email and wrong password",
  });

  // ─── 2.2 Login with valid email but wrong password ───
  if (CONFIG.CUSTOMER.email) {
    const wrongPw = await request("POST", "/auth/login", {
      body: { email: CONFIG.CUSTOMER.email, password: "WrongPassword999!" },
    });
    record({
      name: "Wrong password — no enumeration",
      category: "Auth",
      severity: "MEDIUM",
      status:
        (wrongPw.status === 401 &&
          !wrongPw.raw.toLowerCase().includes("password") &&
          !wrongPw.raw.toLowerCase().includes("incorrect password")) ||
        (wrongPw.status === 400 &&
          wrongPw.raw.toLowerCase().includes("captcha")) ||
        wrongPw.status === 429
          ? "PASS"
          : "WARN",
      description:
        wrongPw.status === 400 && wrongPw.raw.toLowerCase().includes("captcha")
          ? "Login requires CAPTCHA — prevents enumeration via wrong password"
          : wrongPw.status === 429
            ? "Rate limited (429) — prevents enumeration"
            : `Status ${wrongPw.status}, message doesn't leak 'password incorrect' vs 'user not found'`,
      details: JSON.stringify(wrongPw.body).substring(0, 200),
    });
  }

  // ─── 2.3 Access protected endpoint without token ───
  const noToken = await request("GET", "/users/me");
  record({
    name: "Protected route rejects no token",
    category: "Auth",
    severity: "CRITICAL",
    status: noToken.status === 401 ? "PASS" : "FAIL",
    description:
      noToken.status === 401
        ? "Protected endpoint correctly returns 401 without token"
        : `Expected 401, got ${noToken.status}`,
    recommendation: "Ensure JwtAuthGuard is applied to all protected routes",
  });

  // ─── 2.4 Access protected endpoint with garbage token ───
  const garbageToken = await request("GET", "/users/me", {
    token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIiLCJyb2xlIjoiQURNSU4ifQ.garbage",
  });
  record({
    name: "Rejects forged JWT",
    category: "Auth",
    severity: "CRITICAL",
    status: garbageToken.status === 401 ? "PASS" : "FAIL",
    description:
      garbageToken.status === 401
        ? "Forged JWT correctly rejected"
        : `Expected 401, got ${garbageToken.status}`,
    recommendation: "JWT signature verification must be enforced",
  });

  // ─── 2.5 Access protected endpoint with expired token ───
  // This is a token with exp in the past (you'd need a real expired one in practice)
  const expiredPayload = Buffer.from(
    JSON.stringify({ sub: "fake-id", role: "CUSTOMER", exp: 1000000000 }),
  )
    .toString("base64url");
  const expiredToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${expiredPayload}.fakesig`;
  const expired = await request("GET", "/users/me", { token: expiredToken });
  record({
    name: "Rejects expired JWT",
    category: "Auth",
    severity: "HIGH",
    status: expired.status === 401 ? "PASS" : "FAIL",
    description:
      expired.status === 401
        ? "Expired JWT correctly rejected"
        : `Expected 401, got ${expired.status}`,
  });

  // ─── 2.6 JWT algorithm confusion (alg: none) ───
  const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const nonePayload = Buffer.from(
    JSON.stringify({ sub: "admin-id", role: "ADMIN", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const noneToken = `${noneHeader}.${nonePayload}.`;
  const algNone = await request("GET", "/users/me", { token: noneToken });
  record({
    name: "Rejects alg:none JWT",
    category: "Auth",
    severity: "CRITICAL",
    status: algNone.status === 401 ? "PASS" : "FAIL",
    description:
      algNone.status === 401
        ? "alg:none JWT correctly rejected"
        : `CRITICAL: alg:none JWT was ACCEPTED (status ${algNone.status})`,
    recommendation:
      "Enforce specific algorithm in JWT verification options (e.g. algorithms: ['HS256'])",
  });

  // ─── 2.7 Login as customer and try admin endpoint ───
  const customerToken = await login(
    CONFIG.CUSTOMER.email,
    CONFIG.CUSTOMER.password,
    CONFIG.CUSTOMER.token || undefined,
  );
  if (customerToken) {
    const adminEndpoint = await request("GET", "/admin/dashboard", {
      token: customerToken,
    });
    record({
      name: "Customer cannot access admin routes",
      category: "Auth",
      severity: "CRITICAL",
      status: adminEndpoint.status === 403 || adminEndpoint.status === 401 || adminEndpoint.status === 404 ? "PASS" : "FAIL",
      description:
        adminEndpoint.status === 403 || adminEndpoint.status === 401
          ? `Admin route correctly blocked for customer (${adminEndpoint.status})`
          : adminEndpoint.status === 404
            ? `Admin route not found (404) — safe, route does not exist`
            : `CRITICAL: Customer accessed admin route! Status: ${adminEndpoint.status}`,
      recommendation: "Ensure @Roles('ADMIN') guard on all admin endpoints",
    });

    // ─── 2.8 Customer tries to access other user's data ───
    // Try fetching users list (admin only)
    const usersList = await request("GET", "/users", {
      token: customerToken,
    });
    record({
      name: "Customer cannot list all users",
      category: "Auth",
      severity: "HIGH",
      status: usersList.status === 403 || usersList.status === 401 ? "PASS" : "FAIL",
      description:
        usersList.status === 403 || usersList.status === 401
          ? "User listing correctly restricted"
          : `User list accessible! Status: ${usersList.status}`,
    });
  } else {
    record({
      name: "Customer login",
      category: "Auth",
      severity: "INFO",
      status: "SKIP",
      description: "Could not login as customer — set PENTEST_CUSTOMER_EMAIL/PASSWORD",
    });
  }

  // ─── 2.9 Login brute force (no account lockout test — just rate limit) ───
  console.log("  Testing login rate limiting (10 rapid attempts)...");
  let rateLimited = false;
  for (let i = 0; i < 10; i++) {
    const res = await request("POST", "/auth/login", {
      body: { email: "brute-force@test.com", password: `attempt${i}` },
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  record({
    name: "Login rate limiting",
    category: "Auth",
    severity: "HIGH",
    status: rateLimited ? "PASS" : "WARN",
    description: rateLimited
      ? "Rate limiting triggered on rapid login attempts"
      : "No rate limiting detected on login (may need more attempts or different IP tracking)",
    recommendation:
      "Add specific rate limit to /auth/login (e.g. 5 attempts per minute per IP)",
  });

  // ─── 2.10 check-email endpoint — account enumeration ───
  const checkExisting = await request(
    "GET",
    `/auth/check-email?email=${encodeURIComponent(CONFIG.CUSTOMER.email || "test@test.com")}`,
  );
  record({
    name: "Email check endpoint — enumeration risk",
    category: "Auth",
    severity: "MEDIUM",
    status: "WARN",
    description: `check-email returns {exists: ${checkExisting.body?.exists}}. This endpoint enables account enumeration.`,
    details:
      "Attackers can enumerate valid email addresses via /auth/check-email",
    recommendation:
      "Rate limit heavily or require CAPTCHA on check-email. Consider removing in favor of inline validation during registration",
  });

  // ─── 2.11 check-phone endpoint — account enumeration ───
  const checkPhone = await request(
    "GET",
    "/auth/check-phone?phone=9999999999",
  );
  record({
    name: "Phone check endpoint — enumeration risk",
    category: "Auth",
    severity: "MEDIUM",
    status: "WARN",
    description: `check-phone returns {exists: ${checkPhone.body?.exists}}. This endpoint enables phone number enumeration.`,
    recommendation: "Rate limit heavily or require authentication",
  });
}
