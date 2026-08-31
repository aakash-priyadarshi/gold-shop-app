/**
 * Destructive critical-path checks for the disposable PR environment only.
 * Refuses to run against a non-local API or without the explicit write flag.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const API = (process.env.E2E_API_URL || "").replace(/\/$/, "");
const apiHost = API ? new URL(API).hostname : "";
if (
  process.env.E2E_ALLOW_WRITES !== "true" ||
  !["localhost", "127.0.0.1"].includes(apiHost)
) {
  throw new Error(
    "Critical write journeys may run only against a local disposable API with E2E_ALLOW_WRITES=true",
  );
}

const sessionPath = resolve(scriptDirectory, "../.auth/session.json");
if (!existsSync(sessionPath)) {
  throw new Error("Create the E2E session before running critical writes");
}
const token = JSON.parse(readFileSync(sessionPath, "utf8")).token;
if (!token) throw new Error("The E2E session does not contain an access token");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Origin: "http://localhost:3000",
  Referer: "http://localhost:3000/dashboard",
};

async function request(name, method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    redirect: "error",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(
      `${name} failed with HTTP ${response.status}: ${typeof payload === "string" ? payload.slice(0, 500) : JSON.stringify(payload).slice(0, 500)}`,
    );
  }
  console.log(`✅ ${name}`);
  return payload?.data ?? payload;
}

function requireId(name, value) {
  if (!value?.id) throw new Error(`${name} did not return an id`);
  return value.id;
}

const me = await request("Authenticated shop profile", "GET", "/auth/me");
const shopId = me.shop?.id || me.shopId;
if (!shopId) throw new Error("The E2E account has no active shop");

const manualInvoice = await request("Create INR invoice", "POST", "/invoices", {
  customerName: "PR Invoice Customer",
  customerPhone: "+919000001001",
  invoiceCountry: "IN",
  currency: "INR",
  lineItems: [
    {
      label: "22K gold ring",
      category: "GOLD_METAL",
      quantity: 1,
      unitPrice: 10000,
      amount: 10000,
      metalType: "GOLD_22K",
      metalWeightG: 2,
    },
  ],
});
requireId("Create INR invoice", manualInvoice);
if (manualInvoice.currency !== "INR") {
  throw new Error(`Create INR invoice returned ${manualInvoice.currency}`);
}

const quote = await request("Create priced INR quote", "POST", "/shop-quotes", {
  customer: {
    name: "PR Quote Customer",
    phoneCountryCode: "+91",
    phone: "9000001002",
    address: "Disposable CI address",
    city: "Mumbai",
    country: "India",
  },
  jewelleryType: "RING",
  buildMethod: "METHOD_A",
  composition: { metalType: "GOLD_22K", purity: 0.916 },
  targetTotalWeightG: 2,
  metalCostNpr: 10000,
  makingChargeNpr: 1000,
  estimatedDays: 7,
});
const quoteId = requireId("Create priced INR quote", quote);
const convertedQuote = await request(
  "Convert INR quote to invoice",
  "POST",
  `/shop-quotes/${quoteId}/invoice`,
  { notes: "Disposable PR journey" },
);
requireId("Converted quote invoice", convertedQuote.invoice);
if (convertedQuote.invoice.currency !== "INR") {
  throw new Error(
    `Converted quote invoice returned ${convertedQuote.invoice.currency}`,
  );
}

const inventory = await request(
  "Load disposable POS stock",
  "GET",
  `/inventory?shopId=${encodeURIComponent(shopId)}&search=${encodeURIComponent("PR E2E INR Gold Ring")}&limit=10`,
);
const stockItem = inventory.items?.find(
  (item) => item.sku === "E2E-INR-GOLD-RING",
);
const inventoryItemId = requireId("Disposable POS stock", stockItem);

for (const paymentMethod of ["CASH", "UPI"]) {
  const sale = await request(
    `Complete INR POS sale with ${paymentMethod}`,
    "POST",
    "/pos/sale",
    {
      clientId: randomUUID(),
      items: [{ inventoryItemId, qty: 1 }],
      customerName: `PR ${paymentMethod} Customer`,
      customerPhone: "+919000001003",
      invoiceCountry: "IN",
      paymentMethod,
    },
  );
  requireId(`${paymentMethod} POS invoice`, sale.invoice);
  if (sale.invoice.currency !== "INR") {
    throw new Error(
      `${paymentMethod} POS invoice returned ${sale.invoice.currency}`,
    );
  }
}

console.log("\nAll disposable INR write journeys passed.");
