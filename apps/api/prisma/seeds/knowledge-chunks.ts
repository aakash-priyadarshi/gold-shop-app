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
  { topic: 'seller-support-access', content: 'Support access lets a shop owner approve a named admin to browse one shop from their chat. Choose read-only or individually allow product edits, materials, capabilities, pricing, invoice creation, invoice settings, and invoice PDF downloads. Select hours, days, 30 or 90 days, or a custom expiry up to 90 days. Permissions apply to sessions started within that period. Each session lasts at most one hour and ends after 15 minutes of inactivity. Revoke from the chat card or Support access in the dashboard. Admin sessions have an exit banner and an activity log. Screen recording is off and unavailable. Account security, payments, messages as the seller, deletions and consent management are blocked. The feature must be enabled by the platform.' },
  {
    topic: "admin-live-email-studio",
    content: "Live Email Studio is available in Admin > Offers > Product updates > Design email. Select a section on the persistent canvas or in the section list to edit it. Use desktop/mobile widths and Images off to inspect readability. This is a browser preview, not an exact Gmail or Outlook screenshot. Subject, preheader, themes, text styling, padding, corners, GIFs, linked video posters, two/three-image galleries and before/after sections are supported. Drag sections or use the arrows; undo and redo are available. A video opens from its poster in a browser; the email does not run JavaScript. Upload a finished GIF for motion; video-to-GIF conversion is not available. Drafts are kept on the same device for up to seven days, scoped to the signed-in admin and campaign. Restore or discard a recovered draft when reopening. Save design explicitly updates the campaign; local recovery does not change scheduled sends. Missing or invalid content is marked in the editor and blocks saving. Concurrent campaign changes reject stale saves; reopen the studio and review the recovered draft against the latest campaign. Campaign content is locked within five minutes of a scheduled send. Return to simple template removes the advanced design after confirmation.",
  },
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
      "Admin → Offers manages the account-bound 50-day Pro recovery campaign, separately branded festival campaigns, and product-update announcements for registered shopkeepers (never cold leads). Its festival calendar shows Hindu, Muslim, Buddhist, Jewish, Sikh, and Christian dates for the current year plus the next two years, with country filters for India, Nepal, UAE, USA, and UK. Click an upcoming festival to prefill a two-week sale window, campaign copy, key, complimentary Pro days, and plan discount, then edit every value before saving. Create product update prefills an AI photo-studio announcement: looping GIF hero, demo URL (jewellery-shop-software#ai-photo-studio), and a catalog button to /dashboard/shop/products. Product-update campaigns store 0 complimentary days and 0 discount and cannot be claimed for Pro. Islamic calendar dates are estimates until local moon-sighting announcements. The recipient table includes people already emailed for that campaign so you can see sent, opened, clicked, activated, failed, and unsubscribed status. Already queued, sent, claimed, or unsubscribed accounts stay visible but cannot be emailed again; failed or expired rows can be retried. Pending-verification Google/OTP accounts, unverified emails, inactive or missing shops, and paid Pro shops can still be selected if they have not been emailed yet. Nothing is selected until the admin checks one email or Select all visible (sendable rows only). Send immediately, at the next country-local 10 AM, at a custom time, or override an individual email's time. Festival campaigns define a sale start/end, complimentary days (normally 14), and a plan discount (normally 10%). A recipient can claim festival days independently of recovery, so festival days extend existing Pro. The discount applies once per shop to any paid subscription checkout while that festival window is active; the server validates the window and applies the Stripe coupon. The public /offers/:campaignKey page shows the claim and billing actions. Offer emails include an Unsubscribe link to /offers/unsubscribe plus Gmail one-click List-Unsubscribe headers. A 48-hour warning helps avoid sending recovery and festival email to the same inbox too closely. Complaint, suppression, and unsubscribe events block future festival and product-update marketing. The funnel reports delivery, opens, clicks, claims, unsubscribes, and rejoined activity using signature-verified Resend webhooks. Edit Email content from Admin → Offers at any time: Edit email content changes only the subject, heading, body, header image, and product-update demo URL/label, while Edit selected festival or clicking the festival again edits the whole campaign. The header can use an HTTP(S) image link, the default Orivraa artwork (or the AI photo GIF for product updates), or a PNG, JPEG, or animated GIF upload up to 5 MB. Uploaded images are stored with Railway-backed app data, embedded into sent email as CID inline content, expire after 30 days, and are physically purged by the hourly cleanup. Preview email renders the production email template with unsaved copy and image choices before saving. The email body supports multi-paragraph formatting: blank lines start a new paragraph and line breaks are preserved in the rendered email. Email content locks automatically once an offer email for that campaign is scheduled within 5 minutes; the sale window and offer values stay editable. The offer sequence is complimentary Pro first: when a shop claims the free days and then buys a discounted plan during the festival, the discounted paid plan starts only after the complimentary days end (Stripe bills the discounted first invoice at that trial end); buying without an active complimentary window charges immediately. The admin offers console is split into tabs: Festival offers (discount and recovery campaigns), Product updates (feature announcements), and Performance (the combined funnel). Product updates has an advanced block-based email designer: Design email (advanced) stacks heading, text, image or animated GIF, demo video, button, divider, and spacer blocks, with three starter layouts. Designs render server-side into table-based email-safe HTML. Animated GIF blocks animate only in clients that support them and otherwise show a static frame (Outlook desktop displays the first frame); optional fade or slide entrance animations are CSS progressive enhancement that plays in Apple Mail and iOS and shows as static content in Gmail and Outlook; email never runs JavaScript. The video block is a linked poster with a play button that opens the hosted MP4, WebM, or YouTube page because email clients do not play inline video. Campaign media uploads go to the images.orivraa.com CDN under the email key namespace (admin-only, images and MP4/WebM up to 10 MB, animated GIFs stored byte-exact). Design emails keep the unsubscribe footer, one-click List-Unsubscribe headers, Resend tags, and the 5-minute pre-send content lock. Preview email shows the exact rendered HTML and warns when the design approaches Gmail's 102 KB clipping limit. Removing the design falls the campaign back to the simple template editor.",
  },
  {
    topic: "plan_quotes_enterprise",
    content:
      "Pro+ (PRO_PLUS) and Enterprise plans can be bought through sales with custom pricing. On Dashboard → Billing → Upgrade, Pro+/Enterprise cards include a “Need custom pricing for a larger team? Contact sales” link that sends the shop's request to the Orivraa team; sales replies by email with a custom quote. When an admin sends a quote, the shop owner receives an email with a private accept link (Billing → Upgrade also shows the quoted prices with an Accept button when opened via that link). Accepting opens Stripe Checkout at the quoted amount — monthly or annual, exactly as quoted, valid until the quote's expiry date. If the shop still has an active complimentary period (60-day Pro trial or festival free days), the discounted plan starts once that period ends instead of cutting it short. Each quote link works for its shop only and can be redeemed once; quotes can be revoked by the team before redemption.",
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
      "On Products (Add/Edit) the description field stays locked until jewellery type, material type, and weight are filled. Gemstones are optional. Free and Pro get Fill from specs — a hardcoded non-AI template you can edit. Pro+ also gets Generate with AI (Gemini 2.5 Flash) which costs 0.25 AI credits. AI design previews offer Imagen 4 Fast (1 credit), Standard (2 credits), and Ultra (3 credits) per image; a five-design batch costs five times the selected model rate. Metal totals use live market rates (or the shop's own metal price if set); gemstones use the platform catalog or the shopkeeper's gemstone rates. Customers are not billed credits; they have a daily preview cap. Buy extra credits at Billing → AI Credits (/dashboard/shop/billing?tab=credits). If a generation fails, credits are refunded. The Orivraa AI assistant chat and in-app tooltips/tours are free on every plan. Public chat cannot look up users or shops. A signed-in user only sees their own account/shop data.",
  },
  {
    topic: "ai_product_photo_enhancement",
    content:
      "Pro+ and Enterprise shops can turn uploaded catalog photos into clean studio-style product images. In Product Catalog → Add or Edit Product, upload up to three photos, then choose Enhance on one photo or Enhance all. The same controls are available for jewelry sets and in mobile POS → Add Product. A looping demo of the Enhance click lives on /jewellery-shop-software#ai-photo-studio, /jewellery-store-management-software#ai-photo-studio, and the homepage. Admins can email that announcement to registered shops from Admin → Offers → Create product update. Nano Banana costs 2 AI credits per target photo; Nano Banana Pro creates a premium 2K result for 7 credits per target photo. Other photos of the same product are sent as non-billable visual references so the AI understands the piece from more angles. Review before and after, then choose Use enhanced to replace the catalog photo or Discard to keep the original. The prompt preserves the exact design, metal, stones, hallmark, and proportions while changing only lighting, background, cleanup, sharpness, and shadow. Failed targets are refunded individually. Buy credits at Billing → AI Credits (/dashboard/shop/billing?tab=credits).",
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
      "Workshop manufacturing is the optional factory workflow inside /dashboard/shop/supply-chain, not a replacement for the Karigar book. Enable Workshop mode in shop settings and ensure the live plan has the admin-configurable workshopManufacturing feature; never assume a particular plan name. On Metal (?view=metal), review Gold 995 physical balances and double-entry movements before production. Gold 995 is 0.995 and distinct from legacy retail 24K/999 or customer billing wastage. Factory workstations record hardware scale readings directly; read stable NET weight after physical TARE on the balance, tap Capture, then Confirm to post. Do not type manual authoritative grams. Owner/Admin may record reasoned adjustments or immutable reversal/replacement corrections. Recipes show recommended Gold 995 and alloy, while only actual scale-confirmed issues affect stock. Process routes, runs, transfers, recovery bags, assay, finished receipt and reconciliation are managed across dedicated factory tabs. Unclassified differences stay pending until approved/classified. Finished inventory from a scale receipt is hidden and unpriced until reviewed. Staff permissions govern bench operators, supervisors, and admins. Legacy /dashboard/shop/workshop/* URLs redirect to Supply Chain.",
  },
  {
    topic: "supply_chain_workspace_views",
    content:
      "Supply Chain Information Architecture: /dashboard/shop/supply-chain organizes jewellery production into three clear sections: Traditional (Karigar Book for artisan float, issue/return vouchers, and wages), Factory Operations (Overview control tower, Jobs creation and work orders, Production floor bench execution, Metal physical ledger and Gold 995, Transfers inter-department custody, Recovery dust collection and refining, QC quality inspection, and Reports traceable gram accounting), and Configuration (Factory Settings). Karigar Book is the first visible tab, while Overview is the default operational landing screen when Workshop Mode is enabled.",
  },
  {
    topic: "workshop_manufacturing_overview",
    content:
      "Workshop Manufacturing OS on Orivraa provides complete, traceable jewellery factory operations inside /dashboard/shop/supply-chain. It does not replace the traditional Karigar Book, which remains the artisan float and wage ledger. When Workshop mode is enabled and entitled, Supply Chain organizes into three distinct groups: Traditional (Karigar Book), Factory Operations (Overview, Jobs, Production, Metal, Transfers, Recovery, QC, Reports), and Configuration (Factory Settings). The Manufacturing Overview serves as the operational control tower, displaying real-time KPIs (active jobs, in-progress runs, pending transfers, recovery batches, and QC inspections), urgent action-required alerts, a dynamic production pipeline, a physical metal position chart across all stages, setup checklists, and fast Quick Actions.",
  },
  {
    topic: "workshop_getting_started",
    content:
      "Getting Started with Orivraa Workshop: 1) Verify that your subscription plan includes the workshopManufacturing entitlement (admin-configurable on any plan). 2) Turn on Workshop mode in Shop Settings → Preferences (desktop: /dashboard/shop/settings?tab=preferences) or Store Settings (mobile: /m/settings). 3) Navigate to Supply Chain at /dashboard/shop/supply-chain, which opens Manufacturing Overview by default. 4) Complete Factory Settings in sequence: connect hardware scales, configure factory materials (e.g. Gold 995), create master recipes, establish process operations, build production routes, configure loss tolerances, and assign staff permissions. 5) Create your first manufacturing job from Jobs → Create Job or Overview Quick Actions.",
  },
  {
    topic: "workshop_jobs",
    content:
      "Manufacturing Jobs: Work orders are canonically created on the Jobs page (/dashboard/shop/supply-chain?view=jobs) using the '+ Create Job' primary action, or via Overview Quick Actions or the Production empty state. Creating a work order requires an assigned karigar/artisan, product name, quantity, due date, and priority. If no karigars exist yet, an inline warning guides you to add an artisan first. The Jobs directory displays all jobs, active runs, QC stages, and completed pieces with search and filtering. Clicking 'View Details' opens the job breakdown containing theoretical CAD weights, recommended recipe amounts, actual scale-confirmed metal, configured routes, piece child groupings, and stage reconciliation data.",
  },
  {
    topic: "workshop_gold995_materials_recipes",
    content:
      "Workshop Materials, Gold 995 & Recipes: Factory metal accounting is tracked in Gold 995 (0.995 fine gold, 99.5% purity) to reflect international manufacturing standards, distinctly separated from finished retail purities (22K, 18K, 14K) and customer billing wastage (jarti). Master alloys and casting consumables are configured in Factory Settings → Materials. Production recipes define input ratios and expected yields. Crucially, 'Recommended' is a mathematical calculation from the recipe that guides operators without touching physical inventory; only 'Actual' scale-confirmed weights alter the double-entry workshop ledger and balance sheet.",
  },
  {
    topic: "workshop_scale_capture",
    content:
      "Scale Integration, Stable NET & Capture vs Confirm: Orivraa interfaces directly with certified digital balances (0.01g precision for gold, 0.001g for gemstones) via WebSerial or the desktop bridge. The scale operator places the container and performs physical TARE on the balance itself. Once the scale signals Stable NET, the operator taps 'Capture'. Capture reads and freezes the physical reading in working memory without posting to inventory. The operator inspects the captured weight and taps 'Confirm' to post the transaction to the immutable ledger. Normal operators cannot type manual authoritative grams.",
  },
  {
    topic: "workshop_production_processes",
    content:
      "Production Floor & Process Execution: Located at /dashboard/shop/supply-chain?view=production. Production is where work orders are physically executed across departmental queues (Casting, Filing, Setting, Polishing). The operator selects an active job, chooses the current process step, verifies allocated physical material, reads the scale via Stable NET, captures and confirms weights, and classifies post-operation remainders into WIP pieces, reusable sprues, scrap, or recovery dust bags. Once all inputs and outputs are reconciled within allowable tolerance, the process run is formally closed.",
  },
  {
    topic: "workshop_reconciliation",
    content:
      "Process Reconciliation & Remainder Classification: Double-entry metal accounting mandates that Total Input (initial issue plus any added metal/alloy) must equal Total Output (worked pieces plus classified remainders). Remainders cannot simply vanish or be assumed as loss; they must be classified as WIP next-stage metal, reusable sprue/casting scrap, floor scrap, recovery dust bags, or accounted process variance. If the variance exceeds the process tolerance threshold, supervisor approval is required before the run can be closed.",
  },
  {
    topic: "workshop_transfers",
    content:
      "Inter-Department Material Transfers: Located at /dashboard/shop/supply-chain?view=transfers. Move physical metal between factory departments or vaults with custodial tracking. Start a transfer with '+ New Transfer'. The sending department performs dispatch weighing (gross, tare, net) on a certified scale. The receiving department independently re-weighs incoming material upon arrival. Any difference between dispatch and receipt is highlighted as Transfer Variance. Weight differences within configured tolerance are reconciled; significant discrepancies trigger supervisory review.",
  },
  {
    topic: "workshop_recovery",
    content:
      "Precious Metal Recovery & Refining: Located at /dashboard/shop/supply-chain?view=recovery. Floor sweeps, filing dust, ultrasonic cleaning sludge, and polishing suction residue are collected into serialized bags using '+ New Recovery Bag'. Dust is held on the balance sheet under 'Recovery Pending' rather than written off as immediate loss. Accumulated bags are dispatched to internal or external refineries. When refined bullion is returned, the physical recovered weight must be confirmed on scale before settlement. A metallurgical laboratory assay is optional; the scale-confirmed physical recovery result is mandatory before settling the batch into vault reserves.",
  },
  {
    topic: "workshop_qc_finished_receipt",
    content:
      "Quality Control (QC) & Finished Goods Receipt: Located at /dashboard/shop/supply-chain?view=qc. Work orders arrive in the QC queue automatically after completing their manufacturing route; there is no manual create button. Inspectors review pieces against specification checklists and either Approve, request Rework (with mandatory notes sending the job back to the bench), or Reject damaged pieces. Successful QC approval unlocks Finished Goods receipt into showroom inventory (with optional SKU assignment), which keeps pieces unpriced until commercial review.",
  },
  {
    topic: "workshop_corrections",
    content:
      "Audit Corrections, Reversals & Immutability: The Workshop ledger is append-only and audit-grade. Historical entries, scale readings, and material issues can never be edited or deleted. If an error occurs, an authorized Owner or Admin executes an immutable reversal transaction that negates the faulty entry, followed by a replacement transaction with correct details and a mandatory administrative audit reason note. Both the original, reversal, and replacement remain permanently visible in the audit journal.",
  },
  {
    topic: "workshop_staff_permissions",
    content:
      "Workshop Staff Roles & Bench Stations: Staff access is governed by permission flags configured in Factory Settings → Staff and Admin roles. Bench operators can run production benches, capture scale readings, and record departmental movements, but cannot perform manual weight overrides, configure tolerances, or delete jobs. Supervisors hold clearance to classify remainders, approve transfer discrepancies, and grant variance clearances. Platform Owners/Admins have full authority over factory configuration, hardware scales, recipes, and ledger corrections.",
  },
  {
    topic: "workshop_reports",
    content:
      "Traceable Manufacturing Reports: Located at /dashboard/shop/supply-chain?view=reports. Workshop reports answer the core manufacturing question: 'Where did these grams go?'. Filter by date range, job, department, karigar, or material to view real-time tables of material stock, stage reconciliation, process variances, inter-department transfer variances, recovery yields, scale audit logs, and finished goods receipts. Distinct from customer invoice jarti or Karigar Book wage slips.",
  },
  {
    topic: "workshop_factory_settings",
    content:
      "Factory Settings & Configuration: Located at /dashboard/shop/supply-chain?view=settings. Dedicated configuration tabs expose contextual actions: 1) Hardware Scales (add/connect digital balances, set 0.01g gold or 0.001g stone precision), 2) Materials (define Gold 995, silver, alloys), 3) Recipes (create component formulas), 4) Processes (define bench stages), 5) Routes (build stage sequences), 6) Workstations (register benches), 7) Tolerances (set process loss thresholds), and 8) Staff (configure role permissions).",
  },
  {
    topic: "workshop_troubleshooting",
    content:
      "Workshop Troubleshooting FAQ: 1) 'Why can't I see factory tabs?' Ensure Workshop mode is ON in Shop Settings → Preferences and your subscription plan has the workshopManufacturing entitlement. 2) 'How do I create a job?' Go to Supply Chain → Jobs and click '+ Create Job'. 3) 'Why can't I close a production run?' Check that Total Input equals Total Output and all remainder metal is classified. 4) 'Why is Finished Goods receipt disabled?' The job must be approved in Supply Chain → QC first. 5) 'How do I fix a wrong scale entry?' Use the audit correction reversal/replacement workflow on the Metal tab.",
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
      "Ask your AI about us: Public pages include Ask ChatGPT, Ask Claude, Ask Google AI, and Ask Perplexity buttons. They open that assistant (the phone app when installed, otherwise the website) with the question: How is Orivraa for jewellery business software? Google AI opens Google Search AI Mode with the same prompt. The prompt points at /jewellery-shop-software, /jewellery-shop-billing-software, and /ai-integration so the model can fetch current product facts. Dedicated page: /ask-ai. This is independent of the free in-app Orivraa AI assistant.",
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
    "ai_product_photo_enhancement",
    "workshop_manufacturing_mode",
    "supply_chain_workspace_views",
    "workshop_manufacturing_overview",
    "workshop_getting_started",
    "workshop_jobs",
    "workshop_gold995_materials_recipes",
    "workshop_scale_capture",
    "workshop_production_processes",
    "workshop_reconciliation",
    "workshop_transfers",
    "workshop_recovery",
    "workshop_qc_finished_receipt",
    "workshop_corrections",
    "workshop_staff_permissions",
    "workshop_reports",
    "workshop_factory_settings",
    "workshop_troubleshooting",
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
    "plan_quotes_enterprise",
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
