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
    topic: "about",
    content:
      "Orivraa is an all-in-one CRM, POS and ERP built specifically for jewellery shops. It handles billing, inventory, GST/VAT tax compliance, customer management, WhatsApp catalogues, and AI-powered sales agents. Used by jewellers across India, Nepal, UAE, UK, and Europe.",
  },
  {
    topic: "pricing",
    content:
      "Orivraa offers a 30-day free trial with full features and no credit card required. Paid plans: FREE (trial only), PRO (single shop), PRO_PLUS (multi-country tax + CA share links), ENTERPRISE (multi-branch). Exact prices shown in local currency at /pricing. Cancel anytime, no lock-in, data export always free.",
  },
  {
    topic: "trial",
    content:
      "New users get a 30-day free trial with access to all features. No credit card required. Setup takes under 10 minutes. You can import existing inventory from CSV, Excel, Tally, or Marg. Most shops are live the same day.",
  },
  {
    topic: "gst",
    content:
      "Orivraa automatically applies Indian GST on jewellery: 3% on gold value + 5% on making charges. HSN code 7113 (articles of jewellery and parts thereof). Old-gold exchange deductions are handled correctly. Produces GSTR1, GSTR3B, and HSN summary exports. Also supports VAT for UAE/GCC, MTD for UK, and OSS for EU.",
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
      "To speak with a human, contact Aakash (founder) directly. Email: aakashm301@gmail.com. WhatsApp or call: +91 62039 65557. Replies personally within a few hours.",
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
  for (const chunk of CHUNKS) {
    if (done.has(chunk.topic)) {
      console.log(`  Skipping [${chunk.topic}] (already done)`);
      continue;
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
