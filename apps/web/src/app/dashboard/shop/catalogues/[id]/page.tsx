"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { catalogueApi, inventoryApi } from "@/lib/api";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  Monitor,
  Plus,
  QrCode,
  Save,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface CatalogueItem {
  id: string;
  inventoryItemId: string;
  sortOrder: number;
  overridePrice?: number;
  isHidden: boolean;
  inventoryItem: {
    id: string;
    title: string;
    titleNe?: string;
    metal?: string;
    purity?: string;
    images: string[];
    totalPriceNpr?: number;
    status: string;
    visibility: string;
    variants?: { id: string; size: string; stock: number }[];
  };
}

interface Catalogue {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPublic: boolean;
  mode: string;
  passwordHash?: string;
  expiresAt?: string;
  createdAt: string;
  items: CatalogueItem[];
  _count: { viewEvents: number };
}

export default function CatalogueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItems, setShowAddItems] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    mode: "",
    isPublic: true,
    password: "",
    expiresAt: "",
  });

  const fetchCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await catalogueApi.getById(id);
      setCatalogue(res.data);
      setEditForm({
        name: res.data.name,
        description: res.data.description || "",
        mode: res.data.mode,
        isPublic: res.data.isPublic,
        password: "",
        expiresAt: res.data.expiresAt
          ? new Date(res.data.expiresAt).toISOString().slice(0, 16)
          : "",
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to load catalogue" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await catalogueApi.getAnalytics(id);
      setAnalytics(res.data);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchCatalogue();
    fetchAnalytics();
  }, [fetchCatalogue, fetchAnalytics]);

  const catalogueUrl = catalogue
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${catalogue.slug}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(catalogueUrl);
    toast({ title: "Link copied!" });
  };

  // Search inventory items to add
  const searchInventory = async (query: string) => {
    if (!user?.shop?.id) return;
    try {
      setSearchLoading(true);
      const res = await inventoryApi.getShopInventory(user.shop.id, {
        search: query,
        limit: 20,
      });
      const existing = new Set(
        catalogue?.items.map((i) => i.inventoryItemId) || [],
      );
      setAvailableItems(
        (res.data.items || res.data.data || res.data || []).filter(
          (item: any) => !existing.has(item.id) && item.visibility !== "HIDDEN",
        ),
      );
    } catch {
      toast({ variant: "destructive", title: "Failed to search inventory" });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddItem = async (inventoryItemId: string) => {
    try {
      await catalogueApi.addItem(id, {
        inventoryItemId,
        sortOrder: catalogue?.items.length || 0,
      });
      toast({ title: "Item added!" });
      setAvailableItems(availableItems.filter((i) => i.id !== inventoryItemId));
      fetchCatalogue();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Failed to add item",
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await catalogueApi.removeItem(id, itemId);
      toast({ title: "Item removed" });
      fetchCatalogue();
    } catch {
      toast({ variant: "destructive", title: "Failed to remove item" });
    }
  };

  const handleToggleHidden = async (item: CatalogueItem) => {
    try {
      await catalogueApi.updateItem(id, item.id, { isHidden: !item.isHidden });
      fetchCatalogue();
    } catch {
      toast({ variant: "destructive", title: "Failed to update item" });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const data: any = {};
      if (editForm.name !== catalogue?.name) data.name = editForm.name;
      if (editForm.description !== (catalogue?.description || ""))
        data.description = editForm.description;
      if (editForm.mode !== catalogue?.mode) data.mode = editForm.mode;
      if (editForm.isPublic !== catalogue?.isPublic)
        data.isPublic = editForm.isPublic;
      if (editForm.password) data.password = editForm.password;
      if (editForm.expiresAt)
        data.expiresAt = new Date(editForm.expiresAt).toISOString();

      if (Object.keys(data).length === 0) {
        toast({ title: "No changes to save" });
        return;
      }

      await catalogueApi.update(id, data);
      toast({ title: "Settings saved!" });
      setShowSettings(false);
      fetchCatalogue();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Failed to save",
      });
    }
  };

  if (loading || !catalogue) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/shop/catalogues")}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {catalogue.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {catalogue.items.length} items · {catalogue._count.viewEvents}{" "}
                views ·{" "}
                {catalogue.mode === "SHOWROOM"
                  ? "Showroom Mode"
                  : "Normal Mode"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowQr(!showQr)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="QR Code"
            >
              <QrCode className="h-5 w-5" />
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </button>
            <a
              href={`/c/${catalogue.slug}${catalogue.mode === "SHOWROOM" ? "?mode=showroom" : ""}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gold-600 text-white hover:bg-gold-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {catalogue.mode === "SHOWROOM" ? "Open Showroom" : "Preview"}
            </a>
          </div>
        </div>

        {/* Share Link */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <code className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
              {catalogueUrl}
            </code>
            <button
              onClick={copyLink}
              className="text-gold-600 hover:text-gold-700 text-xs font-medium"
            >
              Copy
            </button>
          </div>
        </div>

        {/* QR Code Panel */}
        {showQr && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              QR Code
            </h3>
            <div className="inline-block p-4 bg-white rounded-xl">
              {/* Using a QR code API for simplicity */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(catalogueUrl)}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Scan this QR code to open the catalogue on any device
            </p>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Catalogue Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mode
                </label>
                <select
                  value={editForm.mode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mode: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="SHOWROOM">Showroom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password (leave empty to keep current)
                </label>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  placeholder="Enter new password or leave empty"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="datetime-local"
                  value={editForm.expiresAt}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expiresAt: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Public
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditForm({ ...editForm, isPublic: !editForm.isPublic })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.isPublic
                      ? "bg-gold-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      editForm.isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gold-600 hover:bg-gold-700 rounded-lg"
              >
                <Save className="h-4 w-4" />
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <BarChart3 className="h-5 w-5 text-gold-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.totalViews}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Views
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <Eye className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.uniqueViewers}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Unique Viewers
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <Monitor className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {catalogue.items.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Items
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Catalogue Items ({catalogue.items.length})
            </h3>
            <button
              onClick={() => {
                setShowAddItems(!showAddItems);
                if (!showAddItems) searchInventory("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gold-600 text-white hover:bg-gold-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Items
            </button>
          </div>

          {/* Add Items Panel */}
          {showAddItems && (
            <div className="border-b border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchInventory(e.target.value);
                  }}
                  placeholder="Search your inventory..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              {searchLoading ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Searching...
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  No items found. All inventory items may already be added.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.nameEn || item.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.nameEn || item.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.jewelleryType || item.metal} · NPR{" "}
                          {item.totalPriceNpr?.toLocaleString() || "N/A"}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddItem(item.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-gold-100 dark:bg-gold-900/30 text-gold-600 hover:bg-gold-200 dark:hover:bg-gold-900/50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items */}
          {catalogue.items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No items in this catalogue yet.</p>
              <p className="text-xs mt-1">
                Click &quot;Add Items&quot; to add products from your inventory.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {catalogue.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 ${
                    item.isHidden ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab flex-shrink-0" />
                  <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                  {item.inventoryItem.images?.[0] ? (
                    <img
                      src={item.inventoryItem.images[0]}
                      alt={item.inventoryItem.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.inventoryItem.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {item.inventoryItem.metal}
                        {item.inventoryItem.purity
                          ? ` · ${item.inventoryItem.purity}`
                          : ""}
                      </span>
                      {item.overridePrice ? (
                        <span className="text-gold-600 font-medium">
                          NPR {item.overridePrice.toLocaleString()} (override)
                        </span>
                      ) : (
                        <span>
                          NPR{" "}
                          {item.inventoryItem.totalPriceNpr?.toLocaleString() ||
                            "N/A"}
                        </span>
                      )}
                      {item.inventoryItem.visibility === "CATALOGUE_ONLY" && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Catalogue Only
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleHidden(item)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={item.isHidden ? "Show item" : "Hide item"}
                    >
                      {item.isHidden ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                      title="Remove from catalogue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
