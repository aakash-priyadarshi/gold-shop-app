"use client";

import type { DriveStep } from "driver.js";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

/** Tour steps keyed by pathname prefix */
const TOUR_STEPS: Record<string, DriveStep[]> = {
  "/dashboard/shop/pos": [
    {
      element: "[data-tour='pos-search']",
      popover: {
        title: "Search Products",
        description: "Type a product name or scan a barcode to find items quickly.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-cart']",
      popover: {
        title: "Cart",
        description: "Items you add appear here. Adjust quantities or remove items before billing.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-checkout']",
      popover: {
        title: "Checkout",
        description: "Select payment method and generate a GST/VAT-ready bill instantly.",
        side: "top",
        align: "end",
      },
    },
  ],
  "/dashboard/shop/inventory": [
    {
      element: "[data-tour='inventory-add']",
      popover: {
        title: "Add Product",
        description: "Click here to add a new jewellery item with live metal-weight pricing.",
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
        description: "All your products. Click a row to edit details, pricing, or stock levels.",
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
        description: "Click here to add a new jewellery item with live metal-weight pricing.",
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
        description: "All your products. Click a row to edit details, pricing, or stock levels.",
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
        description: "Manage quote requests from walk-in customers. Tap a quote to respond.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='quotes-create']",
      popover: {
        title: "New Quote",
        description: "Create a custom quote for any walk-in customer in seconds.",
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
        description: "Narrow down by status — Pending, Processing, Shipped, Delivered, etc.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='orders-table']",
      popover: {
        title: "Order List",
        description: "Click any order to view details, update status, or print a bill.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/tools": [
    {
      element: "[data-tour='tools-grid']",
      popover: {
        title: "Shop Tools",
        description: "6 built-in tools to streamline your jewellery business — click any card to open that tool.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Old Gold Exchange",
        description: "Calculate exchange value when a customer trades old gold for new jewellery. Get the exact buy-back rate based on live gold prices.",
      },
    },
    {
      popover: {
        title: "EMI Calculator",
        description: "Show customers an easy installment plan. Enter the price and duration to generate EMI options on the spot.",
      },
    },
    {
      popover: {
        title: "Repair Tracking",
        description: "Log jewellery repair, alteration, and service jobs. Track status and notify customers when work is ready.",
      },
    },
  ],
  "/dashboard/shop/settings": [
    {
      element: "[data-tour='settings-tabs']",
      popover: {
        title: "Settings Tabs",
        description: "Switch between Profile, Location, Preferences, and Payment Methods to configure every aspect of your shop.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-shop-info']",
      popover: {
        title: "Shop Information",
        description: "Set your shop name in English, Nepali, and Hindi. This name appears on invoices, catalogues, and your public store page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      popover: {
        title: "Preferences Tab",
        description: "Under Preferences, configure making charge %, Cash on Delivery toggle, and min/max order values. Under Payment Methods, add your bank account for payouts.",
      },
    },
  ],
  "/dashboard/shop/messages": [
    {
      element: "[data-tour='messages-list']",
      popover: {
        title: "Conversations",
        description: "All buyer conversations appear here. Click any conversation to open the chat thread. Unread messages are highlighted.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='messages-thread']",
      popover: {
        title: "Message Thread",
        description: "Reply to buyers in real-time. All messages are moderated — if a message violates policy you'll see a warning banner with details.",
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
        description: "Build a shareable digital catalogue to send on WhatsApp, email, or social media. Choose which products to include.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='catalogues-grid']",
      popover: {
        title: "Your Catalogues",
        description: "Each catalogue has a public link. Share it with customers and track how many people viewed it. You can have public or private catalogues.",
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
        description: "Switch between All, Online (custom jewellery requests from your marketplace listing), and Walk-in (in-person customer requests).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='rfqs-table']",
      popover: {
        title: "RFQ Requests",
        description: "Each row is a custom jewellery request from a buyer with their budget, design description, and deadline. Click any row to send a price quote back.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/invoices": [
    {
      element: "[data-tour='invoices-create']",
      popover: {
        title: "Create Invoice",
        description: "Generate GST/VAT-ready invoices with automatic tax calculation for India, Nepal, UAE, UK, EU, and US. Supports partial payments too.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='invoices-stats']",
      popover: {
        title: "Invoice Summary",
        description: "Track total invoices issued, revenue collected, outstanding amounts, and count of paid invoices — all at a glance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='invoices-table']",
      popover: {
        title: "Invoice List",
        description: "View all invoices with status (Issued / Paid / Partial / Overdue / Voided). Click any invoice to see full details, mark as paid, or send a payment reminder.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop/tax-reports": [
    {
      element: "[data-tour='tax-period']",
      popover: {
        title: "Select Period",
        description: "Choose the month to generate your tax filing report. Reports are based on invoices issued in that month.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tax-countries']",
      popover: {
        title: "Country Tax Tabs",
        description: "Reports are organised per country — IN (GST), NP (VAT), AE, GB (VAT), EU, US. Only countries where you have sales show data.",
        side: "bottom",
        align: "start",
      },
    },
    {
      popover: {
        title: "Download & Share",
        description: "Export your tax report as CSV or PDF for your accountant. You can also share a secure, time-limited link directly with your CA or tax adviser.",
      },
    },
  ],
  "/dashboard/shop/customers": [
    {
      element: "[data-tour='customers-search']",
      popover: {
        title: "Search Customers",
        description: "Find any customer instantly by name, phone number, or email. Search works across both registered (online) and walk-in customers.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='customers-grid']",
      popover: {
        title: "Customer Directory",
        description: "Each card shows order count, RFQ count, total spend, and last activity. Click a customer to see their full order history and contact details.",
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
        description: "Download the Orivraa desktop app for faster access, offline mode, and system-level notifications. Available for Windows and macOS.",
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
        description: "Switch between 7 days, 30 days, 90 days, or 1 year to see how your business is trending over time.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='analytics-stats']",
      popover: {
        title: "Key Metrics",
        description: "Your total revenue, order count, RFQ win rate, and average customer rating — compared to the previous period so you can see growth.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-tabs']",
      popover: {
        title: "Deep Dive",
        description: "Switch between Revenue (breakdown by direct vs custom orders), Orders, RFQs (win rate), and Customers (new vs returning) for detailed charts.",
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
        description: "Your tier (Standard → Silver → Gold → Elite) unlocks advanced features and boosts your visibility in search results. The progress bar shows what metrics you need to reach the next tier.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='engagement-health']",
      popover: {
        title: "Health Score",
        description: "Your overall shop health grade (A to F) is calculated across profile completeness, order performance, verification status, and customer engagement.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='engagement-tabs']",
      popover: {
        title: "Milestones & Growth",
        description: "Complete milestones to earn rewards and unlock features. Track your RFQ performance, referral stats, KYC status, and onboarding progress from the tabs.",
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
        description: "Leaving a review on SaaSHub, G2, or Crunchbase helps more jewellers discover Orivraa. Click the platform, leave your review, then submit a screenshot as proof to earn rewards.",
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
        description: "Enter a colleague's email and click Send Invite. When they sign up using your link, both of you get 1 month free plus 50 AI credits automatically.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='referrals-list']",
      popover: {
        title: "Your Referrals",
        description: "Track every jeweller you've invited — see whether they've signed up, your reward status, and your unique referral code to share manually.",
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
        description: "My Plan shows your current subscription. AI Credits tracks your usage balance. Available Plans lets you compare and upgrade your subscription.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='billing-plan']",
      popover: {
        title: "Your Current Plan",
        description: "See your plan name, billing cycle (monthly/annual), status, and feature limits. You can cancel or change your plan here at any time.",
        side: "bottom",
        align: "start",
      },
    },
    {
      popover: {
        title: "AI Credits",
        description: "Credits are used for AI-powered features: auto-generated product descriptions, the voice sales agent, smart message replies, and price suggestions. Top up credits anytime from the AI Credits tab.",
      },
    },
  ],
  "/dashboard/shop/profile": [
    {
      element: "[data-tour='profile-info']",
      popover: {
        title: "Personal Information",
        description: "Your name, email, and phone number. Keep this up to date — your email is used for billing receipts and your phone for 2FA and customer calls.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='profile-tabs']",
      popover: {
        title: "Profile Sections",
        description: "Personal Info has your contact details. Preferences lets you set language and notification settings. Security is where you change your password or enable 2-factor authentication.",
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
        description: "Can't find an answer in the docs? Open a support ticket and the Orivraa team will respond within 24 hours. Include screenshots for faster resolution.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='support-tickets']",
      popover: {
        title: "Your Tickets",
        description: "Track the status of all your support requests here (Open, In Progress, Resolved). Click any ticket to continue the conversation with the support team.",
        side: "top",
        align: "center",
      },
    },
  ],
  "/dashboard/shop": [
    {
      element: "[data-tour='dash-stats']",
      popover: {
        title: "Today's Overview",
        description: "At a glance: revenue, orders, and top-selling items for today.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-quick-actions']",
      popover: {
        title: "Quick Actions",
        description: "Jump to POS, add a product, or create a quote from here.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-orders']",
      popover: {
        title: "Recent Orders",
        description: "Your latest orders — click any row to manage it.",
        side: "top",
        align: "center",
      },
    },
  ],
};

export function useTutorial() {
  const pathname = usePathname();

  const steps = useMemo<DriveStep[]>(() => {
    // Exact match first, then prefix match (longest first)
    if (TOUR_STEPS[pathname]) return TOUR_STEPS[pathname];
    const match = Object.keys(TOUR_STEPS)
      .filter((key) => pathname.startsWith(key) && key !== "/dashboard/shop")
      .sort((a, b) => b.length - a.length)[0];
    return match ? TOUR_STEPS[match] : (pathname === "/dashboard/shop" ? TOUR_STEPS["/dashboard/shop"] : []);
  }, [pathname]);

  return { steps, hasSteps: steps.length > 0 };
}
