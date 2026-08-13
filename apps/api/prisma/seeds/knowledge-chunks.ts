/**
 * Seed the KnowledgeChunk table with Orivraa product knowledge.
 *
 * Run once after migration:
 *   cd apps/api
 *   npx ts-node -P tsconfig.json prisma/seeds/knowledge-chunks.ts
 *
 * Requires env vars: DATABASE_URL (or DIRECT_DATABASE_URL), GEMINI_API_KEY
 */

import { PrismaClient } from "@prisma/client";

// Env vars are loaded by passing --env-file .env to node, or set them in shell.

const prisma = new PrismaClient();

const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const CHUNKS: { topic: string; content: string }[] = [
  {
    topic: "inventory-sets",
    content:
      "Jewelry Sets on Orivraa: From Product Catalog use Add Set to create a bridal or matching set with its own SKU. Attach existing pieces or create new components (earrings, maang tikka, necklace, nathuni, etc.). Apply a percent or fixed set discount because buying together reduces the overall price. Components are hidden from separate sale while bound to the set. Selling the set at POS marks the set and all components sold. Use Break set to release pieces for individual sale. Vault & Tags manages physical locations as Area → Cabinet → Bin trees you define for your shop.",
  },
  {
    topic: "vault-locations",
    content:
      "Vault & Tags lets jewellers define shop storage locations (Showcase, Main Safe, trays) in a hierarchy: Area, optional Cabinet/Shelf, optional Bin/Tray. Assign locations when creating products or sets, or transfer pieces in bulk from the Vault & Tags page. Location history is recorded as LOCATION_TRANSFER stock movements.",
  },
  {
    topic: "stock-audit-rfid",
    content:
      "RFID / barcode stock audit: From Vault & Tags open Stock Audit. Start a session and scan pieces with a keyboard-wedge RFID gun or barcode scanner (SKU, HUID, or barcode). Completing the audit compares scanned items to available stock and produces a shrinkage report of missing pieces. Manager PIN can be required to finalize the audit (Shop Settings → Security).",
  },
  {
    topic: "qr-rfid-multi-tag-printing",
    content:
      "QR, RFID and multi-tag printing: In Product Catalog, optionally save a physical RFID/EPC code for an individual piece. Orivraa QR tags encode the immutable inventory record; the printed Code 39/SKU barcode and RFID text stay separate. In Vault & Tags select one or more pieces and choose Print tags. Choose A4 21-tag or 10-tag layouts, 50×25 or 60×40 mm thermal labels, copies, and whether QR, barcode, or RFID text should appear. One tag can be printed on any plan; multi-tag sheets and multiple copies are a Pro feature. Browser/System print works with OS-installed wired, Bluetooth, Wi-Fi, laser and normal printers. For raw thermal tags configure Mobile Settings → Hardware for ZPL, TSPL, EPL, or ESC/POS via Web Serial, WebUSB, BLE, or the desktop app's local-network TCP printer bridge.",
  },
  {
    topic: "manager-pin",
    content:
      "Manager PIN clearance gates: In Shop Settings → Security, set a 4–8 digit manager PIN. Discounts at or above the configured threshold on POS require the PIN. Completing a stock audit also prompts for the PIN when enabled. This is staff clearance control — not fingerprint biometrics.",
  },
  {
    topic: "uk-assay-office",
    content:
      "UK assay office fields: On products, set Hallmark/HUID and Assay Office (London, Birmingham, Sheffield, Edinburgh). When items are added to invoices or POS from catalog, hallmark and assay office appear in line details and on printed bills for UK hallmark compliance.",
  },
  {
    topic: "about",
    content:
      "Orivraa is an all-in-one CRM, POS and ERP built specifically for jewellery shops. It handles billing, inventory, GST/VAT tax compliance, customer management, WhatsApp catalogues, and AI-powered sales agents. Used by jewellers across India, Nepal, UAE, UK, and Europe.",
  },
  {
    topic: "pricing",
    content:
      "Orivraa offers a 60-day free trial with full features and no credit card required. Paid plans: FREE (trial only), PRO (single shop), PRO_PLUS (multi-country tax + CA share links), ENTERPRISE (multi-branch). Exact prices shown in local currency at /pricing. Cancel anytime, no lock-in, data export always free.",
  },
  {
    topic: "trial",
    content:
      "New users get a 60-day free trial with access to all features. No credit card required. Setup takes under 10 minutes. You can import existing inventory from CSV, Excel, Tally, or Marg. Most shops are live the same day.",
  },
  {
    topic: "gst",
    content:
      "Orivraa automatically applies Indian GST on jewellery: 3% on gold value + 5% on making charges. HSN code 7113 (articles of jewellery and parts thereof). Old-gold exchange deductions are handled correctly. Produces GSTR1, GSTR3B, and HSN summary exports. Also supports VAT for UAE/GCC, MTD for UK, and OSS for EU.",
  },
  {
    topic: "nepal_tax_2083",
    content:
      "Nepal tax update (FY 2083/84 — 2026/27 budget): The 2% luxury tax on gold/silver jewellery has been ABOLISHED and replaced with a 0.5% Skill Promotion Fee on jewellery sale value to final consumers (covers metal + making + finish). 13% VAT still applies to diamonds and gemstones only. Customs duty on gold doubled from 10% to 20% (embedded in market premium, not shown as a checkout line item). Orivraa's Nepal tax engine automatically applies the new 0.5% Skill Promotion Fee instead of the old luxury tax.",
  },
  {
    topic: "weight_units",
    content:
      "Orivraa supports multiple weight units on invoices and quotes: grams (g), tola (11.6638g), laal (0.1166g, Nepal), kilogram, ounce (troy), and pound. Nepal defaults to tola, India to grams, US to ounces. You can switch the weight unit per invoice using the unit selector next to the weight field. The system internally stores all weights in grams and converts for display. The tola unit is especially useful for Nepali and traditional Indian jewellers.",
  },
  {
    topic: "sri_lanka_launch",
    content:
      "Orivraa supports Sri Lankan jewellery shops under the LK market with Sri Lankan Rupee (LKR) billing. The configured standard VAT rate is 18%, but tax applicability, exemptions, registration thresholds, and filing obligations can change; shops should confirm current treatment with Sri Lanka's Inland Revenue Department or a qualified local accountant. Card payments use Orivraa's existing Stripe account, with canonical NPR base amounts converted to the actual LKR charge and the FX details recorded. Jewellery weights remain stored internally in grams and can be displayed in grams or tola. Sinhala (si) UI translation is supported through dynamic translation with English fallback, and Tamil support remains available.",
  },
  {
    topic: "live_rates_autofill",
    content:
      "On the invoice creation page, Orivraa shows live gold and silver market rates in a collapsible panel. Click the 'Live' button next to any line item's Metal Cost to autofill the cost as weight × live rate per gram. The autofilled cost is fully editable afterwards. Rates are fetched per market (Nepal, India, UAE, etc.) in the local currency. Live rates update every 10 minutes.",
  },
  {
    topic: "hallmark",
    content:
      "Every invoice can carry HUID (Hallmark Unique ID), purity (24K, 22K, 18K, 14K, 9K), gross weight, net weight, and stone weight. Orivraa is fully BIS-compliant. Full hallmarking compliance checklist available at /blog/hallmarking-compliance-checklist-jewellers-india.",
  },
  {
    topic: "offline_pos",
    content:
      "The Orivraa desktop POS works fully offline at the billing counter. Invoices are generated, payments recorded, and inventory updated even with no internet. All data auto-syncs to the cloud the moment the connection is restored. Available for Windows and macOS. Download at /download.",
  },
  {
    topic: "multi_store",
    content:
      "Orivraa supports multiple branches under one account. Features: inter-branch stock transfers, consolidated reports, per-branch pricing and staff permissions. Suitable for jewellery chain stores. Available on PRO_PLUS and ENTERPRISE plans. See /contact?interest=Enterprise+%2F+Multi-branch.",
  },
  {
    topic: "features",
    content:
      "Key Orivraa features: live gold and silver rate auto-updates, GST/VAT billing, multi-store inventory, HUID/hallmark invoices, customer CRM with WhatsApp catalogue, barcode scanning for fast checkout, offline desktop POS, custom RFQ (request for quote) orders, AI sales agents (beta), CA/accountant share links.",
  },
  {
    topic: "ai_agents",
    content:
      "Orivraa AI sales agents (in beta) answer customer calls 24/7 in 42 languages, qualify leads, schedule visits, and send follow-up emails automatically. Live demo available at /ai-sales-team.",
  },
  {
    topic: "onboarding",
    content:
      "Getting started with Orivraa is 3 steps: (1) sign up free, (2) import inventory from Excel/CSV or from Tally/Marg with our help, (3) start billing. Most shops are live the same day. A free onboarding call is included. Book at /contact?interest=Onboarding.",
  },
  {
    topic: "compare_tally",
    content:
      "Orivraa vs Tally: Tally is a general accounting tool not built for jewellery. Orivraa has live gold/silver rates, HUID-aware invoicing, mobile POS, a free plan, and a jewellery-specific tax engine. Tally has none of these. Side-by-side comparison at /compare/orivraa-vs-tally.",
  },
  {
    topic: "compare_marg",
    content:
      "Orivraa vs Marg ERP: Marg ERP was not designed for jewellery shops — no live gold rates, no cloud sync, no mobile POS, no AI features. Orivraa covers all of these out of the box. Side-by-side comparison at /compare/orivraa-vs-marg-erp.",
  },
  {
    topic: "security",
    content:
      "Orivraa uses TLS 1.3 for data in transit and AES-256 for data at rest. Daily encrypted backups. Data is stored in your region (India, UAE, or EU). Your customer list and all data can be fully exported at any time at no cost.",
  },
  {
    topic: "tax_exports",
    content:
      "Orivraa produces tax-ready exports for accountants: GSTR1 (India), GSTR3B (India), HSN summary, Tally XML, UAE VAT201, UK MTD, EU OSS, and US state filings. CA/accountant share links are available on PRO_PLUS and ENTERPRISE plans.",
  },
  {
    topic: "languages",
    content:
      "The Orivraa app UI supports English, Hindi, Nepali, Arabic, French, German, and Spanish. AI sales agents communicate in 42 languages. Invoices can be printed in the customer's preferred language.",
  },
  {
    topic: "refund",
    content:
      "Orivraa has no lock-in. Cancel anytime from your dashboard. If something doesn't work for you within the first 30 days of a paid plan, a refund is available on request. Data export is always free regardless of plan status.",
  },
  {
    topic: "contact",
    content:
      "To speak with a human, contact Aakash (founder) directly. Email: aakashm301@gmail.com. WhatsApp or call: +91 62039 65557. Replies personally within a few hours. If you ask the AI chatbot for a WhatsApp number or contact details, it will share these same founder contact details. If you share your own email or phone with the bot, Aakash will personally follow up.",
  },
  {
    topic: "repairs",
    content:
      "Orivraa has a built-in repair and service job tracker on both the mobile app and desktop. Log repair jobs (resizing, polishing, soldering, stone setting, rhodium plating), capture before/after photos, set estimated charges and delivery dates, track job status, and notify customers on WhatsApp when ready. Repairs tracking is available on PRO and higher plans in all countries including India and Nepal.",
  },
  {
    topic: "savings",
    content:
      "Orivraa supports gold savings and instalment schemes (also called gold saving plans, committee, chitti, or monthly deposit schemes popular with jewellers in India and Nepal). Track each customer's monthly deposits, accrued gold/value, maturity date, and redemption against a future purchase. Sends WhatsApp reminders for due instalments. Available on PRO and higher plans in all countries.",
  },
  {
    topic: "lending",
    content:
      "Orivraa includes gold loan / girvi (pledged-gold lending) management. Record pledged items with weight, purity and photos, set principal, interest rate and tenure, auto-calculate interest accrued, log repayments, and track due/overdue loans. Helps jewellers in India and Nepal run their lending desk alongside retail. Available on PRO and higher plans.",
  },
  {
    topic: "karigar",
    content:
      "Orivraa has a karigar (goldsmith/artisan) supply-chain module to issue metal to karigars, track work-in-progress orders, record metal given vs returned and wastage, and settle making charges. Keeps your karigar accounts transparent. Available on PRO and higher plans across India, Nepal and other regions.",
  },
  {
    topic: "catalog_currency_reprice",
    content:
      "Product catalog prices are stored in your shop's base currency (INR for India, NPR for Nepal, AED for UAE, etc.) even if older field names mention NPR. When gold rates change, use Product Catalog → Reprice from rates to preview and apply new metal values from your Pricing Setup rates. Making charges can stay as-is or recalculate from your shop making %. Every reprice is audited.",
  },
  {
    topic: "invoice_catalog_and_tax_country",
    content:
      "On Create Invoice use Add from catalog to pull available products into the bill with metal, making and gemstone breakdown. Catalog pieces are stock-linked and marked sold when the invoice is created. The Invoice Country selector at the top controls which tax regime applies (India GST, Nepal skill fee, UAE VAT, etc.) and which Tax Reports tab the invoice appears under. It defaults to your shop country and can differ for export bills. POS counter sales also use your shop currency and country for tax reporting.",
  },
  {
    topic: "billing_wastage",
    content:
      "Billing wastage (also called jarti) is the customer-facing manufacturing-loss charge on Create Invoice — separate from karigar workshop wastage. Three pipelines: (1) Catalog — each product has a required Wastage % (can be 0). Add from catalog fetches that % onto the invoice. One editable % field that recalculates live (no Calculate button); caption shows e.g. '5% from catalog' and if you raise to 6% shows '+1% adjusted' plus the price. (2) Walk-in quote — set wastage when Mark Ready (built); it carries to the final invoice as 'from walk-in ready'. If left 0, change it on the invoice. (3) Manual invoice — enter % only; nothing is fetched; amount updates live. Weight % mode: wastage grams = net weight × (wastage % ÷ 100); amount = wastage grams × (metal cost ÷ net weight). Metal value % mode: wastage = metal cost × %. Shop defaults: Settings → Preferences → Billing Wastage.",
  },
  {
    topic: "invoice_share_and_bluetooth",
    content:
      "After creating an invoice, one Print button sends the bill to the printer that is connected. Thermal receipt (58/80mm roll, e.g. SEZNIK MiniX / Josh, Epson TM) prints a short ESC/POS receipt. A4 / office printers already installed on the computer (Wi-Fi, USB, or Windows Devices and Printers) open the full bill dialog. The chevron beside Print lets you pick either type. In the Orivraa Desktop app, Print reads the real Windows/macOS printer list and labels each device as thermal receipt or A4/office. Pair a thermal printer in Settings → Receipt printer (Hardware), or tap an installed thermal in that list. Share PDF and WhatsApp appear on phones and open the share sheet with bill text plus an on-demand PDF (free for all shops). On PC use Download PDF, Email, and SMS. SMS is Pro+ / Enterprise. Each printed bill includes a verification QR at /verify-bill.",
  },
  {
    topic: "pos_hardware_receipt_printers",
    content:
      "POS Hardware and invoice Print: Open Shop Settings → Preferences → Open hardware settings, or go to /dashboard/shop/settings/hardware (phone: /m/settings/hardware or More → Store Settings → POS Hardware). Pair a thermal receipt printer (58/80mm roll such as SEZNIK MiniX / Josh or Epson TM) via Wireless thermal, USB, or Installed thermal in the Orivraa Desktop app. A4 / office means printers already installed on the computer (Wi-Fi, USB, Windows Devices and Printers). After an invoice is created, one Print button sends to the connected printer automatically; the chevron lets you pick thermal vs A4. Desktop reads the real Windows/macOS printer list and labels each device. Share PDF and WhatsApp appear on phones with an on-demand PDF (free). On PC use Download PDF, Email, and SMS (SMS is Pro+ / Enterprise). Optional jewellery label printer (Zebra/ZPL) is on the same Hardware page for Vault & Tags print tags.",
  },
  {
    topic: "crash_reports_admin",
    content:
      "Orivraa automatically records errors shown to users (red error toasts, page crashes, and server 5xx / network failures) so admins can fix issues they do not see themselves. Open Admin → Crash Reports. Default view is today's new reports. Each row has a Copy button with the same title + description + page format as the user's toast copy button. Auto vs User badges show whether the report was silent capture or a shopkeeper clicking Send Report. Session expiry and form-validation toasts are not logged. Check this page daily, mark reviewed or resolved, and add admin notes.",
  },
  {
    topic: "mobile_invoice_full_billing",
    content:
      "Mobile Create Invoice (/m/invoices/create) is a full jewellery workflow — not a flat amount form. Steps: Customer details → add lines from Catalog, Shop Quote, or Manual → enter metal type, weight (tola/gram/laal), metal cost, making charge (% / per-gram / flat), wastage (jarti), optional gemstones → Review with tax breakdown → Create. Catalog items commit stock. Importing a walk-in shop quote prefills customer and line costs and links shopQuoteId. Flat-only amounts without metal/making breakdown are rejected so tax reports and accounting stay accurate. After create you land on the invoice detail page: Print (thermal receipt or A4) and Share PDF / WhatsApp.",
  },
  {
    topic: "mobile_product_show_to_customer",
    content:
      "On mobile POS, tap a product to open its detail sheet with metal, wastage (jarti), gemstones, making charges, and the stored calculation. Tap Show full details to customer to open a full-screen page at /m/products/:id that you can hand to the buyer. This is a seller inventory view, not the public marketplace product page. Stock Ledger item names also open the same page. Wastage is a default % applied when you bill; estimated bill = catalog price (metal + making + gems + tax) plus wastage.",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embedWithRetry(text: string, retries = 4): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${EMBED_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      return data.embedding.values as number[];
    }
    const body = await res.text();
    // Retry on 429, 500/503, or 400 "expired"/"quota" (rate limit disguised as expiry)
    const isRetryable =
      attempt < retries &&
      (res.status === 429 ||
        res.status >= 500 ||
        (res.status === 400 && body.includes("expired")));
    if (isRetryable) {
      const wait = 15000 * (attempt + 1);
      process.stdout.write(`[rate-limited, retry in ${wait / 1000}s] `);
      await sleep(wait);
      continue;
    }
    throw new Error(`Embed API error ${res.status}: ${body}`);
  }
  throw new Error("Embed failed after retries");
}

async function main() {
  console.log(`Seeding ${CHUNKS.length} knowledge chunks…`);

  // Fetch already-seeded topics so we can skip them on resume
  const existing = await prisma.$queryRaw<{ topic: string }[]>`
    SELECT topic FROM "KnowledgeChunk"
  `;
  const done = new Set(existing.map((r) => r.topic));
  if (done.size > 0) {
    console.log(`Resuming — skipping ${done.size} already-seeded topics.`);
  } else {
    await prisma.$executeRaw`TRUNCATE TABLE "KnowledgeChunk"`;
    console.log("Cleared existing chunks.");
  }

  let count = 0;
  /** Topics whose content changed — re-embed even if already seeded. */
  const FORCE_REFRESH = new Set([
    "billing_wastage",
    "invoice_share_and_bluetooth",
    "mobile_invoice_full_billing",
  ]);

  for (const chunk of CHUNKS) {
    if (done.has(chunk.topic) && !FORCE_REFRESH.has(chunk.topic)) {
      console.log(`  Skipping [${chunk.topic}] (already done)`);
      continue;
    }
    if (FORCE_REFRESH.has(chunk.topic) && done.has(chunk.topic)) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "KnowledgeChunk" WHERE topic = $1`,
        chunk.topic,
      );
      console.log(`  Refreshing [${chunk.topic}]…`);
    }
    process.stdout.write(`  Embedding [${chunk.topic}]… `);
    const vector = await embedWithRetry(chunk.content);
    const vectorLiteral = `[${vector.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "KnowledgeChunk" (id, topic, content, embedding, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::vector, NOW(), NOW())`,
      chunk.topic,
      chunk.content,
      vectorLiteral,
    );
    console.log("done");
    count++;
    // gemini-embedding-001 free tier = 5 RPM → need ≥12s between calls
    await sleep(13000);
  }

  console.log(`\nSeeded ${count} new chunks (${CHUNKS.length} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
