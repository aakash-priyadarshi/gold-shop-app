import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BRAND } from "@/config/brand";
import { BLOG_POSTS } from "@/data/blog-posts";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Tag,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────────────────────── */
/*  BLOG LISTING PAGE                                             */
/* ────────────────────────────────────────────────────────────── */

export default function BlogPage() {
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50/40 to-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-amber-400 blur-3xl" />
            <div className="absolute bottom-10 right-20 w-48 h-48 rounded-full bg-amber-300 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 ring-1 ring-amber-400/30">
              <BookOpen className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Orivraa{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-300">
              Expert guides on jewellery shop software, inventory management,
              GST compliance, and growing your gold &amp; diamond business.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {/* ── Featured Post ──────────────────────────────────── */}
          {featured && (
            <section className="mb-16">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-amber-600">
                Featured Article
              </h2>
              <Link
                href={`/blog/${featured.slug}`}
                className="group block overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-sm transition-all hover:shadow-lg hover:border-amber-300"
              >
                <div className="p-8 sm:p-10">
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      <Tag className="h-3 w-3" />
                      {featured.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(featured.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {featured.readTime}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 group-hover:text-amber-700 transition-colors sm:text-3xl">
                    {featured.title}
                  </h3>
                  <p className="mt-3 text-stone-600 leading-relaxed line-clamp-3">
                    {featured.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 group-hover:gap-3 transition-all">
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* ── All Posts Grid ─────────────────────────────────── */}
          <section>
            <h2 className="mb-8 text-sm font-semibold uppercase tracking-wider text-stone-500">
              All Articles
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-amber-200"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                        {post.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-700 transition-colors leading-snug">
                      {post.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-stone-500 line-clamp-3 leading-relaxed">
                      {post.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-stone-400">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
                        Read
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── CTA ────────────────────────────────────────────── */}
          <section className="mt-20 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 p-10 text-center text-white shadow-lg">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to Grow Your Jewellery Business?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-amber-100">
              Join 2,000+ jewellers using {BRAND.name} to manage inventory, sell
              online, and reach international buyers — free to start.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/register"
                className="rounded-xl bg-white px-8 py-3 font-bold text-amber-700 shadow-md transition hover:shadow-lg hover:bg-amber-50"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="rounded-xl border-2 border-white/40 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                See All Features
              </Link>
            </div>
          </section>
        </div>
      </main>
      <DynamicFooter />
    </>
  );
}
