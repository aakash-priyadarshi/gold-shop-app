# Mobile Invoice Parity + PDF Share — Master Plan (v2)

> **Goal:** Replace the simplified mobile invoice form with a full jeweller-grade workflow (matching desktop calculations and data completeness). Share on WhatsApp, email, and all OS share targets must deliver **the existing bill text plus a generated PDF** — free for every shop, on mobile and desktop. PDFs are generated on demand only; nothing is stored.

**Status:** Phases 1–3 shipped to `master` (shared engine, mobile wizard shell, PDF share). **Phase 2 calculation wiring is incomplete** — mobile UI exists but reactive pricing, catalog/quote import, and audit-grade line breakdown are not reliably populated. **Phase 5–7 (below) are the active work.**

**Last updated:** 2026-08-12 (v3 — calculation + audit pipeline)
**Product owner decisions:** Locked (see §2)

---

## 1. Problem statement

### Mobile invoice create is too thin

Today's `/m/invoices/create` accepts a label, category, and flat amount. That produces invoices that are **accounting- and tax-report-incomplete**: no metal weight, no making charge math, no wastage (jarti), no live rate basis, no catalog linkage, no quote import. Shops cannot trust mobile bills for GST/VAT filings or ledger reconciliation.

### Share is text-only

`InvoiceShareActions` builds plain text (`billShare.ts`) and opens `wa.me` with a string. There is no PDF file. Marketing already promises PDF bills; shops expect a document they can forward, not a chat snippet.

### Desktop/mobile divergence

Two create entry points with different payloads to the same `POST /api/invoices`. Server tax engine runs either way, but **garbage-in from mobile** means wrong or incomplete line structure even when tax % is correct.

---

## 2. Locked product decisions

| #   | Decision                                       | Rationale                                                                                                                                                                                 |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No “quick bill” / express flat-amount mode** | Jewellery tax and accounting need complete line data every time. A shortcut would create inconsistent records and confuse tax reports.                                                    |
| 2   | **All required fields enforced**               | Every invoice line must capture the same structural data as desktop (metal, weight, making, wastage where applicable). Validation blocks submit if incomplete.                            |
| 3   | **Catalog + quote sources mandatory paths**    | Lines can be added manually _or_ from **product catalog** _or_ from **mobile shop quote** (walk-in quote / RFQ counter quote). Same as desktop `shopQuoteId` + `inventoryItemId` linkage. |
| 4   | **PDF share free for all plans**               | No `FeatureGate` on PDF generation or share.                                                                                                                                              |
| 5   | **One share implementation**                   | Single `InvoiceShareActions` (+ helpers) used on mobile detail and desktop detail.                                                                                                        |
| 6   | **Text + PDF together**                        | Share payload = current formatted text (summary + verify link) **and** PDF file. Text is not removed; PDF makes it authentic.                                                             |
| 7   | **On-demand PDF only**                         | Generate at share/print/download time. **No R2, no DB blob, no cache.** User prints or shares via OS sheet; we don't retain copies.                                                       |
| 8   | **Native OS share sheet primary**              | On mobile (Android/iOS): `navigator.share({ text, files: [pdf] })` so WhatsApp, Gmail, Drive, etc. appear automatically. Desktop: download + email attachment + share where supported.    |

### Terminology (this codebase)

| User term                     | Code module    | Mobile route                                |
| ----------------------------- | -------------- | ------------------------------------------- |
| Walk-in quote / counter quote | `shop-quotes`  | `/m/quotes`, `/m/quotes/[id]/payment`       |
| Online marketplace RFQ        | `rfq` + orders | `/m/rfq` (links to desktop RFQ flows today) |
| Product catalog               | `inventory`    | Pick from stock in create flow              |

**Quote → invoice** covers:

- **Import quote into create** (prefill lines, set `shopQuoteId`) — like desktop `handleImportQuote`
- **Checkout quote with payment** (existing `/m/quotes/[id]/payment` → `shopQuotesApi.checkout`) — must land on detail with PDF share
- **Online order link** (`orderId` query param) — parity with desktop for fulfilled RFQ/order → invoice

---

## 3. Current vs target

| Capability                       | Desktop today        | Mobile today                | Target (mobile + desktop share) |
| -------------------------------- | -------------------- | --------------------------- | ------------------------------- |
| Metal type / purity / weight     | Yes + units          | No                          | Yes                             |
| Live market rate autofill        | Yes                  | No                          | Yes                             |
| Making charge (% / per-g / flat) | Yes                  | No                          | Yes                             |
| Wastage (jarti) from shop rules  | Yes                  | No                          | Yes                             |
| Gemstone lines                   | Yes                  | No                          | Yes                             |
| Tax preview (category split)     | Yes                  | No                          | Yes                             |
| Catalog pick + stock commit      | Yes                  | No                          | Yes                             |
| Shop quote import                | Yes                  | No (only separate checkout) | Yes                             |
| Order / `shopQuoteId` on create  | Yes                  | No                          | Yes                             |
| Customer phone lookup            | Yes                  | No                          | Yes                             |
| Discount, notes, payment method  | Yes                  | Partial                     | Yes                             |
| LK TAX INVOICE fields            | Full                 | Partial                     | Full                            |
| Share                            | Text only            | Text only                   | **Text + PDF**                  |
| PDF                              | Manual browser print | Manual browser print        | **On-demand generated PDF**     |

---

## 4. Architecture principles

1. **Extract, don't duplicate** — shared `apps/web/src/lib/invoice/*` modules; desktop create refactors to use them first.
2. **Server authoritative** — client preview for UX; `POST /api/invoices` + `backendTaxEngine` remain source of truth.
3. **One bill layout** — `buildBillHtml()` is the single template for print, PDF, and email HTML body.
4. **No PDF persistence** — stream `application/pdf` from API; client holds blob in memory until share completes.
5. **Mobile UX ≠ mobile data model** — stepped wizard and bottom sheets for touch; **same DTO** as desktop.
6. **No quick path** — remove/replace current flat-amount mobile create entirely.

---

## 5. Phase 1 — Shared invoice engine (foundation)

**Duration:** ~1 week  
**Outcome:** Desktop and mobile call the same calculation and mapping code; desktop behaviour unchanged.

### 5.1 New modules (`apps/web/src/lib/invoice/`)

| File                        | Responsibility                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `lineItemTypes.ts`          | `RichLineItem`, gemstone sub-rows, source (`manual` \| `catalog` \| `quote`), `inventoryItemId`, `shopQuoteId` |
| `emptyLineItem.ts`          | Factory matching desktop defaults                                                                              |
| `calculateLineTotals.ts`    | Metal cost, making, wastage (`calculateLineWastage`, `resolveWastageRule`), gemstones, line amount             |
| `calculateInvoiceTotals.ts` | Subtotal, discount, invoice-level making merge, catalog/quote making dedup                                     |
| `useInvoiceTaxPreview.ts`   | Load rules via `pricingApi.getTaxRules()`, run `apps/web/src/lib/tax/engine.ts`                                |
| `useLiveRates.ts`           | Rates fetch + `pricingApi.resolveBulk` for catalog lines                                                       |
| `mapToCreateDto.ts`         | Rich state → `invoicesApi.create()` body incl. `shopQuoteId`, `orderId`, `lineItems[]` with full breakdown     |
| `validateInvoiceDraft.ts`   | Required-field checks before submit (no quick-mode escape hatch)                                               |
| `importShopQuote.ts`        | Port desktop `handleImportQuote` logic                                                                         |
| `importCatalogItem.ts`      | Port desktop `addCatalogItem` logic                                                                            |

### 5.2 Desktop refactor

- `apps/web/src/app/dashboard/shop/invoices/create/page.tsx` consumes shared modules.
- Zero user-visible regression; existing vitest/tax tests still pass.
- Add unit tests for `calculateLineTotals`, `mapToCreateDto`, `validateInvoiceDraft`, `importShopQuote`.

### 5.3 Acceptance criteria

- [ ] Same quote + catalog import on desktop as before, now via shared functions.
- [ ] Unit tests cover NP/IN/LK tax line mapping for a 22K tola ring with 15% making and shop wastage rule.
- [ ] `mapToCreateDto` output matches what desktop currently POSTs (snapshot test).

---

## 6. Phase 2 — Mobile invoice create v2 (full form)

**Duration:** ~2 weeks  
**Outcome:** `/m/invoices/create` replaced with a complete jeweller workflow. Old simplified page removed.

### 6.1 Entry points

| Route / param                      | Behaviour                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `/m/invoices/create`               | Full wizard (default)                                                        |
| `/m/invoices/create?shopQuoteId=…` | Open on quote import step, prefill via `importShopQuote`                     |
| `/m/invoices/create?orderId=…`     | Prefill from order (desktop parity)                                          |
| `/m/quotes` → "Convert to invoice" | Navigate to create with `shopQuoteId` (not only payment checkout)            |
| `/m/quotes/[id]/payment`           | Keep checkout flow; after success redirect to `/m/invoices/:id?created=true` |

### 6.2 Wizard steps (all required paths, no shortcuts)

```
Step 1 — Customer
  • Name, phone (+ country code), email, address
  • B2B toggle, tax ID, walk-in customer link (phone lookup API)
  • Invoice country, LK: TAX INVOICE request, supply date, place of supply

Step 2 — Add lines (choose one per line)
  • [Catalog]  → MobileCatalogPicker bottom sheet (search inventory, live rate toggle)
  • [Quote]    → MobileQuotePicker (open shop quotes not yet invoiced)
  • [Manual]   → Full jewellery line editor

Step 3 — Line editor (per line, expandable card)
  • Jewellery type, category (METAL/MAKING/GEMSTONE/FINISH)
  • Metal: type, purity, gross/net weight + unit chips (tola/gram/…)
  • Rate: manual or "Live rate" chip
  • Making: segmented % | per-gram | flat
  • Wastage: auto from shop rule, editable %, shows jarti amount
  • Gemstones: add/remove sub-rows (type, carat, cost)
  • Source badge: Catalog # / Quote # / Manual

Step 4 — Invoice adjustments
  • Invoice-level making (if not embedded in lines)
  • Discount (% or fixed)
  • Payment method, notes, terms, due date

Step 5 — Review & tax
  • Line summary
  • Tax breakdown preview (metal / gem / making / wastage lines)
  • Total, currency
  • Block submit if validateInvoiceDraft fails

Step 6 — Create
  • POST invoicesApi.create(mapToCreateDto(...))
  • router.replace(/m/invoices/:id?created=true)
```

### 6.3 New UI components (`apps/web/src/components/invoice/mobile/`)

| Component                     | Role                                               |
| ----------------------------- | -------------------------------------------------- |
| `MobileInvoiceWizard.tsx`     | Step state machine + progress header               |
| `MobileCustomerStep.tsx`      | Customer + market fields                           |
| `MobileLineListStep.tsx`      | Line list + add buttons (catalog / quote / manual) |
| `MobileInvoiceLineCard.tsx`   | Expandable line editor                             |
| `MobileCatalogPicker.tsx`     | Bottom sheet catalog search                        |
| `MobileQuotePicker.tsx`       | Bottom sheet shop quote list                       |
| `MobileTaxBreakdown.tsx`      | Read-only tax lines                                |
| `MobileWeightInput.tsx`       | Amount + unit chips                                |
| `MobileMakingChargeInput.tsx` | % / per-g / flat control                           |
| `MobileReviewStep.tsx`        | Final review + submit                              |

### 6.4 Quote / RFQ / catalog integration detail

**Catalog**

- Reuse `inventoryApi` search patterns from desktop catalog dialog.
- Pass `inventoryItemId` on line; server commits stock on create (existing API).
- Live rate toggle per add (same as desktop `catalogUseLiveRate`).

**Shop quote (walk-in / counter quote)**

- `shopQuotesApi.getAll()` filtered: not invoiced, not cancelled.
- `importShopQuote(quote)` fills customer + one or more lines + sets `importedQuoteId`.
- Submit with `shopQuoteId` in create DTO (desktop already sends this).

**Quote checkout path (existing)**

- `/m/quotes/[id]/payment` continues to call `shopQuotesApi.checkout`.
- Ensure converted invoice has full line breakdown in DB (audit checkout API if it still creates thin lines — **fix in API if needed**).

**Online order (`orderId`)**

- Support `?orderId=` on mobile create (load order, prefill customer + lines like desktop).

### 6.5 Explicitly out of scope for Phase 2 (Phase 4)

- BLE weighing scale on mobile (desktop has `WeighingScalePanel`)
- Currency FX converter UI (desktop has Frankfurter widget)

### 6.6 Acceptance criteria

- [ ] Cannot create invoice with only a flat amount — validation enforces metal/making structure for METAL lines.
- [ ] Catalog-added line: same total as desktop for identical product + live rate.
- [ ] Quote-imported line: same total as desktop `handleImportQuote` for same quote.
- [ ] Mobile totals match desktop for equivalent inputs (manual test matrix: NP B2C, IN B2B, LK TAX INVOICE).
- [ ] `shopQuoteId` and `inventoryItemId` present on created invoice records.
- [ ] E2E: `e2e/mobile-invoice-create.spec.ts` — catalog add + create + land on detail.

---

## 7. Phase 3 — On-demand PDF + unified share (mobile + desktop)

**Duration:** ~1 week  
**Outcome:** Every share action offers **text summary + PDF file**. Free for all shops. No storage.

### 7.1 API: generate PDF stream

```
GET /api/invoices/:id/pdf
  Auth: SHOPKEEPER (shop owns invoice)
  Response: application/pdf
  Headers: Content-Disposition: inline; filename="Invoice-{invoiceNumber}.pdf"
  Body: streamed bytes (no write to R2/DB)
```

**Implementation (`InvoicePdfService`):**

1. `findById` + invoice settings (same data as print).
2. Render HTML via shared `buildBillHtml()` (extract to `packages/shared` or `apps/web/src/lib/invoice/billHtml.ts` importable by API via duplication-minimal server copy).
3. HTML → PDF with `puppeteer-core` + `@sparticuz/chromium` (Railway-compatible).
4. Return stream; **no side effects**.

**Email endpoint update:**

```
POST /api/invoices/:id/share/email
  • Keep HTML body (current summary text)
  • Attach same PDF bytes inline (Resend attachment)
  • Still free — no plan gate
```

### 7.2 Client: `apps/web/src/lib/invoicePdf.ts`

```ts
fetchInvoicePdfBlob(invoiceId): Promise<Blob>  // GET /api/invoices/:id/pdf
buildInvoicePdfFile(blob, invoiceNumber): File   // for Web Share API
```

### 7.3 Unified share flow (`InvoiceShareActions.tsx` refactor)

**Core helper: `shareInvoiceWithPdf(invoice)`**

1. Build text via existing `buildBillShareText()` (unchanged content).
2. Fetch PDF blob on demand (show loading spinner on button).
3. Branch by capability:

| Platform                                   | Behaviour                                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Mobile Android/iOS** (Share API + files) | `navigator.share({ title, text, files: [pdfFile] })` — OS shows WhatsApp, Gmail, Telegram, etc.                             |
| **Mobile fallback**                        | Download PDF + toast "PDF saved — attach in WhatsApp" + copy text to clipboard                                              |
| **Desktop Chrome/Edge** (file share)       | `navigator.share({ text, files })` when available                                                                           |
| **Desktop fallback**                       | Download PDF + open mailto / keep email API                                                                                 |
| **WhatsApp button**                        | Always: generate PDF first, then native share (not `wa.me` text-only). Fallback: `wa.me` with text + separate download link |
| **Email button**                           | API send with PDF attachment + HTML body                                                                                    |
| **Print button**                           | Unchanged `printBill()` (browser print)                                                                                     |
| **Download PDF**                           | New explicit button                                                                                                         |

**Important:** Text is always included in `navigator.share({ text, files })` so recipients get context even if they only read the message line.

### 7.4 Plan gating changes

- Remove any `FeatureGate` / plan checks that would block PDF or WhatsApp share for base tier.
- Keep SMS share plan gate if product still wants SMS as premium (PDF itself is free).

### 7.5 Railway / API container

- Add Chromium deps to `apps/api/Dockerfile` (or use `@sparticuz/chromium` layer).
- Set memory limit awareness on `@gold-shop/api` (PDF gen is bursty; no cache means repeat gen on each share — acceptable per product).
- Timeout: 30s max on PDF endpoint.

### 7.6 Acceptance criteria

- [ ] Share on Android opens system sheet with PDF + apps list (WhatsApp, etc.).
- [ ] Share on iOS: file share where supported; graceful fallback documented.
- [ ] Desktop email receives PDF attachment + readable HTML body.
- [ ] PDF layout matches print preview (invoice #, tax breakdown, QR verify).
- [ ] No files written to R2 or Postgres.
- [ ] Same `InvoiceShareActions` on `/m/invoices/[id]` and `/dashboard/shop/invoices/[id]`.
- [ ] Post-quote-checkout on `/m/quotes/[id]/payment` detail link uses PDF share.

---

## 8. Phase 4 — Polish, API hardening, docs, tests

**Duration:** ~1 week  
**Outcome:** Production-ready, documented, tested end-to-end.

### 8.1 API audit

- [ ] Review `shopQuotesApi.checkout` / convert-to-invoice: ensure line items stored with full metal/making/wastage breakdown (not lump sum). Patch if thin.
- [ ] Confirm `backend-tax-engine` tests cover mobile DTO shape from `mapToCreateDto`.

### 8.2 Desktop parity touch-ups

- [ ] Desktop `InvoiceShareActions` uses same PDF+text share (Phase 3).
- [ ] Desktop create already refactored (Phase 1) — smoke test quote + catalog paths.

### 8.3 Mobile polish

- [ ] Tutorial steps in `useTutorial.ts` for new wizard steps.
- [ ] `data-tour` anchors on catalog picker, tax breakdown, share PDF.
- [ ] Remove dead code: old flat-amount mobile create logic.
- [ ] `/m/quotes` list: add "Create invoice" action → `/m/invoices/create?shopQuoteId=`.

### 8.4 Knowledge & marketing

- [ ] `knowledge-chunks.ts`: mobile full invoice, PDF share, quote import.
- [ ] Align landing copy (`lk/jewellery-shop-software`, etc.) with shipped behaviour.

### 8.5 Tests

| Test                                                            | Type           |
| --------------------------------------------------------------- | -------------- |
| `calculateLineTotals`, `mapToCreateDto`, `validateInvoiceDraft` | vitest unit    |
| `importShopQuote`, `importCatalogItem`                          | vitest unit    |
| Tax preview matches API for sample invoice                      | integration    |
| Mobile create → detail → share triggers PDF fetch               | Playwright e2e |
| PDF endpoint returns valid PDF magic bytes `%PDF`               | API jest       |

### 8.6 Optional (time permitting)

- BLE scale on mobile (`WeighingScalePanel` mobile variant)
- FX converter on mobile review step

---

## 9. Implementation order (all 4 phases)

| Order | Phase                                         | Depends on                                     |
| ----- | --------------------------------------------- | ---------------------------------------------- |
| 1     | Phase 1 — Shared engine + desktop refactor    | —                                              |
| 2     | Phase 2 — Mobile wizard + catalog/quote/order | Phase 1                                        |
| 3     | Phase 3 — PDF API + unified share             | Phase 1 (bill HTML); can parallel late Phase 2 |
| 4     | Phase 4 — Hardening, tests, docs              | Phases 2–3                                     |

**Suggested calendar:** ~5 weeks total (1 + 2 + 1 + 1).

---

## 10. File map

```
apps/web/src/lib/invoice/                      # Phase 1 — shared engine
apps/web/src/lib/invoice/billHtml.ts           # Extract from billPrint (Phase 3)
apps/web/src/lib/invoicePdf.ts                 # Phase 3 — client fetch
apps/web/src/components/invoice/mobile/        # Phase 2 — wizard UI
apps/web/src/app/m/invoices/create/page.tsx    # Phase 2 — rewrite
apps/web/src/app/m/quotes/page.tsx             # Phase 2 — "Create invoice" CTA
apps/web/src/app/dashboard/shop/invoices/create/page.tsx  # Phase 1 refactor
apps/web/src/components/shop/InvoiceShareActions.tsx      # Phase 3
apps/web/src/lib/billPrint.ts                  # Phase 3 — delegate to billHtml
apps/api/src/modules/invoices/invoice-pdf.service.ts      # Phase 3
apps/api/src/modules/invoices/invoices.controller.ts      # GET :id/pdf
apps/api/src/modules/invoices/invoices.service.ts         # email attach PDF
apps/api/Dockerfile                            # Chromium for PDF
apps/api/prisma/seeds/knowledge-chunks.ts      # Phase 4
apps/web/src/components/tutorial/useTutorial.ts
e2e/tests/mobile-invoice-create.spec.ts        # Phase 4
```

---

## 11. Risks & mitigations

| Risk                                    | Mitigation                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Puppeteer memory/CPU on Railway API     | `@sparticuz/chromium`; single-page render; 30s timeout; no cache = repeat cost accepted |
| iOS Web Share file support gaps         | Fallback: download PDF + clipboard text; document in support KB                         |
| Mobile wizard too long                  | Progressive steps + save draft to `sessionStorage` (optional stretch)                   |
| Quote checkout creates thin invoices    | Phase 4 API audit + fix `shop-quotes` convert path                                      |
| Desktop/mobile calc drift               | Single `mapToCreateDto` + shared tests + API tax spec parity                            |
| Large desktop page refactor breaks prod | Phase 1 is refactor-only with snapshot tests before mobile work                         |

---

## 12. Success metrics

- Mobile invoice line items in DB have `metalWeight`, making, wastage fields populated (sample audit).
- Tax report totals from mobile-created invoices match desktop-created equivalents (± rounding).
- Share funnel: PDF blob generated on >95% of share attempts (fallback rate tracked).
- Support tickets re "mobile bill wrong" / "no PDF" drop after release.

---

## 13. What we are NOT building

- Quick / flat-amount invoice mode
- PDF storage (R2, DB, or CDN cache)
- Plan-gated PDF share
- Separate mobile vs desktop PDF templates
- Text-only WhatsApp as primary path (text remains, but always paired with PDF attempt)

---

## 14. End-to-end sales & compliance pipeline (mobile = desktop)

Every sale — whether entered on phone or PC — must follow the **same data contract** so tax reports, IRD/GST audits, and double-entry accounting stay correct.

### 14.1 Pipeline diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SOURCES (pick one or more per invoice line)                                │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│  Manual line    │  Catalog piece  │  Walk-in quote  │  Online order (RFQ)   │
│  (counter sale) │  inventoryItemId│  shopQuoteId    │  orderId              │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                    │
         └─────────────────┴────────┬────────┴────────────────────┘
                                    ▼
              ┌─────────────────────────────────────────┐
              │  INVOICE CREATE (shared mapToCreateDto) │
              │  • Rich line: metal / making / wastage  │
              │    / gemstone breakdown per line        │
              │  • shopQuoteId, orderId, inventoryId  │
              │  • invoiceCountry, customerType, taxId  │
              │  • taxBreakdown preview (client)        │
              └────────────────────┬────────────────────┘
                                   ▼
              ┌─────────────────────────────────────────┐
              │  API: POST /api/invoices                │
              │  • saleBuilder.normalizeInvoiceLines()  │
              │    → METAL / MAKING / GEMSTONE / FINISH │
              │  • backendTaxEngine (authoritative tax) │
              │  • Persist Invoice + lineItems JSON     │
              │  • accounting.postInvoiceIssuance()     │
              │  • Stock commit (catalog lines)         │
              │  • Link quote/order → invoiced          │
              └────────────┬───────────────┬────────────┘
                           │               │
              ┌────────────▼───┐   ┌───────▼────────────────────────┐
              │  ACCOUNTING    │   │  TAX REPORTS                    │
              │  Journal entry │   │  /tax-reports/* + /m/tax        │
              │  AR / Revenue  │   │  Reads stored lineItems by      │
              │  Tax payable   │   │  category + taxBreakdown JSON   │
              │  Payment recv  │   │  NP IRD audit, IN GSTR, LK VAT  │
              │  /dashboard/   │   │  Exports CSV/PDF for accountant │
              │  shop/accounting│  │                                 │
              └────────────────┘   └─────────────────────────────────┘
```

### 14.2 Why mobile calculation bugs break audit

Tax reports (`tax-reports.service.ts`) aggregate **stored** `invoice.lineItems` by category:

| Category   | Used for (examples)                    |
| ---------- | -------------------------------------- |
| `METAL`    | NP skill promotion fee, IN metal GST   |
| `MAKING`   | NP skill fee base, IN 5% GST on making |
| `GEMSTONE` | NP 13% VAT, category-split tax         |
| `FINISH`   | NP 13% VAT                             |
| `PRODUCT`  | Legacy flat lines — **bad for audit**  |

If mobile sends a flat amount without `metalCost` / `makingCost` / `gemstoneCost` / `wastageCost`, the API's `expandCollapsedLine` may guess METAL-only — **tax reports and IRD audit exports will be wrong** even if the grand total looks right on the bill.

Accounting (`postInvoiceIssuance`) posts **invoice-level** AR / revenue / tax payable — it needs correct `totalAmount` and `taxAmount`. Wrong client preview → wrong payment recording → ledger drift.

### 14.3 Audit-grade invoice payload contract

Every `POST /api/invoices` from mobile **or** desktop must include:

| Field                                        | Required when           | Purpose                                    |
| -------------------------------------------- | ----------------------- | ------------------------------------------ |
| `lineItems[].metalCost`                      | Jewellery line          | Tax category METAL, metal tax              |
| `lineItems[].makingCost`                     | Making charged          | MAKING line expansion, making tax          |
| `lineItems[].gemstoneCost`                   | Gems on piece           | GEMSTONE line, 13% VAT (NP)                |
| `lineItems[].wastageCost` + `wastagePercent` | Jarti applied           | Wastage tax, audit trail                   |
| `lineItems[].metalType` + `metalWeightG`     | Metal jewellery         | Weight audit, rate verification            |
| `lineItems[].inventoryItemId`                | From catalog            | Stock commit + traceability                |
| `shopQuoteId`                                | From walk-in quote      | Quote → invoice linkage                    |
| `orderId`                                    | From RFQ/order          | Order → invoice linkage                    |
| `invoiceCountry`                             | Always                  | Regime selection                           |
| `customerType` + `customerTaxId`             | B2B / LK tax invoice    | Filing compliance                          |
| `taxBreakdown`                               | Always (client preview) | Stored; reports prefer this over recompute |

**Rule:** Client preview totals must match server response within ±₹1 (rounding). Server tax engine is authoritative; client must not submit if validation fails.

### 14.4 Mobile vs desktop surface map (same backend)

| Step              | Desktop                           | Mobile                                                | Same API?                      |
| ----------------- | --------------------------------- | ----------------------------------------------------- | ------------------------------ |
| Create invoice    | `/dashboard/shop/invoices/create` | `/m/invoices/create`                                  | `POST /invoices`               |
| Tax reports       | `/dashboard/shop/tax-reports`     | `/m/tax`                                              | `taxReportsApi.*`              |
| Accounting ledger | `/dashboard/shop/accounting`      | _(no page yet — link or lightweight `/m/accounting`)_ | `accountingApi.*`              |
| Daily summary     | Dashboard widgets                 | `/m/summary`                                          | Invoice aggregates             |
| Quote → invoice   | Import + checkout                 | `/m/quotes` + `?shopQuoteId=`                         | `shopQuotesApi`                |
| Catalog → invoice | Catalog dialog                    | Catalog picker on create                              | `inventoryApi` + `resolveBulk` |

---

## 15. Phase 5 — Mobile calculation engine (fix Step 2) — **ACTIVE**

**Duration:** ~5–6 dev days  
**Outcome:** Mobile Step 2 behaves like desktop — live rates, wastage, making, catalog/quote import all populate and recalculate.

### 15.1 Root causes (confirmed in code review)

| Symptom                       | Root cause                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Nothing calculated on Step 2  | Lines start empty; no auto metal cost from type + weight + live rate                  |
| Catalog prices missing        | Only `resolveBulk`; no `calcMetalCostFromParts(shopPrices, marketRates)` fallback     |
| Apply making does nothing     | `applyMakingToLine` needs metal cost > 0; no user feedback                            |
| Wastage % doesn't update cost | No `useEffect` to sync all lines when invoice `wastagePct` changes (desktop has this) |
| Gemstones manual only         | Catalog import sets `gemstones: []`; desktop resolves `composition.gemstones`         |

### 15.2 Deliverables

| #   | Task                                                                                      | Files                                           |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `useInvoicePricing` hook — market rates, shop prices, shop wastage rules, reactive recalc | `apps/web/src/lib/invoice/useInvoicePricing.ts` |
| 2   | Wire hook into mobile create page                                                         | `apps/web/src/app/m/invoices/create/page.tsx`   |
| 3   | Harden `importCatalogItem` — gems from composition, rate fallback, warnings               | `importHelpers.ts`                              |
| 4   | Harden `importShopQuote` — audit API response fields                                      | `importHelpers.ts` + API fixture test           |
| 5   | Sticky totals bar on Step 2 (subtotal / wastage / tax / grand)                            | mobile create UI                                |
| 6   | `orderId` prefill path (RFQ → order → invoice)                                            | mobile create + desktop parity                  |
| 7   | Unit tests for wastage sync, making apply, catalog/quote import                           | `invoice-engine.test.ts`                        |

### 15.3 Acceptance criteria

- [ ] Catalog ring: metal + making + wastage + gems populated from inventory + live rates
- [ ] Walk-in quote: all priced fields + customer prefill + `shopQuoteId` on DTO
- [ ] Manual line: type + weight → live metal → 5% wastage → 15% making → tax preview updates
- [ ] Invoice created from mobile has `lineItems` with METAL/MAKING/GEMSTONE breakdown in DB (not flat PRODUCT-only)

---

## 16. Phase 6 — Audit & compliance verification pipeline

**Duration:** ~3–4 dev days  
**Outcome:** Prove mobile-created invoices produce **identical** tax report and accounting entries as desktop for the same inputs.

### 16.1 API integration tests (new)

| Test                                | Assert                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Mobile-shaped DTO → `create()`      | `lineItems` normalized to METAL/MAKING/GEMSTONE                            |
| Same DTO desktop vs mobile snapshot | Identical stored `taxBreakdown`, `subtotal`, `taxAmount`                   |
| Nepal VAT report                    | Mobile invoice appears in `getNepalVat` with correct skill fee + VAT split |
| Nepal yearly audit                  | Mobile invoice in `getNepalAuditReport` monthly buckets                    |
| India GSTR                          | Mobile invoice in B2B/B2C buckets with IGST/CGST/SGST                      |
| Accounting issuance                 | `journalEntry` created with AR / revenue / tax payable matching total      |

Location: `apps/api/src/modules/invoices/invoices.service.spec.ts`, `tax-reports.service.spec.ts`, `accounting.service.spec.ts`.

### 16.2 E2E compliance smoke

```
1. Mobile: create invoice from catalog (live rate on)
2. Mobile: open /m/tax → same period → verify invoice count + tax total
3. Desktop: /dashboard/shop/tax-reports → same numbers
4. Desktop: /dashboard/shop/accounting → trial balance includes sale
5. Void invoice → verify tax report excludes + accounting reversal
```

Playwright: extend `e2e/tests/mobile-invoice-create.spec.ts` + add `mobile-tax-report-parity.spec.ts`.

### 16.3 Quote / order linkage audit

| Path                                      | Must set on invoice               | Must update on source                    |
| ----------------------------------------- | --------------------------------- | ---------------------------------------- |
| Walk-in quote import                      | `shopQuoteId`, `walkInCustomerId` | Quote status → invoiced, `invoiceNumber` |
| Quote checkout (`/m/quotes/[id]/payment`) | Same + payment                    | No duplicate invoice                     |
| Online order (`orderId`)                  | `orderId`                         | Order fulfillment state                  |

Audit `shop-quotes.service.ts` convert/checkout and `invoices.service.ts` create for idempotency.

### 16.4 Mobile accounting access (lightweight)

Desktop has full ledger UI; mobile shopkeepers need **read-only audit trail**:

| Option          | Route                                                 | Content                                                |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| A (minimal)     | Link from `/m/more` → desktop accounting (responsive) | Zero new UI                                            |
| B (recommended) | `/m/accounting`                                       | Trial balance summary + link to full desktop           |
| C               | Extend `/m/summary`                                   | Add tax collected + AR outstanding from accounting API |

**Recommendation:** Option B — thin mobile page calling `accountingApi.trialBalance` + `profitLoss` for current month, with "Open full ledger on desktop" CTA.

---

## 17. Phase 7 — Desktop refactor + drift prevention

**Duration:** ~1 week (can run parallel after Phase 5 hook is stable)  
**Outcome:** Desktop create page uses `useInvoicePricing`; one code path for both clients.

- Refactor `apps/web/src/app/dashboard/shop/invoices/create/page.tsx` to consume shared hook (~4600 → ~2000 lines target).
- CI: `mapToCreateDto` snapshot test must pass for both mobile and desktop fixture inputs.
- Add `pnpm test:invoice-engine` script for shared + API compliance specs.

---

## 18. Revised implementation order

| Order | Phase                                                      | Depends on           | Est.     |
| ----- | ---------------------------------------------------------- | -------------------- | -------- |
| 1     | Phase 5 — Mobile calculation fix                           | Phases 1–2 (shipped) | 5–6 days |
| 2     | Phase 6 — Audit/compliance verification                    | Phase 5              | 3–4 days |
| 3     | PDF auth fix deploy (axios)                                | —                    | 1 day    |
| 4     | Phase 7 — Desktop refactor to shared hook                  | Phase 5              | 1 week   |
| 5     | Phase 4 remainder — E2E, tutorials, mobile accounting page | Phase 6              | 3 days   |

**Critical path:** Phase 5 → Phase 6 → production deploy. Do not mark mobile billing "done" until Phase 6 tax report parity tests pass.

---

## 19. Compliance success metrics (add to §12)

- **100%** of mobile jewellery invoices in a 30-day sample have `metalCost` + `makingCost` populated (DB audit query).
- Mobile vs desktop tax report totals for same shop/period: **±0** (not ± rounding).
- Nepal IRD audit export (`getNepalAuditReport`) includes all mobile-created NP invoices.
- Accounting trial balance revenue matches sum of issued invoice `totalAmount - taxAmount` for the period.
- Zero duplicate invoices from quote checkout + manual import of same `shopQuoteId` (idempotency).
