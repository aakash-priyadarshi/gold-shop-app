import type { MetadataRoute } from "next";

const BASE_URL = "https://www.orivraa.com";

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