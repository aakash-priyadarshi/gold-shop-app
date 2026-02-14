"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { materialsApi, shopsApi } from "@/lib/api";
import { FINISH_DATA, JEWELLERY_TYPE_DATA } from "@/lib/jewellery-constants";
import {
  CircleDot,
  Eye,
  Gem,
  Hammer,
  Info,
  Loader2,
  Percent,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Material {
  metal: string;
  purity: string;
  isAvailable: boolean;
  makingChargePerGram?: number;
  makingChargePercent?: number;
  chargeMode?: "flat" | "percent";
  minWeightGrams?: number;
  maxWeightGrams?: number;
}

interface MaterialsData {
  materials: Material[];
  supportedMaterials: string[]; // e.g., ["GOLD_24K", "GOLD_22K", "SILVER"]
}

interface CapabilitiesData {
  jewelleryTypes: string[];
  buildMethods: string[];
  finishes: string[];
  gemstones: string[];
  alloys: string[];
  baseMetals: string[];
  platingTypes: string[];
}

interface MarketRate {
  metalCode: string;
  ratePerGram: number;
  source: string;
  country: string;
  validFrom?: string;
}

const DEFAULT_MAKING_CHARGE_PERCENT = 10;

const allMaterials = [
  { metal: "GOLD", purity: "24K", label: "Gold 24K (Pure)" },
  { metal: "GOLD", purity: "22K", label: "Gold 22K" },
  { metal: "GOLD", purity: "18K", label: "Gold 18K" },
  { metal: "GOLD", purity: "14K", label: "Gold 14K" },
  { metal: "SILVER", purity: "925", label: "Sterling Silver (925)" },
  { metal: "SILVER", purity: "999", label: "Fine Silver (999)" },
  { metal: "PLATINUM", purity: "950", label: "Platinum 950" },
];

const allJewelleryTypes = Object.keys(JEWELLERY_TYPE_DATA);

const allBuildMethods = [
  { value: "METHOD_A", label: "Method A - Solid Precious Metal (100% pure)" },
  {
    value: "METHOD_B",
    label: "Method B - Standard Alloy (18K, 14K, Sterling)",
  },
  {
    value: "METHOD_C",
    label: "Method C - Core Metal + Finish (base + plating)",
  },
  { value: "METHOD_D", label: "Method D - Multi-Metal Construction" },
];

const allAlloysData = [
  {
    value: "GOLD_18K",
    label: "18K Gold Alloy (75% gold)",
    description: "Yellow, white, rose gold variants",
  },
  {
    value: "GOLD_14K",
    label: "14K Gold Alloy (58.5% gold)",
    description: "More durable, budget-friendly",
  },
  {
    value: "GOLD_10K",
    label: "10K Gold Alloy (41.7% gold)",
    description: "Most durable, most affordable",
  },
  {
    value: "STERLING_SILVER_925",
    label: "Sterling Silver 925",
    description: "92.5% silver alloy",
  },
];

const allBaseMetalsData = [
  {
    value: "BRASS",
    label: "Brass",
    description: "Copper-zinc alloy, gold-like appearance",
  },
  {
    value: "BRONZE",
    label: "Bronze",
    description: "Copper-tin alloy, warm tone",
  },
  {
    value: "COPPER",
    label: "Copper",
    description: "Pure copper, rose-colored",
  },
  {
    value: "STAINLESS_STEEL_316L",
    label: "Stainless Steel 316L",
    description: "Surgical grade, hypoallergenic",
  },
  {
    value: "TITANIUM",
    label: "Titanium",
    description: "Lightweight, extremely strong",
  },
  {
    value: "TUNGSTEN_CARBIDE",
    label: "Tungsten Carbide",
    description: "Very hard, scratch-resistant",
  },
  {
    value: "COBALT_CHROME",
    label: "Cobalt Chrome",
    description: "Bright white, hypoallergenic",
  },
];

const allPlatingData = [
  {
    value: "GOLD_PLATING",
    label: "Gold Plating",
    description: "Electroplated gold layer",
  },
  {
    value: "VERMEIL",
    label: "Vermeil",
    description: "Gold plating over sterling silver (2.5μm+)",
  },
  {
    value: "PVD_COATING",
    label: "PVD Coating",
    description: "Physical Vapor Deposition, very durable",
  },
  {
    value: "RHODIUM_PLATING",
    label: "Rhodium Plating",
    description: "Bright white finish, anti-tarnish",
  },
  {
    value: "OXIDISED_FINISH",
    label: "Oxidised Finish",
    description: "Darkened antique look",
  },
  {
    value: "ENAMEL_COATING",
    label: "Enamel Coating",
    description: "Colored glass-like coating",
  },
];

const allFinishes = Object.keys(FINISH_DATA);

// Gemstones grouped by category
const allGemstones = [
  { id: "DIAMOND_NATURAL", name: "Diamond (Natural)", category: "precious" },
  { id: "DIAMOND_LAB", name: "Diamond (Lab-Grown)", category: "precious" },
  { id: "RUBY", name: "Ruby", category: "precious" },
  { id: "SAPPHIRE", name: "Sapphire", category: "precious" },
  { id: "EMERALD", name: "Emerald", category: "precious" },
  { id: "MOISSANITE", name: "Moissanite", category: "alternative" },
  { id: "CUBIC_ZIRCONIA", name: "Cubic Zirconia (CZ)", category: "simulant" },
  { id: "PEARL", name: "Pearl", category: "organic" },
  { id: "AMETHYST", name: "Amethyst", category: "semi-precious" },
  { id: "TOPAZ", name: "Topaz", category: "semi-precious" },
  { id: "GARNET", name: "Garnet", category: "semi-precious" },
  { id: "OPAL", name: "Opal", category: "semi-precious" },
  { id: "TURQUOISE", name: "Turquoise", category: "semi-precious" },
  { id: "AQUAMARINE", name: "Aquamarine", category: "semi-precious" },
  { id: "PERIDOT", name: "Peridot", category: "semi-precious" },
  { id: "CITRINE", name: "Citrine", category: "semi-precious" },
];

const gemstoneCategories = [
  {
    id: "precious",
    name: "Precious Stones",
    description: "High-value natural gemstones",
  },
  {
    id: "alternative",
    name: "Alternatives",
    description: "Diamond alternatives and simulants",
  },
  { id: "simulant", name: "Simulants", description: "Synthetic gemstones" },
  {
    id: "organic",
    name: "Organic",
    description: "Naturally formed organic gems",
  },
  {
    id: "semi-precious",
    name: "Semi-Precious",
    description: "Beautiful colored gemstones",
  },
];

export default function ShopInventoryPage() {
  const { user } = useAuth();
  const {
    currencyCode: shopCurrency,
    symbol: currencySymbol,
    country: shopCountry,
  } = useShopCurrency();
  const [materialsData, setMaterialsData] = useState<MaterialsData | null>(
    null,
  );
  const [capabilitiesData, setCapabilitiesData] =
    useState<CapabilitiesData | null>(null);
  const [marketRates, setMarketRates] = useState<MarketRate[]>([]);
  const [gemstonePricing, setGemstonePricing] = useState<any[]>([]);
  const [gemstoneOverrides, setGemstoneOverrides] = useState<
    Record<string, number>
  >({});
  const [isSavingGemstones, setIsSavingGemstones] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Component pricing overrides (base metals, plating, finishes)
  const [baseMetalPrices, setBaseMetalPrices] = useState<
    Record<string, number>
  >({});
  const [platingPrices, setPlatingPrices] = useState<Record<string, number>>(
    {},
  );
  const [finishPrices, setFinishPrices] = useState<Record<string, number>>({});
  const [isSavingComponentPricing, setIsSavingComponentPricing] =
    useState(false);

  useEffect(() => {
    if (user?.shop?.id) {
      loadData();
    }
  }, [user?.shop?.id, shopCountry]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [materialsRes, capabilitiesRes, ratesRes, gemPricingRes, compPricingRes] =
        await Promise.all([
          shopsApi.getMaterials(),
          shopsApi.getCapabilities(),
          materialsApi.getMarketRates({
            currency: shopCurrency,
            country: shopCountry,
          }),
          shopsApi.getGemstonePricing().catch(() => ({ data: { rates: [] } })),
          shopsApi.getComponentPricing().catch(() => ({
            data: { baseMetalPrices: {}, platingPrices: {}, finishPrices: {} },
          })),
        ]);
      // Load component pricing overrides
      const cp = compPricingRes.data || {};
      setBaseMetalPrices(cp.baseMetalPrices || {});
      setPlatingPrices(cp.platingPrices || {});
      setFinishPrices(cp.finishPrices || {});
      // Load gemstone pricing
      const gemRates = gemPricingRes.data?.rates || [];
      setGemstonePricing(gemRates);
      // Pre-populate overrides from existing shop prices
      const overrides: Record<string, number> = {};
      gemRates.forEach((r: any) => {
        if (r.shopPrice !== null) {
          const key = `${r.stoneType}_${r.origin}_${r.sizeCategory}_${r.qualityTier}`;
          overrides[key] = r.shopPrice;
        }
      });
      setGemstoneOverrides(overrides);
      // Transform backend materials format to frontend format
      // Backend returns: {materials: [{code, isAvailable, pricePerGramNpr}], makingChargePercent}
      // Frontend needs: {materials: [{metal, purity, makingChargePerGram}], supportedMaterials: string[]}
      const backendMaterials = materialsRes.data?.materials || [];
      const supportedMaterials: string[] = [];
      const frontendMaterials: Material[] = backendMaterials.map((m: any) => {
        const code: string = m.code || "";
        if (m.isAvailable) {
          supportedMaterials.push(code);
        }
        // Split code like "GOLD_24K" into metal="GOLD" and purity="24K"
        const lastUnderscore = code.lastIndexOf("_");
        const metal =
          lastUnderscore > 0 ? code.substring(0, lastUnderscore) : code;
        const purity =
          lastUnderscore > 0 ? code.substring(lastUnderscore + 1) : "";
        return {
          metal,
          purity,
          isAvailable: m.isAvailable || false,
          makingChargePerGram: m.pricePerGramNpr || undefined,
        };
      });
      setMaterialsData({
        materials: frontendMaterials,
        supportedMaterials,
      });
      // Parse capabilities from API response
      // API returns arrays of {code, name, isSupported} objects
      const capabilities = capabilitiesRes.data || {};

      // Extract only the supported items (where isSupported is true)
      const supportedJewelleryTypes = (capabilities.jewelleryTypes || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      const supportedBuildMethods = (capabilities.buildMethods || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      const supportedGemstones = (capabilities.gemstones || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      const supportedAlloys = (capabilities.alloys || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      const supportedBaseMetals = (capabilities.baseMetals || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      const supportedPlatingTypes = (capabilities.platingTypes || [])
        .filter((item: any) => item.isSupported || item === true)
        .map((item: any) => (typeof item === "string" ? item : item.code));

      setCapabilitiesData({
        jewelleryTypes: supportedJewelleryTypes,
        buildMethods: supportedBuildMethods,
        finishes: capabilities.supportedFinishes || capabilities.finishes || [],
        gemstones: supportedGemstones,
        alloys: supportedAlloys,
        baseMetals: supportedBaseMetals,
        platingTypes: supportedPlatingTypes,
      });
      // Market rates response has metals object, not array
      const ratesData = ratesRes.data?.metals || ratesRes.data || [];
      if (Array.isArray(ratesData)) {
        setMarketRates(ratesData);
      } else {
        // Convert metals object to array format
        const ratesArray = Object.entries(ratesData).map(([key, value]) => ({
          metalCode: key,
          ratePerGram: value as number,
          source: ratesRes.data?.source || "live",
          country: shopCountry,
        }));
        setMarketRates(ratesArray);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        variant: "destructive",
        title: "Failed to load inventory",
        description: "Could not fetch inventory data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMarketRates = async () => {
    setIsRefreshingRates(true);
    try {
      const ratesRes = await materialsApi.getMarketRates({
        currency: shopCurrency,
        country: shopCountry,
      });
      const ratesData = ratesRes.data?.metals || ratesRes.data || [];
      if (Array.isArray(ratesData)) {
        setMarketRates(ratesData);
      } else {
        const ratesArray = Object.entries(ratesData).map(([key, value]) => ({
          metalCode: key,
          ratePerGram: value as number,
          source: ratesRes.data?.source || "live",
          country: shopCountry,
        }));
        setMarketRates(ratesArray);
      }
      toast({
        title: "Rates Refreshed",
        description: "Market rates updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh market rates",
      });
    } finally {
      setIsRefreshingRates(false);
    }
  };

  // Get market rate for a material
  // Market rates use PLATINUM_PT950 format but shop uses PLATINUM_950
  const normalizeRateKey = (code: string): string => {
    const keyMap: Record<string, string> = {
      PLATINUM_950: "PLATINUM_PT950",
      PLATINUM_900: "PLATINUM_PT900",
    };
    return keyMap[code] || code;
  };

  const getMarketRate = (metal: string, purity: string): number | null => {
    const materialCode = `${metal}_${purity}`;
    const rateKey = normalizeRateKey(materialCode);
    const rate = marketRates.find(
      (r) => r.metalCode === rateKey || r.metalCode === materialCode,
    );
    return rate?.ratePerGram ?? null;
  };

  // Calculate default making charge (10% of metal value)
  const getDefaultMakingCharge = (metal: string, purity: string): number => {
    const rate = getMarketRate(metal, purity);
    if (!rate) return 0;
    return Math.round((rate * DEFAULT_MAKING_CHARGE_PERCENT) / 100);
  };

  const saveMaterials = async () => {
    if (!materialsData) return;

    setIsSaving(true);
    try {
      // Transform data to match backend expected format
      const transformedMaterials = materialsData.materials.map((m) => ({
        materialCode: `${m.metal}_${m.purity}`,
        isAvailable: materialsData.supportedMaterials.includes(
          `${m.metal}_${m.purity}`,
        ),
        pricePerGramNpr: m.makingChargePerGram,
        minWeightGrams: m.minWeightGrams,
        maxWeightGrams: m.maxWeightGrams,
      }));

      // Also add supported materials that might not have pricing data
      const existingCodes = new Set(
        transformedMaterials.map((m) => m.materialCode),
      );
      for (const code of materialsData.supportedMaterials) {
        if (!existingCodes.has(code)) {
          transformedMaterials.push({
            materialCode: code,
            isAvailable: true,
            pricePerGramNpr: undefined,
            minWeightGrams: undefined,
            maxWeightGrams: undefined,
          });
        }
      }

      await shopsApi.updateMaterials({ materials: transformedMaterials });
      toast({
        title: "Materials Saved",
        description: "Your material settings have been updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error.response?.data?.message || "Could not save materials",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveCapabilities = async () => {
    if (!capabilitiesData) return;

    setIsSaving(true);
    try {
      await shopsApi.updateCapabilities(capabilitiesData);
      toast({
        title: "Capabilities Saved",
        description: "Your capabilities have been updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error.response?.data?.message || "Could not save capabilities",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveGemstonePricing = async () => {
    setIsSavingGemstones(true);
    try {
      // Convert overrides map to rates array
      const rates = Object.entries(gemstoneOverrides)
        .map(([key, price]) => {
          const [stoneType, origin, sizeCategory, qualityTier] = key
            .split("_")
            .reduce((acc: string[], part, i, arr) => {
              // Re-parse the key: stoneType_origin_sizeCategory_qualityTier
              // But sizeCategory contains hyphens like "0.1-0.25ct"
              return acc;
            }, []);
          // Parse correctly using the stored pricing data
          const matchingRate = gemstonePricing.find((r: any) => {
            const rKey = `${r.stoneType}_${r.origin}_${r.sizeCategory}_${r.qualityTier}`;
            return rKey === key;
          });
          return matchingRate
            ? {
                stoneType: matchingRate.stoneType,
                origin: matchingRate.origin,
                sizeCategory: matchingRate.sizeCategory,
                qualityTier: matchingRate.qualityTier,
                pricePerStone: price,
              }
            : null;
        })
        .filter(Boolean);

      if (rates.length === 0) {
        toast({
          title: "No Changes",
          description: "No pricing overrides to save",
        });
        return;
      }

      await shopsApi.updateGemstonePricing({ rates });
      toast({
        title: "Gemstone Pricing Saved",
        description: `Updated pricing for ${rates.length} gemstone configurations`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error.response?.data?.message || "Could not save gemstone pricing",
      });
    } finally {
      setIsSavingGemstones(false);
    }
  };

  const saveComponentPricing = async () => {
    setIsSavingComponentPricing(true);
    try {
      await shopsApi.updateComponentPricing({
        baseMetalPrices,
        platingPrices,
        finishPrices,
      });
      toast({
        title: "Component Pricing Saved",
        description:
          "Your base metal, plating & finish prices have been updated. These prices will be used in the RFQ calculator.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error.response?.data?.message ||
          "Could not save component pricing",
      });
    } finally {
      setIsSavingComponentPricing(false);
    }
  };

  const toggleMaterial = (materialKey: string) => {
    if (!materialsData) return;

    const currentSupported = new Set(materialsData.supportedMaterials);
    if (currentSupported.has(materialKey)) {
      currentSupported.delete(materialKey);
    } else {
      currentSupported.add(materialKey);
    }

    setMaterialsData({
      ...materialsData,
      supportedMaterials: Array.from(currentSupported),
    });
  };

  const updateMaterialPricing = (
    materialKey: string,
    field: string,
    value: number | string,
  ) => {
    setMaterialsData((prev) => {
      if (!prev) return prev;

      let found = false;
      const materials = prev.materials.map((m) => {
        const key = `${m.metal}_${m.purity}`;
        if (key === materialKey) {
          found = true;
          return { ...m, [field]: value };
        }
        return m;
      });

      // If material doesn't exist, add it
      if (!found) {
        const [metal, purity] = materialKey.split("_");
        materials.push({
          metal,
          purity,
          isAvailable: true,
          [field]: value,
        });
      }

      return { ...prev, materials };
    });
  };

  const updateMaterialPricingBatch = (
    materialKey: string,
    updates: Record<string, number | string>,
  ) => {
    setMaterialsData((prev) => {
      if (!prev) return prev;

      let found = false;
      const materials = prev.materials.map((m) => {
        const k = `${m.metal}_${m.purity}`;
        if (k === materialKey) {
          found = true;
          return { ...m, ...updates };
        }
        return m;
      });

      if (!found) {
        const [metal, purity] = materialKey.split("_");
        materials.push({
          metal,
          purity,
          isAvailable: true,
          ...updates,
        });
      }

      return { ...prev, materials };
    });
  };

  const toggleJewelleryType = (type: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.jewelleryTypes);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      jewelleryTypes: Array.from(current),
    });
  };

  const toggleBuildMethod = (method: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.buildMethods);
    if (current.has(method)) {
      current.delete(method);
    } else {
      current.add(method);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      buildMethods: Array.from(current),
    });
  };

  const toggleFinish = (finish: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.finishes);
    if (current.has(finish)) {
      current.delete(finish);
    } else {
      current.add(finish);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      finishes: Array.from(current),
    });
  };

  const toggleAlloy = (alloy: string) => {
    if (!capabilitiesData) return;
    const current = new Set(capabilitiesData.alloys || []);
    if (current.has(alloy)) current.delete(alloy);
    else current.add(alloy);
    setCapabilitiesData({ ...capabilitiesData, alloys: Array.from(current) });
  };

  const toggleBaseMetal = (metal: string) => {
    if (!capabilitiesData) return;
    const current = new Set(capabilitiesData.baseMetals || []);
    if (current.has(metal)) current.delete(metal);
    else current.add(metal);
    setCapabilitiesData({
      ...capabilitiesData,
      baseMetals: Array.from(current),
    });
  };

  const togglePlatingType = (plating: string) => {
    if (!capabilitiesData) return;
    const current = new Set(capabilitiesData.platingTypes || []);
    if (current.has(plating)) current.delete(plating);
    else current.add(plating);
    setCapabilitiesData({
      ...capabilitiesData,
      platingTypes: Array.from(current),
    });
  };

  const toggleGemstone = (gemstoneId: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.gemstones || []);
    if (current.has(gemstoneId)) {
      current.delete(gemstoneId);
    } else {
      current.add(gemstoneId);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      gemstones: Array.from(current),
    });
  };

  const toggleAllGemstonesInCategory = (category: string) => {
    if (!capabilitiesData) return;

    const gemstonesInCategory = allGemstones
      .filter((g) => g.category === category)
      .map((g) => g.id);
    const current = new Set(capabilitiesData.gemstones || []);

    // Check if all in category are selected
    const allSelected = gemstonesInCategory.every((id) => current.has(id));

    if (allSelected) {
      // Remove all in category
      gemstonesInCategory.forEach((id) => current.delete(id));
    } else {
      // Add all in category
      gemstonesInCategory.forEach((id) => current.add(id));
    }

    setCapabilitiesData({
      ...capabilitiesData,
      gemstones: Array.from(current),
    });
  };

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Inventory & Capabilities</h1>
            <p className="text-muted-foreground">
              Manage your materials, jewellery types, and build methods
            </p>
          </div>

          {/* Live Market Rates Card */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Live Market Rates
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshMarketRates}
                  disabled={isRefreshingRates}
                  className="text-amber-700"
                >
                  {isRefreshingRates ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 dark:text-amber-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {allMaterials.slice(0, 4).map((mat) => {
                  const rate = getMarketRate(mat.metal, mat.purity);
                  return (
                    <div
                      key={`${mat.metal}_${mat.purity}`}
                      className="bg-white/50 dark:bg-black/20 rounded-lg p-3"
                    >
                      <div className="text-xs text-amber-700 dark:text-amber-400">
                        {mat.label}
                      </div>
                      <div className="text-lg font-bold text-amber-900 dark:text-amber-200">
                        {rate
                          ? `${currencySymbol} ${rate.toLocaleString()}/g`
                          : "N/A"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white/30 dark:bg-black/10 rounded-lg p-3 space-y-2">
                <p className="font-medium">
                  <Info className="h-4 w-4 inline mr-1" />
                  How Pricing Works:
                </p>
                <p>
                  <strong>
                    Total Price = (Metal Weight × Live Rate) + Making Charges
                  </strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    <strong>Market Rate:</strong> Fetched live from FENEGOSIDA
                    (Nepal) or international sources.
                  </li>
                  <li>
                    <strong>Making Charges:</strong> Set your own per gram rate
                    below, or leave blank for system default (10% of metal
                    value).
                  </li>
                  <li>
                    <strong>Example:</strong> 10g Gold 24K at {currencySymbol}{" "}
                    {(getMarketRate("GOLD", "24K") || 12000).toLocaleString()}/g
                    = {currencySymbol}{" "}
                    {(
                      (getMarketRate("GOLD", "24K") || 12000) * 10
                    ).toLocaleString()}{" "}
                    metal + {currencySymbol}{" "}
                    {Math.round(
                      (getMarketRate("GOLD", "24K") || 12000) * 10 * 0.1,
                    ).toLocaleString()}{" "}
                    making = {currencySymbol}{" "}
                    {Math.round(
                      (getMarketRate("GOLD", "24K") || 12000) * 10 * 1.1,
                    ).toLocaleString()}{" "}
                    total
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="materials" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="alloys">Alloys</TabsTrigger>
              <TabsTrigger value="basemetals">Base Metals</TabsTrigger>
              <TabsTrigger value="plating">Plating</TabsTrigger>
              <TabsTrigger value="gemstones">Gemstones</TabsTrigger>
              <TabsTrigger value="jewellery">Jewellery Types</TabsTrigger>
              <TabsTrigger value="methods">Build Methods</TabsTrigger>
              <TabsTrigger value="finishes">Finishes</TabsTrigger>
            </TabsList>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5" />
                    Supported Materials
                  </CardTitle>
                  <CardDescription>
                    Select the metals and purities you work with
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allMaterials.map((material) => {
                      const key = `${material.metal}_${material.purity}`;
                      const isSelected =
                        materialsData?.supportedMaterials?.includes(key);
                      const materialData = materialsData?.materials?.find(
                        (m) =>
                          m.metal === material.metal &&
                          m.purity === material.purity,
                      );
                      const liveRate = getMarketRate(
                        material.metal,
                        material.purity,
                      );
                      const defaultMaking = getDefaultMakingCharge(
                        material.metal,
                        material.purity,
                      );

                      return (
                        <Card
                          key={key}
                          className={`cursor-pointer transition-all ${
                            isSelected ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleMaterial(key)}
                                />
                                <div>
                                  <Label className="cursor-pointer font-medium">
                                    {material.label}
                                  </Label>
                                  {liveRate && (
                                    <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      Live: {currencySymbol}{" "}
                                      {liveRate.toLocaleString()}/g
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-4 space-y-3 pl-6">
                                {liveRate && (
                                  <div className="bg-green-50 dark:bg-green-950/30 rounded p-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-green-700 dark:text-green-400">
                                        Live Rate:
                                      </span>
                                      <span className="font-medium">
                                        {currencySymbol}{" "}
                                        {liveRate.toLocaleString()}/g
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Default Making (10%):</span>
                                      <span>
                                        {currencySymbol}{" "}
                                        {defaultMaking.toLocaleString()}/g
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Making charge mode toggle */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">
                                      Making Charge Mode
                                    </Label>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xs ${(materialData?.chargeMode || "flat") === "flat" ? "font-semibold" : "text-muted-foreground"}`}
                                      >
                                        {currencySymbol}/g
                                      </span>
                                      <Switch
                                        checked={
                                          (materialData?.chargeMode ||
                                            "flat") === "percent"
                                        }
                                        onCheckedChange={(checked) => {
                                          const newMode = checked
                                            ? "percent"
                                            : "flat";
                                          const updates: Record<
                                            string,
                                            number | string
                                          > = { chargeMode: newMode };

                                          if (checked && liveRate) {
                                            const currentFlat =
                                              materialData?.makingChargePerGram ||
                                              defaultMaking;
                                            updates.makingChargePercent =
                                              currentFlat && liveRate
                                                ? Math.round(
                                                    (currentFlat / liveRate) *
                                                      100 *
                                                      100,
                                                  ) / 100
                                                : 10;
                                          } else if (!checked && liveRate) {
                                            const pct =
                                              materialData?.makingChargePercent ||
                                              10;
                                            updates.makingChargePerGram =
                                              Math.round(
                                                (liveRate * pct) / 100,
                                              );
                                          }

                                          updateMaterialPricingBatch(
                                            key,
                                            updates,
                                          );
                                        }}
                                      />
                                      <span
                                        className={`text-xs flex items-center gap-0.5 ${(materialData?.chargeMode || "flat") === "percent" ? "font-semibold" : "text-muted-foreground"}`}
                                      >
                                        <Percent className="h-3 w-3" /> %
                                      </span>
                                    </div>
                                  </div>

                                  {(materialData?.chargeMode || "flat") ===
                                  "percent" ? (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">
                                        Making Charge Percentage (%)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="e.g., 10"
                                        value={
                                          materialData?.makingChargePercent ??
                                          ""
                                        }
                                        onChange={(e) => {
                                          const pct = parseFloat(
                                            e.target.value,
                                          );
                                          updateMaterialPricing(
                                            key,
                                            "makingChargePercent",
                                            pct,
                                          );
                                          if (liveRate && !isNaN(pct)) {
                                            updateMaterialPricing(
                                              key,
                                              "makingChargePerGram",
                                              Math.round(
                                                (liveRate * pct) / 100,
                                              ),
                                            );
                                          }
                                        }}
                                      />
                                      {liveRate &&
                                        materialData?.makingChargePercent && (
                                          <p className="text-xs text-muted-foreground">
                                            = {currencySymbol}{" "}
                                            {Math.round(
                                              (liveRate *
                                                materialData.makingChargePercent) /
                                                100,
                                            ).toLocaleString()}
                                            /g making charge
                                          </p>
                                        )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">
                                        Your Making Charge ({currencySymbol}
                                        /gram)
                                      </Label>
                                      <Input
                                        type="number"
                                        placeholder={`Default: ${defaultMaking || "N/A"}`}
                                        value={
                                          materialData?.makingChargePerGram ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          updateMaterialPricing(
                                            key,
                                            "makingChargePerGram",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        {materialData?.makingChargePerGram &&
                                        liveRate ? (
                                          <>
                                            Total: {currencySymbol}{" "}
                                            {liveRate.toLocaleString()}/g
                                            (metal) + {currencySymbol}{" "}
                                            {materialData.makingChargePerGram.toLocaleString()}
                                            /g (making) ={" "}
                                            <span className="font-semibold text-foreground">
                                              {currencySymbol}{" "}
                                              {(
                                                liveRate +
                                                materialData.makingChargePerGram
                                              ).toLocaleString()}
                                              /g
                                            </span>
                                          </>
                                        ) : (
                                          "Leave blank to use default (10% of metal value)"
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Min Weight (g)
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="1"
                                      value={materialData?.minWeightGrams || ""}
                                      onChange={(e) =>
                                        updateMaterialPricing(
                                          key,
                                          "minWeightGrams",
                                          parseFloat(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Max Weight (g)
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="100"
                                      value={materialData?.maxWeightGrams || ""}
                                      onChange={(e) =>
                                        updateMaterialPricing(
                                          key,
                                          "maxWeightGrams",
                                          parseFloat(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Customer Preview */}
                                {liveRate && (
                                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                                      <Eye className="h-3.5 w-3.5" />
                                      Customer View Preview
                                    </div>
                                    {(() => {
                                      const making =
                                        materialData?.makingChargePerGram ||
                                        defaultMaking;
                                      const total = liveRate + making;
                                      const makingPct =
                                        liveRate > 0
                                          ? ((making / liveRate) * 100).toFixed(
                                              1,
                                            )
                                          : "0";
                                      return (
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                          <div className="bg-white dark:bg-black/20 rounded p-2">
                                            <p className="text-[10px] text-muted-foreground uppercase">
                                              Metal Rate
                                            </p>
                                            <p className="text-sm font-bold">
                                              {currencySymbol}{" "}
                                              {liveRate.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              per gram
                                            </p>
                                          </div>
                                          <div className="bg-white dark:bg-black/20 rounded p-2">
                                            <p className="text-[10px] text-muted-foreground uppercase">
                                              Making
                                            </p>
                                            <p className="text-sm font-bold text-amber-600">
                                              {currencySymbol}{" "}
                                              {making.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              ({makingPct}%) /g
                                            </p>
                                          </div>
                                          <div className="bg-white dark:bg-black/20 rounded p-2">
                                            <p className="text-[10px] text-muted-foreground uppercase">
                                              Total
                                            </p>
                                            <p className="text-sm font-bold text-green-600">
                                              {currencySymbol}{" "}
                                              {total.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              per gram
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveMaterials} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gemstones Tab */}
            <TabsContent value="gemstones" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5" />
                    Supported Gemstones
                  </CardTitle>
                  <CardDescription>
                    Select the gemstones you can work with or source
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {gemstoneCategories.map((category) => {
                    const gemstonesInCategory = allGemstones.filter(
                      (g) => g.category === category.id,
                    );
                    const selectedCount = gemstonesInCategory.filter((g) =>
                      (capabilitiesData?.gemstones || []).includes(g.id),
                    ).length;
                    const allSelected =
                      selectedCount === gemstonesInCategory.length;

                    return (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm flex items-center gap-2">
                              {category.name}
                              <Badge variant="secondary" className="text-xs">
                                {selectedCount}/{gemstonesInCategory.length}
                              </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleAllGemstonesInCategory(category.id)
                            }
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {gemstonesInCategory.map((gemstone) => {
                            const isSelected = (
                              capabilitiesData?.gemstones || []
                            ).includes(gemstone.id);
                            return (
                              <div
                                key={gemstone.id}
                                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-gray-300"
                                }`}
                                onClick={() => toggleGemstone(gemstone.id)}
                              >
                                <Checkbox checked={isSelected} />
                                <Label className="cursor-pointer text-sm">
                                  {gemstone.name}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Gemstones
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Gemstone Pricing Card */}
              {gemstonePricing.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gem className="h-5 w-5" />
                      Gemstone Pricing
                    </CardTitle>
                    <CardDescription>
                      Set your own prices or use system defaults. Leave blank to
                      use the default price.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Group by stone type */}
                    {(() => {
                      // Group by unique stoneType + origin combinations
                      const stoneGroups = new Map<string, any[]>();
                      gemstonePricing.forEach((r: any) => {
                        const key = `${r.stoneType}|${r.origin}`;
                        if (!stoneGroups.has(key)) stoneGroups.set(key, []);
                        stoneGroups.get(key)!.push(r);
                      });

                      return Array.from(stoneGroups.entries()).map(
                        ([groupKey, stoneRates]) => {
                          const [stoneType, origin] = groupKey.split("|");
                          const displayName =
                            origin === "LAB_GROWN"
                              ? `${stoneType.replace(/_/g, " ")} (Lab-Grown)`
                              : stoneType.replace(/_/g, " ");
                          const sizeCategories = Array.from(
                            new Set(stoneRates.map((r: any) => r.sizeCategory)),
                          );

                          return (
                            <div key={groupKey} className="space-y-3">
                              <h3 className="font-medium text-sm capitalize">
                                {displayName.toLowerCase().replace(/_/g, " ")}
                              </h3>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Size</th>
                                      <th className="text-right p-2">
                                        Quality
                                      </th>
                                      <th className="text-right p-2">
                                        System Default
                                      </th>
                                      <th className="text-right p-2">
                                        Your Price ({currencySymbol})
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sizeCategories.map((size) => {
                                      const qualityRates = stoneRates.filter(
                                        (r: any) => r.sizeCategory === size,
                                      );
                                      return qualityRates.map(
                                        (rate: any, idx: number) => {
                                          const overrideKey = `${rate.stoneType}_${rate.origin}_${rate.sizeCategory}_${rate.qualityTier}`;
                                          return (
                                            <tr
                                              key={overrideKey}
                                              className="border-b hover:bg-muted/50"
                                            >
                                              {idx === 0 && (
                                                <td
                                                  className="p-2 font-medium"
                                                  rowSpan={qualityRates.length}
                                                >
                                                  {size}
                                                </td>
                                              )}
                                              <td className="p-2 text-right">
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {rate.qualityTier}
                                                </Badge>
                                              </td>
                                              <td className="p-2 text-right text-muted-foreground">
                                                {currencySymbol}
                                                {rate.systemDefault.toLocaleString()}
                                              </td>
                                              <td className="p-2 text-right">
                                                <Input
                                                  type="number"
                                                  className="w-28 ml-auto text-right h-8"
                                                  placeholder={rate.systemDefault.toLocaleString()}
                                                  value={
                                                    gemstoneOverrides[
                                                      overrideKey
                                                    ] ?? ""
                                                  }
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setGemstoneOverrides(
                                                      (prev) => {
                                                        if (val === "") {
                                                          const next = {
                                                            ...prev,
                                                          };
                                                          delete next[
                                                            overrideKey
                                                          ];
                                                          return next;
                                                        }
                                                        return {
                                                          ...prev,
                                                          [overrideKey]:
                                                            parseFloat(val),
                                                        };
                                                      },
                                                    );
                                                  }}
                                                />
                                              </td>
                                            </tr>
                                          );
                                        },
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        },
                      );
                    })()}

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={saveGemstonePricing}
                        disabled={isSavingGemstones}
                      >
                        {isSavingGemstones ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Gemstone Pricing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Jewellery Types Tab */}
            <TabsContent value="jewellery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDot className="h-5 w-5" />
                    Jewellery Types
                  </CardTitle>
                  <CardDescription>
                    Select the types of jewellery you can make
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TooltipProvider delayDuration={200}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {allJewelleryTypes.map((type) => {
                        const isSelected =
                          capabilitiesData?.jewelleryTypes?.includes(type);
                        const info = JEWELLERY_TYPE_DATA[type];
                        return (
                          <Tooltip key={type}>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-gray-300"
                                }`}
                                onClick={() => toggleJewelleryType(type)}
                              >
                                <Checkbox checked={isSelected} />
                                {info?.image && (
                                  <img
                                    src={info.image}
                                    alt={info.label}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                )}
                                <Label className="cursor-pointer text-sm">
                                  {info?.label || type.replace(/_/g, " ")}
                                </Label>
                              </div>
                            </TooltipTrigger>
                            {info && (
                              <TooltipContent
                                side="bottom"
                                className="p-0 overflow-hidden max-w-[220px]"
                              >
                                <div>
                                  <img
                                    src={info.image}
                                    alt={info.label}
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="p-2">
                                    <p className="font-medium text-sm">
                                      {info.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {info.description}
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>

                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Jewellery Types
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alloys Tab (Method B) */}
            <TabsContent value="alloys" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDot className="h-5 w-5" />
                    Standard Alloys (Method B)
                  </CardTitle>
                  <CardDescription>
                    Select the alloy compositions you can work with for Method B
                    orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {allAlloysData.map((alloy) => {
                      const isSelected = capabilitiesData?.alloys?.includes(
                        alloy.value,
                      );
                      return (
                        <div
                          key={alloy.value}
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-300"
                          }`}
                          onClick={() => toggleAlloy(alloy.value)}
                        >
                          <Checkbox checked={isSelected} className="mt-1" />
                          <div>
                            <Label className="cursor-pointer font-medium">
                              {alloy.label}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alloy.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Alloys
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Base Metals Tab (Method C/D) */}
            <TabsContent value="basemetals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hammer className="h-5 w-5" />
                    Base Metals (Method C & D)
                  </CardTitle>
                  <CardDescription>
                    Select the base/core metals you work with and set your
                    per-gram rate. These prices are used in the RFQ live
                    calculator for transparent cost breakdown.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {allBaseMetalsData.map((metal) => {
                      const isSelected = capabilitiesData?.baseMetals?.includes(
                        metal.value,
                      );
                      return (
                        <div
                          key={metal.value}
                          className={`p-4 rounded-lg border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="flex items-start gap-3 cursor-pointer"
                            onClick={() => toggleBaseMetal(metal.value)}
                          >
                            <Checkbox checked={isSelected} className="mt-1" />
                            <div className="flex-1">
                              <Label className="cursor-pointer font-medium">
                                {metal.label}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {metal.description}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 ml-7 flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">
                                Rate per gram ({currencySymbol})
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={baseMetalPrices[metal.value] ?? ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setBaseMetalPrices((prev) => ({
                                    ...prev,
                                    [metal.value]: isNaN(v) ? 0 : v,
                                  }));
                                }}
                                placeholder="0.00"
                                className="h-8 w-32 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                per gram
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Selection
                    </Button>
                    <Button
                      onClick={saveComponentPricing}
                      disabled={isSavingComponentPricing}
                      variant="default"
                    >
                      {isSavingComponentPricing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Save Prices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Plating Types Tab (Method C) */}
            <TabsContent value="plating" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Plating & Coating Types (Method C)
                  </CardTitle>
                  <CardDescription>
                    Select plating types and set your base rate per piece. The
                    calculator adjusts this by tier and jewellery size
                    automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {allPlatingData.map((plating) => {
                      const isSelected =
                        capabilitiesData?.platingTypes?.includes(plating.value);
                      return (
                        <div
                          key={plating.value}
                          className={`p-4 rounded-lg border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="flex items-start gap-3 cursor-pointer"
                            onClick={() => togglePlatingType(plating.value)}
                          >
                            <Checkbox checked={isSelected} className="mt-1" />
                            <div className="flex-1">
                              <Label className="cursor-pointer font-medium">
                                {plating.label}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plating.description}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 ml-7 flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">
                                Base rate ({currencySymbol})
                              </Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={platingPrices[plating.value] ?? ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setPlatingPrices((prev) => ({
                                    ...prev,
                                    [plating.value]: isNaN(v) ? 0 : v,
                                  }));
                                }}
                                placeholder="0"
                                className="h-8 w-32 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                per piece (base)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Selection
                    </Button>
                    <Button
                      onClick={saveComponentPricing}
                      disabled={isSavingComponentPricing}
                      variant="default"
                    >
                      {isSavingComponentPricing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Save Prices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Build Methods Tab */}
            <TabsContent value="methods" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hammer className="h-5 w-5" />
                    Build Methods
                  </CardTitle>
                  <CardDescription>
                    Select the construction methods you support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {allBuildMethods.map((method) => {
                      const isSelected =
                        capabilitiesData?.buildMethods?.includes(method.value);
                      return (
                        <div
                          key={method.value}
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-300"
                          }`}
                          onClick={() => toggleBuildMethod(method.value)}
                        >
                          <Checkbox checked={isSelected} className="mt-1" />
                          <div>
                            <Label className="cursor-pointer font-medium">
                              {method.label}
                            </Label>
                            {method.value === "METHOD_A" && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Standard solid gold or silver construction
                              </p>
                            )}
                            {method.value === "METHOD_B" && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Silver core with gold plating overlay
                              </p>
                            )}
                            {method.value === "METHOD_C" && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Hollow/tube construction for lightweight pieces
                              </p>
                            )}
                            {method.value === "METHOD_D" && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Machine-made chains and bangles (Italian style)
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Build Methods
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finishes Tab */}
            <TabsContent value="finishes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Surface Finishes
                  </CardTitle>
                  <CardDescription>
                    Select the finishes you can apply and set your price per
                    piece for each. Prices feed into the RFQ calculator.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TooltipProvider delayDuration={200}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allFinishes.map((finish) => {
                        const isSelected =
                          capabilitiesData?.finishes?.includes(finish);
                        const info = FINISH_DATA[finish];
                        return (
                          <Tooltip key={finish}>
                            <TooltipTrigger asChild>
                              <div
                                className={`p-3 rounded-lg border transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-gray-300"
                                }`}
                              >
                                <div
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={() => toggleFinish(finish)}
                                >
                                  <Checkbox checked={isSelected} />
                                  {info?.image && (
                                    <img
                                      src={info.image}
                                      alt={info.label}
                                      className="h-8 w-8 rounded object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <Label className="cursor-pointer text-sm block">
                                      {info?.label ||
                                        finish.replace(/_/g, " ")}
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {info?.description}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-2 ml-6 flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      step="1"
                                      min="0"
                                      value={finishPrices[finish] ?? ""}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setFinishPrices((prev) => ({
                                          ...prev,
                                          [finish]: isNaN(v) ? 0 : v,
                                        }));
                                      }}
                                      placeholder="0"
                                      className="h-7 w-24 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                      {currencySymbol}/pc
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            {info && (
                              <TooltipContent
                                side="bottom"
                                className="p-0 overflow-hidden max-w-[220px]"
                              >
                                <div>
                                  <img
                                    src={info.image}
                                    alt={info.label}
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="p-2">
                                    <p className="font-medium text-sm">
                                      {info.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {info.description}
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>

                  <div className="flex justify-end gap-2">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Selection
                    </Button>
                    <Button
                      onClick={saveComponentPricing}
                      disabled={isSavingComponentPricing}
                      variant="default"
                    >
                      {isSavingComponentPricing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Save Prices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
