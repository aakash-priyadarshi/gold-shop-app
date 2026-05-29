import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/auth/",
        "/cart",
        "/checkout",
        "/orders",
        "/notifications",
        "/admin/",
        "/m/",
        "/rfq/",
        // Phase 1: customer/buyer marketplace flow is disabled. Keep these
        // buyer-facing routes out of the index until customer flow is enabled.
        "/shop",
        "/shops",
        "/designs",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}