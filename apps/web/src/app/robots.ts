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
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}