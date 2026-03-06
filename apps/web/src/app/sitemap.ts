import { BLOG_POSTS } from "@/data/blog-posts";
import { MetadataRoute } from "next";

const BASE_URL = "https://www.orivraa.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use a fixed reference date for pages that don't have dynamic content.
  // Update these dates ONLY when you actually modify the page content.
  // Google distrust lastmod values that always show "now" — it looks like spam.
  const SITE_LAUNCH = "2025-01-15"; // approximate site launch date

  // ─── STATIC PAGES ─────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    // Core pages
    {
      url: BASE_URL,
      lastModified: new Date(), // homepage updates frequently (latest products, blog posts)
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shops`,
      lastModified: new Date(), // shop listings change frequently
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/designs`,
      lastModified: new Date(), // designs may update daily
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date("2025-03-05"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/rfq/create`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "monthly",
      priority: 0.7,
    },

    // Informational pages
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/jewellery-shop-software`,
      lastModified: new Date("2025-03-01"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/support`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/seller-guide`,
      lastModified: new Date("2025-02-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/partner`,
      lastModified: new Date("2025-02-15"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/download`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },

    // Legal pages
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(SITE_LAUNCH),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(SITE_LAUNCH),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund`,
      lastModified: new Date(SITE_LAUNCH),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/platform-guidelines`,
      lastModified: new Date(SITE_LAUNCH),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ─── DYNAMIC: Shop pages ──────────────────────────────────────
  let shopPages: MetadataRoute.Sitemap = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/shops?status=ACTIVE&limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const data = await response.json();
      const shops = data.shops || data || [];
      shopPages = shops.map((shop: { id: string; updatedAt?: string }) => ({
        url: `${BASE_URL}/shops/${shop.id}`,
        lastModified: shop.updatedAt ? new Date(shop.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Error fetching shops for sitemap:", error);
  }

  // ─── DYNAMIC: Blog posts ──────────────────────────────────────
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date("2025-03-01"), // update when you publish new blog posts
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated ? new Date(post.updated) : new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...shopPages, ...blogIndex, ...blogPages];
}
