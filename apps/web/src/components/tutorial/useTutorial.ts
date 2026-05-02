"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { DriveStep } from "driver.js";

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
      element: "[data-tour='tools-catalogue']",
      popover: {
        title: "Digital Catalogue",
        description: "Share a WhatsApp-ready link to your shop catalogue.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='tools-ai']",
      popover: {
        title: "AI Sales Team",
        description: "Auto-respond to customer queries 24/7 using your shop data.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "/dashboard/shop/settings": [
    {
      element: "[data-tour='settings-shop-name']",
      popover: {
        title: "Shop Name & Details",
        description: "Update your shop name, address, GST number and contact info.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-pricing']",
      popover: {
        title: "Pricing Engine",
        description: "Configure making charges, wastage %, and tax rates used for all bills.",
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
    return match ? TOUR_STEPS[match] : TOUR_STEPS["/dashboard/shop"] ?? [];
  }, [pathname]);

  return { steps, hasSteps: steps.length > 0 };
}
