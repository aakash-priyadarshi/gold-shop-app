/**
 * Seed dummy data for user aakashmi301@gmail.com (Priyadarshi Makers, India).
 *
 * Idempotent: safe to run multiple times. Uses skipDuplicates / upsert.
 *
 * Run with:
 *   cd apps/api
 *   node --experimental-strip-types prisma/seed-aakash.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "aakashmi301@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`User ${EMAIL} not found`);

  const shop = await prisma.shop.findFirst({ where: { userId: user.id } });
  if (!shop) throw new Error(`Shop for ${EMAIL} not found`);

  console.log(`User ${user.id}  Shop ${shop.id}  (${shop.shopName})`);

  // ── 1. Restore role to SHOPKEEPER (was changed to ADMIN by an earlier script) ──
  if (user.role !== "SHOPKEEPER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "SHOPKEEPER", activeShopId: shop.id },
    });
    console.log("✓ Reset role to SHOPKEEPER");
  } else if (user.activeShopId !== shop.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { activeShopId: shop.id },
    });
    console.log("✓ Set activeShopId");
  }

  // ── 2. Ensure a PRO_PLUS subscription exists for this shop ──
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { name: "PRO_PLUS", country: "IN" },
  });
  if (plan) {
    const existing = await prisma.sellerSubscription.findFirst({
      where: { shopId: shop.id, status: "ACTIVE" },
    });
    if (!existing) {
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      await prisma.sellerSubscription.create({
        data: {
          shopId: shop.id,
          planId: plan.id,
          status: "ACTIVE",
          country: "IN",
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      });
      console.log("✓ Created PRO_PLUS subscription");
    } else {
      console.log("• Subscription already exists, skipping");
    }
  } else {
    console.log("⚠ No PRO_PLUS plan for country=IN, skipping subscription");
  }

  // ── 3. Inventory items ──
  const items = [
    {
      sku: `AK-${shop.id.slice(0, 6)}-RING-001`,
      jewelleryType: "RING" as const,
      nameEn: "22K Gold Engagement Ring",
      weight: 6.5,
      metalCost: 65000,
      makingCharge: 6500,
      total: 71500,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-RING-002`,
      jewelleryType: "RING" as const,
      nameEn: "18K Diamond Solitaire Ring",
      weight: 4.2,
      metalCost: 38000,
      makingCharge: 5000,
      gemstoneValue: 25000,
      total: 68000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-NECK-001`,
      jewelleryType: "NECKLACE" as const,
      nameEn: "22K Traditional Mangalsutra",
      weight: 18.5,
      metalCost: 185000,
      makingCharge: 18500,
      total: 203500,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-NECK-002`,
      jewelleryType: "NECKLACE" as const,
      nameEn: "22K Antique Temple Necklace",
      weight: 42.0,
      metalCost: 420000,
      makingCharge: 50400,
      total: 470400,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-EAR-001`,
      jewelleryType: "EARRING" as const,
      nameEn: "22K Gold Jhumka Earrings",
      weight: 8.0,
      metalCost: 80000,
      makingCharge: 8000,
      total: 88000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-EAR-002`,
      jewelleryType: "EARRING" as const,
      nameEn: "18K Diamond Stud Earrings",
      weight: 2.4,
      metalCost: 22000,
      makingCharge: 3000,
      gemstoneValue: 18000,
      total: 43000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-BANG-001`,
      jewelleryType: "BANGLE" as const,
      nameEn: "22K Gold Plain Bangles (Pair)",
      weight: 20.0,
      metalCost: 200000,
      makingCharge: 16000,
      total: 216000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-BANG-002`,
      jewelleryType: "BANGLE" as const,
      nameEn: "22K Filigree Bridal Bangles",
      weight: 35.0,
      metalCost: 350000,
      makingCharge: 42000,
      total: 392000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-CHAIN-001`,
      jewelleryType: "CHAIN" as const,
      nameEn: "22K Rope Chain 20\"",
      weight: 12.0,
      metalCost: 120000,
      makingCharge: 9600,
      total: 129600,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-CHAIN-002`,
      jewelleryType: "CHAIN" as const,
      nameEn: "18K Box Chain 18\"",
      weight: 7.5,
      metalCost: 68000,
      makingCharge: 5400,
      total: 73400,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-PEND-001`,
      jewelleryType: "PENDANT" as const,
      nameEn: "22K Om Pendant",
      weight: 3.5,
      metalCost: 35000,
      makingCharge: 2800,
      total: 37800,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-BRAC-001`,
      jewelleryType: "BRACELET" as const,
      nameEn: "22K Gold Tennis Bracelet",
      weight: 9.0,
      metalCost: 90000,
      makingCharge: 9000,
      total: 99000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-NPIN-001`,
      jewelleryType: "NOSE_PIN" as const,
      nameEn: "22K Gold Nose Pin with Stone",
      weight: 0.5,
      metalCost: 5000,
      makingCharge: 800,
      gemstoneValue: 1500,
      total: 7300,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-TIKKA-001`,
      jewelleryType: "MAANG_TIKKA" as const,
      nameEn: "22K Bridal Maang Tikka",
      weight: 5.0,
      metalCost: 50000,
      makingCharge: 6000,
      total: 56000,
    },
    {
      sku: `AK-${shop.id.slice(0, 6)}-ANKLET-001`,
      jewelleryType: "ANKLET" as const,
      nameEn: "Silver Anklet with Charms",
      weight: 22.0,
      metalCost: 2400,
      makingCharge: 600,
      total: 3000,
    },
  ];

  let created = 0;
  for (const it of items) {
    const exists = await prisma.inventoryItem.findUnique({ where: { sku: it.sku } });
    if (exists) continue;
    await prisma.inventoryItem.create({
      data: {
        shopId: shop.id,
        sku: it.sku,
        jewelleryType: it.jewelleryType,
        nameEn: it.nameEn,
        buildMethod: "METHOD_A",
        composition: { metal: "Gold", purity: it.sku.includes("18K") ? "18K" : "22K" },
        totalWeightGrams: it.weight,
        metalValueNpr: it.metalCost,
        makingChargeNpr: it.makingCharge,
        gemstoneValueNpr: it.gemstoneValue ?? 0,
        taxNpr: Math.round(it.total * 0.03),
        totalPriceNpr: it.total,
        images: [],
        videos: [],
        labels: [],
        status: "AVAILABLE",
        stockQuantity: 1,
      },
    });
    created++;
  }
  console.log(`✓ Inventory: created ${created}, total ${items.length}`);

  // ── 4. WalkInCustomers ──
  const customers = [
    { phone: "9876543210", name: "Priya Sharma", city: "Patna", address: "Boring Road, Patna" },
    { phone: "9988776655", name: "Rahul Verma", city: "Patna", address: "Kankarbagh, Patna" },
    { phone: "9123456789", name: "Anjali Singh", city: "Patna", address: "Rajendra Nagar, Patna" },
    { phone: "9012345678", name: "Vikram Kumar", city: "Patna", address: "Patliputra Colony" },
    { phone: "8877665544", name: "Sneha Gupta", city: "Patna", address: "Bailey Road" },
    { phone: "7766554433", name: "Amit Raj", city: "Patna", address: "Boring Canal Road" },
    { phone: "9090909090", name: "Meera Devi", city: "Patna", address: "Gandhi Maidan" },
    { phone: "8080808080", name: "Sunil Yadav", city: "Patna", address: "Frazer Road" },
  ];

  let customersCreated = 0;
  const customerRecords: { id: string; phone: string; name: string }[] = [];
  for (const c of customers) {
    const existing = await prisma.walkInCustomer.findUnique({ where: { phone: c.phone } });
    if (existing) {
      customerRecords.push({ id: existing.id, phone: existing.phone, name: existing.name });
      continue;
    }
    const wc = await prisma.walkInCustomer.create({
      data: {
        phone: c.phone,
        phoneCountryCode: "+91",
        name: c.name,
        address: c.address,
        city: c.city,
        country: "India",
        createdByShopId: shop.id,
      },
    });
    customerRecords.push({ id: wc.id, phone: wc.phone, name: wc.name });
    customersCreated++;
  }
  console.log(`✓ Customers: created ${customersCreated}, total ${customerRecords.length}`);

  // ── 5. Invoices (completed bills) ──
  const invoiceSamples = [
    { customer: customerRecords[0], lineLabel: "22K Gold Ring 5g", subtotal: 50000, tax: 1500 },
    { customer: customerRecords[1], lineLabel: "22K Mangalsutra 18g", subtotal: 185000, tax: 5550 },
    { customer: customerRecords[2], lineLabel: "18K Diamond Stud Earrings", subtotal: 43000, tax: 1290 },
    { customer: customerRecords[3], lineLabel: "22K Gold Bangles Pair", subtotal: 216000, tax: 6480 },
    { customer: customerRecords[4], lineLabel: "22K Chain 20\"", subtotal: 129600, tax: 3888 },
    { customer: customerRecords[5], lineLabel: "22K Om Pendant", subtotal: 37800, tax: 1134 },
  ];

  let invoicesCreated = 0;
  for (let i = 0; i < invoiceSamples.length; i++) {
    const s = invoiceSamples[i];
    if (!s.customer) continue;
    const invNum = `INV-AK-${Date.now()}-${i}`;
    // Skip if a similar invoice already exists for this customer
    const exists = await prisma.invoice.findFirst({
      where: { shopId: shop.id, customerPhone: s.customer.phone },
    });
    if (exists) continue;
    const total = s.subtotal + s.tax;
    const issuedAt = new Date();
    issuedAt.setDate(issuedAt.getDate() - i * 3);
    await prisma.invoice.create({
      data: {
        invoiceNumber: invNum,
        shopId: shop.id,
        customerName: s.customer.name,
        customerPhone: s.customer.phone,
        subtotal: s.subtotal,
        taxAmount: s.tax,
        taxRate: 3,
        taxLabel: "GST 3%",
        totalAmount: total,
        paidAmount: total,
        balanceDue: 0,
        currency: "INR",
        lineItems: [
          {
            label: s.lineLabel,
            category: "JEWELLERY",
            quantity: 1,
            unitPrice: s.subtotal,
            amount: s.subtotal,
          },
        ],
        status: "PAID",
        paymentStatus: "PAID",
        issuedAt,
        paidAt: issuedAt,
        invoiceCountry: "IN",
        customerType: "B2C",
        hsnCode: "7113",
      },
    });
    invoicesCreated++;
  }
  console.log(`✓ Invoices: created ${invoicesCreated}`);

  // ── 6. Shop quotes (custom orders in flight) ──
  const quoteSamples = [
    {
      customer: customerRecords[0],
      jewelleryType: "NECKLACE" as const,
      goldWeight: 25,
      metalCost: 250000,
      making: 30000,
      status: "QUOTED" as const,
    },
    {
      customer: customerRecords[1],
      jewelleryType: "RING" as const,
      goldWeight: 6,
      metalCost: 60000,
      making: 7200,
      status: "CONFIRMED" as const,
    },
    {
      customer: customerRecords[2],
      jewelleryType: "BANGLE" as const,
      goldWeight: 30,
      metalCost: 300000,
      making: 36000,
      status: "IN_PROGRESS" as const,
    },
    {
      customer: customerRecords[3],
      jewelleryType: "MANGALSUTRA" as const,
      goldWeight: 20,
      metalCost: 200000,
      making: 24000,
      status: "READY" as const,
    },
  ];

  let quotesCreated = 0;
  for (let i = 0; i < quoteSamples.length; i++) {
    const q = quoteSamples[i];
    if (!q.customer) continue;
    const exists = await prisma.shopQuote.findFirst({
      where: { shopId: shop.id, walkInCustomerId: q.customer.id, jewelleryType: q.jewelleryType },
    });
    if (exists) continue;
    const quoteNumber = `SQ-AK-${Date.now().toString(36).slice(-5).toUpperCase()}${i}`;
    const total = q.metalCost + q.making + Math.round((q.metalCost + q.making) * 0.03);
    await prisma.shopQuote.create({
      data: {
        quoteNumber,
        shopId: shop.id,
        walkInCustomerId: q.customer.id,
        jewelleryType: q.jewelleryType,
        buildMethod: "METHOD_A",
        composition: { metal: "Gold", purity: "22K" },
        targetGoldWeightG: q.goldWeight,
        metalCostNpr: q.metalCost,
        makingChargeNpr: q.making,
        taxNpr: Math.round((q.metalCost + q.making) * 0.03),
        totalPriceNpr: total,
        estimatedDays: 14,
        status: q.status,
        advancePaidNpr: q.status === "CONFIRMED" || q.status === "IN_PROGRESS" || q.status === "READY" ? Math.round(total * 0.3) : 0,
        balanceDueNpr: total,
      },
    });
    quotesCreated++;
  }
  console.log(`✓ ShopQuotes: created ${quotesCreated}`);

  console.log("\nDone. Login with aakashmi301@gmail.com to see the data.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
