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
import { materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
  ArrowRightLeft,
  Coins,
  Package,
  Plus,
  Search,
  Store,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Mock finished goods in physical vault and display showcases
const INITIAL_STOCK = [
  {
    tag: "TAG-G-401",
    huid: "HUID-9K2L4P",
    name: "Classic 22K Solid Gold Rope Chain",
    purity: "22K (916)",
    grossWeight: 24.5,
    netWeight: 24.5,
    stoneWeight: 0,
    location: "Showcase-A",
    status: "ON_DISPLAY",
  },
  {
    tag: "TAG-G-402",
    huid: "HUID-3M1R7X",
    name: "Bridal Antique Gold Jhumka Earrings",
    purity: "22K (916)",
    grossWeight: 32.1,
    netWeight: 29.8,
    stoneWeight: 2.3, // Gemstone/pearl weight
    location: "Main-Safe",
    status: "IN_VAULT",
  },
  {
    tag: "TAG-D-201",
    huid: "HUID-8F6G9W",
    name: "18K Gold Diamond Halo Bangle",
    purity: "18K (750)",
    grossWeight: 18.2,
    netWeight: 14.8,
    stoneWeight: 3.4, // Diamond weight
    location: "Showcase-B",
    status: "ON_DISPLAY",
  },
  {
    tag: "TAG-S-901",
    huid: "HUID-4T2V9Z",
    name: "Heritage Silver Filigree Casket",
    purity: "92.5 Sterling",
    grossWeight: 450.0,
    netWeight: 450.0,
    stoneWeight: 0,
    location: "Main-Safe",
    status: "IN_VAULT",
  },
  {
    tag: "TAG-G-405",
    huid: "HUID-5Y3U8N",
    name: "24K Gold Minted Sovereign Coin",
    purity: "24K (999)",
    grossWeight: 10.0,
    netWeight: 10.0,
    stoneWeight: 0,
    location: "Showcase-A",
    status: "ON_DISPLAY",
  },
];

export default function ActualStockLedgerPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <ActualStockLedgerContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function ActualStockLedgerContent() {
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

  // Stock State
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    tag: "",
    newLocation: "Showcase-A",
  });

  // Add Item Modal State (Simulated)
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

  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => {
      ratesRef.current = false;
      fetchRates();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

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
  const calculateItemValuation = (item: typeof INITIAL_STOCK[0]): number => {
    let rate = goldRates.rate22k; // default
    if (item.purity.includes("24K")) rate = goldRates.rate24k;
    else if (item.purity.includes("18K")) rate = goldRates.rate18k;
    else if (item.purity.includes("Sterling") || item.purity.includes("Silver")) rate = goldRates.silver;

    // Metal weight + rough craftsmanship value multiplier
    const metalVal = item.netWeight * rate;
    const craftVal = metalVal * 0.12; // 12% making charge estimation
    const stoneVal = item.stoneWeight * (rate * 4.5); // stone valuation markup

    return metalVal + craftVal + stoneVal;
  };

  const grandValuation = stock.reduce((sum, item) => sum + calculateItemValuation(item), 0);
  const totalItemsCount = stock.length;
  const vaultItemsCount = stock.filter((s) => s.status === "IN_VAULT").length;
  const showcaseItemsCount = stock.filter((s) => s.status === "ON_DISPLAY").length;

  // Location transfer handler
  const handleTransfer = () => {
    setStock((prev) =>
      prev.map((s) => {
        if (s.tag !== transferForm.tag) return s;
        const status = transferForm.newLocation.includes("Safe") ? "IN_VAULT" : "ON_DISPLAY";
        return {
          ...s,
          location: transferForm.newLocation,
          status,
        };
      })
    );
    setTransferModalOpen(false);
  };

  // Add Item handler
  const handleAddItem = () => {
    const gross = parseFloat(addForm.grossWeight);
    const net = parseFloat(addForm.netWeight);
    const stone = parseFloat(addForm.stoneWeight);
    if (!addForm.tag || !addForm.name || isNaN(gross) || isNaN(net)) {
      alert("Please fill all required fields correctly!");
      return;
    }

    const newItem = {
      tag: addForm.tag.toUpperCase(),
      huid: addForm.huid.toUpperCase() || "HUID-UNTG-" + Math.floor(Math.random() * 9000 + 1000),
      name: addForm.name,
      purity: addForm.purity,
      grossWeight: gross,
      netWeight: net,
      stoneWeight: isNaN(stone) ? 0 : stone,
      location: addForm.location,
      status: addForm.location.includes("Safe") ? "IN_VAULT" : "ON_DISPLAY",
    };

    setStock((prev) => [newItem, ...prev]);
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
            <span className="font-bold text-yellow-600/80">
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-amber-500" />
            <T>Actual Finished Stock Ledger</T>
          </h1>
          <p className="text-muted-foreground mt-0.5">
            <T>Search and manage hallmarked finished jewelry tag assets across showcases and safe vaults.</T>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Inward Finished Piece</T>
          </Button>
        </div>
      </div>

      <FeatureGate
        feature="karigarSupplyChain"
        featureLabel="Actual Stock Ledger"
        hasFeature={hasFeature}
        planName={planName}
        loading={featuresLoading}
      >
        {/* Core Valuation Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card data-tour="stock-valuation" className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-900 border-amber-200/50">
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

          <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardDescription className="uppercase tracking-wider text-xs font-semibold">
                  <T>Display Showcase Items</T>
                </CardDescription>
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {showcaseItemsCount} <span className="text-xs text-muted-foreground">items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <T>Finished pieces placed on showcase counters for customer walk-in sales.</T>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardDescription className="uppercase tracking-wider text-xs font-semibold">
                  <T>Main Vault Reserves</T>
                </CardDescription>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">
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
        <Card data-tour="stock-table" className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 border-b pb-4">
            <div>
              <CardTitle className="text-base font-semibold"><T>Finished Vault Stock Ledger</T></CardTitle>
              <CardDescription><T>Real-time physical asset logs. Scan barcodes or filter locations.</T></CardDescription>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("Search by name, tag, or HUID...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-lg"
                />
              </div>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground bg-gray-50 dark:bg-gray-850/50">
                  <th className="py-2.5 px-3 font-semibold"><T>Item Details & Unique HUID</T></th>
                  <th className="py-2.5 px-3 font-semibold"><T>Barcode Tag</T></th>
                  <th className="py-2.5 px-3 font-semibold"><T>Purity / Weight</T></th>
                  <th className="py-2.5 px-3 font-semibold"><T>Physical Location</T></th>
                  <th className="py-2.5 px-3 font-semibold text-right"><T>Rate Valuation</T></th>
                  <th className="py-2.5 px-3 font-semibold text-center"><T>Action</T></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.map((item) => (
                  <tr key={item.tag} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20">
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {item.huid}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs">{item.tag}</td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-xs">{item.purity}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.grossWeight.toFixed(2)}g G / {item.netWeight.toFixed(2)}g N
                        {item.stoneWeight > 0 && ` / ${item.stoneWeight.toFixed(1)}ct St`}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={item.status === "ON_DISPLAY" ? "outline" : "secondary"} className={item.status === "ON_DISPLAY" ? "border-sky-500/25 bg-sky-500/5 text-sky-600" : ""}>
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
                        className="h-8 w-8 text-muted-foreground hover:text-amber-500 rounded-lg hover:bg-gray-100"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </FeatureGate>

      {/* ─── MODALS ─── */}
      {/* 1. Location Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Transfer Finished Stock Location</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Safely transfer the finished piece between safe vaults and showcases.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label><T>Target Item Tag</T></Label>
                <Input value={transferForm.tag} disabled className="bg-gray-50 font-mono" />
              </div>

              <div className="space-y-1">
                <Label><T>New Physical Location</T></Label>
                <Select
                  value={transferForm.newLocation}
                  onValueChange={(val) => setTransferForm((p) => ({ ...p, newLocation: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Showcase-A">Showcase A (Counters)</SelectItem>
                    <SelectItem value="Showcase-B">Showcase B (Counters)</SelectItem>
                    <SelectItem value="Main-Safe">Main Vault Safe (Strongroom)</SelectItem>
                    <SelectItem value="Artisan-Workbench">Karigar Workbench (Manufacturing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setTransferModalOpen(false)}><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" size="sm" onClick={handleTransfer}><T>Confirm Transfer</T></Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inward Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Inward Finished Jewelry Piece</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Register a fully completed manufacturing piece into active catalogued stock.</T>
            </p>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 pt-2">
              <div className="space-y-1">
                <Label><T>Unique Barcode Tag</T> *</Label>
                <Input
                  placeholder="e.g. TAG-G-406"
                  value={addForm.tag}
                  onChange={(e) => setAddForm((p) => ({ ...p, tag: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label><T>Hallmarked HUID Code</T></Label>
                <Input
                  placeholder="e.g. HUID-8X4W3P"
                  value={addForm.huid}
                  onChange={(e) => setAddForm((p) => ({ ...p, huid: e.target.value }))}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label><T>Product Display Name</T> *</Label>
                <Input
                  placeholder="e.g. 22K Solid Gold Bangle"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label><T>Metal Purity Tier</T></Label>
                <Select
                  value={addForm.purity}
                  onValueChange={(val) => setAddForm((p) => ({ ...p, purity: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24K (999)">24K (999 Fine Gold)</SelectItem>
                    <SelectItem value="22K (916)">22K (916 Standard Gold)</SelectItem>
                    <SelectItem value="18K (750)">18K (750 Jewelry Gold)</SelectItem>
                    <SelectItem value="92.5 Sterling">92.5 Sterling Silver</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label><T>Physical Location</T></Label>
                <Select
                  value={addForm.location}
                  onValueChange={(val) => setAddForm((p) => ({ ...p, location: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Showcase-A">Showcase A</SelectItem>
                    <SelectItem value="Showcase-B">Showcase B</SelectItem>
                    <SelectItem value="Main-Safe">Main Vault Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label><T>Gross Weight (grams)</T> *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15.5"
                  value={addForm.grossWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, grossWeight: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label><T>Net Gold/Silver Weight (g)</T> *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 14.8"
                  value={addForm.netWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, netWeight: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label><T>Stones/Diamond weight (carats)</T></Label>
                <Input
                  type="number"
                  placeholder="e.g. 1.2"
                  value={addForm.stoneWeight}
                  onChange={(e) => setAddForm((p) => ({ ...p, stoneWeight: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" size="sm" onClick={handleAddItem}><T>Inward Piece</T></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
