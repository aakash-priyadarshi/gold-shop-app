"use client";

import Image from "next/image";

import {
    AiDesignStudio,
    type AiDesignVariation,
} from "@/components/ai/AiDesignStudio";
import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LivePricingPanel } from "@/components/pricing/LivePricingPanel";
import { WeighingScalePanel } from "@/components/scale/WeighingScalePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { FlagImage } from "@/components/ui/phone-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useMarket } from "@/hooks/useMarket";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { fetchTaxRules, lookupTaxRate } from "@/hooks/useTaxRules";
import { getApiUrl, shopQuotesApi, shopsApi } from "@/lib/api";
import {
    BUILD_METHODS,
    JEWELLERY_TYPES,
    JEWELLERY_TYPE_IMAGES,
    SURFACE_FINISH_IMAGES,
    WEIGHT_GUIDANCE,
    getBuildMethodInfo,
    getJewelleryTypeLabel,
} from "@/lib/constants/jewellery";
import { getImageUrl } from "@/lib/image-upload";
import type { GoldKarat } from "@/lib/pricing/alloy-constants";
import type {
    BaseMetalType,
    PlatingTierC,
    PlatingTypeC,
} from "@/lib/pricing/base-metal-constants";
import {
    calculateEstimate,
    type BuildMethod,
    type EstimateRequest,
} from "@/lib/pricing/calculate-estimate";
import { useT } from "@/providers/translation-provider";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    Copy,
    Gem,
    ImageIcon,
    Link2,
    Loader2,
    Mail,
    MessageSquare,
    Plus,
    RefreshCw,
    Scale,
    Sparkles,
    Trash2,
    Upload,
    User,
    UserCheck,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = getApiUrl();

const COUNTRY_CODES = [
  { code: "+91", country: "India", flagCode: "IN" as const },
  { code: "+977", country: "Nepal", flagCode: "NP" as const },
  { code: "+1", country: "USA", flagCode: "US" as const },
  { code: "+44", country: "UK", flagCode: "GB" as const },
  { code: "+971", country: "UAE", flagCode: "AE" as const },
  { code: "+65", country: "Singapore", flagCode: null },
  { code: "+61", country: "Australia", flagCode: null },
  { code: "+81", country: "Japan", flagCode: null },
];

interface CustomerLookupResult {
  found: boolean;
  customer: {
    id: string;
    name: string;
    phone: string;
    phoneCountryCode: string;
    email?: string;
    address: string;
    city: string;
    country: string;
    isRegistered?: boolean;
    recentOrders?: Array<{
      id: string;
      quoteNumber: string;
      jewelleryType: string;
      totalPriceNpr?: number;
      status: string;
      createdAt: string;
    }>;
  } | null;
  source: "cache" | "database" | null;
}

interface MarketRates {
  metals: Record<string, number>;
  currency: string;
  updatedAt: string;
  cache: "fresh" | "stale" | "fallback" | "miss" | "hit";
  fx?: { rate: number };
  source?: string;
  debug?: { spotSource?: string };
}

interface GemstoneRateOption {
  key: string;
  label: string;
  stoneType: string;
  origin: string;
  sizeCategory: string;
  qualityTier: string;
  effectivePriceNpr: number;
  shopPriceNpr?: number | null;
  sourceLabel: string;
}

interface QuoteGemstoneEntry {
  id: string;
  rateKey: string;
  count: number;
  notes?: string;
  fallbackStoneType?: string;
}

const createQuoteGemstoneEntry = (): QuoteGemstoneEntry => ({
  id: `gem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  rateKey: "",
  count: 1,
});

const formatGemstoneCode = (value?: string | null) =>
  (value || "Gemstone")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatGemstoneOrigin = (origin?: string | null) => {
  const normalized = origin?.toUpperCase();
  return normalized === "LAB" || normalized === "LAB_GROWN"
    ? "Lab-grown"
    : "Natural";
};

export default function CreateShopQuotePage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Post-creation state: tracking link flow
  const [createdQuote, setCreatedQuote] = useState<{
    id: string;
    quoteNumber: string;
    trackingToken?: string;
  } | null>(null);
  const [sendingTracking, setSendingTracking] = useState(false);
  const [trackingSent, setTrackingSent] = useState<"email" | "sms" | null>(
    null,
  );

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(
    null,
  );
  const [showReturningCustomerAlert, setShowReturningCustomerAlert] =
    useState(false);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phoneCountryCode: "+91",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "India",
  });

  // Shop currency from settings
  const {
    symbol: currencySymbol,
    currencyCode,
    country: shopCountry,
  } = useShopCurrency();

  // Tax
  const [taxRate, setTaxRate] = useState(0.13);
  const [taxLabel, setTaxLabel] = useState("Tax (13% VAT)");

  useEffect(() => {
    const region = shopCountry || "NP";
    fetchTaxRules(region).then((result) => {
      if (result?.rules) {
        const { rate, name } = lookupTaxRate(result.rules);
        setTaxRate(rate);
        setTaxLabel(`${name} (${(rate * 100).toFixed(1)}%)`);
      }
    });
  }, [shopCountry]);

  // Market rates for live pricing
  const [marketRates, setMarketRates] = useState<MarketRates | null>(null);
  const [marketRatesLoading, setMarketRatesLoading] = useState(false);
  const [marketRatesWarning, setMarketRatesWarning] = useState<string | null>(
    null,
  );
  const [gemstoneRateOptions, setGemstoneRateOptions] = useState<
    GemstoneRateOption[]
  >([]);
  const [gemstoneRatesLoading, setGemstoneRatesLoading] = useState(false);

  useEffect(() => {
    const fetchMarketRates = async () => {
      setMarketRatesLoading(true);
      setMarketRatesWarning(null);
      try {
        const res = await fetch(
          `${API_URL}/market-rates?currency=${currencyCode}&country=${shopCountry}`,
        );
        if (res.ok) {
          const data = await res.json();
          setMarketRates(data);
          if (data.cache === "fallback") {
            setMarketRatesWarning(
              "Using estimated rates - market data temporarily unavailable",
            );
          } else if (data.cache === "stale") {
            setMarketRatesWarning(
              "Using cached rates - market data may be outdated",
            );
          } else if (data.debug?.spotSource === "fallback") {
            setMarketRatesWarning(
              "Using fallback spot prices - live feed unavailable",
            );
          }
        } else {
          setMarketRatesWarning(
            "Unable to load current rates - showing estimates",
          );
        }
      } catch {
        setMarketRatesWarning("Connection error - showing estimated rates");
      } finally {
        setMarketRatesLoading(false);
      }
    };
    fetchMarketRates();
  }, [currencyCode, shopCountry]);

  useEffect(() => {
    let isMounted = true;

    const fetchGemstoneRates = async () => {
      setGemstoneRatesLoading(true);
      try {
        const response = await shopsApi.getGemstonePricing();
        if (!isMounted) return;

        const options = (response.data?.rates ?? [])
          .map((rate: any): GemstoneRateOption | null => {
            const effectivePriceNpr = Number(rate?.effectivePrice ?? 0);
            if (
              !rate?.stoneType ||
              !rate?.origin ||
              !rate?.sizeCategory ||
              !rate?.qualityTier ||
              effectivePriceNpr <= 0
            ) {
              return null;
            }

            const origin = String(rate.origin);
            const sourceLabel =
              rate.shopPrice !== null && rate.shopPrice !== undefined
                ? "Seller inventory price"
                : "Platform default price";

            return {
              key: [
                rate.stoneType,
                origin,
                rate.sizeCategory,
                rate.qualityTier,
              ].join("|"),
              label: `${formatGemstoneCode(rate.stoneType)} · ${formatGemstoneOrigin(origin)} · ${rate.sizeCategory} · ${rate.qualityTier}`,
              stoneType: rate.stoneType,
              origin,
              sizeCategory: rate.sizeCategory,
              qualityTier: rate.qualityTier,
              effectivePriceNpr,
              shopPriceNpr: rate.shopPrice,
              sourceLabel,
            };
          })
          .filter(Boolean) as GemstoneRateOption[];

        setGemstoneRateOptions(options);
      } catch {
        if (isMounted) setGemstoneRateOptions([]);
      } finally {
        if (isMounted) setGemstoneRatesLoading(false);
      }
    };

    fetchGemstoneRates();

    return () => {
      isMounted = false;
    };
  }, [user?.shop?.id]);

  // AI Design
  const [designPreviewUrl, setDesignPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [designId, setDesignId] = useState<string | null>(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");

  const { selectedWeightUnit } = useMarket();

  // Form data
  const [formData, setFormData] = useState({
    jewelleryType: "",
    buildMethod: "METHOD_A" as BuildMethod,
    metalType: "GOLD_24K",
    composition: {} as Record<string, unknown>,
    targetTotalWeightG: "",
    targetGoldWeightG: "",
    specialInstructions: "",
    referenceImages: [] as string[],
    metalCostOverride: "",
    makingChargeOverride: "",
    gemstoneCostOverride: "",
    finishCostOverride: "",
    estimatedDays: "",
    shopNotes: "",
    alloyConfig: {
      baseMetal: "GOLD",
      karat: "22K" as string | undefined,
      alloyFamily: undefined as string | undefined,
      recipePresetId: undefined as string | undefined,
    },
    methodCConfig: {
      baseMetal: "BRASS",
      platingType: "GOLD_PLATED",
      platingTier: "STANDARD",
    },
    methodDConfig: { purity: "18K", chainStyle: "" },
    hasGemstones: false,
    gemstonesV2: [] as QuoteGemstoneEntry[],
    surfaceFinish: "",
    description: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploading: isUploadingImage,
    progress: uploadProgress,
    upload: uploadImageToR2,
  } = useImageUpload({
    type: "rfq",
    onSuccess: (result) => {
      if (result.url) {
        setFormData((prev) => ({
          ...prev,
          referenceImages: [...prev.referenceImages, result.url!],
        }));
      }
    },
    onError: (err) => setError(`Image upload failed: ${err}`),
  });

  const lookupCustomer = useCallback(
    async (phoneCountryCode: string, phone: string) => {
      if (phone.length < 7) {
        setLookupResult(null);
        setShowReturningCustomerAlert(false);
        return;
      }
      setIsLookingUp(true);
      try {
        const response = await shopQuotesApi.lookupCustomer({
          phoneCountryCode,
          phone,
        });
        const result = response.data as CustomerLookupResult;
        setLookupResult(result);
        if (result.found && result.customer)
          setShowReturningCustomerAlert(true);
      } catch {
        setLookupResult(null);
      } finally {
        setIsLookingUp(false);
      }
    },
    [],
  );

  const handlePhoneChange = (phone: string) => {
    setCustomerDetails((prev) => ({ ...prev, phone }));
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      lookupCustomer(customerDetails.phoneCountryCode, phone);
    }, 500);
  };

  const handleAutoFillCustomer = () => {
    if (lookupResult?.customer) {
      const c = lookupResult.customer;
      setCustomerDetails({
        name: c.name,
        phoneCountryCode: c.phoneCountryCode,
        phone: c.phone.replace(c.phoneCountryCode, ""),
        email: c.email || "",
        address: c.address,
        city: c.city,
        country: c.country,
      });
      setShowReturningCustomerAlert(false);
      toast({
        title: t("Customer details auto-filled"),
        description: t("Welcome back") + `, ${c.name}!`,
      });
    }
  };

  const handleReferenceImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t("Each image must be smaller than 10MB"));
        continue;
      }
      await uploadImageToR2(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeReferenceImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((img) => img !== url),
    }));
  };

  const gemstoneRateByKey = useMemo(() => {
    return new Map(gemstoneRateOptions.map((option) => [option.key, option]));
  }, [gemstoneRateOptions]);

  const selectedGemstoneLines = useMemo(() => {
    return formData.gemstonesV2.map((entry) => {
      const rate = gemstoneRateByKey.get(entry.rateKey) ?? null;
      const count = Math.max(Number(entry.count) || 1, 1);
      return {
        entry,
        rate,
        count,
        totalNpr: rate ? rate.effectivePriceNpr * count : 0,
      };
    });
  }, [formData.gemstonesV2, gemstoneRateByKey]);

  const selectedGemstoneDetails = useMemo(() => {
    return selectedGemstoneLines
      .filter((line) => line.rate)
      .map((line) => {
        const rate = line.rate as GemstoneRateOption;
        return {
          stoneType: rate.stoneType,
          origin: rate.origin,
          sizeCategory: rate.sizeCategory,
          qualityTier: rate.qualityTier,
          count: line.count,
          pricePerStoneNpr: rate.effectivePriceNpr,
          totalPriceNpr: line.totalNpr,
          source: rate.shopPriceNpr ? "SELLER_INVENTORY" : "PLATFORM_DEFAULT",
          notes: line.entry.notes?.trim() || undefined,
        };
      });
  }, [selectedGemstoneLines]);

  const calculatedGemstoneCostNpr = useMemo(
    () => selectedGemstoneLines.reduce((sum, line) => sum + line.totalNpr, 0),
    [selectedGemstoneLines],
  );

  const addGemstoneLine = () => {
    setFormData((prev) => ({
      ...prev,
      hasGemstones: true,
      gemstonesV2: [...prev.gemstonesV2, createQuoteGemstoneEntry()],
    }));
  };

  const updateGemstoneLine = (
    id: string,
    updates: Partial<QuoteGemstoneEntry>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      gemstonesV2: prev.gemstonesV2.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      ),
    }));
  };

  const removeGemstoneLine = (id: string) => {
    setFormData((prev) => {
      const gemstonesV2 = prev.gemstonesV2.filter((entry) => entry.id !== id);
      return {
        ...prev,
        hasGemstones: gemstonesV2.length > 0,
        gemstonesV2,
      };
    });
  };

  const buildEstimateRequest = (): EstimateRequest => {
    const weight = parseFloat(formData.targetTotalWeightG) || 0;
    const request: EstimateRequest = {
      buildMethod: formData.buildMethod,
      jewelleryType: formData.jewelleryType,
      country: shopCountry,
      currency: currencyCode,
      makingChargePercent: 12,
      methodA:
        formData.buildMethod === "METHOD_A"
          ? { metal: formData.metalType, weightGrams: weight }
          : undefined,
      methodB:
        formData.buildMethod === "METHOD_B"
          ? {
              baseMetal: formData.alloyConfig.baseMetal as "GOLD" | "SILVER",
              karat: formData.alloyConfig.karat as GoldKarat | undefined,
              alloyFamily: formData.alloyConfig.alloyFamily as any,
              recipePresetId: formData.alloyConfig.recipePresetId,
              weightGrams: weight,
            }
          : undefined,
      methodC:
        formData.buildMethod === "METHOD_C"
          ? {
              baseMetal: formData.methodCConfig.baseMetal as BaseMetalType,
              platingType: formData.methodCConfig.platingType as PlatingTypeC,
              platingTier: formData.methodCConfig.platingTier as PlatingTierC,
              weightGrams: weight,
            }
          : undefined,
      methodD:
        formData.buildMethod === "METHOD_D"
          ? {
              purity: formData.methodDConfig.purity as
                | "22K"
                | "18K"
                | "14K"
                | "SILVER_925",
              chainStyle: (formData.methodDConfig.chainStyle ||
                undefined) as any,
              weightGrams: weight,
            }
          : undefined,
    };

    // Add gemstones if any
    if (formData.hasGemstones && selectedGemstoneDetails.length > 0) {
      request.gemstones = selectedGemstoneDetails.map((gemstone) => ({
        stoneType: gemstone.stoneType,
        origin: gemstone.origin,
        sizeCategory: gemstone.sizeCategory,
        qualityTier: gemstone.qualityTier,
        count: gemstone.count,
        pricePerStone: gemstone.pricePerStoneNpr,
        priceSource:
          gemstone.source === "SELLER_INVENTORY"
            ? "Seller inventory price"
            : "Platform default price",
      }));
    }

    // Add surface finish
    if (formData.surfaceFinish) {
      request.surfaceFinish = { finishType: formData.surfaceFinish };
    }

    return request;
  };

  // Auto-calculated estimate from the pricing engine
  const autoEstimate = useMemo(() => {
    try {
      if (!marketRates) return null;
      const request = buildEstimateRequest();
      request.marketRates = {
        metals: marketRates.metals,
        fx: marketRates.fx,
      };
      return calculateEstimate(request);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.buildMethod,
    formData.jewelleryType,
    formData.metalType,
    formData.targetTotalWeightG,
    formData.alloyConfig,
    formData.methodCConfig,
    formData.methodDConfig,
    formData.hasGemstones,
    formData.gemstonesV2,
    selectedGemstoneDetails,
    formData.surfaceFinish,
    marketRates,
    shopCountry,
    currencyCode,
  ]);

  const applyAiVariation = useCallback(
    (variation: AiDesignVariation) => {
      setFormData((prev) => ({
        ...prev,
        jewelleryType: variation.jewelryType,
        buildMethod: variation.buildMethod as BuildMethod,
        metalType: variation.metalType,
        targetTotalWeightG: variation.estimatedWeight
          ? String(variation.estimatedWeight)
          : "",
        surfaceFinish: variation.surfaceFinish || prev.surfaceFinish,
        description: variation.description || prev.description,
        hasGemstones: variation.hasGemstones,
        gemstonesV2: variation.gemstones?.length
          ? variation.gemstones.map((gemstone, index) => {
              const normalizedStoneType = String(
                gemstone.stoneType || "DIAMOND",
              )
                .replace("DIAMOND_NATURAL", "DIAMOND")
                .replace("DIAMOND_LAB", "DIAMOND");
              const matchingRate = gemstoneRateOptions.find(
                (option) => option.stoneType === normalizedStoneType,
              );
              const notes = [
                gemstone.shape,
                gemstone.sizeValue
                  ? `${gemstone.sizeValue}${gemstone.sizeUnit === "CARAT" ? "ct" : "mm"}`
                  : "",
                gemstone.color,
                gemstone.clarity,
                gemstone.cut,
                gemstone.settingStyle,
              ]
                .filter(Boolean)
                .join(", ");

              return {
                id: `ai-${Date.now()}-${index}`,
                rateKey: matchingRate?.key || "",
                count: gemstone.count ?? 1,
                notes: notes || undefined,
                fallbackStoneType: normalizedStoneType,
              };
            })
          : prev.gemstonesV2,
        alloyConfig:
          variation.buildMethod === "METHOD_B" && variation.alloyDetails
            ? {
                baseMetal: variation.alloyDetails.baseMetal || "GOLD",
                karat: variation.alloyDetails.karat,
                alloyFamily: variation.alloyDetails.alloyFamily,
                recipePresetId: undefined,
              }
            : prev.alloyConfig,
        methodCConfig:
          variation.buildMethod === "METHOD_C" && variation.platingDetails
            ? {
                baseMetal: variation.platingDetails.baseMetal || "BRASS",
                platingType:
                  variation.platingDetails.platingType || "GOLD_PLATED",
                platingTier: variation.platingDetails.platingTier || "STANDARD",
              }
            : prev.methodCConfig,
        methodDConfig:
          variation.buildMethod === "METHOD_D" && variation.italianMachineDetails
            ? {
                purity: variation.italianMachineDetails.purity || "18K",
                chainStyle: variation.italianMachineDetails.chainStyle || "",
              }
            : prev.methodDConfig,
        metalCostOverride: variation.estimatedCost?.metal
          ? String(variation.estimatedCost.metal)
          : prev.metalCostOverride,
        makingChargeOverride: variation.estimatedCost?.making
          ? String(variation.estimatedCost.making)
          : prev.makingChargeOverride,
        gemstoneCostOverride: variation.estimatedCost?.gemstones
          ? String(variation.estimatedCost.gemstones)
          : prev.gemstoneCostOverride,
        finishCostOverride: variation.estimatedCost?.finish
          ? String(variation.estimatedCost.finish)
          : prev.finishCostOverride,
      }));
      if (variation.imageUrl) {
        setDesignPreviewUrl(variation.imageUrl);
        if (variation.designId) setDesignId(variation.designId);
      }
    },
    [gemstoneRateOptions],
  );

  const handleGenerateDesign = async () => {
    if (!formData.jewelleryType) {
      setError(t("Please select a jewellery type first"));
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError(t("Please log in to generate design previews"));
      return;
    }
    setGeneratingPreview(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/designs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jewelryType: formData.jewelleryType,
          buildMethod: formData.buildMethod,
          metalType: formData.metalType,
          surfaceFinish:
            formData.surfaceFinish ||
            (formData.composition as any)?.surfaceFinish ||
            "",
          additionalSpecs: {
            description: [
              formData.description,
              formData.specialInstructions,
              `A ${getJewelleryTypeLabel(formData.jewelleryType)}`,
              formData.buildMethod === "METHOD_B" && formData.alloyConfig?.karat
                ? `made in ${formData.alloyConfig.karat} ${formData.alloyConfig.alloyFamily?.replace("_", " ").toLowerCase() || "gold"}`
                : formData.buildMethod === "METHOD_A"
                  ? `made in ${formData.metalType.replace(/_/g, " ").toLowerCase()}`
                  : formData.buildMethod === "METHOD_C"
                    ? `${formData.methodCConfig.platingType.replace(/_/g, " ").toLowerCase()} on ${formData.methodCConfig.baseMetal.toLowerCase()}`
                    : "",
              formData.targetTotalWeightG
                ? `weighing approximately ${formData.targetTotalWeightG}g`
                : "",
              formData.surfaceFinish
                ? `with ${formData.surfaceFinish.replace(/_/g, " ").toLowerCase()} finish`
                : "",
              formData.hasGemstones && selectedGemstoneLines.length > 0
                ? `with ${selectedGemstoneLines
                    .map((line) => {
                      const gemstoneName = line.rate
                        ? line.rate.stoneType
                        : line.entry.fallbackStoneType || "gemstone";
                      return `${line.count}x ${gemstoneName.replace(/_/g, " ").toLowerCase()}`;
                    })
                    .join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join(". "),
            regenerationFeedback: regenerationFeedback || undefined,
          },
          shareToGallery: false,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate preview");
      }
      const result = await response.json();
      if (!result.design) throw new Error("Invalid response from API");
      setDesignPreviewUrl(result.design.imageUrl);
      setDesignId(result.design.id);
      toast({
        title: t("AI Design Generated"),
        description: t("Preview ready! You can regenerate with feedback."),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to generate preview",
      );
    } finally {
      setGeneratingPreview(false);
    }
  };

  const calculateTotal = () => {
    // Use manual overrides if provided, otherwise fall back to auto-estimate
    const metal =
      parseFloat(formData.metalCostOverride) || autoEstimate?.metalCost || 0;
    const making =
      parseFloat(formData.makingChargeOverride) ||
      autoEstimate?.makingCharge ||
      0;
    const gemstone =
      parseFloat(formData.gemstoneCostOverride) ||
      autoEstimate?.gemstoneCost ||
      calculatedGemstoneCostNpr ||
      0;
    const finish =
      parseFloat(formData.finishCostOverride) || autoEstimate?.finishCost || 0;
    const subtotal = metal + making + gemstone + finish;
    const tax = subtotal * taxRate;
    return {
      metal,
      making,
      gemstone,
      finish,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  };

  const handleSubmit = async () => {
    if (
      !customerDetails.name ||
      !customerDetails.phone ||
      !customerDetails.address ||
      !customerDetails.city
    ) {
      setError(t("Please fill in all required customer details"));
      return;
    }
    if (!/^\d{7,15}$/.test(customerDetails.phone)) {
      setError(t("Please enter a valid phone number"));
      return;
    }
    if (!formData.jewelleryType || !formData.buildMethod) {
      setError(t("Please select jewellery type and build method"));
      return;
    }
    const hasManualGemstoneOverride =
      parseFloat(formData.gemstoneCostOverride) > 0;
    if (
      formData.hasGemstones &&
      formData.gemstonesV2.some((entry) => !entry.rateKey) &&
      !hasManualGemstoneOverride
    ) {
      setError(
        t("Select a gemstone price for each gemstone or remove empty rows"),
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const pricing = calculateTotal();
      const composition = {
        ...formData.composition,
        metalType: formData.metalType,
        alloyConfig: formData.alloyConfig,
        methodCConfig: formData.methodCConfig,
        methodDConfig: formData.methodDConfig,
        surfaceFinish: formData.surfaceFinish || undefined,
        description: formData.description || undefined,
        hasGemstones: formData.hasGemstones,
        gemstones: selectedGemstoneDetails,
      };

      const response = await shopQuotesApi.create({
        customer: {
          name: customerDetails.name,
          phoneCountryCode: customerDetails.phoneCountryCode,
          phone: customerDetails.phone,
          email: customerDetails.email || undefined,
          address: customerDetails.address,
          city: customerDetails.city,
          country: customerDetails.country,
        },
        jewelleryType: formData.jewelleryType,
        buildMethod: formData.buildMethod,
        composition,
        targetTotalWeightG:
          parseFloat(formData.targetTotalWeightG) || undefined,
        targetGoldWeightG: parseFloat(formData.targetGoldWeightG) || undefined,
        specialInstructions: formData.specialInstructions || undefined,
        referenceImages: designPreviewUrl
          ? [
              designPreviewUrl,
              ...formData.referenceImages.filter(
                (img) => img !== designPreviewUrl,
              ),
            ]
          : formData.referenceImages,
        metalCostNpr: pricing.metal || undefined,
        makingChargeNpr: pricing.making || undefined,
        gemstoneCostNpr: pricing.gemstone || undefined,
        finishCostNpr: pricing.finish || undefined,
        estimatedDays: parseInt(formData.estimatedDays) || undefined,
        shopNotes: formData.shopNotes || undefined,
      });
      const quote = response.data;
      setCreatedQuote({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        trackingToken: quote.trackingToken,
      });
      toast({
        title: t("Quote Created"),
        description: `${t("Quote")} ${quote.quoteNumber} ${t("created for")} ${customerDetails.name}`,
      });
    } catch (err: unknown) {
      const axiosErr = err as any;
      const msg = axiosErr?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : typeof msg === "string"
            ? msg
            : err instanceof Error
              ? err.message
              : t("An unexpected error occurred"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendTrackingLink = async (method: "email" | "sms") => {
    if (!createdQuote) return;
    setSendingTracking(true);
    try {
      await shopQuotesApi.sendTrackingLink(createdQuote.id, method);
      setTrackingSent(method);
      toast({
        title: t("Tracking link sent"),
        description:
          method === "email"
            ? t("Email sent to customer")
            : t("SMS sent to customer"),
      });
    } catch (err: unknown) {
      const axiosErr = err as any;
      const msg = axiosErr?.response?.data?.message;
      toast({
        title: t("Failed to send"),
        description:
          typeof msg === "string" ? msg : t("Could not send tracking link"),
        variant: "destructive",
      });
    } finally {
      setSendingTracking(false);
    }
  };

  const { subtotal, tax, total } = calculateTotal();
  const customerDetailsComplete =
    customerDetails.name &&
    customerDetails.phone &&
    customerDetails.address &&
    customerDetails.city;
  const jewelleryDetailsComplete =
    formData.jewelleryType && formData.buildMethod;
  const canSubmit = customerDetailsComplete && jewelleryDetailsComplete;

  // ── Post-creation success panel ─────────────────────────────────────────────
  if (createdQuote) {
    const trackingUrl = createdQuote.trackingToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/track/${createdQuote.trackingToken}`
      : null;

    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="max-w-xl mx-auto space-y-6 py-12">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">
                <T>Quote Created!</T>
              </h1>
              <p className="text-muted-foreground">
                {t("Quote")} <span className="font-mono font-semibold">{createdQuote.quoteNumber}</span>{" "}
                {t("has been created for")} {customerDetails.name}.
              </p>
            </div>

            {/* Tracking link card */}
            {trackingUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4 text-amber-500" />
                    <T>Customer Tracking Link</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Share this link so the customer can track their order status in real time — no login required.</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Link preview */}
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all">
                      {trackingUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(trackingUrl);
                        toast({ title: t("Copied to clipboard") });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Send options */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <T>Send tracking link to customer:</T>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {customerDetails.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sendingTracking || trackingSent === "email"}
                          onClick={() => handleSendTrackingLink("email")}
                          className="flex items-center gap-2"
                        >
                          {sendingTracking && trackingSent !== "sms" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : trackingSent === "email" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          <T>Send via Email</T>
                          <span className="text-muted-foreground text-xs">({customerDetails.email})</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sendingTracking || trackingSent === "sms"}
                        onClick={() => handleSendTrackingLink("sms")}
                        className="flex items-center gap-2"
                      >
                        {sendingTracking && trackingSent !== "email" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : trackingSent === "sms" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        <T>Send via SMS</T>
                      </Button>
                    </div>
                    {!customerDetails.email && (
                      <p className="text-xs text-muted-foreground">
                        <T>No email on file — copy the link to share manually, or send via SMS.</T>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => router.push(`/dashboard/shop/quotes/${createdQuote.id}`)}
              >
                <T>View Quote</T>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard/shop/quotes")}
              >
                <T>All Quotes</T>
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold"><T>Create Walk-in Quote</T></h1>
              <p className="text-muted-foreground">
                <T>Create a quote for a customer visiting your shop</T>
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {t("Step")} {step} {t("of")} 3
            </Badge>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? "bg-amber-500 text-white"
                      : s < step
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 ${s < step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle><T>Error</T></AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showReturningCustomerAlert && lookupResult?.customer && (
            <Alert
              className={
                lookupResult.customer.isRegistered
                  ? "border-blue-500 bg-blue-50"
                  : "border-green-500 bg-green-50"
              }
            >
              <UserCheck
                className={`h-4 w-4 ${lookupResult.customer.isRegistered ? "text-blue-600" : "text-green-600"}`}
              />
              <AlertTitle
                className={
                  lookupResult.customer.isRegistered
                    ? "text-blue-800"
                    : "text-green-800"
                }
              >
                {lookupResult.customer.isRegistered
                  ? t("Registered Customer Found!")
                  : t("Returning Customer Found!")}
              </AlertTitle>
              <AlertDescription
                className={
                  lookupResult.customer.isRegistered
                    ? "text-blue-700"
                    : "text-green-700"
                }
              >
                <div className="flex items-center justify-between">
                  <span>
                    Is this <strong>{lookupResult.customer.name}</strong>
                    {lookupResult.customer.isRegistered && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs border-blue-400 text-blue-700"
                      >
                        <T>Registered Account</T>
                      </Badge>
                    )}
                    {lookupResult.customer.city
                      ? ` from ${lookupResult.customer.city}`
                      : ""}
                    ?
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAutoFillCustomer}>
                      <Check className="h-4 w-4 mr-1" /> <T>Yes, auto-fill</T>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReturningCustomerAlert(false)}
                    >
                      <T>No, new customer</T>
                    </Button>
                  </div>
                </div>
                {lookupResult.customer.recentOrders &&
                  lookupResult.customer.recentOrders.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs mb-1"><T>Recent orders:</T></p>
                      <div className="flex flex-wrap gap-1">
                        {lookupResult.customer.recentOrders
                          .slice(0, 3)
                          .map((order) => (
                            <Badge
                              key={order.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {order.quoteNumber} - {order.jewelleryType}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Customer */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> <T>Customer Details</T>
                </CardTitle>
                <CardDescription>
                  <T>Enter the walk-in customer's information. Phone numbers identify returning customers.</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label><T>Country Code *</T></Label>
                    <Select
                      value={customerDetails.phoneCountryCode}
                      onValueChange={(value) => {
                        setCustomerDetails((prev) => ({
                          ...prev,
                          phoneCountryCode: value,
                        }));
                        if (customerDetails.phone.length >= 7)
                          lookupCustomer(value, customerDetails.phone);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              {c.flagCode && (
                                <FlagImage code={c.flagCode} size={16} />
                              )}
                              {c.code} ({c.country})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label><T>Phone Number *</T></Label>
                    <div className="relative">
                      <Input
                        placeholder="9876543210"
                        value={customerDetails.phone}
                        onChange={(e) =>
                          handlePhoneChange(e.target.value.replace(/\D/g, ""))
                        }
                      />
                      {isLookingUp && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {lookupResult?.found && !showReturningCustomerAlert && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <T>Enter phone to check for returning customer</T>
                    </p>
                  </div>
                </div>
                <div>
                  <Label><T>Full Name *</T></Label>
                  <Input
                    placeholder={t("Enter customer's full name")}
                    value={customerDetails.name}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label><T>Email (Optional)</T></Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerDetails.email}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label><T>Address *</T></Label>
                  <Textarea
                    placeholder={t("Enter full address")}
                    value={customerDetails.address}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label><T>City *</T></Label>
                    <Input
                      placeholder={t("Mumbai")}
                      value={customerDetails.city}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label><T>Country</T></Label>
                    <Select
                      value={customerDetails.country}
                      onValueChange={(value) =>
                        setCustomerDetails((prev) => ({
                          ...prev,
                          country: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">
                          <span className="flex items-center gap-2">
                            <FlagImage code="IN" size={16} /> India
                          </span>
                        </SelectItem>
                        <SelectItem value="Nepal">
                          <span className="flex items-center gap-2">
                            <FlagImage code="NP" size={16} /> Nepal
                          </span>
                        </SelectItem>
                        <SelectItem value="USA">
                          <span className="flex items-center gap-2">
                            <FlagImage code="US" size={16} /> USA
                          </span>
                        </SelectItem>
                        <SelectItem value="UK">
                          <span className="flex items-center gap-2">
                            <FlagImage code="UK" size={16} /> UK
                          </span>
                        </SelectItem>
                        <SelectItem value="UAE">
                          <span className="flex items-center gap-2">
                            <FlagImage code="AE" size={16} /> UAE
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Jewellery + Live Pricing */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
              <div className="lg:col-span-2 space-y-6">
                <AiDesignStudio
                  currency={currencyCode}
                  defaultJewelryType={formData.jewelleryType || undefined}
                  onSelect={applyAiVariation}
                />
                <Card>
                  <CardHeader>
                    <CardTitle><T>Jewellery Details</T></CardTitle>
                    <CardDescription>
                      <T>Configure the order. Live pricing updates as you change options.</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Jewellery Type */}
                    <div>
                      <Label><T>Jewellery Type *</T></Label>
                      <Select
                        value={formData.jewelleryType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            jewelleryType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type">
                            {formData.jewelleryType && (
                              <span className="flex items-center gap-2">
                                {JEWELLERY_TYPE_IMAGES[
                                  formData.jewelleryType
                                ] && (
                                  <Image
                                    src={
                                      JEWELLERY_TYPE_IMAGES[
                                        formData.jewelleryType
                                      ]
                                    }
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 rounded object-cover"
                                  />
                                )}
                                {getJewelleryTypeLabel(formData.jewelleryType)}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {JEWELLERY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                {JEWELLERY_TYPE_IMAGES[type.value] && (
                                  <Image
                                    src={JEWELLERY_TYPE_IMAGES[type.value]}
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 rounded object-cover"
                                  />
                                )}
                                {type.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.jewelleryType &&
                        WEIGHT_GUIDANCE[formData.jewelleryType] && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Scale className="h-3 w-3" />
                            <span>
                              Typical weight:{" "}
                              {WEIGHT_GUIDANCE[formData.jewelleryType].range} —{" "}
                              {WEIGHT_GUIDANCE[formData.jewelleryType].note}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Build Method */}
                    <div>
                      <Label><T>Build Method *</T></Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {BUILD_METHODS.map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                buildMethod: method.value as BuildMethod,
                              }))
                            }
                            className={`text-left p-3 rounded-lg border-2 transition-all ${formData.buildMethod === method.value ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#161B22]"}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{method.icon}</span>
                              <span className="font-medium text-sm">
                                {method.shortLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {method.description}
                            </p>
                            {formData.buildMethod === method.value &&
                              method.tooltip && (
                                <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                                  <p className="text-xs">
                                    <span className="font-medium">What:</span>{" "}
                                    <span className="text-muted-foreground">
                                      {method.tooltip.what}
                                    </span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-medium">
                                      Best for:
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      {method.tooltip.bestFor}
                                    </span>
                                  </p>
                                </div>
                              )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Method A: Metal Type */}
                    {formData.buildMethod === "METHOD_A" && (
                      <div>
                        <Label><T>Metal Type</T></Label>
                        <Select
                          value={formData.metalType}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              metalType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GOLD_24K">
                              Gold 24K (99.9%)
                            </SelectItem>
                            <SelectItem value="GOLD_22K">
                              Gold 22K (91.6%)
                            </SelectItem>
                            <SelectItem value="GOLD_18K">
                              Gold 18K (75%)
                            </SelectItem>
                            <SelectItem value="SILVER_999">
                              Silver 999
                            </SelectItem>
                            <SelectItem value="SILVER_925">
                              Silver 925 (Sterling)
                            </SelectItem>
                            <SelectItem value="PLATINUM_PT950">
                              Platinum PT950
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Method B: Alloy */}
                    {formData.buildMethod === "METHOD_B" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label><T>Base Metal</T></Label>
                          <Select
                            value={formData.alloyConfig.baseMetal}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                alloyConfig: {
                                  ...prev.alloyConfig,
                                  baseMetal: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOLD">Gold</SelectItem>
                              <SelectItem value="SILVER">Silver</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label><T>Karat</T></Label>
                          <Select
                            value={formData.alloyConfig.karat || ""}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                alloyConfig: {
                                  ...prev.alloyConfig,
                                  karat: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="22K">22K</SelectItem>
                              <SelectItem value="18K">18K</SelectItem>
                              <SelectItem value="14K">14K</SelectItem>
                              <SelectItem value="10K">10K</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Method C */}
                    {formData.buildMethod === "METHOD_C" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label><T>Base Metal</T></Label>
                          <Select
                            value={formData.methodCConfig.baseMetal}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                methodCConfig: {
                                  ...prev.methodCConfig,
                                  baseMetal: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BRASS">Brass</SelectItem>
                              <SelectItem value="COPPER">Copper</SelectItem>
                              <SelectItem value="STAINLESS_STEEL">
                                Stainless Steel
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label><T>Plating</T></Label>
                          <Select
                            value={formData.methodCConfig.platingType}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                methodCConfig: {
                                  ...prev.methodCConfig,
                                  platingType: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOLD_PLATED">
                                Gold Plated
                              </SelectItem>
                              <SelectItem value="ROSE_GOLD_PLATED">
                                Rose Gold
                              </SelectItem>
                              <SelectItem value="SILVER_PLATED">
                                Silver
                              </SelectItem>
                              <SelectItem value="RHODIUM_PLATED">
                                Rhodium
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label><T>Tier</T></Label>
                          <Select
                            value={formData.methodCConfig.platingTier}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                methodCConfig: {
                                  ...prev.methodCConfig,
                                  platingTier: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ECONOMY">Economy</SelectItem>
                              <SelectItem value="STANDARD">Standard</SelectItem>
                              <SelectItem value="PREMIUM">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Method D */}
                    {formData.buildMethod === "METHOD_D" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label><T>Purity</T></Label>
                          <Select
                            value={formData.methodDConfig.purity}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                methodDConfig: {
                                  ...prev.methodDConfig,
                                  purity: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="22K">22K</SelectItem>
                              <SelectItem value="18K">18K</SelectItem>
                              <SelectItem value="14K">14K</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label><T>Chain/Style</T></Label>
                          <Input
                            placeholder="e.g., Rope, Box"
                            value={formData.methodDConfig.chainStyle}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                methodDConfig: {
                                  ...prev.methodDConfig,
                                  chainStyle: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* Weighing Scale */}
                    <WeighingScalePanel
                      compact
                      onWeightCapture={(weightGrams) => {
                        setFormData((prev) => ({
                          ...prev,
                          targetTotalWeightG: weightGrams.toFixed(3),
                        }));
                        toast({
                          title: t("Weight Captured"),
                          description: `${weightGrams.toFixed(3)}g ${t("captured from scale")}`,
                        });
                      }}
                    />

                    {/* Weight */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label><T>Target Total Weight (grams)</T></Label>
                        <Input
                          type="number"
                          placeholder="e.g., 10.5"
                          value={formData.targetTotalWeightG}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              targetTotalWeightG: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {formData.buildMethod === "METHOD_D" && (
                        <div>
                          <Label><T>Target Gold Weight (grams)</T></Label>
                          <Input
                            type="number"
                            placeholder="e.g., 8.0"
                            value={formData.targetGoldWeightG}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                targetGoldWeightG: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Surface Finish */}
                    <div>
                      <Label><T>Surface Finish</T></Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                        {Object.entries(SURFACE_FINISH_IMAGES)
                          .slice(0, 8)
                          .map(([key, info]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  surfaceFinish: key,
                                  composition: {
                                    ...prev.composition,
                                    surfaceFinish: key,
                                  },
                                }))
                              }
                              className={`relative p-2 rounded-lg border-2 transition-all text-center ${formData.surfaceFinish === key ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                            >
                              <div className="relative w-full h-12 rounded mb-1">
                                <Image
                                  src={info.image}
                                  alt={key.replace(/_/g, " ")}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                              <span className="text-xs font-medium block truncate">
                                {key.replace(/_/g, " ")}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Gemstones */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <Gem className="h-4 w-4 text-purple-500" />
                            <T>Gemstones</T>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            <T>Prices use your inventory gemstone rates, then platform defaults.</T>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {formData.hasGemstones && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  hasGemstones: false,
                                  gemstonesV2: [],
                                }))
                              }
                            >
                              <T>No gemstones</T>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addGemstoneLine}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {formData.hasGemstones ? (
                              <T>Add another</T>
                            ) : (
                              <T>Add gemstone</T>
                            )}
                          </Button>
                        </div>
                      </div>

                      {formData.hasGemstones && (
                        <div className="space-y-3">
                          {formData.gemstonesV2.map((gemstone, index) => {
                            const selectedRate = gemstoneRateByKey.get(
                              gemstone.rateKey,
                            );
                            const count = Math.max(Number(gemstone.count) || 1, 1);
                            const lineTotal = selectedRate
                              ? selectedRate.effectivePriceNpr * count
                              : 0;

                            return (
                              <div
                                key={gemstone.id}
                                className="rounded-lg border bg-muted/20 p-3 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Gem className="h-4 w-4 text-purple-500" />
                                    {t("Gemstone")} {index + 1}
                                    {selectedRate && (
                                      <Badge variant="secondary" className="text-xs">
                                        {t(selectedRate.sourceLabel)}
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                    onClick={() => removeGemstoneLine(gemstone.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                                  <div className="space-y-1">
                                    <Label><T>Gemstone price</T></Label>
                                    <Select
                                      value={gemstone.rateKey}
                                      onValueChange={(value) =>
                                        updateGemstoneLine(gemstone.id, {
                                          rateKey: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={
                                            gemstoneRatesLoading
                                              ? t("Loading gemstone prices...")
                                              : t("Select gemstone")
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80">
                                        {gemstoneRateOptions.map((option) => (
                                          <SelectItem
                                            key={option.key}
                                            value={option.key}
                                          >
                                            <div className="flex flex-col gap-0.5">
                                              <span>{option.label}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {currencySymbol}{" "}
                                                {Math.round(
                                                  option.effectivePriceNpr,
                                                ).toLocaleString()} {t("per stone")}
                                                {" · "}{t(option.sourceLabel)}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <Label><T>Quantity</T></Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={gemstone.count}
                                      onChange={(event) =>
                                        updateGemstoneLine(gemstone.id, {
                                          count:
                                            parseInt(event.target.value, 10) || 1,
                                        })
                                      }
                                    />
                                  </div>
                                </div>

                                <Input
                                  placeholder={t("Optional setting, color, or placement notes")}
                                  value={gemstone.notes || ""}
                                  onChange={(event) =>
                                    updateGemstoneLine(gemstone.id, {
                                      notes: event.target.value,
                                    })
                                  }
                                />

                                {selectedRate && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-purple-50 px-3 py-2 text-sm dark:bg-purple-950/30">
                                    <span className="text-purple-800 dark:text-purple-200">
                                      {currencySymbol}{" "}
                                      {Math.round(
                                        selectedRate.effectivePriceNpr,
                                      ).toLocaleString()} × {count}
                                    </span>
                                    <span className="font-semibold text-purple-900 dark:text-purple-100">
                                      {currencySymbol}{" "}
                                      {Math.round(lineTotal).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {!gemstoneRatesLoading &&
                            gemstoneRateOptions.length === 0 && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <T>Gemstone prices are unavailable right now. You can still use the final pricing override.</T>
                                </AlertDescription>
                              </Alert>
                            )}

                          {calculatedGemstoneCostNpr > 0 && (
                            <div className="flex items-center justify-between rounded-lg bg-purple-50 px-4 py-3 dark:bg-purple-950/30">
                              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                <T>Total gemstone cost</T>
                              </span>
                              <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                {currencySymbol}{" "}
                                {Math.round(
                                  calculatedGemstoneCostNpr,
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description for the piece */}
                    <div>
                      <Label><T>Design Description</T></Label>
                      <Textarea
                        placeholder={t("The more detailed you describe, the better the AI preview & pricing. e.g. 'Heavy 22K gold bridal choker necklace with temple motifs, matte antique finish, set with rubies and emeralds in kundan style, around 45g'.")}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>

                    {/* AI Design Preview */}
                    <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-purple-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-purple-800">
                          <Sparkles className="h-4 w-4" /> <T>AI Design Preview</T>
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-xs text-purple-600"
                        >
                          <T>Powered by AI</T>
                        </Badge>
                      </div>
                      {designPreviewUrl ? (
                        <div className="space-y-3">
                          <div className="relative rounded-lg overflow-hidden border">
                            <div className="relative w-full h-48">
                              <Image
                                src={designPreviewUrl}
                                alt="AI Generated Design"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <button
                              onClick={() => {
                                setDesignPreviewUrl(null);
                                setDesignId(null);
                              }}
                              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={t("Want changes? Enter feedback...")}
                              value={regenerationFeedback}
                              onChange={(e) =>
                                setRegenerationFeedback(e.target.value)
                              }
                              className="text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateDesign}
                              disabled={generatingPreview}
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${generatingPreview ? "animate-spin" : ""}`}
                              />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Button
                            variant="outline"
                            onClick={handleGenerateDesign}
                            disabled={
                              generatingPreview || !formData.jewelleryType
                            }
                            className="border-purple-300 text-purple-700 hover:bg-purple-100"
                          >
                            {generatingPreview ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <T>Generating...</T>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <T>Generate AI Design Preview</T>
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            <T>Show the customer an AI preview of the final piece</T>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reference Images */}
                    <div>
                      <Label><T>Reference Images</T></Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleReferenceImageUpload}
                          className="hidden"
                        />
                        {formData.referenceImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {formData.referenceImages.map((url, idx) => (
                              <div key={idx} className="relative group h-20">
                                <Image
                                  src={getImageUrl(url)}
                                  alt={`Reference ${idx + 1}`}
                                  fill
                                  className="object-cover rounded"
                                />
                                <button
                                  onClick={() => removeReferenceImage(url)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-full"
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <T>Uploading...</T> {uploadProgress}%
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              <T>Add Reference Images</T>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <Label><T>Special Instructions</T></Label>
                      <Textarea
                        placeholder={t("Any special requirements or notes...")}
                        value={formData.specialInstructions}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            specialInstructions: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Pricing sidebar — sticky so it follows scroll */}
              <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-4 scrollbar-thin">
                <LivePricingPanel
                  buildMethod={formData.buildMethod}
                  formData={buildEstimateRequest()}
                  marketRates={marketRates}
                  marketRatesLoading={marketRatesLoading}
                  marketRatesWarning={marketRatesWarning}
                  currencySymbol={currencySymbol}
                />
              </div>
            </div>
          )}

          {/* Step 3: Final Pricing */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle><T>Pricing & Quote</T></CardTitle>
                    <CardDescription>
                      <T>Review the live estimate and set final pricing.</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Auto-Calculated Breakdown */}
                    {autoEstimate ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          <T>Calculated from your selections & live market rates</T>
                        </p>

                        {autoEstimate.lineItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm py-1 border-b border-dashed last:border-0"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="font-medium">
                              {currencySymbol}{" "}
                              {Math.round(item.amount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <T>Select metal, weight, and build method in Step 2 to see auto-calculated pricing.</T>
                      </p>
                    )}

                    {/* Manual Override Section */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-amber-700 hover:text-amber-800">
                        <T>Fine-tune calculated costs</T>
                      </summary>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label>
                            <T>Metal Cost</T> ({currencySymbol})
                            {autoEstimate && (
                              <span className="text-xs text-muted-foreground ml-1">
                                Auto:{" "}
                                {Math.round(
                                  autoEstimate.metalCost,
                                ).toLocaleString()}
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            placeholder={
                              autoEstimate
                                ? String(Math.round(autoEstimate.metalCost))
                                : "0"
                            }
                            value={formData.metalCostOverride}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                metalCostOverride: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>
                            <T>Making Charge</T> ({currencySymbol})
                            {autoEstimate && (
                              <span className="text-xs text-muted-foreground ml-1">
                                Auto:{" "}
                                {Math.round(
                                  autoEstimate.makingCharge,
                                ).toLocaleString()}
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            placeholder={
                              autoEstimate
                                ? String(Math.round(autoEstimate.makingCharge))
                                : "0"
                            }
                            value={formData.makingChargeOverride}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                makingChargeOverride: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>
                            <T>Gemstone Cost Override</T> ({currencySymbol})
                            {autoEstimate && (
                              <span className="text-xs text-muted-foreground ml-1">
                                Auto:{" "}
                                {Math.round(
                                  autoEstimate.gemstoneCost,
                                ).toLocaleString()}
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            placeholder={
                              autoEstimate
                                ? String(Math.round(autoEstimate.gemstoneCost))
                                : "0"
                            }
                            value={formData.gemstoneCostOverride}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                gemstoneCostOverride: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>
                            <T>Finish Cost</T> ({currencySymbol})
                            {autoEstimate && (
                              <span className="text-xs text-muted-foreground ml-1">
                                Auto:{" "}
                                {Math.round(
                                  autoEstimate.finishCost,
                                ).toLocaleString()}
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            placeholder={
                              autoEstimate
                                ? String(Math.round(autoEstimate.finishCost))
                                : "0"
                            }
                            value={formData.finishCostOverride}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                finishCostOverride: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </details>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span><T>Subtotal</T></span>
                        <span>
                          {currencySymbol} {subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{taxLabel}</span>
                        <span>
                          {currencySymbol} {tax.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span><T>Total</T></span>
                        <span className="text-amber-600">
                          {currencySymbol} {total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label><T>Estimated Completion (days)</T></Label>
                      <Input
                        type="number"
                        placeholder="14"
                        value={formData.estimatedDays}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            estimatedDays: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label><T>Internal Notes</T></Label>
                      <Textarea
                        placeholder={t("Internal notes...")}
                        value={formData.shopNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shopNotes: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle><T>Payment at Shop</T></AlertTitle>
                      <AlertDescription>
                        <T>Walk-in order. Payment collected at your shop.</T>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-4 scrollbar-thin">
                <LivePricingPanel
                  buildMethod={formData.buildMethod}
                  formData={buildEstimateRequest()}
                  marketRates={marketRates}
                  marketRatesLoading={marketRatesLoading}
                  marketRatesWarning={marketRatesWarning}
                  currencySymbol={currencySymbol}
                />
                {designPreviewUrl && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" /> <T>AI Preview</T>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative w-full h-48">
                        <Image
                          src={designPreviewUrl}
                          alt="AI Design"
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 1 ? t("Cancel") : t("Back")}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !customerDetailsComplete) ||
                  (step === 2 && !jewelleryDetailsComplete)
                }
              >
                <T>Next</T>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <T>Creating...</T>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    <T>Create Quote</T>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Summary */}
          {step === 3 && customerDetailsComplete && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm"><T>Quote Summary</T></CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <strong><T>Customer:</T></strong> {customerDetails.name}
                </p>
                <p>
                  <strong><T>Phone:</T></strong> {customerDetails.phoneCountryCode}{" "}
                  {customerDetails.phone}
                </p>
                <p>
                  <strong><T>Jewellery:</T></strong>{" "}
                  {getJewelleryTypeLabel(formData.jewelleryType)}
                </p>
                <p>
                  <strong><T>Method:</T></strong>{" "}
                  {getBuildMethodInfo(formData.buildMethod)?.shortLabel ||
                    formData.buildMethod}
                </p>
                {formData.targetTotalWeightG && (
                  <p>
                    <strong><T>Weight:</T></strong> {formData.targetTotalWeightG}g
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
