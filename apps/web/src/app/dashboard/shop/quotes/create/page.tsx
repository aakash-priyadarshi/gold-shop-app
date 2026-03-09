"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  GemstoneEditorV2,
  type GemstoneEntry as GemstoneEntryV2,
} from "@/components/pricing/GemstoneEditorV2";
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
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useMarket } from "@/hooks/useMarket";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { fetchTaxRules, lookupTaxRate } from "@/hooks/useTaxRules";
import { getApiUrl, shopQuotesApi } from "@/lib/api";
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
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
  Upload,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/providers/translation-provider";

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

export default function CreateShopQuotePage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    gemstonesV2: [] as GemstoneEntryV2[],
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
    if (formData.hasGemstones && formData.gemstonesV2.length > 0) {
      request.gemstones = formData.gemstonesV2
        .filter((g) => g.stoneType)
        .map((g) => ({
          presetId: g.presetId,
          stoneType: g.stoneType,
          shape: g.shape,
          sizeValue: g.sizeValue,
          sizeUnit: g.sizeUnit,
          color: g.color,
          clarity: g.clarity,
          cut: g.cut,
          settingStyle: g.settingStyle,
          count: g.count,
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
    formData.surfaceFinish,
    marketRates,
    shopCountry,
    currencyCode,
  ]);

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
              formData.hasGemstones && formData.gemstonesV2.length > 0
                ? `with ${formData.gemstonesV2.map((g) => `${g.count}x ${g.stoneType.replace(/_/g, " ").toLowerCase()}`).join(", ")}`
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
      0;
    const finish =
      parseFloat(formData.finishCostOverride) || autoEstimate?.finishCost || 0;
    const subtotal = metal + making + gemstone + finish;
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
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
    setLoading(true);
    setError("");
    try {
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
        composition: formData.composition,
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
        metalCostNpr: parseFloat(formData.metalCostOverride) || undefined,
        makingChargeNpr: parseFloat(formData.makingChargeOverride) || undefined,
        gemstoneCostNpr: parseFloat(formData.gemstoneCostOverride) || undefined,
        finishCostNpr: parseFloat(formData.finishCostOverride) || undefined,
        estimatedDays: parseInt(formData.estimatedDays) || undefined,
        shopNotes: formData.shopNotes || undefined,
      });
      toast({
        title: t("Quote Created"),
        description: `${t("Quote")} ${response.data.quoteNumber} ${t("created for")} ${customerDetails.name}`,
      });
      router.push("/dashboard/shop/quotes");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
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
                                  <img
                                    src={
                                      JEWELLERY_TYPE_IMAGES[
                                        formData.jewelleryType
                                      ]
                                    }
                                    alt=""
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
                                  <img
                                    src={JEWELLERY_TYPE_IMAGES[type.value]}
                                    alt=""
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
                              <img
                                src={info.image}
                                alt={key.replace(/_/g, " ")}
                                className="w-full h-12 object-cover rounded mb-1"
                              />
                              <span className="text-xs font-medium block truncate">
                                {key.replace(/_/g, " ")}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Gemstones */}
                    <div>
                      <Label><T>Gemstones</T></Label>
                      <div className="flex items-center gap-3 mt-2 mb-3">
                        <Badge
                          variant={
                            formData.hasGemstones ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              hasGemstones: true,
                            }))
                          }
                        >
                          <T>Yes</T>
                        </Badge>
                        <Badge
                          variant={
                            !formData.hasGemstones ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              hasGemstones: false,
                              gemstonesV2: [],
                            }))
                          }
                        >
                          <T>No</T>
                        </Badge>
                      </div>
                      {formData.hasGemstones && (
                        <GemstoneEditorV2
                          gemstones={formData.gemstonesV2}
                          onChange={(gems) =>
                            setFormData((prev) => ({
                              ...prev,
                              gemstonesV2: gems,
                            }))
                          }
                          currencySymbol={currencySymbol}
                          selectedCurrency={currencyCode}
                          exchangeRate={marketRates?.fx?.rate || 144}
                        />
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
                            <img
                              src={designPreviewUrl}
                              alt="AI Generated Design"
                              className="w-full h-48 object-cover"
                            />
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
                              <div key={idx} className="relative group">
                                <img
                                  src={getImageUrl(url)}
                                  alt={`Reference ${idx + 1}`}
                                  className="w-full h-20 object-cover rounded"
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
                        <T>Override individual costs manually</T>
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
                            <T>Gemstone Cost</T> ({currencySymbol})
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
                      <img
                        src={designPreviewUrl}
                        alt="AI Design"
                        className="w-full rounded-lg object-cover"
                      />
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
