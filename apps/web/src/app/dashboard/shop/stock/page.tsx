"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { inventoryApi, materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import { Loader2 } from "lucide-react";
import {
  ArrowRightLeft,
  Coins,
  Package,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function StockLedgerPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <StockLedgerContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function StockLedgerContent() {
  const { user } = useAuth();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const t = useT();

  // Tickers and Live Market Rates State
  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
    updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    changePercent: 0.85,
  });
  const ratesRef = useRef(false);

  // Stock State (Database backed)
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    tag: "",
    newLocation: "Showcase-A",
  });

  // Add Item Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
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
    if (ratesRef.current) return;
    ratesRef.current = true;
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
        updatedAt: data?.updatedAt
          ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        changePercent: data?.changePercent ?? 0.85,
      });
    } catch {
      // safe fallback remains
    } finally {
      ratesRef.current = false;
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
    const interval = setInterval(() => {
      ratesRef.current = false;
      fetchRates();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

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
    const craftVal = metalVal * 0.12; // 12% making charge estimation
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
      // Remove other location labels
      const otherLabels = targetItem.rawItem.labels?.filter((l: string) => !l.includes("Showcase") && !l.includes("Safe") && !l.includes("Vault") && !l.includes("Workbench")) || [];
      const updatedLabels = [...otherLabels, transferForm.newLocation];
      
      await inventoryApi.update(targetItem.id, {
        labels: updatedLabels
      });
      setTransferModalOpen(false);
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
      setAddModalOpen(false);
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
    <div className="space-y-6">
      {/* Rate Feed Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <T>Stock Valuation Live Feed</T>
            </p>
            <p className="text-[10px] text-muted-foreground">
              <T>Market Conversion Rate</T>: 1g 24K = {formatCurrency(goldRates.rate24k)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right text-xs">
            <span className="text-muted-foreground">Gold 22K: </span>
            <span className="font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(goldRates.rate22k)}
            </span>
          </div>
          <div className="text-right text-xs">
            <span className="text-muted-foreground">Gold 18K: </span>
            <span className="font-bold text-yellow-600/80 dark:text-yellow-400/80">
              {formatCurrency(goldRates.rate18k)}
            </span>
          </div>
          <div className="text-right text-xs">
            <span className="text-muted-foreground">Silver 999: </span>
            <span className="font-bold text-slate-400">
              {formatCurrency(goldRates.silver)}
            </span>
          </div>
        </div>
      </div>

      {/* Header and Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Package className="h-6 w-6 text-amber-500" />
            <T>Stock Ledger</T>
          </h1>
          <p className="text-muted-foreground mt-0.5">
            <T>Search and manage hallmarked finished jewelry assets across showcases and safe vaults.</T>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Inward Finished Piece</T>
          </Button>
        </div>
      </div>

      <FeatureGate
        feature="karigarSupplyChain"
        featureLabel="Stock Ledger"
        hasFeature={hasFeature}
        planName={planName}
        loading={featuresLoading}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs text-muted-foreground"><T>Loading database inventory...</T></p>
          </div>
        ) : (
          <>
            {/* Core Valuation Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-tour="stock-valuation" className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-900 border-amber-200/50 dark:border-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <T>Finished Stock Valuation</T>
                    </CardDescription>
                    <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {formatCurrency(grandValuation)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>Dynamic valuation of display and safe stock calculated with live market metal rates + craftsmanship markup.</T>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <T>Display Showcase Items</T>
                    </CardDescription>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {showcaseItemsCount} <span className="text-xs text-muted-foreground">items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>Finished pieces placed on showcase counters for customer walk-in sales.</T>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <T>Main Vault Reserves</T>
                    </CardDescription>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {vaultItemsCount} <span className="text-xs text-muted-foreground">items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>High-value pieces and coins stored inside the strong-room safe vault.</T>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dynamic Ledger search and filtration */}
            <Card data-tour="stock-table" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 border-b dark:border-gray-800 pb-4">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100"><T>Finished Vault Stock Ledger</T></CardTitle>
                  <CardDescription><T>Real-time physical asset logs. Scan barcodes or filter locations.</T></CardDescription>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("Search by name, tag, or HUID...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-36 h-9 text-xs border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      <SelectItem value="ALL">All Items</SelectItem>
                      <SelectItem value="SHOWCASE">Showcase Stock</SelectItem>
                      <SelectItem value="VAULT">Vault Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                      <th className="py-2.5 px-3 font-semibold"><T>Item Details & Unique HUID</T></th>
                      <th className="py-2.5 px-3 font-semibold"><T>Barcode Tag</T></th>
                      <th className="py-2.5 px-3 font-semibold"><T>Purity / Weight</T></th>
                      <th className="py-2.5 px-3 font-semibold"><T>Physical Location</T></th>
                      <th className="py-2.5 px-3 font-semibold text-right"><T>Rate Valuation</T></th>
                      <th className="py-2.5 px-3 font-semibold text-center"><T>Action</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          <T>No items in stock. Click Inward Finished Piece to register finished assets.</T>
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((item) => (
                        <tr key={item.tag} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 text-gray-700 dark:text-gray-300">
                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 dark:border-amber-400/20">
                              {item.huid}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-xs">{item.tag}</td>
                          <td className="py-3.5 px-3">
                            <p className="font-medium text-xs text-gray-900 dark:text-gray-100">{item.purity}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.grossWeight.toFixed(2)}g G / {item.netWeight.toFixed(2)}g N
                              {item.stoneWeight > 0 && ` / ${item.stoneWeight.toFixed(1)}ct St`}
                            </p>
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge variant={item.status === "ON_DISPLAY" ? "outline" : "secondary"} className={item.status === "ON_DISPLAY" ? "border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400" : ""}>
                              {item.location}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-right text-gray-900 dark:text-gray-100">
                            {formatCurrency(calculateItemValuation(item))}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("Transfer Location")}
                              onClick={() => {
                                setTransferForm({ tag: item.tag, newLocation: item.location });
                                setTransferModalOpen(true);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </FeatureGate>

      {/* ─── MODALS ─── */}
      {/* 1. Location Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Transfer Finished Stock Location</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Safely transfer the finished piece between safe vaults and showcases.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Target Item Tag</T></Label>
                <Input value={transferForm.tag} disabled className="bg-gray-50 dark:bg-gray-950 font-mono text-gray-900 dark:text-gray-100" />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>New Physical Location</T></Label>
                <Select
                  value={transferForm.newLocation}
                  onValueChange={(val) => setTransferForm((p) => ({ ...p, newLocation: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectItem value="Showcase-A">Showcase A (Counters)</SelectItem>
                    <SelectItem value="Showcase-B">Showcase B (Counters)</SelectItem>
                    <SelectItem value="Main-Safe">Main Vault Safe (Strongroom)</SelectItem>
                    <SelectItem value="Artisan-Workbench">Karigar Workbench (Manufacturing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setTransferModalOpen(false)} className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700" size="sm" onClick={handleTransfer}><T>Confirm Transfer</T></Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inward Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Inward Finished Jewelry Piece</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Register a fully completed manufacturing piece into active catalogued stock.</T>
            </p>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Unique Barcode Tag</T> *</Label>
                <Input
                  placeholder="e.g. TAG-G-406"
                  value={addForm.tag}
                  onChange={(e) => setAddForm((p) => ({ ...p, tag: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Hallmarked HUID Code</T></Label>
                <Input
                  placeholder="e.g. HUID-8X4W3P"
                  value={addForm.huid}
                  onChange={(e) => setAddForm((p) => ({ ...p, huid: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-gray-700 dark:text-gray-300"><T>Product Display Name</T> *</Label>
                <Input
                  placeholder="e.g. 22K Solid Gold Bangle"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Metal Purity Tier</T></Label>
                <Select
                  value={addForm.purity}
                  onValueChange={(val) => setAddForm((p) => ({ ...p, purity: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectItem value="24K (999)">24K (999 Fine Gold)</SelectItem>
                    <SelectItem value="22K (916)">22K (916 Standard Gold)</SelectItem>
                    <SelectItem value="18K (750)">18K (750 Jewelry Gold)</SelectItem>
                    <SelectItem value="92.5 Sterling">92.5 Sterling Silver</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Physical Location</T></Label>
                <Select
                  value={addForm.location}
                  onValueChange={(val) => setAddForm((p) => ({ ...p, location: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectItem value="Showcase-A">Showcase A</SelectItem>
                    <SelectItem value="Showcase-B">Showcase B</SelectItem>
                    <SelectItem value="Main-Safe">Main Vault Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Gross Weight (grams)</T> *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15.5"
                  value={addForm.grossWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, grossWeight: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Net Gold/Silver Weight (g)</T> *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 14.8"
                  value={addForm.netWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, netWeight: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300"><T>Stones/Diamond weight (carats)</T></Label>
                <Input
                  type="number"
                  placeholder="e.g. 1.2"
                  value={addForm.stoneWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, stoneWeight: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)} className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700" size="sm" onClick={handleAddItem}><T>Inward Piece</T></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
