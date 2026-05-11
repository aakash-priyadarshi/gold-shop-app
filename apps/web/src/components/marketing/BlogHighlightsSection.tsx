"use client";

import { T } from "@/components/ui/T";
import { BLOG_POSTS } from "@/data/blog-posts";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import Link from "next/link";

type BlogHighlightsSectionProps = {
  title?: string;
  description?: string;
  slugs?: string[];
  ctaLabel?: string;
};

function getPosts(slugs?: string[]) {
  if (!slugs?.length) {
    return BLOG_POSTS.slice(0, 3);
  }

  const selected = slugs
    .map((slug) => BLOG_POSTS.find((post) => post.slug === slug))
    .filter((post): post is (typeof BLOG_POSTS)[number] => Boolean(post));

  const fallback = BLOG_POSTS.filter(
    (post) => !selected.some((item) => item.slug === post.slug),
  );

  return [...selected, ...fallback].slice(0, 3);
}

export function BlogHighlightsSection({
  title = "Latest From the Orivraa Blog",
  description = "Fresh guides on billing software, tax reports, GST workflows, and practical ways jewellers can save time and money.",
  slugs,
  ctaLabel = "View all articles",
}: BlogHighlightsSectionProps) {
  const posts = getPosts(slugs);

  if (!posts.length) {
    return null;
  }

  return (
    <section className="py-20 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-5">
            <BookOpen className="h-4 w-4" />
            <T>Blog highlights</T>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            <T>{title}</T>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            <T>{description}</T>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-800 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {post.category}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                <T>{post.title}</T>
              </h3>
              <p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
                <T>{post.description}</T>
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 group-hover:gap-3 transition-all">
                <T>Read article</T>
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:gap-3 transition-all"
          >
            <T>{ctaLabel}</T>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}