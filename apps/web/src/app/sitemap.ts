import { BLOG_POSTS } from "@/data/blog-posts";
import generatedRoutes from "@/data/generated-routes.json";
import { MetadataRoute } from "next";

const BASE_URL = "https://www.orivraa.com";
const DEFAULT_PUBLIC_API_BASE = "https://api.orivraa.com/api";
const SHOP_SITEMAP_PAGE_SIZE = 200;
const SHOP_SITEMAP_MAX_PAGES = 10;

const ABOUT_LANGUAGES = ["fr", "de", "hi", "es", "ar", "ne"] as const;

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

type RouteMeta = {
  changeFrequency: ChangeFrequency;
  priority: number;
  lastModified?: Date;
};

type ShopSitemapRecord = {
  id: string;
  updatedAt?: string;
};

const DEFAULT_ROUTE_META: RouteMeta = {
  changeFrequency: "monthly",
  priority: 0.6,
};

const ROUTE_OVERRIDES: Record<string, RouteMeta> = {
  "/": {
    changeFrequency: "daily",
    priority: 1.0,
    lastModified: new Date(),
  },
  "/shop": {
    changeFrequency: "daily",
    priority: 0.85,
    lastModified: new Date(),
  },
  "/shops": {
    changeFrequency: "daily",
    priority: 0.9,
    lastModified: new Date(),
  },
  "/designs": {
    changeFrequency: "daily",
    priority: 0.85,
    lastModified: new Date(),
  },
  "/pricing": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-shop-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-store-management-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-pos-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-inventory-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-ecommerce-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/jewellery-shop-billing-software": {
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/compare/orivraa-vs-tally": {
    changeFrequency: "monthly",
    priority: 0.85,
  },
  "/compare/orivraa-vs-marg-erp": {
    changeFrequency: "monthly",
    priority: 0.85,
  },
  "/compare/jewellery-crm-software-india": {
    changeFrequency: "monthly",
    priority: 0.85,
  },
  "/compare/billing-software-india-jewellery-shops": {
    changeFrequency: "monthly",
    priority: 0.85,
  },
  "/privacy": {
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/terms": {
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/refund": {
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/platform-guidelines": {
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/about": {
    changeFrequency: "monthly",
    priority: 0.7,
  },
  "/contact": {
    changeFrequency: "yearly",
    priority: 0.5,
  },
  "/for-sellers": {
    changeFrequency: "monthly",
    priority: 0.8,
  },
  "/seller-guide": {
    changeFrequency: "monthly",
    priority: 0.7,
  },
  "/ai-sales-team": {
    changeFrequency: "monthly",
    priority: 0.8,
  },
  "/partner": {
    changeFrequency: "monthly",
    priority: 0.7,
  },
  "/download": {
    changeFrequency: "monthly",
    priority: 0.7,
  },
  "/download/changelog": {
    changeFrequency: "weekly",
    priority: 0.6,
  },
  "/help": {
    changeFrequency: "monthly",
    priority: 0.6,
  },
  "/support": {
    changeFrequency: "monthly",
    priority: 0.5,
  },
};

function getStaticPages(siteLaunch: string): MetadataRoute.Sitemap {
  return (generatedRoutes as string[])
    .map((route) => {
      const override = ROUTE_OVERRIDES[route];
      const meta = override ?? DEFAULT_ROUTE_META;
      return {
        url: route === "/" ? BASE_URL : `${BASE_URL}${route}`,
        lastModified: override?.lastModified ?? new Date(siteLaunch),
        changeFrequency: meta.changeFrequency,
        priority: meta.priority,
      } satisfies SitemapEntry;
    });
}

function resolvePublicApiBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    DEFAULT_PUBLIC_API_BASE;

  return configuredUrl.endsWith("/api")
    ? configuredUrl
    : `${configuredUrl}/api`;
}

async function getShopPagesForSitemap() {
  const apiBaseUrl = resolvePublicApiBaseUrl();
  const shopPages: MetadataRoute.Sitemap = [];

  for (let page = 1; page <= SHOP_SITEMAP_MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      page: `${page}`,
      pageSize: `${SHOP_SITEMAP_PAGE_SIZE}`,
    });

    const response = await fetch(`${apiBaseUrl}/shops/public?${query.toString()}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(
        `Public shops endpoint returned ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const shops = Array.isArray(data?.shops)
      ? (data.shops as ShopSitemapRecord[])
      : Array.isArray(data)
        ? (data as ShopSitemapRecord[])
        : [];

    if (shops.length === 0) {
      break;
    }

    shopPages.push(
      ...shops.map((shop) => ({
        url: `${BASE_URL}/shops/${shop.id}`,
        lastModified: shop.updatedAt ? new Date(shop.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    );

    const totalPages =
      typeof data?.meta?.totalPages === "number"
        ? data.meta.totalPages
        : typeof data?.pagination?.totalPages === "number"
          ? data.pagination.totalPages
          : undefined;

    if ((totalPages && page >= totalPages) || shops.length < SHOP_SITEMAP_PAGE_SIZE) {
      break;
    }
  }

  return shopPages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use a fixed reference date for pages that don't have dynamic content.
  // Update these dates ONLY when you actually modify the page content.
  // Google distrust lastmod values that always show "now" — it looks like spam.
  const SITE_LAUNCH = "2025-01-15"; // approximate site launch date
  const latestBlogDate =
    BLOG_POSTS[0]?.updated ?? BLOG_POSTS[0]?.date ?? SITE_LAUNCH;

  // ─── STATIC PAGES ─────────────────────────────────────────────
  const staticPages = getStaticPages(SITE_LAUNCH);

  const localizedAboutPages: MetadataRoute.Sitemap = ABOUT_LANGUAGES.map(
    (lang) => ({
      url: `${BASE_URL}/about/${lang}`,
      lastModified: new Date("2026-03-09"),
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  // ─── DYNAMIC: Shop pages ──────────────────────────────────────
  let shopPages: MetadataRoute.Sitemap = [];
  try {
    shopPages = await getShopPagesForSitemap();
  } catch (error) {
    console.error("Error fetching shops for sitemap:", error);
  }

  // ─── DYNAMIC: Blog posts ──────────────────────────────────────
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(latestBlogDate),
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

  return [
    ...staticPages,
    ...localizedAboutPages,
    ...shopPages,
    ...blogIndex,
    ...blogPages,
  ];
}
