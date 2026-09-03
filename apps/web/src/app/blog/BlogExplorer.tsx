"use client";

import { T } from "@/components/ui/T";
import type { BlogPost } from "@/data/blog-posts";
import { useT } from "@/providers/translation-provider";
import {
  ArrowRight,
  Calendar,
  Clock,
  Layers,
  LayoutGrid,
  Scale,
  Search,
  ShieldCheck,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/* ────────────────────────────────────────────────────────────── */
/*  PILLAR DEFINITIONS                                            */
/* ────────────────────────────────────────────────────────────── */

interface PillarConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof ShieldCheck;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  slugs: string[];
}

const PILLARS: PillarConfig[] = [
  {
    id: "tax-compliance",
    title: "Tax & Legal Compliance Masterclass",
    subtitle:
      "GST, Nepal 2083/84 laws, Dubai VAT, UK/US regulations, and hallmarking standards.",
    icon: ShieldCheck,
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    accentText: "text-emerald-700 dark:text-emerald-400",
    accentBorder: "border-emerald-200 dark:border-emerald-800/60",
    slugs: [
      "jewellery-billing-software-nepal-tax-guide",
      "jewellery-gst-billing-guide-india",
      "how-to-calculate-gst-on-gold-jewellery-india",
      "vat-on-gold-jewellery-uae-dubai-guide",
      "jewellery-shop-software-tax-compliance-uk",
      "jewellery-shop-software-usa-sales-tax-guide",
      "hallmarking-compliance-checklist-jewellers-india",
    ],
  },
  {
    id: "software-benchmarks",
    title: "Software Benchmarks & ERP Comparisons",
    subtitle:
      "Objective comparisons between Orivraa, Tally, Vyapar, Marg ERP, and Busy.",
    icon: Scale,
    accentBg: "bg-amber-500/10 dark:bg-amber-500/20",
    accentText: "text-amber-700 dark:text-amber-400",
    accentBorder: "border-amber-200 dark:border-amber-800/60",
    slugs: [
      "best-billing-software-for-jewellery-shops-india-2026",
      "zoho-vs-orivraa-jewellery-business",
      "best-jewellery-shop-software-2025",
      "best-jewellery-store-management-software-2026",
      "jewellery-shop-billing-software-guide",
    ],
  },
  {
    id: "inventory-workshop",
    title: "Inventory, Pricing & Workshop Management",
    subtitle:
      "Weight tracking in grams and tola, making charge calculations, wastage, and vault security.",
    icon: Layers,
    accentBg: "bg-blue-500/10 dark:bg-blue-500/20",
    accentText: "text-blue-700 dark:text-blue-400",
    accentBorder: "border-blue-200 dark:border-blue-800/60",
    slugs: [
      "jewellery-inventory-management-guide",
      "how-to-manage-gold-inventory-jewellery-store",
      "how-jewellery-pricing-works",
    ],
  },
  {
    id: "digital-growth",
    title: "Digital Selling & Business Growth",
    subtitle:
      "WhatsApp catalogues, online customer trust, tax savings, and multichannel expansion.",
    icon: TrendingUp,
    accentBg: "bg-violet-500/10 dark:bg-violet-500/20",
    accentText: "text-violet-700 dark:text-violet-400",
    accentBorder: "border-violet-200 dark:border-violet-800/60",
    slugs: [
      "how-to-sell-jewellery-online-2025",
      "how-jewellery-shops-can-go-digital",
      "how-tax-reports-save-jewellery-traders-money",
    ],
  },
];

const POPULAR_SEARCH_TERMS = [
  "GST",
  "Nepal Tax",
  "Tally vs Vyapar",
  "Tola & Grams",
  "Making Charges",
  "HUID Hallmarking",
  "Inventory",
];

/* ────────────────────────────────────────────────────────────── */
/*  PROPS                                                         */
/* ────────────────────────────────────────────────────────────── */

interface BlogExplorerProps {
  posts: BlogPost[];
}

/**
 * Interactive client-side explorer for browsing, searching, and filtering jewellery blog guides.
 *
 * @param props - Component props containing the list of all blog posts.
 * @returns The explorer component with search bar, topic filters, curated pillar sections, and grid views.
 */
export function BlogExplorer({ posts }: BlogExplorerProps) {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"pillars" | "grid">("pillars");

  /* Extract unique categories with counts */
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return [
      { id: "all", label: "All Guides", count: posts.length },
      ...Object.entries(counts).map(([cat, count]) => ({
        id: cat,
        label: cat,
        count,
      })),
    ];
  }, [posts]);

  /* Filtered posts based on search and category */
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCat =
        selectedCategory === "all" || post.category === selectedCategory;

      if (!matchesCat) return false;
      if (!query) return true;

      const titleMatch = post.title.toLowerCase().includes(query);
      const descMatch = post.description.toLowerCase().includes(query);
      const tagsMatch = post.tags.some((t) => t.toLowerCase().includes(query));
      const catMatch = post.category.toLowerCase().includes(query);

      return titleMatch || descMatch || tagsMatch || catMatch;
    });
  }, [posts, searchQuery, selectedCategory]);

  const isFiltered = searchQuery.trim().length > 0 || selectedCategory !== "all";

  return (
    <section className="mt-16 space-y-12">
      {/* ── Search & Filter Controls Island ───────────────────── */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 p-6 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search guides by keyword, topic, tax law, software...")}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/70 py-3 pl-11 pr-10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 transition focus:border-amber-500 focus:bg-white dark:focus:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label={t("Clear search")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              <T>View:</T>
            </span>
            <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-1">
              <button
                type="button"
                onClick={() => setViewMode("pillars")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "pillars"
                    ? "bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <T>Curated Pillars</T>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <T>All Articles</T>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                <T>{cat.label}</T>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active
                      ? "bg-amber-700/80 text-white"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Popular Search Suggestions */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-stone-100 dark:border-stone-800 pt-3 text-xs text-stone-500 dark:text-stone-400">
          <span className="font-medium text-stone-600 dark:text-stone-300">
            <T>Quick topics:</T>
          </span>
          {POPULAR_SEARCH_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setSearchQuery(term);
                setViewMode("grid");
              }}
              className="rounded-md border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800 px-2 py-0.5 text-[11px] text-stone-600 dark:text-stone-300 transition hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
            >
              {t(term)}
            </button>
          ))}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="ml-auto text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
            >
              <T>Reset all filters</T>
            </button>
          )}
        </div>
      </div>

      {/* ── Search Results Count when filtering ─────────────────── */}
      {isFiltered && (
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {t("Showing")}{" "}
            <strong className="text-stone-900 dark:text-white">
              {filteredPosts.length}
            </strong>{" "}
            {filteredPosts.length === 1 ? t("article") : t("articles")}
            {searchQuery && (
              <>
                {" "}{t("for")} &ldquo;<span className="text-stone-900 dark:text-white">{searchQuery}</span>&rdquo;
              </>
            )}
            {selectedCategory !== "all" && (
              <>
                {" "}{t("in")}{" "}
                <span className="font-semibold text-stone-900 dark:text-white">
                  <T>{selectedCategory}</T>
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────── */}
      {filteredPosts.length === 0 && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-12 text-center">
          <p className="text-base font-semibold text-stone-800 dark:text-stone-200">
            <T>No guides match your search criteria</T>
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
            <T>Try clearing your search terms or selecting &ldquo;All Guides&rdquo; to browse our entire library.</T>
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-6 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow transition hover:bg-amber-700"
          >
            <T>Show all articles</T>
          </button>
        </div>
      )}

      {/* ── Render: Curated Pillars View (Default when not searching) ── */}
      {!isFiltered && viewMode === "pillars" && (
        <div className="space-y-16">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const pillarPosts = posts.filter(
              (p) => !p.featured && pillar.slugs.includes(p.slug)
            );
            if (pillarPosts.length === 0) return null;

            return (
              <div
                key={pillar.id}
                className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 p-6 sm:p-8"
              >
                {/* Pillar Header */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/70 dark:border-stone-800 pb-5">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-xl p-2.5 ${pillar.accentBg} ${pillar.accentText}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
                        <T>{pillar.title}</T>
                      </h2>
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                        <T>{pillar.subtitle}</T>
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center text-xs font-semibold text-stone-500 dark:text-stone-400">
                    {pillarPosts.length}{" "}
                    {pillarPosts.length === 1 ? t("guide") : t("guides")}
                  </span>
                </div>

                {/* Pillar Article Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pillarPosts.map((post) => (
                    <ArticleCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Render: Flat Grid View (When toggled or when filtering) ── */}
      {(isFiltered || viewMode === "grid") && filteredPosts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  ARTICLE CARD COMPONENT (IMPECCABLE CRAFT)                      */
/* ────────────────────────────────────────────────────────────── */

/**
 * Individual article preview card built according to Impeccable design standards.
 *
 * @param props - Component props containing the individual blog post.
 * @returns An article card element with tags, date, read time, and direct article link.
 */
function ArticleCard({ post }: { post: BlogPost }) {
  const t = useT();
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/80 dark:hover:border-amber-500/50 hover:shadow-md">
      <div>
        {/* Meta Bar */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 dark:bg-stone-800 px-2.5 py-1 font-medium text-stone-700 dark:text-stone-300">
            <Tag className="h-3 w-3 text-stone-400" />
            <T>{post.category}</T>
          </span>
          <span className="inline-flex items-center gap-1 text-stone-500 dark:text-stone-400">
            <Clock className="h-3 w-3" />
            <T>{post.readTime}</T>
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold leading-snug tracking-tight text-stone-900 dark:text-stone-100 transition-colors group-hover:text-amber-700 dark:group-hover:text-amber-400 sm:text-lg">
          <Link href={`/blog/${post.slug}`} className="focus:outline-none">
            <T>{post.title}</T>
          </Link>
        </h3>

        {/* Description */}
        <p className="mt-2.5 line-clamp-3 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <T>{post.description}</T>
        </p>

        {/* Key Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 px-1.5 py-0.5 text-[10px] text-stone-500 dark:text-stone-400"
              >
                {t(tag)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="mt-5 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80 pt-3.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </span>
        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 transition group-hover:gap-1.5 dark:text-amber-400"
          tabIndex={-1}
          aria-hidden="true"
        >
          <T>Read</T>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
