"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  ExternalLink,
  Copy,
  BookOpen,
  Monitor,
  BarChart3,
  Lock,
} from "lucide-react";
import { catalogueApi } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "@/hooks/use-toast";

interface Catalogue {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPublic: boolean;
  mode: string;
  passwordHash?: string;
  expiresAt?: string;
  deletedAt?: string;
  createdAt: string;
  _count: {
    items: number;
    viewEvents: number;
  };
}

export default function CataloguesPage() {
  const router = useRouter();
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchCatalogues = async () => {
    try {
      setLoading(true);
      const res = await catalogueApi.getMyCatalogues({ page, limit: 20 });
      setCatalogues(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load catalogues" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogues();
  }, [page]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete catalogue "${name}"? This action can be undone by support.`)) return;
    try {
      await catalogueApi.delete(id);
      toast({ title: "Catalogue deleted" });
      fetchCatalogues();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete catalogue" });
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Catalogues
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create shareable product catalogues for walk-in customers and online sharing
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/shop/catalogues/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Catalogue
          </button>
        </div>

        {/* Catalogues Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : catalogues.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No catalogues yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Create your first catalogue to share your products with walk-in customers via QR code or link.
            </p>
            <button
              onClick={() => router.push("/dashboard/shop/catalogues/new")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-white hover:bg-gold-700"
            >
              <Plus className="h-4 w-4" />
              Create Catalogue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogues.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {cat.mode === "SHOWROOM" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">
                        <Monitor className="h-3 w-3" />
                        Showroom
                      </span>
                    )}
                    {cat.passwordHash && (
                      <Lock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {cat._count.items} items
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {cat._count.viewEvents} views
                  </span>
                  <span className="flex items-center gap-1">
                    {cat.isPublic ? (
                      <Eye className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {cat.isPublic ? "Public" : "Private"}
                  </span>
                </div>

                {/* Expiry */}
                {cat.expiresAt && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                    Expires: {new Date(cat.expiresAt).toLocaleDateString()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => router.push(`/dashboard/shop/catalogues/${cat.id}`)}
                    className="flex-1 text-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 inline mr-1" />
                    Manage
                  </button>
                  <button
                    onClick={() => copyLink(cat.slug)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/c/${cat.slug}`}
                    target="_blank"
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Open catalogue"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page === meta.totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
