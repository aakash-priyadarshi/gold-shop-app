"use client";

import { T } from "@/components/ui/T";
import { useTranslation } from "@/providers/translation-provider";
import type { BlogPost } from "@/data/blog-posts";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface Props {
  post: BlogPost;
  related: BlogPost[];
}

export function BlogPostContent({ post, related }: Props) {
  const { locale, t, register } = useTranslation();

  // Register the HTML body for translation
  useEffect(() => {
    if (locale !== "en") {
      register(post.content);
    }
  }, [locale, post.content, register]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/30 via-white to-stone-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="border-b border-stone-100 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <Link
              href="/"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <T>Home</T>
            </Link>
            <span>/</span>
            <Link
              href="/blog"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <T>Blog</T>
            </Link>
            <span>/</span>
            <span className="truncate text-stone-700 dark:text-stone-300 font-medium">
              <T>
                {post.title.length > 50
                  ? post.title.slice(0, 50) + "…"
                  : post.title}
              </T>
            </span>
          </nav>
        </div>
      </div>

      {/* ── Article ─────────────────────────────────────────── */}
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
              <Tag className="h-3 w-3" />
              <T>{post.category}</T>
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
              <span className="text-xs text-stone-400 dark:text-stone-500">
                (<T>Updated</T>{" "}
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
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white sm:text-4xl lg:text-[2.5rem] leading-tight">
            <T>{post.title}</T>
          </h1>
          <p className="mt-4 text-lg text-stone-600 dark:text-stone-300 leading-relaxed">
            <T>{post.description}</T>
          </p>
          <div className="mt-6 flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-stone-700 dark:text-stone-200">
                {post.author}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                <T>{post.authorRole}</T>
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-lg prose-stone max-w-none
            dark:prose-invert
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl prose-h2:text-stone-900 dark:prose-h2:text-white
            prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl prose-h3:text-stone-800 dark:prose-h3:text-stone-200
            prose-p:leading-relaxed prose-p:text-stone-700 dark:prose-p:text-stone-300
            prose-li:text-stone-700 dark:prose-li:text-stone-300 prose-li:leading-relaxed
            prose-strong:text-stone-900 dark:prose-strong:text-white
            prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-table:border-collapse prose-table:text-sm
            prose-th:bg-stone-100 dark:prose-th:bg-stone-800 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-stone-700 dark:prose-th:text-stone-300
            prose-td:border-t prose-td:border-stone-200 dark:prose-td:border-stone-700 prose-td:px-4 prose-td:py-2.5 prose-td:text-stone-600 dark:prose-td:text-stone-400"
          dangerouslySetInnerHTML={{ __html: t(post.content) }}
        />

        {/* Tags */}
        <div className="mt-12 flex flex-wrap gap-2 border-t border-stone-200 dark:border-stone-700 pt-8">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-medium text-stone-600 dark:text-stone-400"
            >
              <T>{tag}</T>
            </span>
          ))}
        </div>
      </article>

      {/* ── Related Posts ───────────────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-white">
              <T>Related Articles</T>
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group flex flex-col rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 p-6 shadow-sm transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700"
                >
                  <span className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <T>{r.category}</T>
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-snug">
                    <T>{r.title}</T>
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                    <T>{r.description}</T>
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:gap-2 transition-all">
                    <T>Read article</T>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Back to Blog + CTA ──────────────────────────────── */}
      <section className="border-t border-stone-100 dark:border-stone-800">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <T>Back to all articles</T>
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
            >
              <T>Try Orivraa Free</T> →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
