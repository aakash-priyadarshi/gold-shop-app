"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Monitor, Lock, Globe } from "lucide-react";
import { catalogueApi } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "@/hooks/use-toast";

export default function NewCataloguePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    mode: "NORMAL",
    isPublic: true,
    password: "",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Please enter a catalogue name" });
      return;
    }

    try {
      setLoading(true);
      const data: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        mode: form.mode,
        isPublic: form.isPublic,
      };
      if (form.password) data.password = form.password;
      if (form.expiresAt) data.expiresAt = new Date(form.expiresAt).toISOString();

      const res = await catalogueApi.create(data);
      toast({ title: "Catalogue created!" });
      router.push(`/dashboard/shop/catalogues/${res.data.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.response?.data?.message || "Failed to create catalogue" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Catalogue
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set up a shareable product catalogue for your customers
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catalogue Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Wedding Collection 2025"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this catalogue..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Display Mode
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "NORMAL" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.mode === "NORMAL"
                    ? "border-gold-500 bg-gold-50 dark:bg-gold-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <BookOpen
                  className={`h-6 w-6 mb-2 ${
                    form.mode === "NORMAL" ? "text-gold-600" : "text-gray-400"
                  }`}
                />
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  Normal
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Standard grid view, great for online sharing
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: "SHOWROOM" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.mode === "SHOWROOM"
                    ? "border-gold-500 bg-gold-50 dark:bg-gold-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Monitor
                  className={`h-6 w-6 mb-2 ${
                    form.mode === "SHOWROOM" ? "text-gold-600" : "text-gray-400"
                  }`}
                />
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  Showroom
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Full-screen immersive, ideal for tablet walk-ins
                </div>
              </button>
            </div>
          </div>

          {/* Visibility & Security */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Visibility & Security
            </h2>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Public Access
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Anyone with the link can view this catalogue
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.isPublic ? "bg-gold-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    form.isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Lock className="h-4 w-4" />
                Password Protection (optional)
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave empty for no password"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gold-600 hover:bg-gold-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Catalogue"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
