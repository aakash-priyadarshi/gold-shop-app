import { ForbiddenException } from "@nestjs/common";

// Explicit operation list: new endpoints are unavailable until reviewed here.
export const SUPPORT_PERMISSIONS = [
  {
    id: "inventory.edit",
    label: "Edit existing products",
    description:
      "Change product details, prices, weights and stock status. No creation or deletion.",
  },
  {
    id: "materials.edit",
    label: "Edit material availability and prices",
    description: "Update materials offered by this shop and their prices.",
  },
  {
    id: "capabilities.edit",
    label: "Edit jewellery capabilities",
    description:
      "Change supported jewellery types, finishes and manufacturing methods.",
  },
  {
    id: "pricing.edit",
    label: "Edit gemstone and component prices",
    description: "Change shop gemstone, base metal, plating and finish prices.",
  },
  {
    id: "invoices.create",
    label: "Create invoices",
    description:
      "Create real invoices, including their stock and accounting effects.",
  },
  {
    id: "invoices.settings",
    label: "Edit invoice settings",
    description: "Change invoice numbering, display and default settings.",
  },
  {
    id: "invoices.download",
    label: "Download invoice PDFs",
    description:
      "Download individual invoices containing customer and transaction details.",
  },
] as const;

export type SupportPermission = (typeof SUPPORT_PERMISSIONS)[number]["id"];
export const SUPPORT_PERMISSION_IDS = SUPPORT_PERMISSIONS.map((p) => p.id);

export function supportOperation(
  method: string,
  path: string,
): {
  permission?: SupportPermission;
  resource?: "inventoryItem" | "customer";
  id?: string;
} {
  const read = method === "GET" || method === "HEAD";
  if (method === 'POST' && path === '/translation/batch') return {};
  if (
    read &&
    [
      "/auth/me",
      "/support-access/session",
      "/shops/my-shop",
      "/shops/my-shop/dashboard",
      "/shops/my-shop/analytics",
      "/shops/my-shop/materials",
      "/shops/my-shop/capabilities",
      "/shops/my-shop/gemstone-pricing",
      "/shops/my-shop/component-pricing",
      "/invoices",
      "/invoices/settings",
      "/invoices/stats",
      "/market-rates",
      "/pricing/tax/summary",
      "/shops/my-shop/settings",
      "/seller-subscriptions/my-features",
      "/seller-subscriptions/my-usage",
      "/seller-subscriptions/my-conversion-signals",
      "/seller-subscriptions/my-subscription",
      "/rfq/shop-requests",
      "/shop-quotes",
      "/shop-quotes/stats",
      "/users/customers/search",
      "/pos/session/active",
      "/pos/shifts/current",
      "/karigar/snapshot",
      "/karigar/gold-loss",
      "/karigar/workshop/tower",
      "/karigar/workshop/floor",
    ].includes(path)
  )
    return {};
  if (method === "POST" && path === "/support-access/session/end") return {};
  if (method === "POST" && path === "/support-access/session/activity")
    return {};
  if (read && /^\/orders\/shop\/[^/]+(\/stats)?$/.test(path)) return {};
  if (read && /^\/shop-quotes\/[^/]+$/.test(path)) return {};
  const customer = read
    ? /^\/users\/customers\/([^/]+)\/(profile|orders|stats|notes)$/.exec(path)
    : null;
  if (customer) return { resource: "customer", id: customer[1] };
  if (read && /^\/karigar\/jobs\/[^/]+(\/cost-summary)?$/.test(path)) return {};
  if (read && /^\/karigar\/workshops\/[^/]+\/account(\/statement)?$/.test(path))
    return {};
  if (
    read &&
    /^\/inventory\/shop\/[^/]+\/(items|stats|lookup|storage-locations|stock-audits)(\/[^/]+)?$/.test(
      path,
    )
  )
    return {};
  if (read && /^\/invoices\/[^/]+\/pdf$/.test(path))
    return { permission: "invoices.download" };
  if (read && /^\/invoices\/[^/]+$/.test(path)) return {};
  const item = /^\/inventory\/([^/]+)$/.exec(path);
  if (item && (read || method === "PATCH"))
    return {
      resource: "inventoryItem",
      id: item[1],
      permission: read ? undefined : "inventory.edit",
    };
  const writes: Record<string, SupportPermission> = {
    "PUT /shops/my-shop/materials": "materials.edit",
    "PUT /shops/my-shop/capabilities": "capabilities.edit",
    "PUT /shops/my-shop/gemstone-pricing": "pricing.edit",
    "PUT /shops/my-shop/component-pricing": "pricing.edit",
    "POST /invoices": "invoices.create",
    "PATCH /invoices/settings": "invoices.settings",
  };
  const permission = writes[`${method} ${path}`];
  if (permission) return { permission };
  throw new ForbiddenException(
    "This action is unavailable during support access",
  );
}
