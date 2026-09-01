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
      "Jewelry Sets on Orivraa: From Product Catalog use Add Set to create a bridal or matching set with its own SKU. Attach existing pieces or create new components (earrings, maang tikka, necklace, nathuni, etc.). The set price is built from its linked metal, making, gemstone, and tax components; apply a percent or fixed set discount when buying together. Review the price preview before saving or invoicing. Components are hidden from separate sale while bound to the set. Selling the set at POS marks the set and all components sold. Use Break set to release pieces for individual sale. Vault & Tags manages physical locations as Area → Cabinet → Bin trees you define for your shop.",
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
    topic: "ui-languages",
    content:
      "The header and dashboard globe opens a language mega menu grouped into International (English), South Asia (Hindi, Nepali, Gujarati, Marathi, Tamil, Telugu, Kannada, Sinhala), Europe (French, German, Spanish), and Middle East (Arabic, Hebrew, Yiddish). Arabic, Hebrew, and Yiddish switch the layout to right-to-left. Product and customer names on the current inventory page are sorted with Alef-Bet (or the locale's dictionary order) instead of raw computer byte order. UI strings are translated on demand via the translation API and cached; English is shown until a confirmed translation arrives.",
  },
  {
    topic: "live_rates_autofill",
    content:
      "On Create Invoice and POS, Orivraa calculates the bill from the current authoritative pricing preview before the seller completes the sale. On Create Invoice, click Live next to Metal Cost to autofill weight × the current supported market rate per gram; review the returned amount before saving because live rates can change. Gold, silver, platinum, and supported palladium purities use their appropriate live market rate; if a rate is unavailable, keep or enter a shop price instead of substituting a different metal. Gemstones stay a separate amount, and displayed currency values retain two decimals.",
  },
  {
    topic: "hallmark",
    content:
      "Every invoice can carry HUID (Hallmark Unique ID), purity (24K, 22K, 18K, 14K, 9K), gross weight, net weight, and stone weight. On each product you can store a 6-character BIS HUID or a longer hallmark/assay number, plus upload hallmark and gemstone certificates (photo or PDF). Walk-in full-details and shared catalogue links show See certificate. Orivraa is fully BIS-compliant. Full hallmarking compliance checklist available at /blog/hallmarking-compliance-checklist-jewellers-india.",
  },
  {
    topic: "offline_pos",
    content:
      "The Orivraa desktop POS works fully offline at the billing counter. Invoices are generated, payments recorded, and inventory updated even with no internet. All data auto-syncs to the cloud the moment the connection is restored. Available for Windows and macOS. Download at /download.",
  },
  {
    topic: "product_gemstone_pricing_and_snapshots",
    content:
      "Product Catalog → Add/Edit Product has separate product specifications and pricing inputs for gemstones. A diamond is stored as type DIAMOND with Origin Natural or Lab-grown; the grading laboratory (GIA, IGI, SGL, etc.) is a separate certificate field and does not mean Lab-grown. Old catalog values such as DIAMOND_LAB still open as Diamond + Lab-grown. Gemstone price suggestion uses the canonical pricing category, diamond origin where relevant, carat for diamonds, size in millimetres for non-diamond stones, Pricing quality (Budget, Standard, Premium), and quantity. Gemological color, clarity and cut are preserved specifications and are not silently used as Pricing quality. A non-diamond needs a size in mm before a reference suggestion; do not invent a 3 mm size. The selected product metal suggestion uses the selected metal/purity and metal-only weight in grams (one tola is converted to 11.6638g before calculation), then uses a shop rate if configured or the current reference rate. Sellers review and deliberately apply a suggestion; it never silently replaces a manual amount. When catalog products are added to an invoice, gemstone origin, color, clarity, cut, carat/size, quality, certificate and grading-lab details are copied into the immutable sale-time snapshot. A later live gemstone reprice changes the displayed stone cost only, not its certificate/specification. Invoice/PDF details show useful available stone specs such as origin, color, clarity, cut, carat and count.",
  },
  {
    topic: "pos_register_payments_returns",
    content:
      "POS cashier workflow: choose the correct register/counter, then open a shift with the actual opening cash in that drawer (zero is valid). Close the same shift by counting physical cash and generate the Z-report, which compares expected and counted cash plus any variance. At checkout, CASH is received at the counter. Manual non-cash legs such as CARD, UPI/wallet, and bank transfer are PENDING until a cashier uses Confirm Payment Received after actual receipt; creating the bill alone does not mean it is paid. A split sale is PARTIALLY_PAID until all required payment legs are received. PAID means the invoice balance is fully received; PENDING means payment is still awaiting receipt; PARTIALLY_PAID means some payment is received and a balance remains. Use only the payment methods offered for the shop's country. Open the cash drawer only for a valid counter need and follow any manager-PIN requirement; opening it never confirms a payment. Use Return / Exchange to find the original bill, select no more than the remaining returnable quantity, and use the historic line value for the refund. Cash refunds settle immediately; non-cash reversals stay pending until actually completed; STORE_CREDIT creates credit for a later purchase. Every printed bill has a QR verification link at /verify-bill.",
  },
  {
    topic: "account_recovery_email_verification",
    content:
      "Account recovery and email verification: Forgot password sends a 6-digit reset code to the supplied inbox. Enter the code and a new password; the server validates the code before changing the password. If login returns EMAIL_NOT_VERIFIED, enter the verification code on the login recovery screen, then sign in again. The public resend-verification action always gives the same generic success response: it does not reveal whether an email exists or is already verified. If an address belongs to an unverified account and sending is permitted, a code is sent; if no code arrives, wait for the cooldown, check spam/junk, and retry from the verification screen rather than assuming the account state from the response.",
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
      "Karigar book is Orivraa's normal small-artisan ledger at /dashboard/shop/supply-chain. Use it to register karigars, record physical metal issued and returned, see each artisan's outstanding metal balance, record jobs, and see wages due. A finished-metal return can accrue wages due; physical-metal return and wage settlement are separate business actions. It is distinct from the optional Workshop mode factory workflow.",
  },
  {
    topic: "catalog_currency_reprice",
    content:
      "Product catalog, walk-in quotes, custom RFQs, shop metal/gem rates, and karigar wage amounts are stored in your shop's base currency (INR for India, NPR for Nepal, USD for the USA, etc.) even if older field names mention NPR. Changing shop country converts those stored amounts at the live exchange rate so a ₹3000 piece becomes about $36, not $3000. Issued invoices keep the currency they were billed in. When metal rates change without a country switch, use Product Catalog → Reprice from rates: review the server preview, choose whether making stays fixed or recalculates, then apply the selected prices. Repricing preserves the separate gemstone and tax amounts and uses two-decimal money values.",
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
    topic: "invoice_bill_templates",
    content:
      "Invoice Settings (/dashboard/shop/invoices/settings) lets you brand bills and pick a printable template. Layout & Visibility sits on the left with a live preview on the right. Below both is a strip of bill templates, each with a distinct border and an auspicious icon on the top and bottom edge: Classic (double gold frame + diya), Royal (navy header + gold crown), Compact (dashed gold gem), Ornate (wine lotus on cream paper — not gold-on-gold), and Minimal (gold corner ticks + kalash). Click a template to preview it, then Save Settings. The chosen template applies to browser print and the on-demand PDF share. Existing shops stay on Classic until they pick another look.",
  },
  {
    topic: "pos_hardware_receipt_printers",
    content:
      "POS Hardware and invoice Print: Open Shop Settings → Preferences → Open hardware settings, or go to /dashboard/shop/settings/hardware (phone: /m/settings/hardware or More → Store Settings → POS Hardware). Pair a thermal receipt printer (58/80mm roll such as SEZNIK MiniX / Josh or Epson TM) via Wireless thermal, USB, or Installed thermal in the Orivraa Desktop app. A4 / office means printers already installed on the computer (Wi-Fi, USB, Windows Devices and Printers). After an invoice is created, one Print button sends to the connected printer automatically; the chevron lets you pick thermal vs A4. Desktop reads the real Windows/macOS printer list and labels each device. Share PDF and WhatsApp appear on phones with an on-demand PDF (free). On PC use Download PDF, Email, and SMS (SMS is Pro+ / Enterprise). Optional jewellery label printer (Zebra/ZPL) is on the same Hardware page for Vault & Tags print tags.",
  },
  {
    topic: "crash_reports_admin",
    content:
      "Orivraa automatically records errors shown to users (red error toasts, page crashes, and server 5xx / network failures) so admins can fix issues they do not see themselves. Open Admin → Crash Reports. Default view is today's new reports. Each row has a Copy button plus visible Review, Fixed, and Reopen actions. Select one or every visible report to update several duplicate incidents together. Copy all as AI prompt or Download .md exports every report matching the current filters with fingerprints, stack traces, diagnostics, admin notes, prompt-injection safety guidance, and authenticated status-update endpoints; IP addresses and session credentials are omitted. Configure CRASH_REPORT_SLACK_WEBHOOK_URL only on the Railway API service to post every new, non-duplicate incident to an existing Slack channel, then verify it with Send test alert. CRASH_REPORT_SLACK_MENTION can be here, channel, or a Slack user ID. Auto vs User badges show whether the report was silent capture or a shopkeeper clicking Send Report. Session expiry and form-validation toasts are not logged. Mark reports reviewed while investigating and Fixed only after the change is implemented and validated; add the PR or commit to admin notes when available.",
  },
  {
    topic: "customer_recovery_campaign",
    content:
      "Admin → Customer Recovery manages the account-bound 50-day Pro win-back campaign. Admins can preview eligible shopkeepers, filter by country or activity level, select recipients, and send immediately or at the next country-local 10 AM. Active paid plans, unverified addresses, inactive accounts, missing shops, and repeat campaign sends are excluded. The campaign funnel shows sent, delivered, unique opened, unique clicked, claimed Pro, and rejoined counts plus country breakdowns. Open tracking is approximate because privacy tools and blocked images affect the tracking pixel. Rejoined means the recipient had authenticated Orivraa activity or claimed the offer after the email was sent. Delivery, open, click, bounce, complaint, failure, and suppression events come from signature-verified, deduplicated Resend webhooks at /api/recovery-offers/webhooks/resend; enable Resend domain open/click tracking and configure RESEND_WEBHOOK_SECRET before relying on those metrics.",
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
  {
    topic: "product_description_generation",
    content:
      "On Products (Add/Edit) the description field stays locked until jewellery type, material type, and weight are filled. Gemstones are optional. Free and Pro get Fill from specs — a hardcoded non-AI template you can edit. Pro+ also gets Generate with AI (Gemini 2.5 Flash) which costs 0.25 AI credits. Shopkeeper AI design previews cost 1 credit per Imagen image. The Design Studio / RFQ 5-variation generator charges 5 credits up front (1 per image). Metal totals use live market rates (or the shop's own metal price if set); gemstones use the platform catalog or the shopkeeper's gemstone rates. Customers are not billed credits; they have a daily preview cap. Buy extra credits at Billing → AI Credits (/dashboard/shop/billing?tab=credits). If a generation fails, credits are refunded. The Orivraa AI assistant chat and in-app tooltips/tours are free on every plan. Public chat cannot look up users or shops. A signed-in user only sees their own account/shop data.",
  },
  {
    topic: "karigar_gold_loss_ledger",
    content:
      "Karigar Gold Loss tracks physical workshop metal, not customer billing wastage (jarti) on invoices. You will find it in two places on /dashboard/shop/supply-chain: the Gold Loss / Wastage Report card at the bottom of Karigar book (the default tab), and the Reports tab (?view=reports) when Workshop mode is on. Issue gold from the vault to a karigar or job; record finished return, sprue, scrap, dust, and outstanding balance through the appropriate metal movement. Casting trees live on the job card: issued grams versus finished pieces, sprue/button, and recoverable scrap. Actual loss = issued − finished − sprue − recoverable; unexplained loss is anything above the allowed percentage. Catalogue and RFQ bills never feed this ledger. The demo job creates persistent workshop, job, vault, and metal-ledger records, so use it only in a test/demo shop or when you intend to reconcile those records through the supported ledger workflow.",
  },
  {
    topic: "old_gold_silver_exchange",
    content:
      "Old Gold / Silver Exchange is one shop tool at /dashboard/shop/tools/old-gold. Stay on that page and switch Gold or Silver at the top. Gold uses the live 24K rate and karat purities (24K–9K). Silver uses the live 999 rate and jewellery purities 999, 925 sterling, 900, 835, and 800. Weight, impurity %, melting loss, and making % work the same for both metals. Apply the calculated credit to Create Invoice or POS. Invoice notes say Old gold or Old silver based on the metal. This is customer trade-in / buy-back, not karigar workshop gold loss and not billing wastage (jarti).",
  },
  {
    topic: "workshop_manufacturing_mode",
    content:
      "Workshop manufacturing is the optional factory workflow inside /dashboard/shop/supply-chain, not a replacement for the normal Karigar book. Turn its factory tabs on at Shop Settings → Preferences → Workshop mode (desktop /dashboard/shop/settings?tab=preferences) or Store Settings on mobile (/m/settings). It requires BOTH Workshop mode and the current shop plan's live workshopManufacturing feature. That feature is admin-configured per live plan, so never use a hardcoded plan name; if the live check is unavailable, retry or open Billing. 1) Karigar book (default): small-artisan vault, issue/return, outstanding metal, wages due, jobs, and Gold Loss. 2) Tower (?view=tower): overdue jobs, hand-off delays, loss limits, unreceived finished goods, QC, vault, and department load. 3) Jobs (?view=jobs): create work orders with due date, priority, and quantity; open a row for the job card and casting trees. Cancel/archive an unwanted job so its history remains visible; do not use cancellation to correct issued metal. 4) Floor (?view=floor): department queues; enter gold-out grams to send the weight to the next department. 5) Metal (?view=metal): ISSUE, finished return, sprue return, scrap, dust, and adjustment using the same physical vault as Karigar book. 6) QC (?view=qc): Approve, Rework back to filing, or Reject. Approve QC before Receive finished goods. Receiving creates or updates inventory only; it does not create a customer invoice or sale price. 7) Reports (?view=reports): gold loss by job, tree, and karigar, never invoice jarti. Procure records physical bullion entering the vault; it does not create supplier purchasing or payment records. Legacy /dashboard/shop/workshop/* URLs redirect here.",
  },
  {
    topic: "supply_chain_workspace_views",
    content:
      "The desktop Supply Chain workspace is one page: /dashboard/shop/supply-chain. Tabs at the top: Karigar book, Tower, Jobs, Floor, Metal, QC, Reports. Karigar book is the artisan ledger. The other six tabs appear when Workshop mode is on AND the shop's live plan includes workshopManufacturing (admin-editable per plan). Turn Workshop mode on at Shop Settings → Preferences. Floor departments are query filters (?view=floor&dept=), not sidebar items. Job cards are ?view=job&id=. Gold loss on Karigar book and on Reports is physical workshop metal. Billing wastage (jarti) is only on Create Invoice. Old-gold / old-silver exchange is a separate shop tool, not this ledger. In-app help tours on each tab describe the buttons that are actually on that view.",
  },
  {
    topic: "product_gross_weight_and_pos_customer",
    content:
      "Product metal weight is the net metal-only weight used for metal pricing. Gemstones are entered in carats; 1 carat is exactly 0.2 grams. Gross weight is read-only and equals metal weight plus the converted weight of every gemstone line. Gross weight appears in Products, catalogues, desktop product details, and mobile customer-facing product details. From a Products detail popup, Add to POS basket uses the active POS session or starts one if needed. POS can search existing customers by phone, save a new walk-in customer in the same CRM store used by quotes and invoices, and attach or change that customer during a session. Both camera QR/barcode scanning and USB/Bluetooth RFID or barcode scanners use the same POS lookup. Advanced and Easy POS modes can browse the product catalogue.",
  },
  {
    topic: "seller_referral_programme",
    content:
      "Orivraa seller referrals pay the referring shop a configured share of the referred shop's gross paid subscription invoice (default 10%, admin-adjustable) while that shop remains subscribed. Referral commissions are held in the referral wallet. Depending on the current referral policy, eligible commission may be applied to an Orivraa subscription invoice or made available for the supported payout or Pro conversion options; Dashboard → Referrals shows the current rule for the account. For a bank payout, save bank details in Dashboard → Referrals and submit a request; it remains pending until Orivraa processes it, and a rejected request returns the balance to the referral wallet. Referral rewards are not AI credits or a refund to the referred shop. Share https://www.orivraa.com/auth/register?ref=CODE or send an email invite from Dashboard → Referrals. Review & Earn is separate: after an admin verifies one supported public platform review, it grants one month of Pro.",
  },
  {
    topic: "review_and_earn",
    content:
      "Review & Earn: a shopkeeper leaves a review on SaaSHub, G2, or Crunchbase, then submits both the public review URL and a screenshot from Dashboard → Reviews. After an admin verifies the review, Orivraa grants 1 month of Pro (not Pro+). One review per platform per shop. This is separate from the seller referral programme.",
  },
  {
    topic: "karigar_settlement_ledger",
    content:
      "Karigar Settlement & Account Ledger: Inside /dashboard/shop/supply-chain, click 'Account' on any karigar card to open the authoritative financial reconciliation drawer. 1) Append-only Financial Entries: all wage accruals, settlement payments, advances, and authorized adjustments are immutable with no PUT/DELETE. 2) Anti-overreturn check: returns (RETURN_FINISHED, RETURN_UNUSED, RETURN_SPRUE, SCRAP, DUST) are validated against the outstanding physical metal float for that specific metalKey. 3) RETURN_UNUSED: allows returning unused metal to the shop vault without accruing making wages, and is permitted on cancelled jobs to reconcile outstanding metal floats. 4) Wage Accrual: occurs automatically when RETURN_FINISHED is logged (wage = weightGrams × wageRatePerGram). 5) Settlement Payments: pay accrued wages up to amountPayable (with optional job allocations). 6) Advances: prepaid advances reduce net payable and track positive advance balances. 7) Adjustments: authorized increases or decreases require a mandatory reason note. 8) Printable Statement & CSV: view and export unified chronological metal and money statements with date and type filters.",
  },
  {
    topic: "ask_ai_about_orivraa",
    content:
      "Ask your AI about us: Public pages include Ask ChatGPT, Ask Claude, Ask Gemini, and Ask Perplexity buttons. They open that assistant (the phone app when installed, otherwise the website) with the question: How is Orivraa for jewellery business software? The prompt points at /jewellery-shop-software, /jewellery-shop-billing-software, and /ai-integration so the model can fetch current product facts. Dedicated page: /ask-ai. This is independent of the free in-app Orivraa AI assistant.",
  },
  {
    topic: "seller_ai_integration_mcp",
    content:
      "Seller AI integration: the shopkeeper creates an AI integration key in Shop → AI Integrations (desktop) or More Tools → AI Integrations (mobile). They choose scopes such as inventory:read, inventory:write, orders:read, or orders:write, and can rotate or revoke the key. Reads run immediately. Supported inventory and order-status writes wait for dashboard approval. Sales, payments, refunds, and deletions are not MCP tools. MCP endpoint: POST /api/seller-ai/mcp. Public explainer: /ai-integration.",
  },
  {
    topic: "orivraa_heritage_cloud_launch",
    content:
      "Orivraa trust story: the people behind the product spent more than 10 years serving jewellery customers at the counter (quotes, old-gold exchange, daily closing). That shop-floor practice is encoded in the software: tola, jarti, making charges, vault stock, and karigar metal. It runs in the cloud on phone, laptop, and desktop so a shop is not locked to one Windows PC. Describe the jewellery-trade depth, not a SaaS launch month.",
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
    "inventory-sets",
    "live_rates_autofill",
    "karigar",
    "catalog_currency_reprice",
    "pos_register_payments_returns",
    "account_recovery_email_verification",
    "invoice_bill_templates",
    "billing_wastage",
    "invoice_share_and_bluetooth",
    "mobile_invoice_full_billing",
    "product_description_generation",
    "workshop_manufacturing_mode",
    "supply_chain_workspace_views",
    "karigar_gold_loss_ledger",
    "product_gross_weight_and_pos_customer",
    "seller_referral_programme",
    "review_and_earn",
    "ui-languages",
    "karigar_settlement_ledger",
    "ask_ai_about_orivraa",
    "seller_ai_integration_mcp",
    "orivraa_heritage_cloud_launch",
    "customer_recovery_campaign",
  ]);

  for (const chunk of CHUNKS) {
    if (done.has(chunk.topic) && !FORCE_REFRESH.has(chunk.topic)) {
      console.log(`  Skipping [${chunk.topic}] (already done)`);
      continue;
    }
    const refreshing = FORCE_REFRESH.has(chunk.topic) && done.has(chunk.topic);
    process.stdout.write(
      refreshing
        ? `  Refreshing [${chunk.topic}]… `
        : `  Embedding [${chunk.topic}]… `,
    );
    const vector = await embedWithRetry(chunk.content);
    const vectorLiteral = `[${vector.join(",")}]`;

    await prisma.$transaction(async (tx) => {
      if (refreshing) {
        await tx.$executeRawUnsafe(
          `DELETE FROM "KnowledgeChunk" WHERE topic = $1`,
          chunk.topic,
        );
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO "KnowledgeChunk" (id, topic, content, embedding, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3::vector, NOW(), NOW())`,
        chunk.topic,
        chunk.content,
        vectorLiteral,
      );
    });
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
