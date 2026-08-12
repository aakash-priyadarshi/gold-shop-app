"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { TagPrintDialog } from "@/components/shop/TagPrintDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/hooks/use-toast";
import { inventoryApi, materialsApi } from "@/lib/api";
import { type JewelleryTagItem } from "@/lib/jewelleryTagPrint";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
  Loader2,
  MapPin,
  Package,
  Plus,
  Printer,
  Radio,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type LocNode = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  children: LocNode[];
  _count?: { items: number };
};

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
  const shopId = user?.shop?.id;

  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
  });
  const ratesRef = useRef(false);

  const [locations, setLocations] = useState<LocNode[]>([]);
  const [flatLocations, setFlatLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | "ALL" | "UNASSIGNED">("ALL");
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagPrintOpen, setTagPrintOpen] = useState(false);
  const [tagPrintItems, setTagPrintItems] = useState<JewelleryTagItem[]>([]);
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

  const [addLocOpen, setAddLocOpen] = useState(false);
  const [addLocForm, setAddLocForm] = useState({
    name: "",
    kind: "AREA",
    parentId: "",
  });
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

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
        if (value && typeof value === "object")
          return Number(value.ratePerGram ?? value.rate ?? 0);
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
        rate22k: Math.round(
          readMetalRate(data, ["GOLD_22K"]) || rate24k * (22 / 24),
        ),
        rate18k: Math.round(
          readMetalRate(data, ["GOLD_18K"]) || rate24k * (18 / 24),
        ),
        silver: Math.round(
          readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]) ||
            85,
        ),
        currency: data?.currency ?? params.currency ?? "INR",
      });
    } catch {
      /* keep fallback */
    } finally {
      ratesRef.current = false;
    }
  }, [user?.shop]);

  const fetchLocations = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await inventoryApi.getStorageLocations(shopId);
      const data = res.data?.data ?? res.data;
      setLocations(data?.locations || []);
      setFlatLocations(data?.flat || []);
    } catch (err) {
      console.error(err);
    }
  }, [shopId]);

  const fetchStock = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const params: any = {
        limit: 200,
        excludeSetComponents: true,
      };
      if (selectedLocationId === "UNASSIGNED") {
        // client filter — API has no null filter; fetch all and filter
      } else if (selectedLocationId !== "ALL") {
        params.locationId = selectedLocationId;
        params.includeSubtree = true;
      }
      const res = await inventoryApi.getShopInventory(shopId, params);
      let items = res.data?.items || res.data?.data?.items || res.data || [];
      if (!Array.isArray(items)) items = [];
      if (selectedLocationId === "UNASSIGNED") {
        items = items.filter((i: any) => !i.locationId);
      }
      setStock(items);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast({
        title: t("Failed to load stock"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [shopId, selectedLocationId, t]);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => {
      ratesRef.current = false;
      fetchRates();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(
        goldRates.currency === "NPR" ? "ne-NP" : "en-IN",
        {
          style: "currency",
          currency: goldRates.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        },
      ).format(amount);
    } catch {
      return `${goldRates.currency} ${amount.toLocaleString()}`;
    }
  };

  const calculateItemValuation = (item: any): number => {
    const purity =
      item.composition?.baseAlloy?.purity ||
      item.composition?.purity ||
      "22K";
    let rate = goldRates.rate22k;
    if (String(purity).includes("24K")) rate = goldRates.rate24k;
    else if (String(purity).includes("18K")) rate = goldRates.rate18k;
    else if (
      String(purity).toLowerCase().includes("silver") ||
      String(purity).includes("925")
    )
      rate = goldRates.silver;
    const metalVal = (item.totalWeightGrams || 0) * rate;
    return metalVal + metalVal * 0.12;
  };

  const filteredStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stock;
    return stock.filter(
      (s) =>
        s.nameEn?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q) ||
        s.hallmarkNumber?.toLowerCase().includes(q),
    );
  }, [stock, searchQuery]);

  const grandValuation = filteredStock.reduce(
    (sum, item) => sum + calculateItemValuation(item),
    0,
  );

  const toTagItem = (item: any): JewelleryTagItem => ({
    id: item.id,
    sku: item.sku,
    name: item.nameEn,
    hallmark: item.hallmarkNumber,
    rfidCode: item.rfidCode,
    purity: item.composition?.baseAlloy?.purity || item.composition?.purity || "",
    weightGrams: item.totalWeightGrams,
    price: item.totalPriceNpr,
    currency: goldRates.currency,
    shopName: item.shop?.shopName || user?.shop?.shopName,
  });

  const openTagPrint = (items: any[]) => {
    setTagPrintItems(items.map(toTagItem));
    setTagPrintOpen(true);
  };

  const authorizeMultiTagPrint = async (itemIds: string[], copies: number) => {
    if (!shopId) throw new Error(t("No active shop found"));
    const response = await inventoryApi.prepareMultiTagPrint(shopId, itemIds, copies);
    const items = response.data?.items ?? response.data?.data?.items ?? [];
    return (Array.isArray(items) ? items : []).filter(Boolean).map(toTagItem);
  };

  const handleCreateLocation = async () => {
    if (!shopId || !addLocForm.name.trim()) return;
    try {
      await inventoryApi.createStorageLocation(shopId, {
        name: addLocForm.name.trim(),
        kind: addLocForm.kind,
        parentId: addLocForm.parentId || undefined,
      });
      setAddLocOpen(false);
      setAddLocForm({ name: "", kind: "AREA", parentId: "" });
      await fetchLocations();
      toast({ title: t("Location created") });
    } catch (err: any) {
      toast({
        title: t("Failed to create location"),
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const handleArchiveLocation = async (id: string) => {
    if (!shopId) return;
    if (!confirm(t("Archive this location? Items will become unassigned.")))
      return;
    try {
      await inventoryApi.archiveStorageLocation(shopId, id);
      if (selectedLocationId === id) setSelectedLocationId("ALL");
      await fetchLocations();
      await fetchStock();
    } catch (err: any) {
      toast({
        title: t("Failed to archive location"),
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    }
  };

  const handleTransfer = async () => {
    if (!shopId || selectedIds.size === 0) return;
    try {
      await inventoryApi.transferLocation(shopId, {
        itemIds: Array.from(selectedIds),
        locationId: transferTarget || null,
      });
      setTransferOpen(false);
      setTransferTarget("");
      await fetchStock();
      await fetchLocations();
      toast({ title: t("Location updated") });
    } catch (err: any) {
      toast({
        title: t("Transfer failed"),
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parentOptionsForKind = (kind: string) => {
    if (kind === "AREA") return [];
    if (kind === "CABINET")
      return flatLocations.filter((l) => l.kind === "AREA");
    return flatLocations.filter((l) => l.kind === "CABINET");
  };

  const renderLocTree = (nodes: LocNode[], depth = 0) =>
    nodes.map((node) => (
      <div key={node.id}>
        <button
          type="button"
          data-tour={depth === 0 ? "stock-location-tree" : undefined}
          onClick={() => setSelectedLocationId(node.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/80 ${
            selectedLocationId === node.id
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium"
              : ""
          }`}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {node._count?.items ?? 0}
          </span>
          <button
            type="button"
            className="opacity-40 hover:opacity-100 p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              handleArchiveLocation(node.id);
            }}
            title={t("Archive")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </button>
        {node.children?.length > 0 && renderLocTree(node.children, depth + 1)}
      </div>
    ));

  if (featuresLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate
      feature="karigarSupplyChain"
      featureLabel="Vault & Tags"
      hasFeature={hasFeature}
      planName={planName}
      loading={featuresLoading}
    >
    <div className="space-y-6">
      <div
        data-tour="stock-valuation"
        className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <T>Stock Valuation Live Feed</T>
          </p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(grandValuation)}
          </p>
          <p className="text-xs text-muted-foreground">
            {filteredStock.length} <T>pieces in view</T>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">22K: </span>
            <span className="font-bold text-yellow-600">
              {formatCurrency(goldRates.rate22k)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">18K: </span>
            <span className="font-bold">{formatCurrency(goldRates.rate18k)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <T>Vault & Tags</T>
          </h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/dashboard/shop/stock/audit">
              <Button variant="outline" size="sm">
                <Radio className="h-4 w-4 mr-1.5" />
                <T>RFID / Barcode stock audit</T>
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            <T>Manage where each piece lives in your shop</T>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/shop/products?create=1">
              <Plus className="h-4 w-4 mr-1" />
              <T>Inward piece</T>
            </Link>
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Button variant="outline" onClick={() => openTagPrint(stock.filter((item) => selectedIds.has(item.id)))}>
                <Printer className="h-4 w-4 mr-1" />
                <T>Print tags</T> ({selectedIds.size})
              </Button>
              <Button onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                <T>Transfer</T> ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[480px]">
        {/* Location tree */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                <T>Locations</T>
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAddLocOpen(true)}
                data-tour="stock-add-location"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              <T>Area → Cabinet → Bin (optional nesting)</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedLocationId("ALL")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/80 ${
                selectedLocationId === "ALL" ? "bg-muted font-medium" : ""
              }`}
            >
              <Package className="h-3.5 w-3.5 opacity-60" />
              <T>All locations</T>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLocationId("UNASSIGNED")}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/80 ${
                selectedLocationId === "UNASSIGNED"
                  ? "bg-muted font-medium"
                  : ""
              }`}
            >
              <Layers className="h-3.5 w-3.5 opacity-60" />
              <T>Unassigned</T>
            </button>
            <div className="border-t my-2" />
            {locations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4">
                <T>No locations yet. Add an Area to get started.</T>
              </p>
            ) : (
              renderLocTree(locations)
            )}
          </CardContent>
        </Card>

        {/* Pieces table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("Search tag, HUID, name…")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-tour="stock-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent data-tour="stock-table">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <T>No pieces in this location</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 w-8" />
                      <th className="pb-2 font-medium">
                        <T>Tag</T>
                      </th>
                      <th className="pb-2 font-medium">
                        <T>Name</T>
                      </th>
                      <th className="pb-2 font-medium">
                        <T>Type</T>
                      </th>
                      <th className="pb-2 font-medium">
                        <T>Location</T>
                      </th>
                      <th className="pb-2 font-medium text-right">
                        <T>Weight</T>
                      </th>
                      <th className="pb-2 font-medium text-right">
                        <T>Value</T>
                      </th>
                      <th className="pb-2 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((item) => {
                      const isSet = item.jewelleryType === "SET";
                      const expanded = expandedSets.has(item.id);
                      return (
                        <Fragment key={item.id}>
                          <tr
                            className="border-b border-border/50 hover:bg-muted/30"
                          >
                            <td className="py-2">
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                              />
                            </td>
                            <td className="py-2 font-mono text-xs">
                              <div className="flex items-center gap-1">
                                {isSet && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSets((prev) => {
                                        const n = new Set(prev);
                                        if (n.has(item.id)) n.delete(item.id);
                                        else n.add(item.id);
                                        return n;
                                      })
                                    }
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                                {item.sku}
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {item.nameEn}
                                {isSet && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <T>Set</T>
                                    {item.setComponents?.length
                                      ? ` · ${item.setComponents.length}`
                                      : ""}
                                  </Badge>
                                )}
                              </div>
                              {item.hallmarkNumber && (
                                <div className="text-[10px] text-muted-foreground">
                                  HUID {item.hallmarkNumber}
                                </div>
                              )}
                              {item.rfidCode && (
                                <div className="text-[10px] text-muted-foreground">
                                  RFID {item.rfidCode}
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-xs">
                              {item.jewelleryType}
                            </td>
                            <td className="py-2">
                              <Badge variant="outline" className="text-[10px]">
                                {item.location?.name || t("Unassigned")}
                              </Badge>
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {(item.totalWeightGrams || 0).toFixed(2)}g
                            </td>
                            <td className="py-2 text-right tabular-nums font-medium">
                              {formatCurrency(calculateItemValuation(item))}
                            </td>
                            <td className="py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openTagPrint([item])}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                          {isSet &&
                            expanded &&
                            item.setComponents?.map((c: any) => (
                              <tr
                                key={c.componentItemId}
                                className="border-b border-border/30 bg-muted/20 text-muted-foreground"
                              >
                                <td />
                                <td className="py-1.5 pl-8 font-mono text-xs">
                                  {c.componentItem?.sku}
                                </td>
                                <td className="py-1.5 text-xs">
                                  {c.role ? `${c.role}: ` : ""}
                                  {c.componentItem?.nameEn}
                                </td>
                                <td className="py-1.5 text-xs">
                                  {c.componentItem?.jewelleryType}
                                </td>
                                <td colSpan={4} />
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add location modal */}
      {addLocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                <T>Add location</T>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>
                  <T>Name</T>
                </Label>
                <Input
                  value={addLocForm.name}
                  onChange={(e) =>
                    setAddLocForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder={t("e.g. Showcase A, Main Safe")}
                />
              </div>
              <div>
                <Label>
                  <T>Kind</T>
                </Label>
                <Select
                  value={addLocForm.kind}
                  onValueChange={(v) =>
                    setAddLocForm((f) => ({
                      ...f,
                      kind: v,
                      parentId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AREA">
                      <T>Area</T>
                    </SelectItem>
                    <SelectItem value="CABINET">
                      <T>Cabinet / Shelf</T>
                    </SelectItem>
                    <SelectItem value="BIN">
                      <T>Bin / Tray</T>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addLocForm.kind !== "AREA" && (
                <div>
                  <Label>
                    <T>Parent</T>
                  </Label>
                  <Select
                    value={addLocForm.parentId}
                    onValueChange={(v) =>
                      setAddLocForm((f) => ({ ...f, parentId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select parent")} />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptionsForKind(addLocForm.kind).map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddLocOpen(false)}>
                  <T>Cancel</T>
                </Button>
                <Button onClick={handleCreateLocation}>
                  <T>Create</T>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer modal */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                <T>Transfer location</T>
              </CardTitle>
              <CardDescription>
                {selectedIds.size} <T>piece(s) selected</T>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>
                  <T>Move to</T>
                </Label>
                <Select
                  value={transferTarget || "__none__"}
                  onValueChange={(v) =>
                    setTransferTarget(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select location")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <T>Unassigned</T>
                    </SelectItem>
                    {flatLocations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.kind})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTransferOpen(false)}>
                  <T>Cancel</T>
                </Button>
                <Button onClick={handleTransfer}>
                  <T>Transfer</T>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <TagPrintDialog
        open={tagPrintOpen}
        onOpenChange={setTagPrintOpen}
        items={tagPrintItems}
        authorizeMultiTagPrint={authorizeMultiTagPrint}
      />
    </div>
    </FeatureGate>
  );
}
