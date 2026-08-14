"use client";

import { useT, useTranslation } from "@/providers/translation-provider";
import type { DriveStep } from "driver.js";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTourContext } from "./useTourContext";

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
      element: "[data-tour='pos-search']",
      popover: {
        title: "Search Products",
        description:
          "Type a product name or scan a barcode to find items quickly.",
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
          "Select payment method and generate a GST/VAT-ready bill instantly.",
        side: "top",
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
    {
      element: "[data-tour='supply-ticker']",
      popover: {
        title: "Live Bullion Ticker",
        description:
          "Real-time feed of raw materials (gold grains 24K, 22K, 18K, silver) dynamically synced from international commodities markets for accurate valuation.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-vault']",
      popover: {
        title: "Bullion Safe Vault Reserves",
        description:
          "Track the total raw materials physical stock (gold cast bars, silver scrap, grains) currently locked inside your strong-room vault.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='supply-add-material']",
      popover: {
        title: "Add Custom Material Types",
        description:
          "Click here to add custom metal types (such as Platinum 950, Rose Gold 14K, or Palladium) dynamically to your strong-room vault grid. Once added, they will be available across all procurement and allotment modules!",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='supply-ledger']",
      popover: {
        title: "Artisan Balance Ledger",
        description:
          "Complete CRUD dashboard for registered Karigars. View their name, contact phone, email, wastage limit (%), float balances (gold/silver), and total pending wages. You can also edit details or delete records securely.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-add-karigar']",
      popover: {
        title: "Register New Karigar",
        description:
          "Click here to register a new goldsmith or artisan. Save their name, workshop name, location, phone (with country code), email, wastage target limit, and basic labor rates directly to the cloud.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-pipeline']",
      popover: {
        title: "Artisan Fabrication Pipeline",
        description:
          "Track active jobs with gold in/out at each stage. Casting trees show issued metal vs finished pieces, sprue/button, recoverable scrap, allowed loss, and unexplained loss. This is workshop metal — not customer billing wastage.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-add-job']",
      popover: {
        title: "Create Fabrication Job",
        description:
          "Launch a new custom job. Then record a casting tree (for example 1 kg issued) and department weights. Use Load sample 1 kg job for a walkthrough of the Gold Loss report.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-sample-job']",
      popover: {
        title: "Sample 1 kg casting job",
        description:
          "Loads a demo: 1000g issued, 920g finished, 50g sprue, 20g recoverable. Actual loss is 10g, which matches 1% allowed — unexplained stays at 0. Open the Gold Loss report after it loads.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-casting-tree']",
      popover: {
        title: "Casting tree reconciliation",
        description:
          "Enter issued gold, finished pieces, sprue/button, and recoverable scrap. Actual loss and unexplained loss (above the allowed %) calculate automatically.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='supply-gold-loss']",
      popover: {
        title: "Gold Loss report",
        description:
          "Job-wise, tree-wise, and karigar-wise gold accountability. Print this for a factory walkthrough. Catalogue and invoice wastage are separate and never mix into this ledger.",
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
          "Click here to add a single jewellery piece with live metal-weight pricing and optional storage location.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-desc-generate']",
      popover: {
        title: "Auto description",
        description:
          "Fill from specs and Generate with AI stay locked until Jewellery Type, Metal Type, and Total Weight are filled. The page names whichever box is still empty. Fill from specs is free. Generate with AI costs 0.25 credits and only asks you to buy more after you click it.",
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
      element: "[data-tour='inventory-reprice']",
      popover: {
        title: "Reprice from rates",
        description:
          "When gold rates move, preview and apply new catalog prices from your Pricing Setup metal rates. Making charges can stay fixed or recalculate. Prices use your shop currency.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='inventory-add-set']",
      popover: {
        title: "Add Set",
        description:
          "Build a bridal or matching set with its own SKU. Attach earrings, maang tikka, necklace, nathuni, and apply a set discount when buying together.",
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
      popover: {
        title: "Preferences Tab",
        description:
          "Under Preferences, configure making charge %, Billing Wastage (jarti) mode and default %, Cash on Delivery, and min/max order values. Under Payment Methods, add your bank account for payouts.",
      },
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
    },    {
      element: "[data-tour='invoice-create-items']",
      popover: {
        title: "Line Items",
        description:
          "Add each jewellery item manually, or click Add from catalog to pull an available product (stock is deducted when you create the invoice). Enter metal type, weight, metal cost, gemstones, and making charge. Switch weight units (grams, tola, laal) and use Live metal autofill. Tax is calculated per component for tax reports.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoice-add-from-catalog']",
      popover: {
        title: "Add from catalog",
        description:
          "Search your Product Catalog and add pieces with prices already filled. Optionally recalculate metal from today's rate. Each piece can appear once per invoice.",
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
          "Leaving a review on SaaSHub, G2, or Crunchbase helps more jewellers discover Orivraa. Click the platform, leave your review, then submit a screenshot as proof to earn rewards.",
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
          "Enter a colleague's email and click Send Invite. When they sign up using your link, both of you get 1 month free plus 50 AI credits automatically.",
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
          "Your unified manufacturing workspace! Monitor live raw gold/silver bullion reserves in your safe vault, track outstanding float balances allotted to Karigars (artisans), record process wastages, and issue metal or receive finished pieces with direct cloud-persisted ledgers.",
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
        title: "Review and resolve",
        description:
          "Open a row for stack and notes. Mark Reviewed or Resolved as you go. Session-expired and form-validation toasts are not logged.",
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

  const steps = useMemo<DriveStep[]>(() => {
    const translateSteps = (source: DriveStep[]) =>
      source.map((step) => ({
        ...step,
        popover: step.popover
          ? {
              ...step.popover,
              title: step.popover.title
                ? t(step.popover.title)
                : step.popover.title,
              description: step.popover.description
                ? t(step.popover.description)
                : step.popover.description,
            }
          : step.popover,
      }));
    return translateSteps(rawSteps);
  }, [rawSteps, t]);

  return { steps, hasSteps: steps.length > 0 };
}
