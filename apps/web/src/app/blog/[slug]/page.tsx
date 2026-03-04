import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BRAND } from "@/config/brand";
import { BLOG_POSTS, getBlogPost, getRelatedPosts } from "@/data/blog-posts";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Share2,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

/* ────────────────────────────────────────────────────────────── */
/*  STATIC PARAMS                                                 */
/* ────────────────────────────────────────────────────────────── */

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

/* ────────────────────────────────────────────────────────────── */
/*  DYNAMIC METADATA                                              */
/* ────────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return {
    title: `${post.title} | ${BRAND.name} Blog`,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.orivraa.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

/* ────────────────────────────────────────────────────────────── */
/*  PAGE                                                          */
/* ────────────────────────────────────────────────────────────── */

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug, 3);

  /* Article JSON-LD */
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      "@type": "Organization",
      name: BRAND.name,
      url: "https://www.orivraa.com",
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: "https://www.orivraa.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.orivraa.com/icons/icon-512x512.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.orivraa.com/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  /* BreadcrumbList JSON-LD */
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
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
        name: "Blog",
        item: "https://www.orivraa.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://www.orivraa.com/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50/30 to-white">
        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <div className="border-b border-stone-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
            <nav className="flex items-center gap-2 text-sm text-stone-500">
              <Link
                href="/"
                className="hover:text-amber-600 transition-colors"
              >
                Home
              </Link>
              <span>/</span>
              <Link
                href="/blog"
                className="hover:text-amber-600 transition-colors"
              >
                Blog
              </Link>
              <span>/</span>
              <span className="truncate text-stone-700 font-medium">
                {post.title.length > 50
                  ? post.title.slice(0, 50) + "…"
                  : post.title}
              </span>
            </nav>
          </div>
        </div>

        {/* ── Article ─────────────────────────────────────────── */}
        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          {/* Header */}
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                <Tag className="h-3 w-3" />
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {post.updated && post.updated !== post.date && (
                <span className="text-xs text-stone-400">
                  (Updated{" "}
                  {new Date(post.updated).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  )
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.5rem] leading-tight">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-stone-600 leading-relaxed">
              {post.description}
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-stone-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-stone-700">{post.author}</p>
                <p className="text-xs text-stone-400">{post.authorRole}</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <div
            className="prose prose-lg prose-stone max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl prose-h2:text-stone-900
              prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl prose-h3:text-stone-800
              prose-p:leading-relaxed prose-p:text-stone-700
              prose-li:text-stone-700 prose-li:leading-relaxed
              prose-strong:text-stone-900
              prose-a:text-amber-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-table:border-collapse prose-table:text-sm
              prose-th:bg-stone-100 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-stone-700
              prose-td:border-t prose-td:border-stone-200 prose-td:px-4 prose-td:py-2.5 prose-td:text-stone-600"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          <div className="mt-12 flex flex-wrap gap-2 border-t border-stone-200 pt-8">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </article>

        {/* ── Related Posts ───────────────────────────────────── */}
        {related.length > 0 && (
          <section className="border-t border-stone-100 bg-stone-50/50">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
              <h2 className="mb-8 text-center text-2xl font-bold text-stone-900">
                Related Articles
              </h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group flex flex-col rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-amber-200"
                  >
                    <span className="mb-2 text-xs font-medium text-amber-600">
                      {r.category}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-700 transition-colors leading-snug">
                      {r.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-stone-500 line-clamp-2">
                      {r.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
                      Read article
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Back to Blog + CTA ──────────────────────────────── */}
        <section className="border-t border-stone-100">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-amber-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all articles
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
              >
                Try Orivraa Free →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
