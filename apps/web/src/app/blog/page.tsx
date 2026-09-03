import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { BLOG_POSTS } from "@/data/blog-posts";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { BlogExplorer } from "./BlogExplorer";

/* ────────────────────────────────────────────────────────────── */
/*  SERVER COMPONENT: BLOG INDEX HUB                              */
/* ────────────────────────────────────────────────────────────── */

/**
 * Server-rendered blog hub page for jewellery software guides, tax blueprints, and benchmarks.
 * Emits complete Schema.org knowledge graph JSON-LD and renders the featured editorial spotlight.
 *
 * @returns The rendered server component for the /blog hub.
 */
export default function BlogPage() {
  const featured = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];

  /* Comprehensive Schema.org JSON-LD Knowledge Graph for SEO & AI */
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "https://www.orivraa.com/blog#webpage",
        url: "https://www.orivraa.com/blog",
        name: "Orivraa Jewellery Business Blog, Tax Guides & ERP Benchmarks",
        description:
          "Authoritative guides for gold & diamond jewellers: GST & Nepal 2083/84 tax compliance, jewellery billing software benchmarks, karigar workshop tracking, and retail store growth.",
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://www.orivraa.com/#website",
          url: "https://www.orivraa.com",
          name: "Orivraa",
          publisher: {
            "@type": "Organization",
            name: "Orivraa",
            url: "https://www.orivraa.com",
            logo: {
              "@type": "ImageObject",
              url: "https://www.orivraa.com/icons/icon-512x512.png",
            },
          },
        },
        about: [
          { "@type": "Thing", name: "Jewellery Billing Software" },
          { "@type": "Thing", name: "GST Compliance for Jewellers" },
          { "@type": "Thing", name: "Nepal Jewellery Tax Rules FY 2083/84" },
          { "@type": "Thing", name: "Gold Inventory Management" },
          { "@type": "Thing", name: "Karigar Workshop & Gold Loss" },
          { "@type": "Thing", name: "Hallmarking & HUID Compliance" },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.orivraa.com/blog#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.orivraa.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog & Guides",
            item: "https://www.orivraa.com/blog",
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": "https://www.orivraa.com/blog#itemlist",
        name: "Jewellery Business Guides & Software Benchmarks",
        numberOfItems: BLOG_POSTS.length,
        itemListElement: BLOG_POSTS.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: post.title,
          description: post.description,
          url: `https://www.orivraa.com/blog/${post.slug}`,
        })),
      },
    ],
  };

  const formattedFeaturedDate = new Date(featured.date).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }
  );

  return (
    <>
      {/* Server-Rendered JSON-LD for Search Crawlers & AI Bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Header />

      <main className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        {/* ── Editorial Hero ──────────────────────────────────── */}
        <section className="border-b border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/90 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/40 px-3.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300">
                <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <T>Jewellery Business Knowledge Hub</T>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-5xl lg:text-5xl font-serif leading-[1.15]">
                <T>
                  Jewellery Business Intelligence, Tax Playbooks &amp; Software
                  Guides
                </T>
              </h1>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-600 dark:text-stone-300">
                <T>
                  Field-tested guides on jewellery billing software, GST and
                  Nepal FY 2083/84 compliance, Karigar workshop management, gold
                  inventory controls, and scaling retail jewellery chains.
                </T>
              </p>

              {/* Quick Topic Badges */}
              <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                <span className="text-stone-400 dark:text-stone-500">
                  <T>Featured tracks:</T>
                </span>
                <span className="rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1">
                  <T>Nepal FY 2083/84 (0.5% Fee + 13% VAT)</T>
                </span>
                <span className="rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1">
                  <T>Vyapar vs Tally vs Marg vs Orivraa</T>
                </span>
                <span className="rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1">
                  <T>HUID Hallmarking</T>
                </span>
                <span className="rounded-md border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1">
                  <T>Dubai 5% VAT &amp; UK 20%</T>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {/* ── Lead Editorial Spotlight (Featured Post) ────────── */}
          {featured && (
            <section className="mb-14">
              <div className="overflow-hidden rounded-2xl border border-amber-200/90 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 p-7 shadow-sm transition-all sm:p-10">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                  {/* Content Column */}
                  <div className="lg:col-span-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/50 px-2.5 py-1 font-semibold text-amber-900 dark:text-amber-300">
                        <Tag className="h-3 w-3" />
                        <T>{featured.category}</T>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formattedFeaturedDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <T>{featured.readTime}</T>
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white sm:text-3xl lg:text-[2rem] leading-tight">
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="transition hover:text-amber-700 dark:hover:text-amber-400"
                      >
                        <T>{featured.title}</T>
                      </Link>
                    </h2>

                    <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300">
                      <T>{featured.description}</T>
                    </p>

                    {/* Quick Takeaways Strip */}
                    <div className="mt-5 grid gap-2 sm:grid-cols-2 text-xs text-stone-700 dark:text-stone-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span><T>GST split across metal &amp; making charges</T></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span><T>Old gold exchange &amp; buy-back workflows</T></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span><T>Offline counter POS with desktop sync</T></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span><T>Pricing breakdown: Free tier up to Pro</T></span>
                      </div>
                    </div>

                    {/* Author & Action */}
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-amber-200/60 dark:border-stone-800 pt-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                            {featured.author}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            <T>{featured.authorRole}</T>
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${featured.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-amber-700 hover:gap-2.5"
                      >
                        <T>Read full guide</T>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Benchmark Preview Callout Column */}
                  <div className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 p-5 shadow-xs">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <T>Direct Comparison</T>
                    </p>
                    <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">
                      <T>Which software fits your jewellery shop?</T>
                    </p>
                    <div className="mt-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">Orivraa</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium"><T>Jewellery-first · ₹299/mo</T></span>
                      </div>
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                        <span className="text-stone-600 dark:text-stone-400">Vyapar</span>
                        <span className="text-stone-500"><T>Generic retail billing</T></span>
                      </div>
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                        <span className="text-stone-600 dark:text-stone-400">TallyPrime</span>
                        <span className="text-stone-500"><T>Accounting powerhouse</T></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600 dark:text-stone-400">Marg ERP</span>
                        <span className="text-stone-500"><T>Legacy desktop module</T></span>
                      </div>
                    </div>
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="mt-4 block text-center text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
                    >
                      <T>View complete benchmark table →</T>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Client Island: Search, Topic Filters & Curated Pillars ─ */}
          <BlogExplorer posts={BLOG_POSTS} />

          {/* ── Commercial Cross-Linking Solutions Bar ──────────── */}
          <section className="mt-20 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <Link
                href="/jewellery-shop-software"
                className="group rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 p-5 transition hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/20"
              >
                <div className="mb-2 text-amber-600 dark:text-amber-400 font-semibold text-sm flex items-center justify-between">
                  <span><T>Jewellery Billing Software</T></span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  <T>
                    GST-ready invoices with making charges, stone deduction, old
                    gold buy-backs, and weight in grams or tola.
                  </T>
                </p>
              </Link>

              <Link
                href="/dashboard/shop/supply-chain"
                className="group rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 p-5 transition hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/20"
              >
                <div className="mb-2 text-amber-600 dark:text-amber-400 font-semibold text-sm flex items-center justify-between">
                  <span><T>Karigar Ledger &amp; Workshop</T></span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  <T>
                    Track metal issue/return, stages, QC checks, and Karigar gold
                    loss tolerance down to the milligram.
                  </T>
                </p>
              </Link>

              <Link
                href="/pricing"
                className="group rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 p-5 transition hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/20"
              >
                <div className="mb-2 text-amber-600 dark:text-amber-400 font-semibold text-sm flex items-center justify-between">
                  <span><T>Global Multi-Country Plans</T></span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  <T>
                    Free tier for independent goldsmiths; Pro plans tailored for
                    Nepal, India, UAE, UK, and USA.
                  </T>
                </p>
              </Link>
            </div>
          </section>

          {/* ── Conversion Section ──────────────────────────────── */}
          <section className="mt-14 rounded-2xl bg-stone-900 dark:bg-stone-925 p-8 text-center text-white sm:p-12 border border-stone-800">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-serif">
              <T>Run Your Jewellery Business with Precision</T>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-stone-400">
              <T>
                Join jewellers across Nepal, India, Dubai, UK, and USA using
                Orivraa to eliminate billing errors, automate GST reports, and
                protect workshop margins.
              </T>
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto rounded-xl bg-amber-500 px-7 py-3 text-xs sm:text-sm font-bold text-stone-950 shadow transition hover:bg-amber-400"
              >
                <T>Start Free — No Credit Card Needed</T>
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="w-full sm:w-auto rounded-xl border border-stone-700 px-7 py-3 text-xs sm:text-sm font-semibold text-stone-300 transition hover:bg-stone-800 hover:text-white"
              >
                <T>Explore All Software Capabilities</T>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <DynamicFooter />
    </>
  );
}
