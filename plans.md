# Orivraa All-In-One Master Plan: Hybrid POS, Data Consistency & PLG Growth Suite

This workspace file represents our definitive, all-in-one roadmap for Orivraa. It details all technical architecture, file paths, visual layouts, and implementation steps to bridge platform gaps and build highly engaging, gamified user onboarding.

---

## 1. Executive Summary & Design Intent

Our unified goal is to transform Orivraa's POS into a fast, touchscreen-optimized, and financially consistent platform while introducing high-retention growth loops (daily gold forecasts, zero-friction sandbox setups, and credit-card-free trials) that turn free signups into paying customers.

### Core Pillars
1. **PC "Counter Mode" Slide-Toggle:** A high-speed, touchscreen-friendly checkout layout alongside the Advanced back-office ERP views.
2. **PC & Mobile POS Feature Parity:** Auto-tax rule preset chips, debounced Name/SKU product autocompletes, dynamic making charge calculators, payment method grids, browser print receipt previews, and WhatsApp sharing templates.
3. **Mobile POS Offline Resilience:** Automatic background draft cart syncing to browser `localStorage` to survive network drops.
4. **Total Data Consistency (NestJS + Prisma DB):** Enforcing proper structured checkout columns on NestJS, and instantly marking walk-in POS counter checkouts as `PAID` invoices in the database (ending un-reconciled invoices and string hacks inside the `notes` field).
5. **Daily Habit Hook & Gamified Conversions:** Displaying live gold spot prices and AI daily gold forecasts, offering one-click demo data hydration sandboxes, 14-day free trials, and milestone quest rewards that award free AI design credits with confetti animations.

---

## 2. Comprehensive Feature Blueprints

### Feature A: Desktop POS "Counter Mode" Slide-Toggle
* **The Problem:** cashiers operating busy showrooms cannot navigate dense back-office tables and ERP forms during rush hours.
* **The Solution:** Add an elegant **"ERP Mode | Counter Mode"** toggle switch in the desktop header.
* **Layout Transition:**
  * **Advanced ERP Mode (Default):** Retains complex operations (customer wishlists, manual items, stock-reservation timers, back-office reports).
  * **Counter Mode (Touchscreen Simple):** Rearranges the interface:
    * **Left 2/3 (Visual Catalogue):** Grid of product cards with thumbnails, Gold Karat/Purity badges, live stock counts, and active pricing. Clicking a card appends it to the cart.
    * **Right 1/3 (Counter Sidebar):** Dense transaction cart listing item quantities, automatic tax preset buttons, making charge sliders, and payment selectors.

### Feature B: PC POS UX Gaps Resolved
* **Name/SKU Debounced Autocomplete:** Port mobile's autocomplete search, enabling cashiers to type a Product Name, Category, or SKU, select the match from a dropdown list, and add it instantly.
* **Tax Preset Chips:** Trigger automatic regional tax lookup based on the shop country, rendering easy-tap chips: `GST 3%`, `VAT 13%`, `Tax Exempt` with custom percentage override inputs.
* **Jewellery Making Charges Calculator:** Add a making charge percentage selector (`0%`, `8%`, `12%`, `14%`, `18%`) and a flat per-gram override field that dynamically recalculates invoice totals.
* **Payment Selector Grid:** Add clear, finger-friendly button selectors for counter payments: `Cash`, `Card`, `UPI / QR`, `eSewa`, `Khalti`, and `Bank Transfer`.
* **Receipt Layout & WhatsApp Sharing:** Open a beautiful post-sale print layout modal enabling the cashier to trigger standard browser thermal print rules or click "Share on WhatsApp" to pre-fill a checkout notification.

### Feature C: Mobile POS Gaps Resolved
* **Offline Local Storage Sync:** Save the active mobile cart items array dynamically to `localStorage` on modification. Load and rebuild this cart state on component mount, preventing billing losses during network drops or page reloads.

### Feature D: Front-to-Back Data Consistency
* **Structured DTOs:** Add structured, validated fields (`paymentMethod`, `makingChargesNpr`, `makingChargeRate`, `paymentStatus`) to the NestJS `CheckoutDto` schema, terminating the old mobile hack of stringifying checkout data inside `notes`.
* **Immediate Payments Logging:** Update the backend POS service so checking out immediately triggers `invoicesService.recordPayment()`. This marks walk-in POS invoices as `PAID` with `paidAmount = totalAmount` and `balanceDue = 0` in the database, updating audited financial ledgers automatically.

### Feature E: Addictive Daily Hook & Gamified Conversions
* **Live Gold Market Pulse Ticker & AI Price Forecast (The Hook):**
  * Jewellers monitor gold spot prices constantly. We will place a premium live gold rate line ticker (24K, 22K, 18K) at the top of the Seller dashboard.
  * Embed an **"AI Gold Price Forecast Insight"** panel showing daily advice: *"Gold price rose by +0.84% today. AI recommends locking in ring-inventory stock now."* Jewellers will open this page every single morning just for this tool.
* **One-Click Demo Store Sandbox Setup:** Add a card labeled **"Explore Orivraa Demo Shop (Zero Setup)"** for empty stores. Tapping this instantly hydrates their database with 5 sample gold products, 2 customers, and 3 invoices, allowing them to test the POS and print invoices immediately.
* **Self-Service 14-Day Free Pro Trial:** Add a premium self-activation billing card to activate a Pro subscription for 14 days without requiring credit card inputs.
* **Dopaminergic Confetti Quest Path:** Gamify the checklist with progression quests (e.g. "Do 1st Counter Sale"). Completing a quest fires off a confetti micro-animation and unlocks free **AI Design credits**.

---

## 3. Targeted Codebase Directory & File Manifest

### Backend Modules (NestJS & Prisma)
1. **`apps/api/prisma/schema.prisma`**
   * Review fields for `Invoice` payments, `paymentMethod`, and POS session associations.
2. **`apps/api/src/modules/pos/dto/checkout.dto.ts`**
   * Add structured property validators to `CheckoutDto` (`paymentMethod`, `makingChargesNpr`, `makingChargeRate`, `paymentStatus`).
3. **`apps/api/src/modules/pos/pos.service.ts`**
   * Modify the `checkout()` service method to automatically register POS payments on the invoice and decrement inventory.
4. **`apps/api/src/modules/shops/demo.service.ts` [NEW]**
   * Author `/shops/demo-hydrate` endpoints to populate sandbox products, orders, and customer logs for new signups.

### Shared Client SDK
5. **`apps/web/src/lib/api.ts`**
   * Update `posApi.checkout` signatures and add endpoints for `hydrateDemoStore` and `activateFreeTrial`.

### Frontend Applications (Next.js)
6. **`apps/web/src/app/m/pos/page.tsx`**
   * Sync active carts to `localStorage` on change and load.
   * Send structured payment parameters to `posApi.checkout` instead of hacking stringified variables inside the `notes` field.
7. **`apps/web/src/app/dashboard/shop/pos/page.tsx`**
   * Build the header toggle switch (`isCounterMode`).
   * Design the simple visual catalogue product grid (Left 2/3) and cart payment sidebars (Right 1/3) with automated taxes, making charges, and print/WhatsApp actions.
8. **`apps/web/src/app/dashboard/shop/page.tsx`**
   * Install the daily Gold Market Pulse widget and AI Price Forecast.
   * Embed the One-Click Demo Store Hydrator, self-service 14-Day Trial activator, and the Confetti Quest progression checklist.

---

## 4. Deep Architectural Risk Scan & Regression Mitigations

To guarantee we absolutely do not break any live production services or affect unrelated business modules, we have completed a deep scan of side-effects. Below is our safety grid:

| Risk Area | Potential Side-Effect | Mitigation Plan | Safety Level |
| :--- | :--- | :--- | :--- |
| **Database Migrations** | Adding `paymentMethod` directly to the `Invoice` schema in `schema.prisma` could trigger database locking or migration errors on live production tables. | We will store POS payment methods in the structured `Invoice.notes` or `taxBreakdown` JSON parameters, or implement a safe, backward-compatible optional column `paymentMethod String?` using standard non-blocking Prisma migrations (`prisma migrate dev` with pre-defined defaults). | **High Safety** |
| **Shop Accounting & Analytics** | Automatically logging walk-in POS invoices as `PAID` instead of `ISSUED/UNPAID` will drastically alter dashboard financials (e.g. moving balances from "Outstanding" to "Collected Revenue"). | This is a positive correction! However, to prevent data mismatch with historical orders, the auto-paid payment logging will be *strictly gated* to the POS module checkout. Traditional manual back-office invoices created via `/dashboard/shop/invoices/create` will still follow standard credit terms (remaining `ISSUED` until paid manually). | **High Safety** |
| **Stock Reservation Locks** | Implementing local-cart-to-backend-session sync on mobile devices could result in excessive `StockReservation` entries in Postgres if phone buyers drop off mid-checkout, locking actual stock. | Mobile POS will retain local state during browsing and only write to the backend session when the checkout drawer is opened. Furthermore, the backend Bull queue job `expireOverdueSessions` runs every 10 minutes to automatically purge overdue stock locks, guaranteeing inventory is never permanently hung. | **High Safety** |
| **Receipt Printing Compatibility** | Adding direct thermal printer triggers on PC desktop could trigger script blockers or errors if no physical thermal device is connected to standard web terminals. | We will implement a smart wrapper in `posHardware.ts`. The PC POS will default to displaying a beautiful, clean HTML **Receipt Print Preview sheet** that cashiers can print via standard browser `window.print()` rendering, alongside optional high-speed raw ESC/POS triggers if dedicated configurations are enabled. | **High Safety** |
| **Offline Storage Data Pollution** | If two cashiers share the same mobile terminal under different accounts, local storage carts could bleed into each other, creating billing mix-ups. | We will scope all saved mobile carts using the active user's ID as a key prefix (e.g., `orivraa_cart_${userId}`). On user logout, the corresponding key will be immediately wiped to guarantee customer privacy and perfect cashier separation. | **High Safety** |

---

## 5. Verification & Testing Playbook

### Backend Tests
* Run the NestJS POS spec validations to confirm active checkout mechanics:
  ```powershell
  npm run test apps/api/src/modules/pos/pos.spec.ts
  ```
* Write assertions confirming POS checking out logs an invoice with status `PAID` and matches the structured payment methods.

### Manual UX Test Path
1. **Sandbox Demo Path:**
   * Create a new shopkeeper account.
   * Click **"Explore Orivraa Demo Shop (Zero Setup)"** on the dashboard. Verify gold products populate.
   * Open the **Desktop POS page**, toggle to **Counter Mode**, verify the visual card layout, search an item, select Card, and click Checkout.
   * Verify a receipt layout is rendered and that the DB invoice is successfully marked as paid.
   * Check that completing this milestone triggers free AI credits.

---

## 6. Execution Status

### ✅ COMPLETED
| Feature | Files Modified | Status |
|:--|:--|:--|
| **Feature A: PC Counter Mode Toggle** | `dashboard/shop/pos/page.tsx` | ✅ Done — ERP/Counter mode toggle with visual product grid + cart sidebar |
| **Feature B: PC POS UX Gaps** | `dashboard/shop/pos/page.tsx` | ✅ Done — Tax presets, making charges, payment grid, receipt dialog, WhatsApp sharing |
| **Feature C: Mobile Offline Cart Sync** | `m/pos/page.tsx` | ✅ Done — localStorage cart persistence with user-scoped keys |
| **Feature D: Data Consistency** | `checkout.dto.ts`, `invoice.dto.ts`, `invoices.service.ts`, `pos.service.ts`, `schema.prisma`, `api.ts` | ✅ Done — Structured payment fields, making charges as line items, auto-PAID marking |
| **Feature E1: Gold Market Pulse** | `dashboard/shop/page.tsx` | ✅ Done — Live 24K/22K/18K/Silver rate ticker + AI Price Forecast insight |
| **Feature E2: Gamified Quest System** | `dashboard/shop/page.tsx` | ✅ Done — Progress bar, reward badges, quest completion tracking |
| **Feature E3: One-Click Demo Hydrator** | `shops.controller.ts`, `shops.service.ts`, `api.ts`, `dashboard/shop/page.tsx` | ✅ Done — Added `POST /shops/my-shop/demo-hydrate` to populate demo items and UI triggers |
| **Feature E4: Self-Service 14-Day Trial** | `dashboard/shop/page.tsx` | ✅ Done — Card links to billing for free trial subscription activation |
| **Feature E5: Confetti Micro-Animation** | `dashboard/shop/page.tsx`, `package.json` | ✅ Done — Installed `canvas-confetti` and triggered on quest completion |

### ⏳ PENDING
| Feature | Notes |
|:--|:--|
| **DB Migration** | `npx prisma db push` | ✅ Done — Executed `db push` successfully to the provided Railway DB URL |
