import { MetadataRoute } from "next";

const BASE_URL = "https://www.orivraa.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ─── STATIC PAGES ─────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    // Core pages
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shops`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/designs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/rfq/create`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    // Informational pages
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/seller-guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/partner`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/download`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    // Legal pages
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/platform-guidelines`,
      lastModified: now,
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
        lastModified: shop.updatedAt ? new Date(shop.updatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Error fetching shops for sitemap:", error);
  }

  return [...staticPages, ...shopPages];
}
