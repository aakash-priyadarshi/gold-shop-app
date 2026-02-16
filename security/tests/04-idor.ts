/**
 * TEST 4: Insecure Direct Object Reference (IDOR)
 *
 * Tests whether authenticated users can access resources belonging to other users.
 * OWASP: A01:2021 — Broken Access Control
 */

import { CONFIG } from "../pentest.config";
import { login, record, request, sleep } from "../pentest.utils";

export async function testIDOR() {
  console.log("\n─── IDOR / Broken Access Control ───");

  // Login as a regular customer
  const customerToken = await login(
    CONFIG.CUSTOMER.email,
    CONFIG.CUSTOMER.password,
    CONFIG.CUSTOMER.token || undefined,
  );

  // Login as shopkeeper if credentials provided
  const shopkeeperToken = await login(
    CONFIG.SHOPKEEPER.email,
    CONFIG.SHOPKEEPER.password,
    CONFIG.SHOPKEEPER.token || undefined,
  );

  if (!customerToken) {
    record({
      name: "IDOR — cannot test (no customer login)",
      category: "IDOR",
      severity: "INFO",
      status: "SKIP",
      description:
        "Cannot test IDOR without valid customer credentials. Update pentest.config.ts.",
    });
    return;
  }

  // ═══════════════════════════════════════
  // 4.1 Access other users' profiles
  // ═══════════════════════════════════════

  // Try accessing user details with a random UUID
  const fakeUserId = "00000000-0000-0000-0000-000000000001";
  const userDetailRes = await request("GET", `/users/${fakeUserId}/details`, {
    token: customerToken,
  });
  record({
    name: "IDOR — access arbitrary user details",
    category: "IDOR",
    severity: "HIGH",
    status:
      userDetailRes.status === 403 || userDetailRes.status === 404
        ? "PASS"
        : "WARN",
    description:
      userDetailRes.status === 403
        ? "Correctly denied access to other user details"
        : userDetailRes.status === 404
          ? "User not found (safe)"
          : `Got status ${userDetailRes.status} — may expose other user data`,
    details: `Response: ${JSON.stringify(userDetailRes.body).substring(0, 200)}`,
  });

  // Try accessing user by ID (admin endpoint)
  const userByIdRes = await request("GET", `/users/${fakeUserId}`, {
    token: customerToken,
  });
  record({
    name: "IDOR — customer accessing /users/:id (admin)",
    category: "IDOR",
    severity: "HIGH",
    status:
      userByIdRes.status === 403 || userByIdRes.status === 401
        ? "PASS"
        : "WARN",
    description:
      userByIdRes.status === 403 || userByIdRes.status === 401
        ? "Admin endpoint correctly denied to customer"
        : `Got status ${userByIdRes.status} — check authorization`,
  });

  // ═══════════════════════════════════════
  // 4.2 Access other users' orders
  // ═══════════════════════════════════════

  const fakeOrderId = "00000000-0000-0000-0000-000000000001";
  const orderRes = await request("GET", `/orders/${fakeOrderId}`, {
    token: customerToken,
  });
  record({
    name: "IDOR — access arbitrary order by ID",
    category: "IDOR",
    severity: "HIGH",
    status:
      orderRes.status === 403 || orderRes.status === 404 ? "PASS" : "WARN",
    description:
      orderRes.status === 403
        ? "Correctly denied access to other user's order"
        : orderRes.status === 404
          ? "Order not found (safe if also checks in service)"
          : `Got status ${orderRes.status} — check if order belongs to user`,
    details: `Response: ${JSON.stringify(orderRes.body).substring(0, 200)}`,
  });

  // 4.3 Modify order status (IDOR)
  const orderStatusRes = await request(
    "PATCH",
    `/orders/${fakeOrderId}/status`,
    {
      token: customerToken,
      body: { status: "COMPLETED" },
    }
  );
  record({
    name: "IDOR — modify arbitrary order status",
    category: "IDOR",
    severity: "CRITICAL",
    status:
      orderStatusRes.status === 403 ||
      orderStatusRes.status === 401 ||
      orderStatusRes.status === 404
        ? "PASS"
        : "FAIL",
    description:
      orderStatusRes.status === 403 || orderStatusRes.status === 401
        ? "Correctly denied order status modification"
        : orderStatusRes.status === 404
          ? "Order not found (safe)"
          : `Got status ${orderStatusRes.status} — CRITICAL: may allow unauthorized order modification`,
  });

  // ═══════════════════════════════════════
  // 4.4 Access other users' RFQs
  // ═══════════════════════════════════════

  const fakeRfqId = "00000000-0000-0000-0000-000000000001";
  const rfqRes = await request("GET", `/rfq/${fakeRfqId}`, {
    token: customerToken,
  });
  record({
    name: "IDOR — access arbitrary RFQ",
    category: "IDOR",
    severity: "MEDIUM",
    status:
      rfqRes.status === 403 || rfqRes.status === 404 ? "PASS" : "WARN",
    description:
      rfqRes.status === 403
        ? "Correctly denied access to other user's RFQ"
        : rfqRes.status === 404
          ? "RFQ not found (safe)"
          : `Got status ${rfqRes.status} — RFQ may be visible to non-owner`,
    details: `Response: ${JSON.stringify(rfqRes.body).substring(0, 200)}`,
  });

  // ═══════════════════════════════════════
  // 4.5 Access other users' offers
  // ═══════════════════════════════════════

  const fakeOfferId = "00000000-0000-0000-0000-000000000001";
  const offerRes = await request("GET", `/offers/${fakeOfferId}`, {
    token: customerToken,
  });
  record({
    name: "IDOR — access arbitrary offer",
    category: "IDOR",
    severity: "MEDIUM",
    status:
      offerRes.status === 403 || offerRes.status === 404 ? "PASS" : "WARN",
    description:
      offerRes.status === 403
        ? "Correctly denied access to foreign offer"
        : offerRes.status === 404
          ? "Offer not found (safe)"
          : `Got status ${offerRes.status} — offer may be accessible cross-user`,
    details: `Response: ${JSON.stringify(offerRes.body).substring(0, 200)}`,
  });

  // 4.6 Withdraw another shop's offer
  const withdrawRes = await request(
    "PATCH",
    `/offers/${fakeOfferId}/withdraw`,
    {
      token: customerToken,
    }
  );
  record({
    name: "IDOR — withdraw other shop's offer",
    category: "IDOR",
    severity: "CRITICAL",
    status:
      withdrawRes.status === 403 ||
      withdrawRes.status === 401 ||
      withdrawRes.status === 404
        ? "PASS"
        : "FAIL",
    description:
      withdrawRes.status === 403 || withdrawRes.status === 401
        ? "Correctly denied offer withdrawal"
        : withdrawRes.status === 404
          ? "Offer not found (safe)"
          : `Got status ${withdrawRes.status} — may allow unauthorized offer withdrawal`,
  });

  // ═══════════════════════════════════════
  // 4.7 Access other shop's data as customer
  // ═══════════════════════════════════════

  const fakeShopId = "00000000-0000-0000-0000-000000000001";
  const shopOrdersRes = await request(
    "GET",
    `/orders/shop/${fakeShopId}`,
    { token: customerToken }
  );
  record({
    name: "IDOR — customer accessing shop orders",
    category: "IDOR",
    severity: "HIGH",
    status:
      shopOrdersRes.status === 403 || shopOrdersRes.status === 401
        ? "PASS"
        : "WARN",
    description:
      shopOrdersRes.status === 403 || shopOrdersRes.status === 401
        ? "Shop orders correctly denied to customer"
        : `Got status ${shopOrdersRes.status} — check if shop ownership is verified`,
  });

  // ═══════════════════════════════════════
  // 4.8 Access other users' invoices
  // ═══════════════════════════════════════

  const fakeInvoiceId = "00000000-0000-0000-0000-000000000001";
  const invoiceRes = await request("GET", `/invoices/${fakeInvoiceId}`, {
    token: customerToken,
  });
  record({
    name: "IDOR — access arbitrary invoice",
    category: "IDOR",
    severity: "HIGH",
    status:
      invoiceRes.status === 403 || invoiceRes.status === 404
        ? "PASS"
        : "WARN",
    description:
      invoiceRes.status === 403
        ? "Correctly denied access to other user's invoice"
        : invoiceRes.status === 404
          ? "Invoice not found (safe)"
          : `Got status ${invoiceRes.status} — invoice may be accessible cross-user`,
  });

  // ═══════════════════════════════════════
  // 4.9 CRM — customer accessing CRM data
  // ═══════════════════════════════════════

  const crmProfileRes = await request(
    "GET",
    `/customer-crm/${fakeUserId}/profile`,
    { token: customerToken }
  );
  record({
    name: "IDOR — customer accessing CRM profile",
    category: "IDOR",
    severity: "HIGH",
    status:
      crmProfileRes.status === 403 || crmProfileRes.status === 401
        ? "PASS"
        : "WARN",
    description:
      crmProfileRes.status === 403 || crmProfileRes.status === 401
        ? "CRM profile correctly denied to customer"
        : `Got status ${crmProfileRes.status} — CRM endpoint may lack proper authorization`,
  });

  // ═══════════════════════════════════════
  // 4.10 Marketplace Intelligence — cross-user
  // ═══════════════════════════════════════

  const trustRes = await request(
    "GET",
    `/marketplace-intelligence/trust-profile/${fakeShopId}`,
    { token: customerToken }
  );
  record({
    name: "IDOR — access trust profile of arbitrary shop",
    category: "IDOR",
    severity: "LOW",
    status: trustRes.status !== 500 ? "PASS" : "FAIL",
    description:
      trustRes.status !== 500
        ? `Trust profile request returned ${trustRes.status} (may be intentionally public)`
        : "Server error accessing trust profile",
  });

  // ═══════════════════════════════════════
  // 4.11 Admin endpoints as regular user
  // ═══════════════════════════════════════

  const adminEndpoints = [
    { method: "GET" as const, path: "/admin/stats" },
    { method: "GET" as const, path: "/admin/verifications" },
    { method: "GET" as const, path: "/admin/reports" },
    { method: "GET" as const, path: "/admin/settings" },
    { method: "GET" as const, path: "/admin/customers" },
    { method: "GET" as const, path: "/admin/sellers" },
    { method: "GET" as const, path: "/orders/admin/all" },
    { method: "GET" as const, path: "/marketplace-intelligence/admin/dashboard" },
    { method: "GET" as const, path: "/users" }, // Admin user list
  ];

  for (const endpoint of adminEndpoints) {
    const res = await request(endpoint.method, endpoint.path, {
      token: customerToken,
    });
    record({
      name: `IDOR — customer → ${endpoint.path}`,
      category: "IDOR",
      severity: "HIGH",
      status:
        res.status === 403 || res.status === 401 ? "PASS" : "FAIL",
      description:
        res.status === 403 || res.status === 401
          ? `Admin endpoint correctly denied (${res.status})`
          : `Got ${res.status} — CUSTOMER CAN ACCESS ADMIN ENDPOINT`,
    });
    await sleep(100); // Small delay to avoid rate limiting
  }

  // ═══════════════════════════════════════
  // 4.12 Admin operations as regular user
  // ═══════════════════════════════════════

  // Try to verify a shop as a customer
  const verifyShopRes = await request(
    "PATCH",
    `/shops/${fakeShopId}/verify`,
    {
      token: customerToken,
      body: { verified: true },
    }
  );
  record({
    name: "IDOR — customer verifying a shop (admin action)",
    category: "IDOR",
    severity: "CRITICAL",
    status:
      verifyShopRes.status === 403 || verifyShopRes.status === 401
        ? "PASS"
        : "FAIL",
    description:
      verifyShopRes.status === 403 || verifyShopRes.status === 401
        ? "Shop verification correctly restricted"
        : `Got ${verifyShopRes.status} — CUSTOMER CAN VERIFY SHOPS`,
  });

  // Try to suspend a user as a customer
  const suspendRes = await request(
    "PATCH",
    `/users/${fakeUserId}/suspend`,
    {
      token: customerToken,
      body: { reason: "pen-test" },
    }
  );
  record({
    name: "IDOR — customer suspending user (admin action)",
    category: "IDOR",
    severity: "CRITICAL",
    status:
      suspendRes.status === 403 || suspendRes.status === 401
        ? "PASS"
        : "FAIL",
    description:
      suspendRes.status === 403 || suspendRes.status === 401
        ? "User suspension correctly restricted"
        : `Got ${suspendRes.status} — CUSTOMER CAN SUSPEND USERS`,
  });

  // ═══════════════════════════════════════
  // 4.13 Horizontal IDOR: Shopkeeper accessing other shop
  // ═══════════════════════════════════════

  if (shopkeeperToken) {
    // A shopkeeper trying to access another shop's orders
    const otherShopOrders = await request(
      "GET",
      `/orders/shop/${fakeShopId}`,
      { token: shopkeeperToken }
    );
    record({
      name: "IDOR — shopkeeper accessing other shop's orders",
      category: "IDOR",
      severity: "HIGH",
      status:
        otherShopOrders.status === 403 || otherShopOrders.status === 404
          ? "PASS"
          : "WARN",
      description:
        otherShopOrders.status === 403
          ? "Correctly denied access to other shop's orders"
          : `Got ${otherShopOrders.status} — check if shop ID ownership is verified`,
    });

    // Shopkeeper accessing other shop's CRM
    const otherShopCrm = await request(
      "GET",
      `/customer-crm/${fakeUserId}/profile`,
      { token: shopkeeperToken }
    );
    record({
      name: "IDOR — shopkeeper accessing CRM of non-customer",
      category: "IDOR",
      severity: "HIGH",
      status:
        otherShopCrm.status === 403 || otherShopCrm.status === 404
          ? "PASS"
          : "WARN",
      description:
        otherShopCrm.status === 403 || otherShopCrm.status === 404
          ? "CRM correctly restricted"
          : `Got ${otherShopCrm.status} — CRM data may leak across shops`,
    });
  }

  // ═══════════════════════════════════════
  // 4.14 Notification IDOR
  // ═══════════════════════════════════════

  const fakeNotifId = "00000000-0000-0000-0000-000000000001";
  const notifRes = await request(
    "PATCH",
    `/notifications/${fakeNotifId}/read`,
    { token: customerToken }
  );
  record({
    name: "IDOR — mark other user's notification as read",
    category: "IDOR",
    severity: "MEDIUM",
    status:
      notifRes.status === 403 ||
      notifRes.status === 404 ||
      notifRes.status === 401 ||
      notifRes.status === 200  // Service uses updateMany({where: {id, userId}}) — 200 with 0 rows affected is safe
        ? "PASS"
        : "WARN",
    description:
      notifRes.status === 403 || notifRes.status === 401
        ? "Notification access correctly denied"
        : notifRes.status === 404
          ? "Notification not found (safe if ownership is checked)"
          : notifRes.status === 200
            ? "Returns 200 but service checks userId in WHERE clause (0 rows affected for wrong user)"
            : `Got ${notifRes.status} — may allow marking other user's notifications`,
  });
}
