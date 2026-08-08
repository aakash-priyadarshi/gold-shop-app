"use client";

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { inventoryApi, materialsApi } from "@/lib/api";
import { printJewelleryTags } from "@/lib/jewelleryTagPrint";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  ArrowRightLeft,
  Coins,
  Loader2,
  Package,
  Plus,
  Printer,
  Search,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function MobileStockPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useT();

  // Tickers and Live Market Rates State
  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
  });

  // Stock State (Database backed)
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Transfer Drawer State
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    tag: "",
    newLocation: "Showcase-A",
  });

  // Add Item Drawer State
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    tag: "",
    huid: "",
    name: "",
    purity: "22K (916)",
    grossWeight: "",
    netWeight: "",
    stoneWeight: "0",
    location: "Showcase-A",
  });

  // Read metal rate function
  const readMetalRate = (data: any, codes: string[]): number => {
    const metals = data?.metals;
    if (Array.isArray(metals)) {
      const match = metals.find((m: any) => codes.includes(m.code));
      return Number(match?.ratePerGram ?? match?.rate ?? 0);
    }
    if (metals && typeof metals === "object") {
      for (const code of codes) {
        const value = metals[code];
        if (typeof value === "number") return value;
        if (value && typeof value === "object") return Number(value.ratePerGram ?? value.rate ?? 0);
      }
    }
    return 0;
  };

  const fetchRates = useCallback(async () => {
    try {
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const data = res.data;
      const rate24k = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]) || 7250;
      setGoldRates({
        rate24k: Math.round(rate24k),
        rate22k: Math.round(readMetalRate(data, ["GOLD_22K"]) || rate24k * (22 / 24)),
        rate18k: Math.round(readMetalRate(data, ["GOLD_18K"]) || rate24k * (18 / 24)),
        silver: Math.round(readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]) || 85),
        currency: data?.currency ?? params.currency ?? "INR",
      });
    } catch {
      // safe fallback remains
    }
  }, [user?.shop]);

  const fetchStock = useCallback(async () => {
    if (!user?.shop?.id) return;
    setLoading(true);
    try {
      const res = await inventoryApi.getShopInventory(user.shop.id);
      const items = res.data?.items || res.data || [];
      const mapped = items.map((item: any) => {
        const location = item.labels?.find((l: string) => l.includes("Showcase") || l.includes("Safe") || l.includes("Vault") || l.includes("Workbench")) || "Showcase-A";
        const status = location.includes("Safe") || location.includes("Vault") ? "IN_VAULT" : "ON_DISPLAY";
        
        let purity = "22K (916)";
        if (item.composition?.baseAlloy?.purity) {
          purity = item.composition.baseAlloy.purity;
        } else if (item.composition?.purity) {
          purity = item.composition.purity;
        }

        return {
          id: item.id,
          tag: item.sku,
          huid: item.hallmarkNumber || "HUID-UNTG-" + Math.floor(Math.random() * 9000 + 1000),
          name: item.nameEn,
          purity: purity,
          grossWeight: item.totalWeightGrams,
          netWeight: item.totalWeightGrams,
          stoneWeight: 0,
          location: location,
          status: status,
          rawItem: item
        };
      });
      setStock(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.shop?.id]);

  useEffect(() => {
    fetchRates();
    fetchStock();
  }, [fetchRates, fetchStock]);

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(goldRates.currency === "NPR" ? "ne-NP" : "en-IN", {
        style: "currency",
        currency: goldRates.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${goldRates.currency} ${amount.toLocaleString()}`;
    }
  };

  // Calculate physical valuation based on metal rates
  const calculateItemValuation = (item: any): number => {
    let rate = goldRates.rate22k; // default
    if (item.purity.includes("24K")) rate = goldRates.rate24k;
    else if (item.purity.includes("18K")) rate = goldRates.rate18k;
    else if (item.purity.includes("Sterling") || item.purity.includes("Silver")) rate = goldRates.silver;

    const metalVal = item.netWeight * rate;
    const craftVal = metalVal * 0.12; 
    const stoneVal = item.stoneWeight * (rate * 4.5); 

    return metalVal + craftVal + stoneVal;
  };

  const grandValuation = stock.reduce((sum, item) => sum + calculateItemValuation(item), 0);
  const totalItemsCount = stock.length;
  const vaultItemsCount = stock.filter((s) => s.status === "IN_VAULT").length;
  const showcaseItemsCount = stock.filter((s) => s.status === "ON_DISPLAY").length;

  // Location transfer handler
  const handleTransfer = async () => {
    const targetItem = stock.find((s) => s.tag === transferForm.tag);
    if (!targetItem || !user?.shop?.id) return;
    
    try {
      const otherLabels = targetItem.rawItem.labels?.filter((l: string) => !l.includes("Showcase") && !l.includes("Safe") && !l.includes("Vault") && !l.includes("Workbench")) || [];
      const updatedLabels = [...otherLabels, transferForm.newLocation];
      
      await inventoryApi.update(targetItem.id, {
        labels: updatedLabels
      });
      setTransferOpen(false);
      await fetchStock();
    } catch (err) {
      console.error(err);
      alert("Failed to update stock location!");
    }
  };

  // Add Item handler
  const handleAddItem = async () => {
    const gross = parseFloat(addForm.grossWeight);
    const net = parseFloat(addForm.netWeight);
    const stone = parseFloat(addForm.stoneWeight);
    if (!addForm.tag || !addForm.name || isNaN(gross) || isNaN(net) || !user?.shop?.id) {
      alert("Please fill all required fields correctly!");
      return;
    }

    try {
      await inventoryApi.create(user.shop.id, {
        sku: addForm.tag.toUpperCase(),
        nameEn: addForm.name,
        jewelleryType: "RING",
        buildMethod: "METHOD_B",
        composition: { baseAlloy: { metal: "GOLD", purity: addForm.purity } },
        totalWeightGrams: gross,
        metalValueNpr: 0,
        makingChargeNpr: 0,
        totalPriceNpr: 0,
        labels: [addForm.location],
        hallmarkNumber: addForm.huid.toUpperCase(),
        status: "AVAILABLE"
      });

      setAddForm({
        tag: "",
        huid: "",
        name: "",
        purity: "22K (916)",
        grossWeight: "",
        netWeight: "",
        stoneWeight: "0",
        location: "Showcase-A",
      });
      setAddOpen(false);
      await fetchStock();
    } catch (err) {
      console.error(err);
      alert("Failed to inward stock piece!");
    }
  };

  const filteredStock = stock.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.huid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      locationFilter === "ALL" ||
      (locationFilter === "VAULT" && s.status === "IN_VAULT") ||
      (locationFilter === "SHOWCASE" && s.status === "ON_DISPLAY");

    return matchesSearch && matchesLocation;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/m/more" className="p-1 rounded-lg hover:bg-gray-150 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Package className="h-5 w-5 text-amber-500" />
              <T>Stock Ledger</T>
            </h1>
            <p className="text-[10px] text-muted-foreground"><T>Manage finished ready tag stock</T></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="h-8 px-2.5 bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="h-3.5 w-3.5" />
            <T>Inward</T>
          </button>
          <MobileHelpButton
            title="Stock Ledger"
            description="Manage finished ready-tag jewelry stock in real-time, relocate assets between showcases and the vault, and inward new pieces."
            tips={[
              "Tap Inward to register a new finished jewelry piece into database inventory",
              "Use the transfer icon next to any item to move it between Counters and Strongroom Vault",
              "Valuation is dynamically adjusted using the live metal rate feed",
              "Filter stock by counter showcase display versus main safe vault reserves",
            ]}
          />
        </div>
      </div>

      {/* Tickers Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-y border-amber-500/15 py-1.5 px-4 flex justify-between items-center text-[10px] tracking-wide text-amber-600 dark:text-amber-400 font-semibold overflow-x-auto whitespace-nowrap">
        <span>24K: {formatCurrency(goldRates.rate24k)}/g</span>
        <span>22K: {formatCurrency(goldRates.rate22k)}/g</span>
        <span>18K: {formatCurrency(goldRates.rate18k)}/g</span>
        <span>Silver: {formatCurrency(goldRates.silver)}/g</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Dynamic Valuation metrics Card */}
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/15 dark:to-gray-900 border border-amber-250/20 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block leading-none"><T>Total Finished Valuation</T></span>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 leading-none pt-0.5">{formatCurrency(grandValuation)}</p>
            <span className="text-[9px] text-muted-foreground block"><T>Showcases</T>: {showcaseItemsCount} &middot; <T>Safe Vault</T>: {vaultItemsCount}</span>
          </div>
          <div className="h-10 w-10 bg-amber-500/10 dark:bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder={t("Search tag, HUID, name...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-2 text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="ALL">{t("All Locations")}</option>
            <option value="SHOWCASE">{t("Showcases")}</option>
            <option value="VAULT">{t("Main Safe")}</option>
          </select>
        </div>

        {/* Database Stock list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <p className="text-xs text-muted-foreground"><T>Loading database inventory...</T></p>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 border rounded-2xl p-6 text-xs text-muted-foreground">
            <T>No ready tag items found. Inward completed pieces to track them.</T>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStock.map((item) => (
              <div
                key={item.tag}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {item.tag}
                      </span>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {item.huid}
                      </span>
                    </div>
                  </div>
                  <Badge variant={item.status === "ON_DISPLAY" ? "outline" : "secondary"} className={item.status === "ON_DISPLAY" ? "border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400" : ""}>
                    {item.location}
                  </Badge>
                </div>

                <div className="flex justify-between items-center border-t dark:border-gray-800 pt-3">
                  <div className="text-[11px] text-muted-foreground">
                    <p className="font-semibold text-gray-900 dark:text-gray-200">{item.purity}</p>
                    <p>{item.grossWeight.toFixed(2)}g G / {item.netWeight.toFixed(2)}g N</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                      {formatCurrency(calculateItemValuation(item))}
                    </span>
                    <button
                      onClick={() => {
                        try {
                          printJewelleryTags([
                            {
                              sku: item.tag,
                              name: item.name,
                              purity: item.purity,
                              weightGrams: item.netWeight,
                              price: calculateItemValuation(item),
                              currency: goldRates.currency,
                              hallmark: item.huid,
                              shopName: user?.shop?.shopName,
                            },
                          ]);
                        } catch {
                          // popup blocked
                        }
                      }}
                      className="h-8 w-8 bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-gray-600 dark:text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                      aria-label="Print tag"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setTransferForm({ tag: item.tag, newLocation: item.location });
                        setTransferOpen(true);
                      }}
                      className="h-8 w-8 bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-gray-600 dark:text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── DRAWERS / MOBILE OVERLAYS ─── */}
      {/* 1. Location Transfer Drawer */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-2 border-b dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Relocate Stock Asset</T></h3>
              <button onClick={() => setTransferOpen(false)} className="p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500"><T>Unique Barcode Tag</T></Label>
                <Input value={transferForm.tag} disabled className="bg-gray-50 dark:bg-gray-950 font-mono text-xs text-gray-900 dark:text-gray-100" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500"><T>Select showcase / safe location</T></Label>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {["Showcase-A", "Showcase-B", "Main-Safe", "Artisan-Workbench"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setTransferForm((p) => ({ ...p, newLocation: loc }))}
                      className={`p-3 rounded-xl border text-center font-semibold ${transferForm.newLocation === loc ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 text-gray-700 dark:text-gray-300"}`}
                    >
                      {loc === "Showcase-A" && "Showcase A (Counters)"}
                      {loc === "Showcase-B" && "Showcase B (Counters)"}
                      {loc === "Main-Safe" && "Safe Vault (Strongroom)"}
                      {loc === "Artisan-Workbench" && "Karigar Workshop"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                <Button variant="ghost" size="sm" onClick={() => setTransferOpen(false)} className="text-gray-650 dark:text-gray-400"><T>Cancel</T></Button>
                <Button className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600" size="sm" onClick={handleTransfer}><T>Confirm Transfer</T></Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inward Finished Piece Drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-2 border-b dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Inward Finished Jewelry</T></h3>
              <button onClick={() => setAddOpen(false)} className="p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3.5 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-gray-650 dark:text-gray-400"><T>Barcode Tag</T> *</Label>
                  <Input
                    placeholder="TAG-G-406"
                    value={addForm.tag}
                    onChange={(e) => setAddForm((p) => ({ ...p, tag: e.target.value }))}
                    className="bg-white dark:bg-gray-955 text-xs text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-655 dark:text-gray-400"><T>HUID Code</T></Label>
                  <Input
                    placeholder="HUID-8X4W3P"
                    value={addForm.huid}
                    onChange={(e) => setAddForm((p) => ({ ...p, huid: e.target.value }))}
                    className="bg-white dark:bg-gray-955 text-xs text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-655 dark:text-gray-400"><T>Product Name</T> *</Label>
                <Input
                  placeholder="Classic Gold rope chain"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-white dark:bg-gray-955 text-xs text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-gray-655 dark:text-gray-400"><T>Purity</T></Label>
                  <select
                    value={addForm.purity}
                    onChange={(e) => setAddForm((p) => ({ ...p, purity: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none"
                  >
                    <option value="24K (999)">24K (999 Fine)</option>
                    <option value="22K (916)">22K (916 Standard)</option>
                    <option value="18K (750)">18K (750 Gold)</option>
                    <option value="92.5 Sterling">92.5 Silver</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-655 dark:text-gray-400"><T>Physical Location</T></Label>
                  <select
                    value={addForm.location}
                    onChange={(e) => setAddForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none"
                  >
                    <option value="Showcase-A">Showcase A</option>
                    <option value="Showcase-B">Showcase B</option>
                    <option value="Main-Safe">Main Safe Vault</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-gray-655 dark:text-gray-400"><T>Gross Weight (g)</T> *</Label>
                  <Input
                    type="number"
                    placeholder="15.5"
                    value={addForm.grossWeight}
                    onChange={(e) => setAddForm((p) => ({ ...p, grossWeight: e.target.value }))}
                    className="bg-white dark:bg-gray-955 text-xs text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-655 dark:text-gray-400"><T>Net Weight (g)</T> *</Label>
                  <Input
                    type="number"
                    placeholder="14.8"
                    value={addForm.netWeight}
                    onChange={(e) => setAddForm((p) => ({ ...p, netWeight: e.target.value }))}
                    className="bg-white dark:bg-gray-955 text-xs text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)} className="text-gray-655 dark:text-gray-400"><T>Cancel</T></Button>
                <Button className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600" size="sm" onClick={handleAddItem}><T>Inward Piece</T></Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
