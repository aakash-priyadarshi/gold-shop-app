"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { pagesApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface StaticPageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
}

export function StaticPageView({ slug }: { slug: string }) {
  const [page, setPage] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await pagesApi.getBySlug(slug);
        setPage(res.data);
      } catch (err: any) {
        setError(
          err?.response?.status === 404
            ? "This page has not been published yet."
            : "Failed to load page content.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{error}</p>
          </div>
        )}

        {page && (
          <article>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              {page.title}
            </h1>
            <div
              className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:text-gray-900 dark:prose-headings:text-white
                prose-p:text-gray-600 dark:prose-p:text-gray-300
                prose-li:text-gray-600 dark:prose-li:text-gray-300
                prose-a:text-amber-600 dark:prose-a:text-amber-400
                prose-strong:text-gray-900 dark:prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        )}
      </main>

      <DynamicFooter />
    </div>
  );
}
