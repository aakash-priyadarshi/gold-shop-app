"use client";

/**
 * WhatsApp Catalogue Share
 *
 * Pick items from your live inventory and share a beautifully formatted
 * WhatsApp message (with public catalogue links + per-item prices) to a
 * customer, broadcast list, or WhatsApp channel.
 *
 * Reuses the same inventoryApi.getShopInventory call as POS so the catalogue
 * is always in sync with what's actually for sale.
 */

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { inventoryApi } from "@/lib/api";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Search,
  Share2,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

interface InventoryItem {
  id: string;
  nameEn: string;
  sku: string;
  images: string[];
  totalPriceNpr: number;
  stockQuantity: number;
  weightGrams?: number;
  metalPurity?: string;
  category?: string;
}

function fmt(n: number, cur: string) {
  return `${cur} ${Math.round(n).toLocaleString("en-IN")}`;
}

function purityLabel(p?: string) {
  if (!p) return "";
  if (p === "0.999" || p === "999") return "24K";
  if (p === "0.916" || p === "916") return "22K";
  if (p === "0.75" || p === "750") return "18K";
  if (p === "0.583" || p === "583") return "14K";
  return p;
}

export default function CataloguePage() {
  const { user } = useAuth();
  const haptic = useHaptics();
  const shopId = user?.shop?.id ?? "";
  const shopName = user?.shop?.shopName ?? "Our Store";
  const shopPhone = user?.shop?.contactPhone ?? user?.shop?.phone ?? "";
  const currency = user?.shop?.currency ?? "NPR";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [intro, setIntro] = useState(
    `Hello! Here are some pieces from ${shopName} you might love 💛`,
  );
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await inventoryApi.getShopInventory(shopId, {
        status: "AVAILABLE",
        limit: 100,
      });
      const list: InventoryItem[] =
        res.data?.items ?? res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.nameEn?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );

  const toggle = (id: string) => {
    haptic("light");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    haptic("light");
    setSelected(new Set());
  };

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://orivraa.com";

  const message = useMemo(() => {
    if (selectedItems.length === 0) return "";
    const lines: string[] = [];
    lines.push(intro);
    lines.push("");
    selectedItems.forEach((it, idx) => {
      const bits: string[] = [];
      if (it.weightGrams) bits.push(`${it.weightGrams}g`);
      const k = purityLabel(it.metalPurity);
      if (k) bits.push(k);
      const meta = bits.length ? ` (${bits.join(" · ")})` : "";
      lines.push(`${idx + 1}. *${it.nameEn}*${meta}`);
      lines.push(`   ${fmt(it.totalPriceNpr ?? 0, currency)} — SKU ${it.sku}`);
      lines.push(`   ${baseUrl}/p/${it.sku}`);
      lines.push("");
    });
    const total = selectedItems.reduce(
      (s, it) => s + (it.totalPriceNpr ?? 0),
      0,
    );
    lines.push(`*Total: ${fmt(total, currency)}*`);
    lines.push("");
    if (shopPhone) lines.push(`📞 ${shopPhone}`);
    lines.push(`_— ${shopName}_`);
    return lines.join("\n");
  }, [selectedItems, intro, currency, baseUrl, shopName, shopPhone]);

  const openWhatsApp = () => {
    if (!message) {
      toast({ title: "Pick at least one item", variant: "destructive" });
      return;
    }
    haptic("success");
    const digits = phone.replace(/\D/g, "");
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noreferrer");
  };

  const copyMessage = async () => {
    if (!message) return;
    haptic("light");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const shareNative = async () => {
    if (!message) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Catalogue from ${shopName}`, text: message });
      } catch {
        /* user cancelled */
      }
    } else {
      copyMessage();
    }
  };

  return (
    <MobileFeatureGate feature="mobileCatalogue" featureName="Catalogue Share">
      <div className="flex flex-col h-full bg-gray-50 pb-32">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-base font-bold text-gray-900">
              <T>Catalogue Share</T>
            </h1>
            <p className="text-[11px] text-gray-400">
              <T>Pick items · share on WhatsApp</T>
            </p>
          </div>
          <MobileHelpButton
            title="WhatsApp Catalogue Share"
            description="Send a personalised catalogue of items from your live inventory to any customer in one tap."
            tips={[
              "Search & tap to select items — selected items get an amber border",
              "Optionally enter the customer's WhatsApp number for direct send",
              "Each item links to a public product page customers can open",
              "Use 'Share' for the system share sheet (Instagram, SMS, email…)",
              "Use 'Copy' to paste into a Broadcast List or Channel",
            ]}
          />
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory by name, SKU, category"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Selection summary */}
        {selected.size > 0 && (
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-amber-700">
                {selected.size} <T>selected</T> ·{" "}
                {fmt(
                  selectedItems.reduce(
                    (s, it) => s + (it.totalPriceNpr ?? 0),
                    0,
                  ),
                  currency,
                )}
              </p>
              <button
                onClick={clearAll}
                className="text-xs font-medium text-amber-700 underline underline-offset-2"
              >
                <T>Clear</T>
              </button>
            </div>
          </div>
        )}

        {/* Inventory grid */}
        <div className="flex-1 overflow-y-auto px-4 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <ShoppingBag className="h-8 w-8" />
              <p className="text-sm">
                <T>No items match your search</T>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((it) => {
                const isSelected = selected.has(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggle(it.id)}
                    className={`text-left rounded-2xl border bg-white overflow-hidden transition-all ${
                      isSelected
                        ? "border-amber-500 ring-2 ring-amber-200"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-50">
                      {it.images?.[0] ? (
                        <Image
                          src={it.images[0]}
                          alt={it.nameEn}
                          fill
                          sizes="(max-width: 768px) 50vw, 200px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                        {it.nameEn}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {purityLabel(it.metalPurity)}
                        {it.weightGrams ? ` · ${it.weightGrams}g` : ""}
                      </p>
                      <p className="text-xs font-bold text-amber-700">
                        {fmt(it.totalPriceNpr ?? 0, currency)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky compose + send */}
        {selected.size > 0 && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-3 bg-white border-t border-gray-100 space-y-2">
            <input
              type="text"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Intro message"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Customer WhatsApp (optional) — leave blank to pick a chat"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex gap-2">
              <button
                onClick={copyMessage}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 active:bg-gray-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={shareNative}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 active:bg-gray-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <button
                onClick={openWhatsApp}
                className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileFeatureGate>
  );
}
