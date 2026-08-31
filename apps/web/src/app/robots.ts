import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

const BASE_URL = SITE_URL;

const PRIVATE_PATHS = [
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
  "/shop",
  "/shops",
  "/designs",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "GPTBot",
        allow: "/llms.txt",
        disallow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: "/llms.txt",
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
