"use client";

import { ClipboardList, ExternalLink, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

/**
 * Renders rich message types: CATALOGUE_LINK, PRODUCT_CARD, RFQ_ACTION
 * Falls back to null for TEXT or unknown types (caller renders text).
 */
export function RichMessageCard({
  messageType,
  payload,
  content,
}: {
  messageType?: string;
  payload?: any;
  content?: string;
}) {
  if (!messageType || messageType === "TEXT") return null;

  if (messageType === "CATALOGUE_LINK" && payload) {
    return (
      <div className="bg-gradient-to-r from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20 border border-gold-200 dark:border-gold-800 rounded-lg p-3 space-y-2 max-w-xs">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gold-600" />
          <span className="text-xs font-semibold text-gold-700 dark:text-gold-400">
            Catalogue Shared
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {payload.catalogueName || "Catalogue"}
        </p>
        {payload.itemCount != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {payload.itemCount} items
          </p>
        )}
        <a
          href={`/c/${payload.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-600 hover:text-gold-700"
        >
          <ExternalLink className="h-3 w-3" />
          Open Catalogue
        </a>
      </div>
    );
  }

  if (messageType === "PRODUCT_CARD" && payload) {
    const products = Array.isArray(payload.items) ? payload.items : [payload];
    return (
      <div className="space-y-2 max-w-xs">
        <div className="flex items-center gap-1.5 mb-1">
          <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {products.length > 1
              ? `${products.length} Products Shared`
              : "Product Shared"}
          </span>
        </div>
        {products.slice(0, 4).map((p: any, i: number) => (
          <div
            key={p.inventoryItemId || i}
            className="flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2"
          >
            {p.image ? (
              <img
                src={p.image}
                alt={p.title || "Product"}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {p.title || "Item"}
              </p>
              {p.metal && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {p.metal} {p.purity ? `· ${p.purity}` : ""}
                </p>
              )}
              {p.price != null && (
                <p className="text-[10px] font-semibold text-gold-600">
                  NPR {Number(p.price).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {products.length > 4 && (
          <p className="text-[10px] text-gray-400">
            +{products.length - 4} more
          </p>
        )}
      </div>
    );
  }

  if (messageType === "RFQ_ACTION" && payload) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 max-w-xs space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
            Walk-in RFQ Created
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {payload.jewelleryType?.replace(/_/g, " ") || "Custom Request"} ·{" "}
          {payload.itemCount || 0} items
        </p>
        {payload.rfqId && (
          <Link
            href={`/dashboard/shop/rfqs/${payload.rfqId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
          >
            <ExternalLink className="h-3 w-3" />
            View RFQ
          </Link>
        )}
      </div>
    );
  }

  if (messageType === "SHOWROOM_SESSION" && payload) {
    return (
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <Store className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
            Showroom Session
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {payload.itemCount || 0} items viewed
        </p>
      </div>
    );
  }

  // Unknown type — return null so caller renders plain text
  return null;
}
