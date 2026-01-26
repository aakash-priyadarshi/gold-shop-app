"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import {
  useMarket,
  WEIGHT_UNIT_SYMBOLS,
  type WeightUnit,
} from "@/hooks/useMarket";
import { getImageUrl } from "@/lib/image-upload";
import {
  COUNTRIES,
  CURRENCIES,
  usePreferencesStore,
  type CurrencyCode,
} from "@/store/preferences";
import { fromGrams, toGrams } from "@gold-shop/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Gem,
  Image as ImageIcon,
  Info,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// New pricing components
import {
  AlloyBuilder,
  type AlloyConfig,
} from "@/components/pricing/AlloyBuilder";
import {
  GemstoneEditorV2,
  type GemstoneEntry as GemstoneEntryV2,
} from "@/components/pricing/GemstoneEditorV2";
import { LivePricingPanel } from "@/components/pricing/LivePricingPanel";
import {
  MethodCSelector,
  type MethodCConfig,
} from "@/components/pricing/MethodCSelector";
import { getApiUrl } from "@/lib/api";
import {
  calculateEstimate,
  CHAIN_STYLE_OPTIONS,
  type BuildMethod,
  type ChainStyleType,
  type EstimateRequest,
} from "@/lib/pricing/calculate-estimate";

const API_URL = getApiUrl();

const JEWELLERY_TYPES = [
  { value: "RING", label: "Ring" },
  { value: "NECKLACE", label: "Necklace" },
  { value: "BRACELET", label: "Bracelet" },
  { value: "EARRING", label: "Earrings" },
  { value: "PENDANT", label: "Pendant" },
  { value: "BANGLE", label: "Bangle" },
  { value: "CHAIN", label: "Chain" },
  { value: "ANKLET", label: "Anklet" },
  { value: "BROOCH", label: "Brooch" },
  { value: "OTHER", label: "Other" },
];

// Build methods with labels per spec
const BUILD_METHODS = [
  {
    value: "METHOD_A",
    label: "Method A: Solid Precious Metal",
    description: "Pure gold, silver, or platinum throughout",
    tooltip: {
      what: "Solid precious metal from core to surface. No plating or coating needed.",
      durability:
        "Highest durability. Can be polished and repaired forever. Maintains value.",
      bestFor: "Investment pieces, heirloom jewellery, daily wear items.",
      care: "Simple cleaning with mild soap. Can be professionally polished.",
      resale: "Highest resale value. Can be melted down and repurposed.",
    },
  },
  {
    value: "METHOD_B",
    label: "Method B: Precious Metal Alloy",
    description: "Gold/silver mixed with other metals for durability",
    tooltip: {
      what: "Precious metal alloyed with other metals for color and strength. Still solid gold/silver throughout.",
      durability:
        "Excellent durability. 18K is industry standard. Lower karats are harder and more scratch-resistant.",
      bestFor:
        "Engagement rings, wedding bands, colored gold pieces (white, rose, green gold).",
      care: "White gold may need rhodium re-plating every 1-2 years. Rose gold develops warm patina over time.",
      colors:
        "Yellow Gold (classic), White Gold (silvery), Rose Gold (pink/copper), Green Gold (subtle greenish).",
    },
  },
  {
    value: "METHOD_C",
    label: "Method C: Base Metal + Plating",
    description: "Not solid gold. Plated/Coated.",
    tooltip: {
      what: "Non-precious base metal (brass, steel, etc.) with a thin gold/silver coating.",
      durability:
        "Plating wears off with friction. Economy: 3-6 months. Standard: 1-2 years. Premium: 2-5 years.",
      bestFor:
        "Fashion jewellery, trendy pieces, budget-conscious buyers, costume jewellery.",
      care: "Avoid water, perfumes, lotions. Remove before sleeping. Store separately.",
      warning:
        "⚠️ This is NOT solid gold. Will be clearly labeled as plated/coated.",
    },
  },
  {
    value: "METHOD_D",
    label: "Method D: Italian Machine Made",
    description: "Precision machine-made hollow chains and patterns",
    tooltip: {
      what: "High-precision machinery creates intricate designs with hollow or semi-hollow construction. Popular Italian goldsmith technique.",
      durability:
        "Good durability for the weight. Hollow construction means lighter pieces for the same visual size.",
      bestFor:
        "Chains (rope, figaro, curb, box, snake, Singapore, Franco), hollow bangles, machine-cut patterns.",
      styles:
        "• Hollow Chains: Lighter, larger look for less gold\n• Laser-Cut: Precise diamond-cut faceting for maximum sparkle\n• Machine-Stamped: Consistent patterns and textures\n• Woven: Computer-controlled intricate weaves",
      advantage:
        "Up to 50% lighter than solid pieces of the same size. More affordable. Comfortable for daily wear.",
      care: "Hollow pieces can dent if pressed hard. Avoid crushing. Store flat.",
    },
  },
];

// Method D is only available for certain jewelry types (machine-made items)
const METHOD_D_SUPPORTED_TYPES = [
  "CHAIN",
  "NECKLACE",
  "BRACELET",
  "BANGLE",
  "ANKLET",
];

const WEIGHT_CATEGORIES = [
  { value: "LIGHT", label: "Light", description: "Delicate, everyday wear" },
  { value: "MEDIUM", label: "Medium", description: "Standard weight" },
  { value: "HEAVY", label: "Heavy", description: "Statement piece" },
];

interface Template {
  id: string;
  name: string;
  jewelleryType: string;
  lightWeightGrams: number;
  mediumWeightGrams: number;
  heavyWeightGrams: number;
  recommendedMaterials: string[];
}

interface GemstonePreset {
  id: string;
  stoneType: string;
  sizeOptions: string[];
  colorOptions: string[];
  basePriceNpr: number;
}

interface PlatingOption {
  id: string;
  platingType: string;
  tier: string;
  displayName: string;
  basePriceNpr: number;
  goldContent: string;
}

interface GemstoneEntry {
  presetId: string;
  stoneType: string;
  shape: string;
  size: string;
  colour: string;
  settingStyle: string;
  count: number;
}

interface PriceEstimate {
  metalCost: number;
  makingCharge: number;
  platingCost: number;
  gemstoneCost: number;
  subtotal: number;
  tax: number;
  total: number;
  breakdown: {
    metalType: string;
    weightGrams: number;
    ratePerGram: number;
    makingChargePercent: number;
  };
}

interface MarketRates {
  region: string;
  currency: CurrencyCode;
  unit: string;
  updatedAt: string;
  source: string;
  cache: "fresh" | "stale" | "miss" | "fallback";
  fx: {
    pair: string;
    rate: number;
    source: string;
    updatedAt: string;
  };
  adjustments: {
    importDutyPct?: number;
    customsDutyPct?: number;
    gstPct?: number;
    vatPct?: number;
    localPremiumPct?: number;
    multiplier: number;
  };
  // Debug info for troubleshooting price jumps
  debug?: {
    spotSource?: string;
    fxSource?: string;
    spotUsed?: number;
    fxUsed?: number;
    regionUsed?: string;
  };
  metals: {
    GOLD_24K: number;
    GOLD_22K: number;
    GOLD_18K: number;
    GOLD_14K: number;
    GOLD_10K: number;
    SILVER_999: number;
    SILVER_925: number;
    PLATINUM_PT950: number;
    PLATINUM_PT900: number;
    PALLADIUM_PD950: number;
  };
}

export default function CreateRfqPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    refreshUser,
  } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hydration fix - track when component has mounted on client
  const [mounted, setMounted] = useState(false);
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    setMounted(true);
    setMinDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Refresh user data on page load and when window gains focus
  // This ensures phoneVerifiedAt and other user status is up-to-date
  useEffect(() => {
    // Refresh user data on mount if logged in
    if (isAuthenticated) {
      refreshUser();
    }

    // Also refresh when tab/window gains focus (user might have verified in another tab)
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated, refreshUser]);

  // User verification status - use useAuth hook instead of useSession
  // Use mounted check to prevent hydration mismatch (server renders with no user, client has user)
  const isLoggedIn = mounted && isAuthenticated && !!user;
  const isAdmin = mounted && user?.role === "ADMIN";
  // Admins are exempt from phone verification requirement
  const isPhoneVerified = mounted && (isAdmin || !!user?.phoneVerifiedAt);
  const isSeller =
    mounted && (user?.role === "SHOPKEEPER" || user?.role === "ADMIN");
  const isShopVerified = mounted && !!user?.shop?.isVerified;

  // For sellers: need phone + KYC (shop verified) - but admins exempt from KYC too
  // For customers: need phone only
  // Admins can always submit
  const canSubmitOrder =
    mounted &&
    isLoggedIn &&
    (isAdmin || (isPhoneVerified && (!isSeller || isShopVerified)));

  // Determine why submit is blocked (for tooltip)
  const getSubmitBlockReason = (): string | null => {
    if (!isLoggedIn) {
      return "Please log in to submit your custom jewellery request";
    }
    if (!isPhoneVerified) {
      return "Please verify your phone number in your profile settings to submit requests";
    }
    if (isSeller && !isShopVerified) {
      return "Your shop needs KYC verification (ID card & tax details) before you can submit requests. Please complete verification in your dashboard.";
    }
    return null;
  };

  // Get currency from global preferences store (persisted across navigation)
  // IMPORTANT: Currency is for DISPLAY only (FX conversion)
  const currency = usePreferencesStore((state) => state.currency);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const currencyInfo = CURRENCIES[currency];

  // Get country from global preferences store (persisted across navigation)
  // IMPORTANT: Country determines TAX jurisdiction (VAT/GST rates)
  const country = usePreferencesStore((state) => state.country);
  const countryInfo = COUNTRIES[country];

  // Get weight unit from market context (country-specific default)
  const {
    selectedWeightUnit,
    config: marketConfig,
    setWeightUnit,
  } = useMarket();
  const [displayWeightUnit, setDisplayWeightUnit] =
    useState<WeightUnit>(selectedWeightUnit);

  // Update display weight unit when market config loads
  useEffect(() => {
    if (marketConfig?.defaultWeightUnit) {
      setDisplayWeightUnit(marketConfig.defaultWeightUnit);
    }
  }, [marketConfig?.defaultWeightUnit]);

  // For price API: pass both currency (display) and country (tax) separately
  const apiCurrency = currency;

  // API data states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [gemstonePresets, setGemstonePresets] = useState<GemstonePreset[]>([]);
  const [platingOptions, setPlatingOptions] = useState<PlatingOption[]>([]);
  const [metalTypes, setMetalTypes] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [surfaceFinishes, setSurfaceFinishes] = useState<
    { id: string; name: string }[]
  >([]);
  const [gemstoneShapes, setGemstoneShapes] = useState<
    { id: string; name: string }[]
  >([]);
  const [settingStyles, setSettingStyles] = useState<
    { id: string; name: string }[]
  >([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(
    null,
  );
  const [estimating, setEstimating] = useState(false);

  // Market rates state
  const [marketRates, setMarketRates] = useState<MarketRates | null>(null);
  const [marketRatesLoading, setMarketRatesLoading] = useState(false);
  const [marketRatesWarning, setMarketRatesWarning] = useState<string | null>(
    null,
  );

  // Image upload for reference images
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
    onError: (error) => {
      setError(`Image upload failed: ${error}`);
    },
  });

  const handleReferenceImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Upload each file
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Each image must be smaller than 10MB");
        continue;
      }
      await uploadImageToR2(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeReferenceImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((img) => img !== url),
    }));
  };

  // AI Design Preview state
  const [designPreviewUrl, setDesignPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [shareToGallery, setShareToGallery] = useState(true); // Default to checked
  const [designId, setDesignId] = useState<string | null>(null);
  const [fromDesign, setFromDesign] = useState(false);

  // Handle prefill from Design Gallery ("Build me this")
  useEffect(() => {
    // Check if coming from design gallery
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("from") === "design") {
      const prefillJson = sessionStorage.getItem("rfq-prefill");
      if (prefillJson) {
        try {
          const prefill = JSON.parse(prefillJson);
          setFromDesign(true);

          // Set the design preview image if available
          if (prefill.imageUrl) {
            setDesignPreviewUrl(prefill.imageUrl);
          }
          if (prefill.designId) {
            setDesignId(prefill.designId);
          }

          // Prefill form data
          setFormData((prev) => ({
            ...prev,
            jewelleryType: prefill.jewelleryType || prev.jewelleryType,
            buildMethod: prefill.buildMethod || prev.buildMethod,
            metalType: prefill.metalType || prev.metalType,
            weightCategory: prefill.weightCategory || prev.weightCategory,
            estimatedWeight:
              prefill.estimatedWeight?.toString() || prev.estimatedWeight,
            surfaceFinish: prefill.surfaceFinish || prev.surfaceFinish,
            description: prefill.description || prev.description,
            hasGemstones: prefill.hasGemstones || false,
            referenceImages: prefill.referenceImages || prev.referenceImages,
          }));

          // Set gemstones if any
          if (prefill.hasGemstones && prefill.gemstone) {
            setFormData((prev) => ({
              ...prev,
              gemstonesV2: [
                {
                  id: `prefill-${Date.now()}`,
                  presetId: "",
                  stoneType: prefill.gemstone.type || "",
                  shape: prefill.gemstone.shape || "",
                  sizeValue: prefill.gemstone.size || "0",
                  sizeUnit: "MM" as const,
                  color: prefill.gemstone.color || "",
                  clarity: "",
                  cut: "",
                  settingStyle: prefill.gemstone.settingStyle || "",
                  count: prefill.gemstone.count || 1,
                },
              ],
            }));
          }

          // Clear the session storage
          sessionStorage.removeItem("rfq-prefill");
        } catch (err) {
          console.error("Failed to parse prefill data:", err);
        }
      }
    }
  }, []);

  // Generate AI Preview
  const generatePreview = async () => {
    console.log(
      "[Generate Preview] Button clicked, isAuthenticated:",
      isAuthenticated,
    );

    if (!isAuthenticated) {
      router.push("/auth/login?callbackUrl=/rfq/create");
      return;
    }

    setGeneratingPreview(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const weight = getWeightFromTemplate();

      // Build detailed metal description based on method
      let metalDescription = formData.metalType;
      if (formData.buildMethod === "METHOD_B" && formData.alloyConfig) {
        const alloyFamily = formData.alloyConfig.alloyFamily;
        const karat = formData.alloyConfig.karat;
        if (alloyFamily && karat) {
          const colorMap: Record<string, string> = {
            YELLOW_GOLD: "yellow gold",
            WHITE_GOLD: "white gold",
            ROSE_GOLD: "rose gold",
            GREEN_GOLD: "green gold",
          };
          metalDescription = `${karat} ${colorMap[alloyFamily] || alloyFamily}`;
        }
      } else if (
        formData.buildMethod === "METHOD_C" &&
        formData.methodCConfig
      ) {
        const baseMetalMap: Record<string, string> = {
          BRASS: "brass",
          COPPER: "copper",
          BRONZE: "bronze",
          STAINLESS_STEEL: "stainless steel",
        };
        const platingMap: Record<string, string> = {
          GOLD_PLATED: "gold plated",
          ROSE_GOLD_PLATED: "rose gold plated",
          RHODIUM_PLATED: "rhodium plated",
          SILVER_PLATED: "silver plated",
        };
        const base =
          baseMetalMap[formData.methodCConfig.baseMetal] ||
          formData.methodCConfig.baseMetal;
        const plating =
          platingMap[formData.methodCConfig.platingType] ||
          formData.methodCConfig.platingType;
        metalDescription = `${base} with ${plating} finish`;
      } else if (
        formData.buildMethod === "METHOD_D" &&
        formData.methodDConfig
      ) {
        const purity = formData.methodDConfig.purity;
        const style = formData.methodDConfig.chainStyle;
        metalDescription = `${purity} Italian machine-made ${style || "chain"}`;
      }

      // Build gemstone details with quality specs
      let gemstonesDetails: any[] = [];
      if (formData.hasGemstones && formData.gemstonesV2.length > 0) {
        gemstonesDetails = formData.gemstonesV2.map((gem) => ({
          stoneType: gem.stoneType,
          shape: gem.shape,
          color: gem.color,
          clarity: gem.clarity,
          cut: gem.cut,
          settingStyle: gem.settingStyle,
          count: gem.count,
          sizeValue: parseFloat(gem.sizeValue) || 0, // Convert string to number
          sizeUnit: gem.sizeUnit,
        }));
      }

      // Prepare comprehensive design specs
      const designSpecs = {
        jewelryType: formData.jewelleryType,
        buildMethod: formData.buildMethod,
        metalType: formData.metalType,
        metalDescription, // Enhanced description with alloy/plating details
        weightCategory: formData.weightCategory,
        estimatedWeight: weight,
        surfaceFinish: formData.surfaceFinish,
        hasGemstones: formData.hasGemstones,
        // Include all gemstones with full details
        gemstones: gemstonesDetails,
        // Include primary gemstone for compatibility
        ...(formData.hasGemstones &&
          formData.gemstonesV2.length > 0 && {
            primaryStone: formData.gemstonesV2[0].stoneType,
            stoneCut: formData.gemstonesV2[0].shape,
            stoneColor: formData.gemstonesV2[0].color,
            stoneClarity: formData.gemstonesV2[0].clarity,
            stoneCutGrade: formData.gemstonesV2[0].cut,
            settingStyle: formData.gemstonesV2[0].settingStyle,
            stoneCount: formData.gemstonesV2[0].count,
          }),
        // Method-specific details
        ...(formData.buildMethod === "METHOD_B" && {
          alloyDetails: {
            baseMetal: formData.alloyConfig.baseMetal,
            karat: formData.alloyConfig.karat,
            alloyFamily: formData.alloyConfig.alloyFamily,
            recipePresetId: formData.alloyConfig.recipePresetId,
          },
        }),
        ...(formData.buildMethod === "METHOD_C" && {
          platingDetails: {
            baseMetal: formData.methodCConfig.baseMetal,
            platingType: formData.methodCConfig.platingType,
            platingTier: formData.methodCConfig.platingTier,
          },
        }),
        ...(formData.buildMethod === "METHOD_D" &&
          formData.methodDConfig && {
            italianMachineDetails: {
              purity: formData.methodDConfig.purity,
              chainStyle: formData.methodDConfig.chainStyle,
            },
          }),
        additionalSpecs: {
          description: formData.description,
        },
        shareToGallery,
      };

      console.log(
        "[Generate Preview] Making API call to:",
        `${API_URL}/designs`,
      );
      console.log(
        "[Generate Preview] Design specs:",
        JSON.stringify(designSpecs, null, 2),
      );

      const response = await fetch(`${API_URL}/designs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(designSpecs),
      });

      console.log("[Generate Preview] Response status:", response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error("[Generate Preview] API error:", data);
        throw new Error(data.message || "Failed to generate preview");
      }

      const result = await response.json();
      console.log(
        "[Generate Preview] API response:",
        JSON.stringify(result, null, 2),
      );

      // API returns { design: {...}, cached: boolean }
      const design = result.design;
      if (!design) {
        console.error("[Generate Preview] No design object in response!");
        throw new Error("Invalid response from API - no design object");
      }

      console.log(
        "[Generate Preview] Image URL from response:",
        design.imageUrl,
      );

      setDesignPreviewUrl(design.imageUrl);
      setDesignId(design.id);

      console.log(
        "[Generate Preview] State updated - designId:",
        design.id,
        "imageUrl:",
        design.imageUrl,
      );

      // Add the generated image to reference images
      if (design.imageUrl) {
        console.log(
          "[Generate Preview] Adding to reference images:",
          design.imageUrl,
        );
        setFormData((prev) => ({
          ...prev,
          referenceImages: [
            design.imageUrl,
            ...prev.referenceImages.filter((img) => img !== design.imageUrl),
          ],
        }));
      } else {
        console.warn("[Generate Preview] No imageUrl in design!");
      }
    } catch (err: unknown) {
      console.error("[Generate Preview] Error caught:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to generate preview");
      }
    } finally {
      setGeneratingPreview(false);
    }
  };

  const [formData, setFormData] = useState({
    jewelleryType: "",
    templateId: "",
    buildMethod: "METHOD_A" as BuildMethod,
    metalType: "",
    weightCategory: "MEDIUM",
    estimatedWeight: "",
    surfaceFinish: "",
    description: "",
    // Method B: Alloy config
    alloyConfig: {
      baseMetal: "GOLD",
      karat: undefined,
      alloyFamily: undefined,
      recipePresetId: undefined,
    } as AlloyConfig,
    // Method C: Base Metal + Plating config
    methodCConfig: {
      baseMetal: "BRASS",
      platingType: "GOLD_PLATED",
      platingTier: "STANDARD",
    } as MethodCConfig,
    // Method D: Italian Machine Made config
    methodDConfig: {
      purity: "18K",
      chainStyle: "",
    } as { purity: string; chainStyle: string },
    // Legacy Method C plating fields (for backwards compat)
    addGoldPlating: false,
    platingType: "",
    platingTier: "STANDARD",
    // Gemstones (using new V2 format)
    hasGemstones: false,
    gemstonesV2: [] as GemstoneEntryV2[],
    gemstones: [] as GemstoneEntry[], // Legacy format
    gemstoneDetails: "", // Legacy free-text fallback
    // Other fields
    referenceImages: [] as string[],
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    specialInstructions: "",
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metalsRes, finishesRes, shapesRes, stylesRes] =
          await Promise.all([
            fetch(`${API_URL}/materials/precious-metals`),
            fetch(`${API_URL}/materials/surface-finishes`),
            fetch(`${API_URL}/materials/gemstone-shapes`),
            fetch(`${API_URL}/materials/setting-styles`),
          ]);
        if (metalsRes.ok) setMetalTypes(await metalsRes.json());
        if (finishesRes.ok) setSurfaceFinishes(await finishesRes.json());
        if (shapesRes.ok) setGemstoneShapes(await shapesRes.json());
        if (stylesRes.ok) setSettingStyles(await stylesRes.json());
      } catch (err) {
        console.error("Failed to fetch materials data:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch market rates when currency or country changes
  useEffect(() => {
    const fetchMarketRates = async () => {
      setMarketRatesLoading(true);
      setMarketRatesWarning(null);
      try {
        // Use currency (for display) and country (for tax rates) as separate parameters
        const res = await fetch(
          `${API_URL}/market-rates?currency=${currency}&country=${country}`,
        );
        if (res.ok) {
          const data = await res.json();
          setMarketRates(data);

          // Check if we're using fallback/stale data
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
          // API returned error but we should still have fallback data
          console.error("Market rates API error:", res.status);
          setMarketRatesWarning(
            "Unable to load current rates - showing estimates",
          );
        }
      } catch (err) {
        console.error("Failed to fetch market rates:", err);
        setMarketRatesWarning("Connection error - showing estimated rates");
      } finally {
        setMarketRatesLoading(false);
      }
    };
    fetchMarketRates();
  }, [currency, country]);

  // Fetch templates when jewellery type changes
  useEffect(() => {
    if (!formData.jewelleryType) return;
    const fetchTemplates = async () => {
      try {
        const res = await fetch(
          `${API_URL}/materials/templates?jewelleryType=${formData.jewelleryType}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, [formData.jewelleryType]);

  // Fetch plating options when build method is C
  useEffect(() => {
    if (formData.buildMethod !== "METHOD_C") return;
    const fetchPlating = async () => {
      try {
        const res = await fetch(`${API_URL}/materials/plating-options`);
        if (res.ok) setPlatingOptions(await res.json());
      } catch (err) {
        console.error("Failed to fetch plating options:", err);
      }
    };
    fetchPlating();
  }, [formData.buildMethod]);

  // Fetch gemstone presets when hasGemstones is true
  useEffect(() => {
    if (!formData.hasGemstones) return;
    const fetchPresets = async () => {
      try {
        const res = await fetch(`${API_URL}/materials/gemstone-presets`);
        if (res.ok) setGemstonePresets(await res.json());
      } catch (err) {
        console.error("Failed to fetch gemstone presets:", err);
      }
    };
    fetchPresets();
  }, [formData.hasGemstones]);

  // Helper to check if a real template is selected (not "custom")
  const hasRealTemplate =
    formData.templateId && formData.templateId !== "custom";
  const getTemplateId = () =>
    hasRealTemplate ? formData.templateId : undefined;

  // Weight unit helpers
  const weightUnitSymbol = WEIGHT_UNIT_SYMBOLS[displayWeightUnit] || "g";
  const supportedWeightUnits = marketConfig?.supportedWeightUnits || [
    "GRAM",
    "KILOGRAM",
  ];

  // Convert user input (in display unit) to grams for API
  const displayToGrams = useCallback(
    (displayValue: number): number => {
      return toGrams(displayValue, displayWeightUnit);
    },
    [displayWeightUnit],
  );

  // Convert grams (from template) to display unit
  const gramsToDisplay = useCallback(
    (grams: number): number => {
      return fromGrams(grams, displayWeightUnit);
    },
    [displayWeightUnit],
  );

  // Format weight with unit symbol
  const formatWeight = useCallback(
    (grams: number, showUnit = true): string => {
      const displayValue = gramsToDisplay(grams);
      const formatted = displayValue.toLocaleString("en", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return showUnit ? `${formatted} ${weightUnitSymbol}` : formatted;
    },
    [gramsToDisplay, weightUnitSymbol],
  );

  // Calculate weight from template and weight category (returns grams)
  const getWeightFromTemplate = useCallback(() => {
    // User-entered weight is in display units, convert to grams
    if (!hasRealTemplate) {
      const displayValue = parseFloat(formData.estimatedWeight) || 0;
      return displayToGrams(displayValue);
    }
    const template = templates.find((t) => t.id === formData.templateId);
    if (!template) {
      const displayValue = parseFloat(formData.estimatedWeight) || 0;
      return displayToGrams(displayValue);
    }
    // Template weights are always in grams
    switch (formData.weightCategory) {
      case "LIGHT":
        return template.lightWeightGrams;
      case "MEDIUM":
        return template.mediumWeightGrams;
      case "HEAVY":
        return template.heavyWeightGrams;
      default:
        return template.mediumWeightGrams;
    }
  }, [
    formData.templateId,
    formData.weightCategory,
    formData.estimatedWeight,
    templates,
    hasRealTemplate,
    displayToGrams,
  ]);

  // Fetch price estimate using the new pricing engine
  const fetchPriceEstimate = useCallback(async () => {
    if (!formData.buildMethod) return;

    // Check for valid metal selection based on method
    const hasValidMetal = () => {
      switch (formData.buildMethod) {
        case "METHOD_A":
          return !!formData.metalType;
        case "METHOD_B":
          return (
            !!formData.alloyConfig?.baseMetal && !!formData.alloyConfig?.karat
          );
        case "METHOD_C":
          return !!formData.methodCConfig?.baseMetal;
        default:
          return !!formData.metalType;
      }
    };
    if (!hasValidMetal()) return;

    const weight = getWeightFromTemplate();
    if (weight <= 0) return;

    setEstimating(true);
    try {
      // Map build method to new API format
      const buildMethodMap: Record<string, string> = {
        METHOD_A: "METHOD_A",
        METHOD_B: "METHOD_B",
        METHOD_C: "METHOD_C",
        METHOD_D: "METHOD_D",
      };

      // Prepare request body for new pricing endpoint
      const requestBody: Record<string, unknown> = {
        country: country, // Tax jurisdiction (independent of currency)
        currency: apiCurrency, // Display currency (independent of country)
        jewelleryType: formData.jewelleryType,
        buildMethod: buildMethodMap[formData.buildMethod] || "METHOD_A",
        totalWeightG: weight,
        makingChargePct: 12, // Default making charge
      };

      // Add method-specific details
      if (formData.buildMethod === "METHOD_A") {
        requestBody.methodA = {
          metal: formData.metalType,
          totalWeightG: weight,
        };
      } else if (formData.buildMethod === "METHOD_B") {
        // Use alloyConfig for Method B
        const alloy = formData.alloyConfig;
        requestBody.methodB = {
          baseMetal: alloy?.baseMetal || "GOLD",
          karat: alloy?.karat || "18K",
          alloyFamily: alloy?.alloyFamily,
          recipePresetId: alloy?.recipePresetId,
          totalWeightG: weight,
        };
      } else if (formData.buildMethod === "METHOD_C") {
        // Use methodCConfig for Method C
        const config = formData.methodCConfig;
        requestBody.methodC = {
          coreMetal: config?.baseMetal || "BRASS",
          totalWeightG: weight,
        };
        // Add plating from methodCConfig
        requestBody.finish = {
          finishType: config?.platingType || "GOLD_PLATED",
          tier: config?.platingTier || "STANDARD",
        };
      } else if (formData.buildMethod === "METHOD_D") {
        // Use methodDConfig for Method D (Italian Machine Made)
        const config = formData.methodDConfig;
        requestBody.methodD = {
          purity: config?.purity || "22K",
          chainStyle: config?.chainStyle,
          totalWeightG: weight,
        };
      }

      // Add gemstones if any
      if (formData.gemstones.length > 0) {
        requestBody.gemstones = formData.gemstones
          .filter((g) => g.stoneType)
          .map((g) => ({
            stoneType: g.stoneType.toUpperCase(),
            sizeMm: parseFloat(g.size) || 3,
            qualityTier: "STANDARD",
            settingType: g.settingStyle?.toUpperCase() || "PRONG",
            count: g.count || 1,
          }));
      }

      const res = await fetch(`${API_URL}/pricing/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const data = await res.json();
        // Map new response format to old format for compatibility
        setPriceEstimate({
          metalCost:
            data.lineItems
              ?.filter(
                (item: { category: string }) => item.category === "METAL",
              )
              .reduce(
                (sum: number, item: { amount: number }) => sum + item.amount,
                0,
              ) || 0,
          makingCharge: data.makingCharge || 0,
          platingCost:
            data.lineItems
              ?.filter(
                (item: { category: string }) => item.category === "FINISH",
              )
              .reduce(
                (sum: number, item: { amount: number }) => sum + item.amount,
                0,
              ) || 0,
          gemstoneCost:
            data.lineItems
              ?.filter((item: { category: string }) =>
                ["GEMSTONE", "SETTING"].includes(item.category),
              )
              .reduce(
                (sum: number, item: { amount: number }) => sum + item.amount,
                0,
              ) || 0,
          subtotal: data.subtotal || 0,
          tax: data.taxes || 0,
          total: data.total || 0,
          breakdown: {
            metalType: formData.metalType,
            weightGrams: weight,
            ratePerGram:
              marketRates?.metals?.[
                formData.metalType as keyof typeof marketRates.metals
              ] || 0,
            makingChargePercent: 12,
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch price estimate:", err);
    } finally {
      setEstimating(false);
    }
  }, [formData, getWeightFromTemplate, country, apiCurrency, marketRates]);

  // Client-side live estimate calculation (instant, no API call)
  const liveEstimate = useMemo(() => {
    if (!marketRates) return null;

    const weight = getWeightFromTemplate();
    if (weight <= 0) return null;

    const request: EstimateRequest = {
      buildMethod: formData.buildMethod,
      jewelleryType: formData.jewelleryType,
      country: country,
      currency: currency,
      marketRates: {
        metals: marketRates.metals,
        fx: marketRates.fx,
      },
      makingChargePercent: 12,
    };

    // Add method-specific details
    if (formData.buildMethod === "METHOD_A") {
      request.methodA = {
        metal: formData.metalType,
        weightGrams: weight,
      };
    } else if (formData.buildMethod === "METHOD_B") {
      request.methodB = {
        baseMetal: formData.alloyConfig.baseMetal as "GOLD" | "SILVER",
        karat: formData.alloyConfig.karat,
        alloyFamily: formData.alloyConfig.alloyFamily,
        recipePresetId: formData.alloyConfig.recipePresetId,
        weightGrams: weight,
      };
    } else if (formData.buildMethod === "METHOD_C") {
      request.methodC = {
        baseMetal: formData.methodCConfig.baseMetal,
        platingType: formData.methodCConfig.platingType,
        platingTier: formData.methodCConfig.platingTier,
        weightGrams: weight,
      };
    } else if (formData.buildMethod === "METHOD_D") {
      request.methodD = {
        purity: formData.methodDConfig.purity as
          | "22K"
          | "18K"
          | "14K"
          | "SILVER_925",
        chainStyle: formData.methodDConfig.chainStyle as
          | ChainStyleType
          | undefined,
        weightGrams: weight,
      };
    }

    // Add gemstones from V2 format
    if (formData.gemstonesV2.length > 0) {
      request.gemstones = formData.gemstonesV2.map((gem) => ({
        presetId: gem.presetId,
        stoneType: gem.stoneType,
        shape: gem.shape,
        sizeValue: gem.sizeValue,
        sizeUnit: gem.sizeUnit,
        color: gem.color,
        clarity: gem.clarity,
        cut: gem.cut,
        settingStyle: gem.settingStyle,
        count: gem.count,
      }));
    }

    return calculateEstimate(request);
  }, [
    formData,
    getWeightFromTemplate,
    country,
    currency,
    marketRates,
    displayWeightUnit,
  ]);

  // Update price estimate when relevant fields change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPriceEstimate();
    }, 500);
    return () => clearTimeout(debounce);
  }, [
    formData.metalType,
    formData.buildMethod,
    formData.templateId,
    formData.weightCategory,
    formData.estimatedWeight,
    formData.addGoldPlating,
    formData.platingType,
    formData.platingTier,
    formData.gemstones,
    formData.alloyConfig,
    formData.methodCConfig,
    currency,
    country,
    displayWeightUnit,
    fetchPriceEstimate,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add a new gemstone entry
  const addGemstone = () => {
    const newGemstone: GemstoneEntry = {
      presetId: "",
      stoneType: "",
      shape: "",
      size: "",
      colour: "",
      settingStyle: "",
      count: 1,
    };
    updateFormData("gemstones", [...formData.gemstones, newGemstone]);
  };

  // Update a gemstone entry
  const updateGemstone = (
    index: number,
    field: keyof GemstoneEntry,
    value: string | number,
  ) => {
    const updated = [...formData.gemstones];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill stone type from preset (skip if "custom" is selected)
    if (field === "presetId" && value && value !== "custom") {
      const preset = gemstonePresets.find((p) => p.id === value);
      if (preset) {
        updated[index].stoneType = preset.stoneType;
      }
    }

    // Clear presetId if "custom" is selected
    if (field === "presetId" && value === "custom") {
      updated[index].presetId = "";
    }

    updateFormData("gemstones", updated);
  };

  // Remove a gemstone entry
  const removeGemstone = (index: number) => {
    updateFormData(
      "gemstones",
      formData.gemstones.filter((_, i) => i !== index),
    );
  };

  // Pure metals for Method A - only the highest purity options
  // Lower karats (22K, 18K, 14K, 10K) are ALLOYS and should be in Method B
  // Method A is for solid PURE precious metals with minimal/no alloy mixing
  const PURE_METAL_IDS = [
    "GOLD_24K", // Pure gold (99.9%)
    "SILVER_999", // Fine silver (99.9%)
    "PLATINUM_PT950", // Platinum 950 (95%)
    "PLATINUM_PT900", // Platinum 900 (90%)
    "PALLADIUM_PD950", // Palladium 950 (95%)
    "PALLADIUM_PD500", // Palladium 500 (50%)
    // Note: 22K, 18K, 14K, 10K gold and 925 silver are alloys - see Method B
  ];

  // Get metal types based on build method
  const getAvailableMetals = () => {
    if (formData.buildMethod === "METHOD_C") {
      // Base metals for Method C
      return [
        { id: "BRASS", name: "Brass" },
        { id: "COPPER", name: "Copper" },
        { id: "BRONZE", name: "Bronze" },
        { id: "STAINLESS_STEEL_316L", name: "Stainless Steel 316L" },
        { id: "SILVER_925", name: "Sterling Silver (for Vermeil)" },
      ];
    }
    // For Method A - only show pure metals (no alloys like rose gold, white gold - those are in Method B)
    return metalTypes.filter((metal) => PURE_METAL_IDS.includes(metal.id));
  };

  // Validate Vermeil requires Sterling Silver
  const isVermeilValid = () => {
    if (
      formData.platingType === "VERMEIL" &&
      formData.metalType !== "SILVER_925"
    ) {
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (status !== "authenticated") {
      router.push("/auth/login?callbackUrl=/rfq/create");
      return;
    }

    // Validate Vermeil
    if (!isVermeilValid()) {
      setError(
        "Vermeil plating requires Sterling Silver (925) as the base metal.",
      );
      return;
    }

    setLoading(true);
    setError("");

    const weight = getWeightFromTemplate();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      const response = await fetch(`${API_URL}/rfq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jewelleryType: formData.jewelleryType,
          templateId: getTemplateId(),
          weightCategory: formData.weightCategory,
          composition: {
            metalType: formData.metalType,
            buildMethod: formData.buildMethod,
            estimatedWeight: weight,
            surfaceFinish: formData.surfaceFinish,
            hasGemstones: formData.hasGemstones,
            gemstoneDetails: formData.gemstoneDetails,
          },
          // Method C plating fields
          addGoldPlating:
            formData.buildMethod === "METHOD_C"
              ? formData.addGoldPlating
              : false,
          platingType: formData.addGoldPlating
            ? formData.platingType
            : undefined,
          platingTier: formData.addGoldPlating
            ? formData.platingTier
            : undefined,
          surfaceFinish: formData.surfaceFinish,
          // Structured gemstones
          gemstones:
            formData.hasGemstones && formData.gemstones.length > 0
              ? formData.gemstones.map((g) => ({
                  stoneType: g.stoneType,
                  shape: g.shape,
                  sizeRange: g.size,
                  colour: g.colour,
                  settingStyle: g.settingStyle,
                  count: g.count,
                  presetId: g.presetId || undefined,
                }))
              : undefined,
          descriptionEn: formData.description,
          referenceImages: formData.referenceImages,
          budgetMinNpr: parseFloat(formData.budgetMin) || 0,
          budgetMaxNpr: parseFloat(formData.budgetMax) || 0,
          deadline: formData.deadline
            ? new Date(formData.deadline).toISOString()
            : null,
          specialInstructions: formData.specialInstructions,
          // Include estimate for reference
          estimatedPriceNpr: priceEstimate?.total,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create request");
      }

      const data = await response.json();
      router.push(`/rfq/${data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Form validation - pages 1-2 just need form data, page 3 needs auth + verification
  // For Method A: check metalType, For Method B: check alloyConfig.baseMetal, For Method C: check methodCConfig.baseMetal
  const hasValidMetalSelection = () => {
    if (!formData.buildMethod) return false;
    switch (formData.buildMethod) {
      case "METHOD_A":
        return !!formData.metalType;
      case "METHOD_B":
        return (
          !!formData.alloyConfig?.baseMetal && !!formData.alloyConfig?.karat
        );
      case "METHOD_C":
        return (
          !!formData.methodCConfig?.baseMetal &&
          !!formData.methodCConfig?.platingType
        );
      default:
        return !!formData.metalType;
    }
  };
  const canProceedToStep2 =
    formData.jewelleryType && formData.buildMethod && hasValidMetalSelection();
  const canProceedToStep3 =
    formData.description && (hasRealTemplate || formData.estimatedWeight);

  // Form data validation for submit (budget, etc.)
  const formDataComplete =
    formData.budgetMin && formData.budgetMax && isVermeilValid();

  // Final submit check: form complete + user verified
  const canSubmit = formDataComplete && canSubmitOrder;
  const submitBlockReason = getSubmitBlockReason();

  // Show loading skeleton until client-side hydration is complete
  // This prevents hydration mismatch errors that break React interactivity
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="animate-pulse space-y-6">
              {/* Progress skeleton */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="ml-2 h-4 w-20 bg-gray-200 rounded hidden sm:block" />
                  </div>
                ))}
              </div>
              {/* Card skeleton */}
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="h-24 bg-gray-200 rounded" />
                  <div className="h-24 bg-gray-200 rounded" />
                  <div className="h-24 bg-gray-200 rounded" />
                  <div className="h-24 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        step >= s
                          ? "bg-gold-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <span
                      className={`ml-2 hidden sm:inline ${step >= s ? "text-gray-900" : "text-gray-500"}`}
                    >
                      {s === 1
                        ? "Basic Info"
                        : s === 2
                          ? "Design Details"
                          : "Budget & Timeline"}
                    </span>
                    {s < 3 && (
                      <div
                        className={`w-16 sm:w-24 h-1 mx-4 ${step > s ? "bg-gold-500" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-6 w-6 text-gold-500" />
                    What would you like to create?
                  </CardTitle>
                  <CardDescription>
                    Tell us the basic details of your custom jewellery piece
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Jewellery Type *</Label>
                    <Select
                      value={formData.jewelleryType}
                      onValueChange={(v: string) => {
                        updateFormData("jewelleryType", v);
                        updateFormData("templateId", ""); // Reset template
                        // Reset build method if it's METHOD_D and new jewelry type doesn't support it
                        if (
                          formData.buildMethod === "METHOD_D" &&
                          !METHOD_D_SUPPORTED_TYPES.includes(v)
                        ) {
                          updateFormData("buildMethod", "");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select jewellery type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JEWELLERY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Template Selector - shows when jewellery type is selected */}
                  {formData.jewelleryType && templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Choose a Template (Optional)</Label>
                      <Select
                        value={formData.templateId}
                        onValueChange={(v: string) =>
                          updateFormData("templateId", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template for pre-defined specs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">
                            Custom (No template)
                          </SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Templates provide pre-defined weight ranges and
                        recommended materials
                      </p>
                    </div>
                  )}

                  {/* Weight Category Slider - shows when template is selected */}
                  {hasRealTemplate && (
                    <div className="space-y-3">
                      <Label>Weight Category *</Label>
                      <div className="flex gap-2">
                        {WEIGHT_CATEGORIES.map((cat) => {
                          const template = templates.find(
                            (t) => t.id === formData.templateId,
                          );
                          const weight = template
                            ? cat.value === "LIGHT"
                              ? template.lightWeightGrams
                              : cat.value === "MEDIUM"
                                ? template.mediumWeightGrams
                                : template.heavyWeightGrams
                            : 0;
                          return (
                            <Button
                              key={cat.value}
                              type="button"
                              variant={
                                formData.weightCategory === cat.value
                                  ? "default"
                                  : "outline"
                              }
                              className={`flex-1 flex-col h-auto py-3 ${
                                formData.weightCategory === cat.value
                                  ? "gold-gradient text-white"
                                  : ""
                              }`}
                              onClick={() =>
                                updateFormData("weightCategory", cat.value)
                              }
                            >
                              <span className="font-semibold">{cat.label}</span>
                              <span className="text-xs opacity-80">
                                {formatWeight(weight)}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual weight input when no template */}
                  {!hasRealTemplate && (
                    <div className="space-y-2">
                      <Label>Estimated Weight ({weightUnitSymbol})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={
                          displayWeightUnit === "GRAM"
                            ? "e.g., 10.5"
                            : "e.g., 1.0"
                        }
                        value={formData.estimatedWeight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateFormData("estimatedWeight", e.target.value)
                        }
                      />
                      {/* Weight unit selector */}
                      {supportedWeightUnits.length > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Unit:</span>
                          <Select
                            value={displayWeightUnit}
                            onValueChange={(v) =>
                              setDisplayWeightUnit(v as WeightUnit)
                            }
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedWeightUnits.map((unit) => (
                                <SelectItem
                                  key={unit}
                                  value={unit}
                                  className="text-xs"
                                >
                                  {WEIGHT_UNIT_SYMBOLS[unit as WeightUnit]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Build Method Selection */}
                  <div className="space-y-3">
                    <Label>Build Method *</Label>
                    <div className="space-y-2">
                      {BUILD_METHODS.filter((method) => {
                        // Method D is only available for specific jewelry types
                        if (method.value === "METHOD_D") {
                          return METHOD_D_SUPPORTED_TYPES.includes(
                            formData.jewelleryType,
                          );
                        }
                        return true;
                      }).map((method) => (
                        <Tooltip key={method.value}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                formData.buildMethod === method.value
                                  ? "border-gold-500 bg-gold-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => {
                                updateFormData("buildMethod", method.value);
                                updateFormData("metalType", ""); // Reset metal
                                // Reset method-specific configs
                                if (method.value === "METHOD_B") {
                                  updateFormData("alloyConfig", {
                                    baseMetal: "GOLD",
                                    karat: "18K",
                                    alloyFamily: null,
                                    recipePreset: null,
                                  });
                                } else if (method.value === "METHOD_C") {
                                  updateFormData("methodCConfig", {
                                    baseMetal: null,
                                    platingType: null,
                                    platingTier: "STANDARD",
                                  });
                                } else if (method.value === "METHOD_D") {
                                  // For Method D, default to 22K gold since that's most common for Italian chains
                                  updateFormData("metalType", "GOLD_22K");
                                }
                                if (method.value !== "METHOD_C") {
                                  updateFormData("addGoldPlating", false);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-4 h-4 mt-0.5 rounded-full border-2 ${
                                    formData.buildMethod === method.value
                                      ? "border-gold-500 bg-gold-500"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {formData.buildMethod === method.value && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {method.label}
                                    </p>
                                    <Info className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {method.description}
                                  </p>
                                  {method.value === "METHOD_C" && (
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-amber-600 border-amber-300"
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Not solid gold. Plated/Coated.
                                    </Badge>
                                  )}
                                  {method.value === "METHOD_D" && (
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-blue-600 border-blue-300"
                                    >
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Lighter weight, intricate patterns
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm p-4">
                            <div className="space-y-2">
                              <p className="font-semibold">{method.label}</p>
                              {method.tooltip && (
                                <div className="text-xs space-y-1">
                                  <p>
                                    <strong>What:</strong> {method.tooltip.what}
                                  </p>
                                  <p>
                                    <strong>Durability:</strong>{" "}
                                    {method.tooltip.durability}
                                  </p>
                                  <p>
                                    <strong>Best for:</strong>{" "}
                                    {method.tooltip.bestFor}
                                  </p>
                                  {method.tooltip.care && (
                                    <p>
                                      <strong>Care:</strong>{" "}
                                      {method.tooltip.care}
                                    </p>
                                  )}
                                  {method.tooltip.warning && (
                                    <p className="text-amber-600">
                                      {method.tooltip.warning}
                                    </p>
                                  )}
                                  {method.tooltip.styles && (
                                    <p>
                                      <strong>Styles:</strong>{" "}
                                      {method.tooltip.styles}
                                    </p>
                                  )}
                                  {method.tooltip.advantage && (
                                    <p>
                                      <strong>Advantage:</strong>{" "}
                                      {method.tooltip.advantage}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Method A: Traditional Metal Selection */}
                  {formData.buildMethod === "METHOD_A" && (
                    <div className="space-y-2">
                      <Label>Metal Type *</Label>
                      <Select
                        value={formData.metalType}
                        onValueChange={(v: string) =>
                          updateFormData("metalType", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select metal type" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMetals().map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Method B: Alloy Builder */}
                  {formData.buildMethod === "METHOD_B" && (
                    <AlloyBuilder
                      value={formData.alloyConfig}
                      onChange={(config) =>
                        updateFormData("alloyConfig", config)
                      }
                      weightGrams={parseFloat(formData.estimatedWeight) || 5}
                      marketRates={marketRates?.metals || {}}
                      currencySymbol={currencyInfo.symbol}
                    />
                  )}

                  {/* Method C: Base Metal + Required Plating */}
                  {formData.buildMethod === "METHOD_C" && (
                    <MethodCSelector
                      value={formData.methodCConfig}
                      onChange={(config) =>
                        updateFormData("methodCConfig", config)
                      }
                      weightGrams={parseFloat(formData.estimatedWeight) || 5}
                      currencySymbol={currencyInfo.symbol}
                      selectedCurrency={currency}
                      exchangeRate={marketRates?.fx?.rate || 144}
                    />
                  )}

                  {/* Method D: Italian Machine Made Options */}
                  {formData.buildMethod === "METHOD_D" && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-blue-900">
                          Italian Machine Made Options
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <Label>Metal Purity *</Label>
                        <Select
                          value={formData.methodDConfig.purity}
                          onValueChange={(v: string) =>
                            setFormData((prev) => ({
                              ...prev,
                              methodDConfig: {
                                ...prev.methodDConfig,
                                purity: v,
                              },
                              metalType:
                                v === "SILVER_925" ? "SILVER_925" : `GOLD_${v}`,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select metal purity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="22K">
                              <div className="flex flex-col">
                                <span>22K Gold (91.7%)</span>
                                <span className="text-xs text-gray-500">
                                  Most popular for hollow chains
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="18K">
                              <div className="flex flex-col">
                                <span>18K Gold (75%)</span>
                                <span className="text-xs text-gray-500">
                                  Stronger, variety of colors
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="14K">
                              <div className="flex flex-col">
                                <span>14K Gold (58.3%)</span>
                                <span className="text-xs text-gray-500">
                                  More durable, lighter color
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="SILVER_925">
                              <div className="flex flex-col">
                                <span>Sterling Silver 925</span>
                                <span className="text-xs text-gray-500">
                                  Italian silver chains
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Chain/Pattern Style *</Label>
                        <Select
                          value={formData.methodDConfig.chainStyle}
                          onValueChange={(v: string) =>
                            setFormData((prev) => ({
                              ...prev,
                              methodDConfig: {
                                ...prev.methodDConfig,
                                chainStyle: v,
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select chain/pattern style" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[400px]">
                            {(
                              Object.entries(CHAIN_STYLE_OPTIONS) as [
                                ChainStyleType,
                                (typeof CHAIN_STYLE_OPTIONS)[ChainStyleType],
                              ][]
                            ).map(([key, style]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex flex-col py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {style.label}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{style.makingChargePercent}%
                                    </Badge>
                                    {style.hollowDiscount >= 0.4 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs text-green-700"
                                      >
                                        ~
                                        {Math.round(style.hollowDiscount * 100)}
                                        % lighter
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500 line-clamp-2">
                                    {style.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Show selected style details */}
                        {formData.methodDConfig.chainStyle &&
                          CHAIN_STYLE_OPTIONS[
                            formData.methodDConfig.chainStyle as ChainStyleType
                          ] && (
                            <div className="bg-white p-3 rounded border border-blue-200 text-sm">
                              <div className="font-medium text-blue-900 mb-2">
                                {
                                  CHAIN_STYLE_OPTIONS[
                                    formData.methodDConfig
                                      .chainStyle as ChainStyleType
                                  ].label
                                }
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <p>
                                  <strong>What it is:</strong>{" "}
                                  {
                                    CHAIN_STYLE_OPTIONS[
                                      formData.methodDConfig
                                        .chainStyle as ChainStyleType
                                    ].description
                                  }
                                </p>
                                <p>
                                  <strong>How it looks:</strong>{" "}
                                  {
                                    CHAIN_STYLE_OPTIONS[
                                      formData.methodDConfig
                                        .chainStyle as ChainStyleType
                                    ].howItLooks
                                  }
                                </p>
                                <div className="flex gap-4 mt-2 pt-2 border-t">
                                  <div>
                                    <span className="text-gray-500">
                                      Making Charge:
                                    </span>
                                    <span className="ml-1 font-medium text-amber-700">
                                      +
                                      {
                                        CHAIN_STYLE_OPTIONS[
                                          formData.methodDConfig
                                            .chainStyle as ChainStyleType
                                        ].makingChargePercent
                                      }
                                      %
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      Weight Savings:
                                    </span>
                                    <span className="ml-1 font-medium text-green-700">
                                      ~
                                      {Math.round(
                                        CHAIN_STYLE_OPTIONS[
                                          formData.methodDConfig
                                            .chainStyle as ChainStyleType
                                        ].hollowDiscount * 100,
                                      )}
                                      % hollow
                                    </span>
                                  </div>
                                </div>
                                {CHAIN_STYLE_OPTIONS[
                                  formData.methodDConfig
                                    .chainStyle as ChainStyleType
                                ].minWeight && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Min. recommended weight:{" "}
                                    {
                                      CHAIN_STYLE_OPTIONS[
                                        formData.methodDConfig
                                          .chainStyle as ChainStyleType
                                      ].minWeight
                                    }
                                    g
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="bg-white p-3 rounded border text-sm text-blue-900">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              About Italian Machine Made
                            </p>
                            <ul className="text-xs mt-1 space-y-1 text-gray-600">
                              <li>• High-precision automated manufacturing</li>
                              <li>• Hollow/semi-hollow for lighter weight</li>
                              <li>• Consistent quality and patterns</li>
                              <li>• Diamond-cut facets for extra sparkle</li>
                              <li>• Price based on actual gold weight used</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Surface Finish</Label>
                    <Select
                      value={formData.surfaceFinish}
                      onValueChange={(v: string) =>
                        updateFormData("surfaceFinish", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select finish type" />
                      </SelectTrigger>
                      <SelectContent>
                        {surfaceFinishes.length > 0 ? (
                          surfaceFinishes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="POLISHED">
                              High Polish / Mirror Finish
                            </SelectItem>
                            <SelectItem value="MATTE">
                              Matte / Brushed Finish
                            </SelectItem>
                            <SelectItem value="SATIN">Satin Finish</SelectItem>
                            <SelectItem value="HAMMERED">
                              Hammered Texture
                            </SelectItem>
                            <SelectItem value="SANDBLAST">
                              Sandblasted
                            </SelectItem>
                            <SelectItem value="ANTIQUE">
                              Antique / Oxidized
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Live Pricing Panel - Method-Aware */}
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={{
                      buildMethod: formData.buildMethod as BuildMethod,
                      jewelleryType: formData.jewelleryType,
                      country,
                      currency,
                      methodA:
                        formData.buildMethod === "METHOD_A"
                          ? {
                              metal: formData.metalType,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodB:
                        formData.buildMethod === "METHOD_B"
                          ? {
                              baseMetal: formData.alloyConfig.baseMetal as
                                | "GOLD"
                                | "SILVER",
                              karat: formData.alloyConfig.karat,
                              alloyFamily: formData.alloyConfig.alloyFamily,
                              recipePresetId:
                                formData.alloyConfig.recipePresetId,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodC:
                        formData.buildMethod === "METHOD_C"
                          ? {
                              baseMetal: formData.methodCConfig.baseMetal,
                              platingType: formData.methodCConfig.platingType,
                              platingTier: formData.methodCConfig.platingTier,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      gemstones: formData.gemstonesV2.map((g) => ({
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
                      })),
                      surfaceFinish: formData.surfaceFinish
                        ? {
                            finishType: formData.surfaceFinish,
                          }
                        : undefined,
                      marketRates: marketRates
                        ? {
                            metals: marketRates.metals,
                            fx: marketRates.fx,
                          }
                        : undefined,
                    }}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">How it works</p>
                      <p>
                        After submitting your request, multiple verified
                        jewellers will review your requirements and send you
                        competitive quotes. You can compare offers and choose
                        the best one.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setStep(2);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={!canProceedToStep2}
                      className="gold-gradient text-white"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Design Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Design Details</CardTitle>
                  <CardDescription>
                    Describe your design vision and specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Show weight info if template selected */}
                  {hasRealTemplate && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Template:</span>{" "}
                        {
                          templates.find((t) => t.id === formData.templateId)
                            ?.name
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">
                          Weight ({formData.weightCategory}):
                        </span>{" "}
                        {formatWeight(getWeightFromTemplate())}
                      </p>
                    </div>
                  )}

                  {/* Manual weight input shown only if no template */}
                  {!hasRealTemplate && (
                    <div className="space-y-2">
                      <Label>Estimated Weight ({weightUnitSymbol}) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={
                          displayWeightUnit === "GRAM"
                            ? "e.g., 10.5"
                            : "e.g., 1.0"
                        }
                        value={formData.estimatedWeight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateFormData("estimatedWeight", e.target.value)
                        }
                      />
                      <p className="text-xs text-gray-500">
                        An approximate weight helps jewellers provide accurate
                        quotes
                      </p>
                      {/* Weight unit selector */}
                      {supportedWeightUnits.length > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Unit:</span>
                          <Select
                            value={displayWeightUnit}
                            onValueChange={(v) =>
                              setDisplayWeightUnit(v as WeightUnit)
                            }
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedWeightUnits.map((unit) => (
                                <SelectItem
                                  key={unit}
                                  value={unit}
                                  className="text-xs"
                                >
                                  {WEIGHT_UNIT_SYMBOLS[unit as WeightUnit]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      rows={4}
                      placeholder="Describe your design in detail. Include dimensions, style preferences, any specific patterns or motifs you want..."
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        updateFormData("description", e.target.value)
                      }
                    />
                  </div>

                  {/* Gemstones Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Include Gemstones?</Label>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            formData.hasGemstones ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => updateFormData("hasGemstones", true)}
                        >
                          Yes
                        </Badge>
                        <Badge
                          variant={
                            !formData.hasGemstones ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            updateFormData("hasGemstones", false);
                            updateFormData("gemstonesV2", []);
                            updateFormData("gemstones", []);
                          }}
                        >
                          No
                        </Badge>
                      </div>
                    </div>

                    {formData.hasGemstones && (
                      <GemstoneEditorV2
                        gemstones={formData.gemstonesV2}
                        onChange={(gems) => updateFormData("gemstonesV2", gems)}
                        currencySymbol={currencyInfo.symbol}
                        selectedCurrency={currency}
                        exchangeRate={marketRates?.fx?.rate || 144}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Images (Optional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                        id="rfq-image-upload"
                        disabled={isUploadingImage}
                      />
                      <label
                        htmlFor="rfq-image-upload"
                        className="cursor-pointer block"
                      >
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-gray-600">
                              Uploading... {uploadProgress}%
                            </p>
                            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Upload images of designs you like
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <span>Browse Files</span>
                            </Button>
                            <p className="text-xs text-gray-400 mt-2">
                              PNG, JPG, WebP up to 10MB each
                            </p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Preview uploaded images */}
                    {formData.referenceImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.referenceImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={getImageUrl(url, "thumbnail")}
                              alt={`Reference ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeReferenceImage(url)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Special Instructions</Label>
                    <Textarea
                      rows={2}
                      placeholder="Any other requirements or preferences..."
                      value={formData.specialInstructions}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        updateFormData("specialInstructions", e.target.value)
                      }
                    />
                  </div>

                  {/* Live Pricing Panel - Same as Step 1 */}
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={{
                      buildMethod: formData.buildMethod as BuildMethod,
                      jewelleryType: formData.jewelleryType,
                      country,
                      currency,
                      methodA:
                        formData.buildMethod === "METHOD_A"
                          ? {
                              metal: formData.metalType,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodB:
                        formData.buildMethod === "METHOD_B"
                          ? {
                              baseMetal: formData.alloyConfig.baseMetal as
                                | "GOLD"
                                | "SILVER",
                              karat: formData.alloyConfig.karat,
                              alloyFamily: formData.alloyConfig.alloyFamily,
                              recipePresetId:
                                formData.alloyConfig.recipePresetId,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodC:
                        formData.buildMethod === "METHOD_C"
                          ? {
                              baseMetal: formData.methodCConfig.baseMetal,
                              platingType: formData.methodCConfig.platingType,
                              platingTier: formData.methodCConfig.platingTier,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      gemstones: formData.gemstonesV2.map((g) => ({
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
                      })),
                      surfaceFinish: formData.surfaceFinish
                        ? {
                            finishType: formData.surfaceFinish,
                          }
                        : undefined,
                      marketRates: marketRates
                        ? {
                            metals: marketRates.metals,
                            fx: marketRates.fx,
                          }
                        : undefined,
                    }}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        setStep(3);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={!canProceedToStep3}
                      className="gold-gradient text-white"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Budget & Timeline */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Budget & Timeline</CardTitle>
                  <CardDescription>
                    Set your budget range and preferred delivery date
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AI Design Preview Section - At top of Step 3 */}
                  <div className="space-y-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                        <Label className="text-base font-medium">
                          AI Design Preview
                        </Label>
                      </div>
                      {designId && (
                        <Badge variant="outline" className="text-xs">
                          Design #{designId.slice(0, 8)}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      Generate an AI visualization of your custom jewelry design
                      based on all your specifications.
                      {fromDesign &&
                        " This design was selected from the gallery."}
                    </p>

                    {/* Sign-in / Phone Verification Required Notice - Check sign-in FIRST */}
                    {(!isLoggedIn || !isPhoneVerified) && (
                      <div
                        className={`border rounded-lg p-3 flex items-start gap-2 ${
                          !isLoggedIn
                            ? "bg-blue-50 border-blue-200"
                            : "bg-amber-100 border-amber-300"
                        }`}
                      >
                        {!isLoggedIn ? (
                          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Phone className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              !isLoggedIn ? "text-blue-800" : "text-amber-800"
                            }`}
                          >
                            {!isLoggedIn
                              ? "Sign In Required"
                              : "Phone Verification Required"}
                          </p>
                          <p
                            className={`text-sm mt-1 ${
                              !isLoggedIn ? "text-blue-700" : "text-amber-700"
                            }`}
                          >
                            {!isLoggedIn
                              ? "Sign in to generate AI design previews and submit your custom jewelry request."
                              : "Verify your phone number to generate AI design previews. This helps us prevent spam and ensures a quality experience."}
                          </p>
                          {!isLoggedIn ? (
                            <Link
                              href="/auth/login?redirect=/rfq/create"
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
                            >
                              Sign in now
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <Link
                              href="/dashboard/customer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-800 mt-2"
                            >
                              Verify phone in profile
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview Image Display */}
                    {designPreviewUrl ? (
                      <div className="relative w-full max-w-sm mx-auto">
                        <img
                          src={designPreviewUrl}
                          alt="AI Generated Design Preview"
                          className="w-full rounded-lg shadow-md border"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-500 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm mx-auto aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <p className="text-sm">Preview will appear here</p>
                      </div>
                    )}

                    {/* Generate Button - Disabled if not signed in or phone not verified */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button
                              type="button"
                              onClick={generatePreview}
                              disabled={
                                generatingPreview ||
                                !formData.jewelleryType ||
                                !formData.metalType ||
                                !isLoggedIn ||
                                !isPhoneVerified
                              }
                              className={`bg-amber-600 hover:bg-amber-700 text-white ${
                                !isLoggedIn || !isPhoneVerified
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {generatingPreview ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating... (10-15s)
                                </>
                              ) : designPreviewUrl ? (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Regenerate Preview
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Preview
                                </>
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!isLoggedIn || !isPhoneVerified) && (
                          <TooltipContent side="top" className="max-w-xs">
                            <p>
                              {!isLoggedIn
                                ? "Sign in to generate AI design previews"
                                : "Verify your phone number to generate AI design previews"}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>

                    {/* Share to Gallery Checkbox */}
                    {isLoggedIn && isPhoneVerified && (
                      <div className="flex items-center justify-center gap-2 pt-2 border-t border-amber-200">
                        <input
                          type="checkbox"
                          id="share-to-gallery"
                          checked={shareToGallery}
                          onChange={(e) => setShareToGallery(e.target.checked)}
                          className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="share-to-gallery"
                          className="text-sm text-gray-600"
                        >
                          Share this design to the{" "}
                          <a
                            href="/designs"
                            target="_blank"
                            className="text-amber-600 hover:underline"
                          >
                            Design Gallery
                          </a>{" "}
                          to inspire others
                        </label>
                      </div>
                    )}

                    {isLoggedIn &&
                      isPhoneVerified &&
                      (!formData.jewelleryType || !formData.metalType) && (
                        <p className="text-xs text-gray-500 text-center">
                          Complete jewelry type and metal selection to enable
                          preview generation
                        </p>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Budget ({currency}) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 50000"
                        value={formData.budgetMin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateFormData("budgetMin", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Budget ({currency}) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 100000"
                        value={formData.budgetMax}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateFormData("budgetMax", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Price estimate comparison */}
                  {/* Live Pricing Panel */}
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={{
                      buildMethod: formData.buildMethod as BuildMethod,
                      jewelleryType: formData.jewelleryType,
                      country,
                      currency,
                      methodA:
                        formData.buildMethod === "METHOD_A"
                          ? {
                              metal: formData.metalType,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodB:
                        formData.buildMethod === "METHOD_B"
                          ? {
                              baseMetal: formData.alloyConfig.baseMetal as
                                | "GOLD"
                                | "SILVER",
                              karat: formData.alloyConfig.karat,
                              alloyFamily: formData.alloyConfig.alloyFamily,
                              recipePresetId:
                                formData.alloyConfig.recipePresetId,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      methodC:
                        formData.buildMethod === "METHOD_C"
                          ? {
                              baseMetal: formData.methodCConfig.baseMetal,
                              platingType: formData.methodCConfig.platingType,
                              platingTier: formData.methodCConfig.platingTier,
                              weightGrams: getWeightFromTemplate(),
                            }
                          : undefined,
                      gemstones: formData.gemstonesV2.map((g) => ({
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
                      })),
                      surfaceFinish: formData.surfaceFinish
                        ? {
                            finishType: formData.surfaceFinish,
                          }
                        : undefined,
                      marketRates: marketRates
                        ? {
                            metals: marketRates.metals,
                            fx: marketRates.fx,
                          }
                        : undefined,
                    }}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />

                  {/* Budget warning if estimate exceeds budget */}
                  {priceEstimate &&
                    priceEstimate.total != null &&
                    (priceEstimate.total || 0) >
                      parseFloat(formData.budgetMax || "0") &&
                    formData.budgetMax && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-sm text-amber-700">
                          Estimated price exceeds your maximum budget. Consider
                          adjusting specifications or budget.
                        </p>
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label>Preferred Deadline</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateFormData("deadline", e.target.value)
                      }
                      min={minDate}
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty if you&apos;re flexible on timing
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold">Request Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Type:</span>
                      <span>
                        {
                          JEWELLERY_TYPES.find(
                            (t) => t.value === formData.jewelleryType,
                          )?.label
                        }
                      </span>

                      {hasRealTemplate && (
                        <>
                          <span className="text-gray-500">Template:</span>
                          <span>
                            {
                              templates.find(
                                (t) => t.id === formData.templateId,
                              )?.name
                            }
                          </span>
                        </>
                      )}

                      <span className="text-gray-500">Build Method:</span>
                      <span>
                        {
                          BUILD_METHODS.find(
                            (m) => m.value === formData.buildMethod,
                          )?.label.split(":")[1]
                        }
                      </span>

                      <span className="text-gray-500">Metal:</span>
                      <span>
                        {
                          getAvailableMetals().find(
                            (t) => t.id === formData.metalType,
                          )?.name
                        }
                      </span>

                      <span className="text-gray-500">Weight:</span>
                      <span>
                        {hasRealTemplate
                          ? `${getWeightFromTemplate()}g (${formData.weightCategory})`
                          : `${formData.estimatedWeight}g`}
                      </span>

                      {formData.surfaceFinish && (
                        <>
                          <span className="text-gray-500">Finish:</span>
                          <span>
                            {formData.surfaceFinish.replace("_", " ")}
                          </span>
                        </>
                      )}

                      {formData.addGoldPlating && (
                        <>
                          <span className="text-gray-500">Plating:</span>
                          <span>
                            {formData.platingType.replace("_", " ")} (
                            {formData.platingTier})
                          </span>
                        </>
                      )}

                      {formData.gemstones.length > 0 && (
                        <>
                          <span className="text-gray-500">Gemstones:</span>
                          <span>{formData.gemstones.length} stone type(s)</span>
                        </>
                      )}

                      <span className="text-gray-500">Budget:</span>
                      <span>
                        {currencyInfo.symbol} {formData.budgetMin} -{" "}
                        {formData.budgetMax}
                      </span>
                    </div>
                  </div>

                  {/* Method C warning */}
                  {formData.buildMethod === "METHOD_C" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        <strong>Note:</strong> This piece uses base metal with
                        plating/coating. It is not solid gold and will be
                        labeled accordingly.
                      </p>
                    </div>
                  )}

                  {/* Verification status notice */}
                  {step === 3 && !canSubmitOrder && (
                    <div
                      className={`border rounded-lg p-4 flex gap-3 ${
                        !isLoggedIn
                          ? "bg-blue-50 border-blue-200"
                          : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      {!isLoggedIn ? (
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      ) : !isPhoneVerified ? (
                        <Phone className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-medium text-sm ${
                            !isLoggedIn ? "text-blue-800" : "text-amber-800"
                          }`}
                        >
                          {!isLoggedIn
                            ? "Sign in to Submit"
                            : !isPhoneVerified
                              ? "Phone Verification Required"
                              : "KYC Verification Required"}
                        </p>
                        <p
                          className={`text-sm mt-1 ${
                            !isLoggedIn ? "text-blue-700" : "text-amber-700"
                          }`}
                        >
                          {submitBlockReason}
                        </p>
                        {!isLoggedIn ? (
                          <Link
                            href="/auth/login?redirect=/rfq/create"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
                          >
                            Sign in now
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : !isPhoneVerified ? (
                          <Link
                            href="/dashboard/customer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-800 mt-2"
                          >
                            Verify phone in profile
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : isSeller && !isShopVerified ? (
                          <Link
                            href="/dashboard/shop/verification"
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-800 mt-2"
                          >
                            Complete KYC verification
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>

                    {/* Submit button with tooltip for disabled state */}
                    {!canSubmit && submitBlockReason ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button
                              disabled
                              className="gold-gradient text-white pointer-events-none opacity-50"
                            >
                              Submit Request
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>{submitBlockReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || loading}
                        className="gold-gradient text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Request
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </TooltipProvider>
  );
}
