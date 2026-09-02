"use client";

import { useT, useTranslation } from "@/providers/translation-provider";
import type { DriveStep } from "driver.js";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { translateTourSteps } from "./translate-tour-steps";
import { useTourContext } from "./useTourContext";

const SUPPLY_CHAIN_NAV_STEP: DriveStep = {
  element: "[data-tour='supply-chain-nav']",
  popover: {
    title: "Seven views on one page",
    description:
      "Karigar book is the artisan ledger. With Workshop mode on, the same Supply Chain page also has Tower, Jobs, Floor, Metal, QC, and Reports. These are tabs here — not extra sidebar pages.",
    side: "bottom",
    align: "start",
  },
};

function activateShopSettingsPreferencesTab() {
  if (typeof document === "undefined") return;
  document
    .querySelector<HTMLElement>("[data-tour='settings-preferences-tab']")
    ?.click();
}

let preferencesAdvancePending = false;

function waitForTourElement(
  selector: string,
  timeoutMs = 2000,
): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (document.querySelector(selector)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

/** Tour steps keyed by pathname prefix */
const HARDWARE_TOUR_STEPS: DriveStep[] = [
  {
    element: "[data-tour='hardware-receipt-printer']",
    popover: {
      title: "Receipt printer",
      description:
        "Pick how invoices Print. Thermal receipt is a 58/80mm roll (SEZNIK MiniX / Josh, Epson TM). A4 / office is any printer already installed on this computer (Wi-Fi, USB, Windows Devices and Printers). Invoice Print then chooses automatically — use the chevron if you need the other type.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='hardware-detected']",
    popover: {
      title: "Printers on this device",
      description:
        "In the Orivraa Desktop app this list comes from Windows or macOS. Tap a thermal name to use it for short receipts. In the browser you only see paired thermals — open Desktop to list every office printer too.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='hardware-scanner']",
    popover: {
      title: "Barcode scanner",
      description:
        "USB or Bluetooth scanners that type like a keyboard work with no extra driver. Phone camera scanning is available when the browser supports it.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='hardware-label-printer']",
    popover: {
      title: "Jewellery label printer",
      description:
        "Optional Zebra / ZPL tags from Vault & Tags → Print tags. Leave this off to use the browser printable tag sheet.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='hardware-save']",
    popover: {
      title: "Save hardware settings",
      description:
        "Save after pairing. Then open any invoice and tap Print — the subtitle shows Thermal receipt or A4 / office.",
      side: "top",
      align: "center",
    },
  },
];

const INVOICE_DETAIL_TOUR_STEPS: DriveStep[] = [
  {
    element: "[data-tour='invoice-print']",
    popover: {
      title: "Print",
      description:
        "One Print button. If a thermal receipt printer is paired or listed by the Desktop app, it sends a short 58/80mm receipt. Otherwise it opens the A4 / office print dialog. The chevron lets you pick either type, or open printer setup.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='invoice-download-pdf']",
    popover: {
      title: "Download PDF",
      description:
        "Saves an on-demand PDF of this bill (free on every plan). On a phone you also get Share PDF and WhatsApp, which attach the same PDF. On a PC use Download, Email, and SMS instead of the phone share sheet.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='invoice-receipt-printer']",
    popover: {
      title: "Set up a printer",
      description:
        "Opens POS Hardware. Pair a wireless thermal, pick USB, or (in Desktop) tap an installed thermal from Windows/macOS. Shop Settings → Preferences also has this link.",
      side: "top",
      align: "start",
    },
  },
];

const TOUR_STEPS: Record<string, DriveStep[]> = {
  "/dashboard/shop/pos": [
    {
      element: "[data-tour='pos-register-shift']",
      popover: {
        title: "Register and shift",
        description:
          "Choose the counter you are using, then open its shift with the physical opening cash in that drawer. At close, count the drawer and generate the Z-report to compare the counted cash with that shift's cash sales and refunds.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='pos-search']",
      popover: {
        title: "Search Products",
        description:
          "Type a product name or scan a barcode, QR label, or RFID tag to find items quickly.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-cart']",
      popover: {
        title: "Cart",
        description:
          "Items you add appear here. Adjust quantities or remove items before billing.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-checkout']",
      popover: {
        title: "Checkout",
        description:
          "Review the live bill total, choose only payment methods supported by this shop's country, then complete the sale. Cash is received at the counter; card, UPI, wallet, and bank-transfer legs stay Pending until you use Confirm Payment Received. A split sale stays PARTIALLY_PAID until every required leg is received. Every printed bill includes a QR link for bill verification.",
        side: "top",
        align: "end",
      },
    },
    {
      element: "[data-tour='pos-drawer']",
      popover: {
        title: "Cash drawer",
        description:
          "Open the drawer only for a valid counter need. Your shop's manager-PIN rule may require approval. Opening the drawer does not confirm a payment or change an invoice status.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='pos-return-exchange']",
      popover: {
        title: "Returns and exchanges",
        description:
          "Look up the original bill and return only the remaining quantity shown for each item. The historic bill amount determines the refund. Cash can settle immediately; a non-cash reversal remains pending until it is completed, and store credit is available for a later purchase.",
        side: "bottom",
        align: "end",
      },
    },
  ],
  "/dashboard/shop/stock": [
    {
      element: "[data-tour='stock-valuation']",
      popover: {
        title: "Finished Stock Valuation",
        description:
          "View the live dynamic valuation of your finished display and safe stock, calculated dynamically using live gold and silver rates with craft markup.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='stock-location-tree']",
      popover: {
        title: "Shop locations",
        description:
          "Build your own Area → Cabinet → Bin tree (Showcase, Main Safe, trays). Nesting is optional — small shops can use Areas only.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='stock-add-location']",
      popover: {
        title: "Add a location",
        description:
          "Create named places in your shop so every tagged piece has a clear home. Transfer pieces between locations in bulk from the table.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='stock-table']",
      popover: {
        title: "Pieces in this location",
        description:
          "Search by tag, HUID, QR, or RFID/EPC. Multi-select pieces to transfer or open Print tags: choose A4 multi-up, thermal size, copies, QR, barcode, and RFID text. Multi-tag printing is a Pro feature. Use RFID / Barcode stock audit to run a full count with a wedge scanner.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/stock/audit": [
    {
      element: "body",
      popover: {
        title: "RFID / Barcode stock audit",
        description:
          "Start a session and scan every piece with a keyboard-wedge RFID gun or barcode scanner. Complete the audit to see missing stock (shrinkage). Manager PIN may be required to finalize.",
        side: "bottom",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/supply-chain": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-book']",
      popover: {
        title: "Karigar book",
        description:
          "This default tab is the normal small-artisan ledger: vault bullion, issue/return, outstanding metal, wages due, jobs, and gold loss. Factory tabs are a separate Workshop-mode workflow on this same page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-ticker']",
      popover: {
        title: "Live bullion rates",
        description:
          "Gold 24K / 22K / 18K and silver rates used to value vault stock on this page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-procure']",
      popover: {
        title: "Procure bullion",
        description:
          "Use this to record physical bullion added to the workshop vault. It updates available metal for issue; handle supplier invoices, payments, and purchase accounting in the appropriate purchasing or accounting workflow.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='supply-add-karigar']",
      popover: {
        title: "Add Karigar",
        description:
          "Register a goldsmith: workshop name, artisan, location, phone, email, wastage limit, and wage rate.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-add-job']",
      popover: {
        title: "Add Job",
        description:
          "Create a fabrication job on this ledger. Add a karigar first. For factory due dates and priority, use the Jobs tab after Workshop mode is on.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-sample-job']",
      popover: {
        title: "Load demo job",
        description:
          "Creates persistent sample workshop, job, and metal-ledger records in this shop, including a 1000 g issue. Use it only in a test/demo shop or if you intend to keep and reconcile these sample records through the ledger workflow.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-issue-metal']",
      popover: {
        title: "Issue Metal",
        description:
          "Allot raw gold or silver from the vault into a karigar's outstanding float. Returns and scrap come back through the same ledger.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='supply-vault']",
      popover: {
        title: "Vault valuation",
        description:
          "Fiat value of raw 24K gold and silver currently in the strong-room vault — not finished jewellery in Stock Ledger.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-add-material']",
      popover: {
        title: "Add material type",
        description:
          "Add custom metals such as platinum or rose gold to the vault grid. They then appear in procurement and allotment.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='supply-ledger']",
      popover: {
        title: "Artisan Ledger & Settlement",
        description:
          "Manage karigars, issued bullion float, wastage limits, and settlement accounts. Click 'Account' on any karigar to view their unified statement timeline, pay wages, record advances, return metal, or print voucher slips.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-pipeline']",
      popover: {
        title: "Fabrication pipeline",
        description:
          "Active jobs with gold in and out by stage. Open a job card to enter the casting tree. Cancel/archive a job rather than using it as a correction for issued metal; this is workshop metal, not customer billing wastage (jarti).",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-gold-loss-card']",
      popover: {
        title: "Gold Loss report",
        description:
          "Job, tree, and karigar accountability for issued vs returned metal. The Reports tab shows the same workshop math when factory views are on. Invoice jarti never mixes in.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/inventory": [
    {
      element: "[data-tour='inventory-add']",
      popover: {
        title: "Add Product",
        description:
          "Click here to add a new jewellery item with live metal-weight pricing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-search']",
      popover: {
        title: "Search Inventory",
        description: "Filter by name, category, or metal type.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-table']",
      popover: {
        title: "Product List",
        description:
          "All your products. Click a row to edit details, pricing, or stock levels.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/products": [
    {
      element: "[data-tour='inventory-add']",
      popover: {
        title: "Add Product",
        description:
          "Click here to add a single jewellery piece with live metal-weight pricing and an optional storage location. Gold, silver, platinum, and supported palladium purities can use live rates; review the price components before saving.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-desc-generate']",
      popover: {
        title: "Auto description",
        description:
          "Fill from specs and Generate with AI stay locked until Jewellery Type, Metal Type, and Metal Weight are filled. Gross weight is calculated from metal plus gemstone carats. Fill from specs is free. Generate with AI costs 0.25 credits and only asks you to buy more after you click it.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-certificates']",
      popover: {
        title: "Certificates",
        description:
          "Upload a hallmark certificate and a gemstone certificate as a photo or PDF. Walk-in customers and shared catalogue links can open See certificate from the full product page.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-gemstones']",
      popover: {
        title: "Gemstone specification & suggestion",
        description:
          "For diamonds, choose Natural or Lab-grown origin separately from the grading laboratory (GIA, IGI, etc.). Price suggestions use stone type, origin, carat/size, pricing quality and quantity. Color, clarity, cut and certificate details are preserved on the product and copied to the sale-time invoice snapshot.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-pricing']",
      popover: {
        title: "Metal price suggestion",
        description:
          "Use the sparkle button to review a suggestion from the selected metal, purity and metal-only weight in grams. It uses your shop rate when configured, otherwise the current reference market rate. Applying it is deliberate; it does not replace a manual amount until you click the suggestion.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-reprice']",
      popover: {
        title: "Reprice from rates",
        description:
          "When market rates move, preview the authoritative catalog prices before applying them. Metal, making, gemstone, and tax components stay separate; making can stay fixed or recalculate, and prices keep two-decimal currency precision in your shop currency.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-add-set']",
      popover: {
        title: "Add Set",
        description:
          "Build a bridal or matching set with its own SKU. Its price comes from the linked components, then an optional percent or fixed set discount. Components stay hidden from separate sale until you Break set.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-search']",
      popover: {
        title: "Search Inventory",
        description: "Filter by name, category, or metal type.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-table']",
      popover: {
        title: "Product List",
        description:
          "All your products and sets. Sets show a badge with component count. Break a set to sell pieces individually.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/quotes": [
    {
      element: "[data-tour='quotes-list']",
      popover: {
        title: "Walk-in Quotes",
        description:
          "Manage quote requests from walk-in customers. Tap a quote to respond.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='quotes-create']",
      popover: {
        title: "New Quote",
        description:
          "Create a custom quote for any walk-in customer in seconds.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/orders": [
    {
      element: "[data-tour='orders-filters']",
      popover: {
        title: "Filter Orders",
        description:
          "Narrow down by status — Pending, Processing, Shipped, Delivered, etc.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='orders-table']",
      popover: {
        title: "Order List",
        description:
          "Click any order to view details, update status, or print a bill.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/tools/old-gold": [
    {
      element: "[data-tour='exchange-metal']",
      popover: {
        title: "Gold or silver",
        description:
          "Switch metal here. Gold uses the live 24K rate and karat purities. Silver uses the live 999 rate and 999 / 925 / 900 / 835 / 800.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='exchange-rate']",
      popover: {
        title: "Live metal rate",
        description:
          "The rate card follows the selected metal. Refresh pulls the latest shop-currency rate for gold 24K or silver 999.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='exchange-old']",
      popover: {
        title: "Old metal credit",
        description:
          "Enter weight, purity, impurity, and melting loss. The buy-back value is fine metal after deductions times the live rate. Apply the credit to Invoice or POS.",
        side: "right",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/tools": [
    {
      element: "[data-tour='tools-grid']",
      popover: {
        title: "Shop Tools",
        description:
          "6 built-in tools to streamline your jewellery business — click any card to open that tool.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Old Gold / Silver Exchange",
        description:
          "Calculate exchange value when a customer trades old gold or silver for new jewellery. Switch metal on the page and use the live rate for that metal.",
      },
    },
    {
      popover: {
        title: "EMI Calculator",
        description:
          "Show customers an easy installment plan. Enter the price and duration to generate EMI options on the spot.",
      },
    },
    {
      popover: {
        title: "Repair Tracking",
        description:
          "Log jewellery repair, alteration, and service jobs. Track status and notify customers when work is ready.",
      },
    },
  ],
  "/dashboard/shop/settings": [
    {
      element: "[data-tour='settings-tabs']",
      popover: {
        title: "Settings Tabs",
        description:
          "Switch between Profile, Location, Preferences, and Payment Methods to configure every aspect of your shop.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-shop-info']",
      popover: {
        title: "Shop Information",
        description:
          "Set your shop name in English, Nepali, and Hindi. This name appears on invoices, catalogues, and your public store page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-preferences-tab']",
      popover: {
        title: "Preferences Tab",
        description:
          "Under Preferences, configure making charge %, Billing Wastage (jarti) mode and default %, Cash on Delivery, min/max order values, and Workshop mode (factory tabs on Supply Chain). Under Payment Methods, add your bank account for payouts.",
        side: "bottom",
        align: "start",
        onNextClick: (_el, _step, { driver }) => {
          if (preferencesAdvancePending) return;
          preferencesAdvancePending = true;
          activateShopSettingsPreferencesTab();
          void waitForTourElement("[data-tour='settings-workshop-mode']")
            .then((ready) => {
              if (ready) driver.moveNext();
            })
            .finally(() => {
              preferencesAdvancePending = false;
            });
        },
      },
    },
    {
      element: "[data-tour='settings-workshop-mode']",
      popover: {
        title: "Workshop mode",
        description:
          "Turn this on to add Tower, Jobs, Floor, Metal, QC, and Reports as tabs on Supply Chain. The normal Karigar book remains available. The switch checks your current plan's live workshopManufacturing feature; do not rely on a fixed plan name.",
        side: "top",
        align: "start",
      },
      onHighlightStarted: activateShopSettingsPreferencesTab,
    },
    {
      element: "[data-tour='shop-wastage-settings']",
      popover: {
        title: "Billing Wastage Settings",
        description:
          "Set how customer wastage is calculated on invoices: Auto (follow invoice country), Weight %, Metal value %, or Disabled. Leave % blank to use the country default. On Create Invoice, wastage recalculates live as you change the % (same as making). Hover How is this calculated? for the formula tooltip that links here.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-hardware']",
      popover: {
        title: "Receipt / thermal printer",
        description:
          "Under Preferences, open Hardware settings to pair a 58/80mm thermal receipt printer or use A4 / office printers already on this PC. The Orivraa Desktop app lists Windows and macOS printers so invoice Print can tell thermal from office automatically.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/settings/hardware": HARDWARE_TOUR_STEPS,
  "/dashboard/shop/messages": [
    {
      element: "[data-tour='messages-list']",
      popover: {
        title: "Conversations",
        description:
          "All buyer conversations appear here. Click any conversation to open the chat thread. Unread messages are highlighted.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='messages-thread']",
      popover: {
        title: "Message Thread",
        description:
          "Reply to buyers in real-time. All messages are moderated — if a message violates policy you'll see a warning banner with details.",
        side: "left",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-locked": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='workshop-locked']",
      popover: {
        title: "Factory views are locked",
        description:
          "Tower, Jobs, Floor, Metal, QC, and Reports need Workshop mode on in Shop Settings, plus workshopManufacturing on your plan. Use Karigar book until both are on.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-nav-book']",
      popover: {
        title: "Open Karigar book",
        description:
          "This tab always stays available. It is the vault, artisan float, jobs, and gold-loss ledger.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-tower": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-tower']",
      popover: {
        title: "Tower",
        description:
          "Factory exceptions on this same Supply Chain page. It does not replace the Karigar book — switch back with that tab.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-tower']",
      popover: {
        title: "Control tower",
        description:
          "Overdue work, department bottlenecks, gold-loss breaches, QC, and vault gold. This is factory status, not the artisan balance sheet.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-overdue']",
      popover: {
        title: "Overdue jobs",
        description:
          "Start here. Open a job to see its card. Then check waiting-on-next, loss-limit, and unreceived finished goods.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-waiting']",
      popover: {
        title: "Waiting on next department",
        description:
          "Jobs finished in one stage but not yet advanced. Floor is where you enter gold out and tap Advance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-loss']",
      popover: {
        title: "Loss-limit breaches",
        description:
          "Physical workshop metal above the allowed %. This is not invoice jarti. Open Reports for the full gold-loss table.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-qc']",
      popover: {
        title: "QC pending",
        description:
          "Jobs waiting for inspect. The QC tab is where you Approve, Rework, or Reject — that does not write invoices.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-load']",
      popover: {
        title: "Department load",
        description:
          "Open jobs by current stage. Tap a badge to open Floor with that department filter. Departments are filters, not extra sidebar pages.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-jobs": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-jobs']",
      popover: {
        title: "Jobs",
        description:
          "Factory work orders. The Karigar book also lists jobs; this tab is for due date, priority, qty, and the job card.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-jobs']",
      popover: {
        title: "Work orders",
        description:
          "Manufacturing jobs assigned to a karigar. Floor only advances the current stage — it does not create jobs.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-jobs-create']",
      popover: {
        title: "New job",
        description:
          "Requires a karigar. Set product, due date, priority, and qty. Issue metal from the Metal tab after you create it.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-jobs-list']",
      popover: {
        title: "Job list",
        description:
          "Open a product name for the job card: casting tree, stage weights, and Receive finished goods into inventory.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-job": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='workshop-job-card']",
      popover: {
        title: "Job card",
        description:
          "One work order: artisan, stage, due date, size, purity, and notes. Use All jobs to return to the Jobs tab.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-casting-tree']",
      popover: {
        title: "Casting tree",
        description:
          "Enter issued gold, finished pieces, sprue/button, and recoverable scrap. Actual loss and unexplained loss (above the allowed %) calculate here.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='workshop-receive-fg']",
      popover: {
        title: "Receive finished goods",
        description:
          "After QC approves the work, receive the finished goods into inventory. This creates or updates stock and can keep an optional SKU; it does not create a customer invoice or price the item for sale.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-floor": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-floor']",
      popover: {
        title: "Floor",
        description:
          "Department queues on this page. Casting, filing, setting, polish, and QC are filters — not separate routes.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-floor']",
      popover: {
        title: "Floor queues",
        description:
          "Advance a job by transferring a gold-out weight to the next department. Do not tick checkboxes — enter grams and tap Advance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-floor-depts']",
      popover: {
        title: "Department filters",
        description:
          "All, or one stage. The URL uses ?view=floor&dept= so you can bookmark a bench. Tower load badges open the same filters.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-floor-queue']",
      popover: {
        title: "Gold out and Advance",
        description:
          "Gold in is what this stage received. Type gold out, then Advance. That weight becomes the next stage's gold in.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-metal": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-metal']",
      popover: {
        title: "Metal",
        description:
          "Factory metal movements. Same physical vault as the Karigar book — unexplained loss never returns to the vault.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-metal']",
      popover: {
        title: "Metal ledger",
        description:
          "Issue, return finished or sprue, scrap, dust, or adjust inbound bullion. Optional lot id starts genealogy later.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-metal-vault']",
      popover: {
        title: "Vault balances",
        description:
          "Grams on hand by metal key. Karigar book valuation uses live rates; this grid is the physical weight.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-metal-form']",
      popover: {
        title: "Record movement",
        description:
          "Pick type, weight in grams, karigar, and optional job. Post movement writes the same ledger the Karigar book uses.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-qc": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-qc']",
      popover: {
        title: "QC",
        description:
          "Inspect queue for jobs in the QC stage. Approve, rework, or reject — this is not Create Invoice.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-qc-page']",
      popover: {
        title: "QC inspect",
        description:
          "Approve is the required next step before receiving finished goods. Rework sends the job back to filing; Reject ends the job without creating an invoice. None of these write customer invoices.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-qc-queue']",
      popover: {
        title: "Approve, Rework, Reject",
        description:
          "Add a reason for rework or reject. Open the product name for the full job card if you need the casting tree.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/supply-chain#workshop-reports": [
    SUPPLY_CHAIN_NAV_STEP,
    {
      element: "[data-tour='supply-nav-reports']",
      popover: {
        title: "Reports",
        description:
          "Workshop gold-loss tables. The Karigar book also shows this report at the bottom of that tab.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='workshop-reports']",
      popover: {
        title: "Workshop reports",
        description:
          "Gold loss by job, tree, and karigar. Yield, wages, and ageing reports come later. This is workshop metal, not invoice jarti.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-gold-loss']",
      popover: {
        title: "Gold loss table",
        description:
          "Issued vs finished vs sprue vs recoverable. Unexplained is anything above the allowed %. Print from the Karigar book card if you need a walkthrough sheet.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/catalogues": [
    {
      element: "[data-tour='catalogues-create']",
      popover: {
        title: "Create Catalogue",
        description:
          "Build a shareable digital catalogue to send on WhatsApp, email, or social media. Choose which products to include.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='catalogues-grid']",
      popover: {
        title: "Your Catalogues",
        description:
          "Each catalogue has a public link. Share it with customers and track how many people viewed it. You can have public or private catalogues.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/rfqs": [
    {
      element: "[data-tour='rfqs-filters']",
      popover: {
        title: "Filter Requests",
        description:
          "Switch between All, Online (custom jewellery requests from your marketplace listing), and Walk-in (in-person customer requests).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='rfqs-table']",
      popover: {
        title: "RFQ Requests",
        description:
          "Each row is a custom jewellery request from a buyer with their budget, design description, and deadline. Click any row to send a price quote back.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/invoices/create": [
    {
      element: "[data-tour='invoice-create-country']",
      popover: {
        title: "Country & Tax",
        description:
          "Select the country for this invoice. Tax rates auto-apply per category, and this also controls which Tax Reports tab the bill appears under (India GSTR, Nepal, UAE VAT, etc.). In Nepal, the active 0.5% Skill Promotion Fee replaces the old 2% luxury tax. Defaults to your shop country; change it for export bills. Changing country recalculates tax on existing lines.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-create-customer']",
      popover: {
        title: "Customer Details",
        description:
          "Type the customer's phone number to search your existing customer database — it auto-fills name, address, and GST/PAN. For B2B invoices enter the customer's GSTIN or VAT number so the tax ID prints on the bill. Walk-in customers can be added without a phone.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-create-items']",
      popover: {
        title: "Line Items",
        description:
          "Add each jewellery item manually, or click Add from catalog to pull an available product (stock is deducted when you create the invoice). Enter metal type, weight, metal cost, gemstones, and making charge. Switch weight units (grams, tola, laal) and use Live metal autofill for supported gold, silver, platinum, or palladium rates. Catalog gemstone specifications—including origin, color, clarity, cut, carat/size and certificate details—are copied as the immutable sale-time snapshot; live repricing changes only the stone price.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-add-from-catalog']",
      popover: {
        title: "Add from catalog",
        description:
          "Search your Product Catalog and add available pieces with their metal, making, gemstone, certificate, and pricing details. Review an imported set discount and any live-rate recalculation before creating the bill. Each piece can appear once per invoice.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-create-totals']",
      popover: {
        title: "Invoice Totals, Making & Wastage",
        description:
          "Subtotal is based on metal and gemstones. Set Making Charge here (% or amount) — this is the only making control. Below it, one Wastage % field that recalculates live: catalog/walk-in imports show e.g. '5% from catalog' and if you change to 6% the caption shows '+1% adjusted' with the amount. Manual invoices just enter %. Tax breakdown and grand total appear underneath.",
        side: "top",
        align: "end",
      },
    },
  ],
  "/dashboard/shop/invoices/settings": [
    {
      element: "[data-tour='invoice-settings-branding']",
      popover: {
        title: "Shop Branding",
        description:
          "Set the shop name, logo, and tagline that appear on every printed bill. Upload a PNG or JPG logo (max 5 MB). The name here overrides your registered shop name on the bill header.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-settings-layout']",
      popover: {
        title: "Layout & Visibility",
        description:
          "Control which fields (address, GSTIN, licence number, footer, terms) appear on your printed invoice, and whether they print at the top or bottom. Toggle any field off to hide it from the bill. The live preview on the right updates as you change these.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-settings-templates']",
      popover: {
        title: "Bill templates",
        description:
          "The strip at the bottom is a row of bill looks — Classic (gold diya frame), Royal (navy with gold crown), Compact (dashed gold gem), Ornate (wine lotus on cream), and Minimal (gold kalash corners). Click one to preview it instantly. Save Settings to use that layout on printed bills and shared PDFs.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/invoices": [
    {
      element: "[data-tour='invoices-create']",
      popover: {
        title: "Create Invoice",
        description:
          "Generate GST/VAT-ready invoices with automatic tax calculation for India, Nepal, Sri Lanka, UAE, UK, EU, and US. Supports partial payments too.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='invoices-stats']",
      popover: {
        title: "Invoice Summary",
        description:
          "Track total invoices issued, revenue collected, outstanding amounts, and count of paid invoices — all at a glance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoices-table']",
      popover: {
        title: "Invoice List",
        description:
          "View all invoices with status (Issued / Paid / Partial / Overdue / Voided). Click any invoice to Print (thermal receipt or A4), Download PDF, Email, or share on a phone.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "💡 Invoice Settings",
        description:
          "Want to change what your printed bill looks like? Go to Invoice Settings (top-right gear icon) to add your shop logo, GSTIN, footer note, and control which fields appear on the bill. Pair a receipt printer from Shop Settings → Hardware, or from the Receipt printer link on the invoice.",
      },
    },
  ],
  "/dashboard/shop/invoices/": INVOICE_DETAIL_TOUR_STEPS,
  // ─── Tax Reports: generic fallback (shown when no country tab active yet) ───
  "/dashboard/shop/tax-reports": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "Choose the month to generate your tax filing report. Reports are based on invoices issued in that month.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "Country Tax Tabs",
        description:
          "Reports are organised per country — IN (GST), NP (VAT), LK (output VAT), AE (UAE VAT), GB (MTD), EU (OSS), US (state tax). Switch tabs to see country-specific data and filing details.",
        side: "bottom",
        align: "start",
      },
    },
    {
      popover: {
        title: "Download & Share",
        description:
          "Export your tax report as CSV or PDF for your accountant. You can also share a secure, time-limited link directly with your CA or tax adviser.",
      },
    },
  ],

  // ─── Tax Reports: India ───────────────────────────────────────────
  "/dashboard/shop/tax-reports#IN": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "Choose the month for your GST report. All India invoices in that month are included.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "India (GST) Tab",
        description:
          "You are on the India panel. It shows your GSTR-3B summary, HSN-wise breakdown, and lets you download GSTR-1 CSV or Tally XML for filing with the GSTN portal.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='india-gstr3b']",
      popover: {
        title: "GSTR-3B Summary",
        description:
          "Your monthly GST summary: total taxable sales, IGST (inter-state), CGST + SGST (intra-state), and net tax liability. Gold jewellery attracts 3% GST on metal value; making charges are taxed at 18%.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='india-hsn']",
      popover: {
        title: "HSN-wise Breakdown",
        description:
          "Every product sold is mapped to its HSN code. HSN 7113 covers gold jewellery, 7116 covers gems and pearls. This table is required for GSTR-1 if your annual turnover exceeds ₹5 crore.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='india-downloads']",
      popover: {
        title: "Downloads: GSTR-1, HSN & Tally",
        description:
          "Export GSTR-1 CSV to upload on the GSTN portal, HSN summary CSV for your CA, or Tally XML to import directly into Tally ERP. Available on Pro plan.",
        side: "top",
        align: "start",
      },
    },
    {
      popover: {
        title: "Share with CA",
        description:
          'Click "Share with CA" on any card to generate a secure, 7-day read-only link you can send to your Chartered Accountant for GST filing review.',
      },
    },
  ],

  // ─── Tax Reports: Nepal ───────────────────────────────────────────
  "/dashboard/shop/tax-reports#NP": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "Choose the Nepali fiscal month. Nepal follows BS (Bikram Sambat) calendar — the period shown maps to the corresponding BS month for IRD filing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "Nepal (VAT) Tab",
        description:
          "You are on the Nepal panel. Nepal taxes jewellery with 0.5% skill promotion fee on metal & making charges and 13% VAT on gemstones & services.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='nepal-audit-tabs']",
      popover: {
        title: "Monthly Return vs Yearly Audit",
        description:
          '"Monthly Return" shows VAT & skill promotion fee for the selected month for your regular IRD submission. "Yearly Audit" shows a full 12-month breakdown required if sales exceed the NPR 1 crore threshold.',
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='nepal-audit-threshold']",
      popover: {
        title: "IRD Audit Threshold",
        description:
          "The progress bar tracks your annual sales against the NPR 1 crore (10,000,000) IRD audit threshold. If sales exceed this limit, a formal audit filing with IRD Nepal is required — the bar turns red as a warning.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='nepal-audit-table']",
      popover: {
        title: "Month-by-Month Breakdown",
        description:
          "Every month of the Nepali fiscal year: invoice count, total sales in NPR, 0.5% skill promotion fee on metals & making charges, and 13% VAT on gemstones & services. Use the year selector (‹ ›) to view previous years.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Share with CA / Tax Adviser",
        description:
          "Generate a secure 7-day link for your IRD-registered tax adviser to review the yearly audit report without giving them access to your full dashboard.",
      },
    },
  ],

  // ─── Tax Reports: UAE ─────────────────────────────────────────────
  "/dashboard/shop/tax-reports#AE": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "Choose the filing period. UAE VAT is filed quarterly with the FTA — select the month within the quarter you are reviewing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "UAE (VAT) Tab",
        description:
          "You are on the UAE panel. UAE applies a flat 5% VAT on most goods and services. Precious metals sold as financial instruments may be zero-rated.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='uae-vat201']",
      popover: {
        title: "VAT 201 Summary (FTA)",
        description:
          "Your VAT 201 form data: standard-rated sales, zero-rated supplies, exempt sales, input tax recoverable, and net VAT payable to the FTA (Federal Tax Authority). Use this to complete your EmaraTax submission.",
        side: "top",
        align: "start",
      },
    },
    {
      popover: {
        title: "FTA Filing & Share",
        description:
          "Export or share the VAT 201 summary with your UAE-registered tax agent. Direct EmaraTax API submission is on the roadmap (Phase C).",
      },
    },
  ],

  // ─── Tax Reports: UK ──────────────────────────────────────────────
  "/dashboard/shop/tax-reports#GB": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "UK MTD VAT is filed quarterly. Select any month within the VAT quarter to preview your 9-box return figures.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "UK (MTD) Tab",
        description:
          "You are on the UK panel. HMRC's Making Tax Digital (MTD) requires digital VAT records and electronic submission via compatible software. UK standard VAT rate is 20%.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='uk-mtd']",
      popover: {
        title: "MTD 9-Box VAT Return",
        description:
          "The 9 boxes map directly to the HMRC MTD return: Box 1 (VAT due on sales), Box 4 (VAT reclaimed on purchases), Box 5 (net VAT to pay/reclaim), and Boxes 6-9 (turnover and input totals). Share with your accountant before submitting.",
        side: "top",
        align: "start",
      },
    },
    {
      popover: {
        title: "HMRC Submission",
        description:
          "Direct HMRC MTD API submission requires OAuth authorisation with HMRC. This is planned for Phase C — for now export the data and use bridging software or your accountant.",
      },
    },
  ],

  // ─── Tax Reports: EU ──────────────────────────────────────────────
  "/dashboard/shop/tax-reports#EU": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "EU OSS (One-Stop Shop) is declared quarterly. Select any month to see that period's cross-border sales breakdown.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "EU (OSS) Tab",
        description:
          "You are on the EU panel. The OSS scheme lets you declare and pay VAT for all EU countries in a single quarterly return filed in your home member state. Each country has its own VAT rate.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='eu-oss']",
      popover: {
        title: "OSS by Destination Country",
        description:
          "Each row is an EU member state where you have sales. The table shows invoice count, net sales, applicable local VAT rate, and VAT amount due for that country. Total this up for your quarterly OSS declaration.",
        side: "top",
        align: "start",
      },
    },
    {
      popover: {
        title: "Export & Filing",
        description:
          "Download the OSS CSV to import into your home-state tax portal. Direct OSS portal integration is planned for Phase C.",
      },
    },
  ],

  // ─── Tax Reports: US ──────────────────────────────────────────────
  "/dashboard/shop/tax-reports#US": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description:
          "Choose the month to see US sales tax collected by state for that period.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "US (Sales Tax) Tab",
        description:
          "You are on the US panel. Sales tax in the USA is state-by-state — rates range from 0% (Oregon, Montana) to over 10% in some counties. Economic nexus rules apply if you exceed a state's revenue or transaction threshold.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='us-state-tax']",
      popover: {
        title: "Sales Tax by State",
        description:
          "Each row is a US state where you have sales: invoice count, net sales, and total sales tax collected. States where you have economic nexus (typically $100k revenue or 200 transactions) require separate state tax registration and filing.",
        side: "top",
        align: "start",
      },
    },
    {
      popover: {
        title: "TaxJar / Avalara & Filing",
        description:
          "Export the CSV for your accountant or import into TaxJar/Avalara for automated multi-state filing. Real-time rooftop tax rates and auto-filing integration are on the roadmap.",
      },
    },
  ],
  "/dashboard/shop/customers": [
    {
      element: "[data-tour='customers-search']",
      popover: {
        title: "Search Customers",
        description:
          "Find any customer instantly by name, phone number, or email. Search works across both registered (online) and walk-in customers.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='customers-grid']",
      popover: {
        title: "Customer Directory",
        description:
          "Each card shows order count, RFQ count, total spend, and last activity. Click a customer to see their full order history and contact details.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/desktop": [
    {
      element: "[data-tour='desktop-app']",
      popover: {
        title: "Desktop App",
        description:
          "Download the Orivraa desktop app for faster access, offline mode, and system-level notifications. Available for Windows and macOS.",
        side: "bottom",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/analytics": [
    {
      element: "[data-tour='analytics-period']",
      popover: {
        title: "Time Period",
        description:
          "Switch between 7 days, 30 days, 90 days, or 1 year to see how your business is trending over time.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='analytics-stats']",
      popover: {
        title: "Key Metrics",
        description:
          "Your total revenue, order count, RFQ win rate, and average customer rating — compared to the previous period so you can see growth.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-tabs']",
      popover: {
        title: "Deep Dive",
        description:
          "Switch between Revenue (breakdown by direct vs custom orders), Orders, RFQs (win rate), and Customers (new vs returning) for detailed charts.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/engagement": [
    {
      element: "[data-tour='engagement-tier']",
      popover: {
        title: "Seller Tier",
        description:
          "Your tier (Standard → Silver → Gold → Elite) unlocks advanced features and boosts your visibility in search results. The progress bar shows what metrics you need to reach the next tier.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='engagement-health']",
      popover: {
        title: "Health Score",
        description:
          "Your overall shop health grade (A to F) is calculated across profile completeness, order performance, verification status, and customer engagement.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='engagement-tabs']",
      popover: {
        title: "Milestones & Growth",
        description:
          "Complete milestones to earn rewards and unlock features. Track your RFQ performance, referral stats, KYC status, and onboarding progress from the tabs.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/reviews": [
    {
      element: "[data-tour='reviews-platforms']",
      popover: {
        title: "Platform Reviews",
        description:
          "Leaving a review on SaaSHub, G2, or Crunchbase helps more jewellers discover Orivraa. Submit the public review URL and a screenshot together. After admin verification you earn 1 month of Pro.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/referrals": [
    {
      element: "[data-tour='referrals-invite']",
      popover: {
        title: "Invite Other Jewellers",
        description:
          "Enter a colleague's email or copy your register link. Referral commissions are held in your referral wallet. Depending on the current referral policy, eligible commission may be applied to an Orivraa subscription invoice or made available for the supported payout or Pro conversion options. Dashboard → Referrals shows the current rule for your account. Review & Earn is a separate review-reward programme.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='referrals-list']",
      popover: {
        title: "Your Referrals",
        description:
          "Track every jeweller you've invited — see whether they've signed up, your reward status, and your unique referral code to share manually.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='referrals-bank']",
      popover: {
        title: "Leftover cash-out",
        description:
          "Commission first reduces your next Orivraa invoice. Save bank details, then request an eligible leftover balance as a bank payout; it remains pending until processed. You can also convert eligible leftover to Pro months. No Stripe Connect account is needed.",
        side: "top",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/billing": [
    {
      element: "[data-tour='billing-tabs']",
      popover: {
        title: "Billing Sections",
        description:
          "My Plan shows your current subscription. AI Credits tracks your usage balance. Available Plans lets you compare and upgrade your subscription.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='billing-plan']",
      popover: {
        title: "Your Current Plan",
        description:
          "See your plan name, billing cycle (monthly/annual), status, and feature limits. You can cancel or change your plan here at any time.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='billing-credits']",
      popover: {
        title: "AI Credits",
        description:
          "Pro+ includes monthly AI credits. Product descriptions cost 0.25 credits. One design preview image costs 1 credit; generating 5 Design Studio variations costs 5 credits. Buy more from this tab if the balance runs out. Failed generations are refunded. The AI assistant chat and in-app tooltips stay free on every plan.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/profile": [
    {
      element: "[data-tour='profile-info']",
      popover: {
        title: "Personal Information",
        description:
          "Your name, email, and phone number. Keep this up to date — your email is used for billing receipts and your phone for 2FA and customer calls.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='profile-tabs']",
      popover: {
        title: "Profile Sections",
        description:
          "Personal Info has your contact details. Preferences lets you set language and notification settings. Security is where you change your password or enable 2-factor authentication.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/support": [
    {
      element: "[data-tour='support-new']",
      popover: {
        title: "Raise a Ticket",
        description:
          "Can't find an answer in the docs? Open a support ticket and the Orivraa team will respond within 24 hours. Include screenshots for faster resolution.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='support-tickets']",
      popover: {
        title: "Your Tickets",
        description:
          "Track the status of all your support requests here (Open, In Progress, Resolved). Click any ticket to continue the conversation with the support team.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop": [
    {
      element: "[data-tour='dashboard-mode-toggle']",
      popover: {
        title: "Workspace Mode Toggle",
        description:
          "Located at the top-right of your sidebar header. Switch between Easy Mode (simplifies the navigation down to 10 core daily POS & invoicing links) and Advanced Mode (expands the sidebar to expose all 21+ advanced enterprise ERP tools). Your layout preference is automatically remembered.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='quick-estimator']",
      popover: {
        title: "Quick Gold Estimator",
        description:
          "A floating gold bar button at the bottom-right corner of the window. Click it (or press Alt+E) to toggle a real-time price calculator. Select gold purity (24K, 22K, 18K, 14K), type the weight in grams, enter optional making charges, and get an instant cost estimate dynamically synced with the live spot market rate.",
        side: "right",
        align: "end",
      },
    },
    {
      element: "[data-tour='dash-live-rates']",
      popover: {
        title: "Live Market Pulse Card",
        description:
          "Displays live spot market rates for 24K, 22K, 18K gold and silver per gram, synced every 10 minutes. It includes a daily percentage change index badge and a real-time AI advisory insight recommending whether to restock or hedge based on active commodities price momentum.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-quests']",
      popover: {
        title: "Setup Quests Roadmap",
        description:
          "A gamified progress card tracking your setup milestones, including shop profiling, inventory seed uploads, and KYC compliance. Each quest displays the premium reward earned on completion, along with an action button that redirects you directly to the relevant settings page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-stats']",
      popover: {
        title: "Today's Key Metrics Overview",
        description:
          "At-a-glance KPI cards tracking today's total sales revenue, active order counts, pending custom marketplace requests (RFQs), and your shop's average customer review score. Clicking any card takes you instantly to its complete ledger details.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-quick-actions']",
      popover: {
        title: "Quick Actions Console",
        description:
          "Jump instantly into key modules. Launch the Quick Bill POS screen, open the Add Product inventory form, or create a walk-in Quote with single-click shortcut buttons designed to speed up customer checkout flows.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-orders']",
      popover: {
        title: "Recent Orders Monitor",
        description:
          "Tracks active customer transactions in real-time, showing order ID, fulfillment status, and final amount. Click any transaction row to open details or print invoices.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='dash-rfqs']",
      popover: {
        title: "Custom RFQ Request Inbox",
        description:
          "Displays custom design requests sent by marketplace shoppers. View their target budget, deadline, and jewelry type specifications. Tap 'Respond' to submit a customized price quote and lock in the deal.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='dash-low-stock']",
      popover: {
        title: "Low Stock Inventory Alerts",
        description:
          "Flags items that have dropped below your specified safety threshold. Restock directly from this ledger card to avoid running out of display items.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='dash-supply-chain']",
      popover: {
        title: "Karigar & Bullion Supply Chain Tracker",
        description:
          "Your unified manufacturing workspace at Supply Chain. Karigar book is the artisan ledger. With Workshop mode on, the same page adds Tower, Jobs, Floor, Metal, QC, and Reports as tabs.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='support-bot']",
      popover: {
        title: "AI Support & Shop Intelligence Assistant",
        description:
          "Click the amber chat bubble anytime in the bottom-right corner to talk with your context-aware AI. Since it has access to your shop data, you can ask questions like 'How many invoices are unpaid?' or 'What were my sales this month?' to get instant answers.",
        side: "left",
        align: "end",
      },
    },
    {
      popover: {
        title: "💡 Need Help Anytime?",
        description:
          "You can click the floating '?' Help Button in the bottom-right corner of the screen at any point to restart this guide or get in-context assistance on any page you visit!",
      },
    },
  ],

  /* ── Mobile POS (m.orivraa.com) ── */
  "/m/pos": [
    {
      element: "[data-tour='m-gold-ticker']",
      popover: {
        title: "Live Gold Price Ticker",
        description:
          "A header banner displaying live spot market prices for 24K, 22K, 18K gold and silver per gram. Automatically synced every 10 minutes to guarantee accurate walk-in pricing on the retail floor.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-pos-search']",
      popover: {
        title: "Intelligent Search & Filter",
        description:
          "Type here to perform an instant search by product name, SKU, or category to filter your store catalogue dynamically. Tap to select or clear.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-pos-grid']",
      popover: {
        title: "Product Grid & Detail Sheets",
        description:
          "Displays your catalog cards. Tapping any card opens a sheet with metal, wastage, gemstones, making charges, and the full calculation. Use Show full details to customer for a full-screen view you can hand to the buyer. Tapping the orange '+' button adds the item to the bill.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-pos-bill-btn']",
      popover: {
        title: "View Bill & Finalize Checkout",
        description:
          "Visible when items are in your cart. Displays the total bill amount and cart count. Tapping this launches the Cart Drawer, where you can enter customer CRM details (phone/name) for invoice linking, view VAT/GST tax splits, select standard payment methods, and finalize checkout.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-bottom-nav']",
      popover: {
        title: "Bottom Navigation bar",
        description:
          "Switch seamlessly between POS billing, Walk-in Quotes, Orders list, and your CRM Customers list. Tapping '⋯ More' unlocks advanced tools like live Rate Card templates, Tax reports, Repairs logs, and Savings Schemes.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='support-bot']",
      popover: {
        title: "AI Assistant Chat",
        description:
          "A floating helper button to ask the AI assistant about mobile-specific features, billing calculations, gold savings installment logs, or WhatsApp message sharing rules.",
        side: "left",
        align: "end",
      },
    },
    {
      popover: {
        title: "💡 Need Help on Mobile?",
        description:
          "You can tap the floating '?' Help Button in the bottom-right corner of the screen at any point to restart this guide or get in-context assistance on any mobile page you visit!",
      },
    },
  ],
  "/m/products/": [
    {
      element: "[data-tour='m-product-breakdown']",
      popover: {
        title: "Full piece calculation",
        description:
          "Hand this screen to the customer. It shows metal, weight, wastage (jarti), making charges, each gemstone, tax, and the estimated bill — the same figures stored when the piece was added. This is a shop floor view, not the public marketplace.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/quotes": [
    {
      element: "[data-tour='m-quote-customer']",
      popover: {
        title: "Customer Details",
        description:
          "Enter the customer's name and phone number. Phone is used to send the quote via WhatsApp.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-quote-items']",
      popover: {
        title: "Quote Line Items",
        description:
          "Add each item with description, purity (24K/22K/18K/14K), weight in grams, and making charges. Price is auto-calculated using live gold rate.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-quote-total']",
      popover: {
        title: "Quote Total",
        description:
          "Subtotal, 3% tax, and grand total are calculated automatically. The gold rate used is shown for transparency.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "WhatsApp Share",
        description:
          "After saving the quote, you can share a formatted quote message directly to the customer's WhatsApp with a single tap.",
      },
    },
  ],
  "/m/rate-card": [
    {
      element: "[data-tour='m-rate-card']",
      popover: {
        title: "Today's Rate Card",
        description:
          "Live gold and silver rates for your shop — 24K, 22K, 18K, 14K, and silver per gram.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-rate-whatsapp']",
      popover: {
        title: "Share on WhatsApp",
        description:
          "Tap to share today's rate card as a formatted text message to any WhatsApp contact. Great for sending to regular customers every morning.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-rate-refresh']",
      popover: {
        title: "Refresh Rates",
        description:
          "Pull the latest rates from the market. Rates auto-refresh when you open this page.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/tax": [
    {
      element: "[data-tour='m-tax-country']",
      popover: {
        title: "Country Selector",
        description:
          "Switch between Nepal VAT and India GST. The report format changes accordingly.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-tax-period']",
      popover: {
        title: "Select Month",
        description:
          "Choose any month in the past year to generate that period's tax summary.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-tax-stats']",
      popover: {
        title: "Tax Summary",
        description:
          "Total sales, tax collected, taxable amount, and invoice count for the selected period.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-tax-download']",
      popover: {
        title: "Download Reports",
        description:
          "Download GSTR-1 CSV, GSTR-3B JSON (India), Tally XML, or Nepal VAT JSON — ready to submit or share with your CA.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/orders": [
    {
      element: "[data-tour='m-orders-filter']",
      popover: {
        title: "Filter by Status",
        description:
          "Tap All, Pending, Processing, or Ready to filter today's orders. Tap any order card to open full details.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-orders-list']",
      popover: {
        title: "Today's Orders",
        description:
          "All orders placed today. Tap a card to manage the order — update status, print bill, or contact the customer.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/invoices/create": [
    {
      element: "[data-tour='mobile-invoice-create']",
      popover: {
        title: "Full jewellery invoice",
        description:
          "Create bills with metal weight, making charge, wastage, and tax — same accuracy as desktop. No flat-amount shortcuts.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='invoice-add-from-catalog']",
      popover: {
        title: "Add from catalog",
        description:
          "Pull stocked pieces with live rates. Catalog items commit stock when the invoice is created.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-add-from-quote']",
      popover: {
        title: "Import a shop quote",
        description:
          "Convert a walk-in quote into an invoice with metal, making, and wastage already filled.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-tax-breakdown']",
      popover: {
        title: "Tax preview",
        description:
          "Review metal, making, gemstone, and wastage tax before creating. The server recalculates authoritatively on submit. After Create you land on the invoice — tap Print (thermal or A4) or Share PDF / WhatsApp.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/settings": [
    {
      element: "[data-tour='m-settings-hardware']",
      popover: {
        title: "POS Hardware",
        description:
          "Tap here to pair a thermal receipt printer, barcode scanner, or jewellery label printer. Invoice Print then sends to that printer automatically.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/m/settings/hardware": HARDWARE_TOUR_STEPS,
  "/m/invoices/": INVOICE_DETAIL_TOUR_STEPS,
  "/m/repairs": [
    {
      element: "[data-tour='m-repairs-list']",
      popover: {
        title: "Repair Jobs",
        description:
          "All logged repair and alteration jobs. Filter by Active to see only in-progress work.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-repairs-log']",
      popover: {
        title: "Log New Job",
        description:
          "Tap '+' to log a new repair — enter customer details, item description, issue, estimated cost, and ready date.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Advance Status",
        description:
          "Tap 'Advance' on a job card to move it through: Received → Diagnosing → In Repair → Ready → Delivered.",
      },
    },
    {
      popover: {
        title: "WhatsApp Notify",
        description:
          "Tap the WhatsApp button on any job to instantly send the customer a status update message.",
      },
    },
  ],
  "/m/customers": [
    {
      element: "[data-tour='m-customers-search']",
      popover: {
        title: "Search Customers",
        description:
          "Type a name or phone number to find any customer in your CRM.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='m-customers-list']",
      popover: {
        title: "Customer Cards",
        description:
          "Each card shows the customer's order count and total spend. Tap to open their full profile.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Customer Profile",
        description:
          "Profile drawer shows stats (orders, total spent, avg order, last visit), recent order history, and a WhatsApp message button.",
      },
    },
  ],
  "/m/savings": [
    {
      element: "[data-tour='m-savings-header']",
      popover: {
        title: "Savings Scheme Overview",
        description:
          "See total active members and the total gold savings pool at a glance.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-savings-list']",
      popover: {
        title: "Member Cards",
        description:
          "Each card shows installments paid, progress towards completion, and saved/bonus/payout amounts. Tap 'Record Payment' to log an installment.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='m-savings-enroll']",
      popover: {
        title: "Enroll New Member",
        description:
          "Tap '+' to enroll a customer in a new gold savings scheme — set type (Daily/Weekly/Monthly), installment amount, and duration.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Payout Calculator",
        description:
          "The enrollment form auto-calculates the payout amount based on installments, bonus, and current gold rate so you and the customer know the expected final payout.",
      },
    },
  ],
  "/dashboard/admin/users": [
    {
      element: "[data-tour='admin-users-stats']",
      popover: {
        title: "Live Activity Stats",
        description:
          "Monitor real-time platform engagement including how many users are 'Online Now' and the average session duration for today.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='admin-users-table']",
      popover: {
        title: "User Directory & Risk",
        description:
          "View all users. Pay attention to the 'Last Seen' column for activity tracking and the 'Risk Score' badge indicating potential security or policy issues.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='admin-users-bulk']",
      popover: {
        title: "Bulk Actions",
        description:
          "Select multiple users to perform bulk operations like suspending accounts, exporting data to CSV, or sending mass messages.",
        side: "left",
        align: "center",
      },
    },
    {
      popover: {
        title: "Deep Insights Panel",
        description:
          "Click the 👁 eye icon on any user to open the sliding panel. It features 5 tabs: Profile, Activity (with active sessions), Shops, Audit Log, and Direct Messaging (with AI compose).",
      },
    },
  ],
  "/dashboard/admin/offers": [
    {
      element: "[data-tour='offers-campaigns']",
      popover: {
        title: "Recovery and festival offers",
        description:
          "Switch between the 50-day recovery campaign and festival campaigns. Festival offers have their own sale window, complimentary Pro days, discount, subject, and message.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='offers-audience']",
      popover: {
        title: "Choose recipients",
        description:
          "Select one shopkeeper or every visible row. Filters include pending, unverified, paid, and no-shop accounts; suppressed marketing addresses stay protected.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='offers-schedule']",
      popover: {
        title: "Schedule delivery",
        description:
          "Send now, at each recipient's next local 10 AM, or at a custom time. The time in a recipient row overrides the campaign schedule for that email.",
        side: "left",
        align: "center",
      },
    },
  ],
  "/dashboard/admin/crash-reports": [
    {
      element: "[data-tour='crash-reports-header']",
      popover: {
        title: "Crash Reports",
        description:
          "Errors other users actually saw: red toasts, page crashes, and server/network failures are captured automatically. Check this page daily so you can fix issues you never hit yourself.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='crash-reports-alerts']",
      popover: {
        title: "Instant Slack alerts",
        description:
          "Once the server-side Slack webhook is configured, every new incident is posted to your existing alert channel. Use Send test alert to verify delivery without exposing the webhook in the browser.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='crash-reports-export']",
      popover: {
        title: "AI-ready incident export",
        description:
          "Copy or download every report matching the current filters as one Markdown investigation prompt. The export groups issues with stable fingerprints and omits IP and session credentials.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='crash-reports-filters']",
      popover: {
        title: "Today and source",
        description:
          "Defaults to today's new reports. Auto vs User shows silent capture versus someone tapping Send Report. Copy uses the same title + description + page block as the user's toast copy button.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='crash-reports-list']",
      popover: {
        title: "Review and mark fixed",
        description:
          "Use the visible Review, Fixed, and Reopen actions while scanning. Select several duplicate reports to update them together, and mark Fixed only after the solution is validated. Open a row for stack traces and notes.",
        side: "top",
        align: "center",
      },
    },
  ],
};

export function useTutorial() {
  const pathname = usePathname();
  const subKey = useTourContext((s) => s.subKey);
  const t = useT();
  const { register, locale } = useTranslation();

  const rawSteps = useMemo<DriveStep[]>(() => {
    // Check for sub-key variant first (e.g. "/dashboard/shop/tax-reports#IN")
    if (subKey) {
      const subKeyPath = `${pathname}#${subKey}`;
      if (TOUR_STEPS[subKeyPath]) return TOUR_STEPS[subKeyPath];
      // Factory tabs share this pathname with Karigar book. Do not use the
      // book tour — those data-tour anchors are not mounted on factory views.
      if (pathname === "/dashboard/shop/supply-chain") return [];
    }
    // Exact match, then prefix match (longest first)
    if (TOUR_STEPS[pathname]) return TOUR_STEPS[pathname];
    const match = Object.keys(TOUR_STEPS)
      .filter((key) => pathname.startsWith(key) && key !== "/dashboard/shop")
      .sort((a, b) => b.length - a.length)[0];
    if (match) return TOUR_STEPS[match];
    return pathname === "/dashboard/shop" ? TOUR_STEPS["/dashboard/shop"] : [];
  }, [pathname, subKey]);

  // Pre-register all tour step titles & descriptions for translation as soon
  // as the path is known, so they're cached BEFORE the user clicks the help
  // button. Without this, the first tour render shows English because t()
  // queues async registration and returns English on the first call.
  useEffect(() => {
    if (locale === "en") return;
    for (const step of rawSteps) {
      if (step.popover?.title) register(step.popover.title);
      if (step.popover?.description) register(step.popover.description);
    }
  }, [rawSteps, locale, register]);

  const steps = useMemo<DriveStep[]>(
    () => translateTourSteps(rawSteps, t),
    [rawSteps, t],
  );

  return { steps, rawSteps, hasSteps: steps.length > 0 };
}
