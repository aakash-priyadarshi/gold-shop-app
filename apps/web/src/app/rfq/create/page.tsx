"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BuyerEducation } from "@/components/pricing/BuyerEducation";
import { MarketComparison } from "@/components/pricing/MarketComparison";
import { SellerTierBadge } from "@/components/pricing/SellerTierBadge";
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
import {
  fetchTaxRules,
  lookupTaxRate,
  type TaxRule,
} from "@/hooks/useTaxRules";
import { getImageUrl } from "@/lib/image-upload";
import {
  COUNTRIES,
  CURRENCIES,
  usePreferencesStore,
  type CurrencyCode,
} from "@/store/preferences";
import {
  fromGrams,
  getCitiesForCountry,
  getStatesForCountry,
  toGrams,
} from "@gold-shop/shared";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Gem,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Alert Dialog for resume draft prompt
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
import { getApiUrl, intelligenceApi, shopsApi } from "@/lib/api";
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
  { value: "TIE_PIN", label: "Tie Pin" },
  { value: "CUFFLINKS", label: "Cufflinks" },
  { value: "NOSE_PIN", label: "Nose Pin" },
  { value: "MANGALSUTRA", label: "Mangalsutra" },
  { value: "MAANG_TIKKA", label: "Maang Tikka" },
  { value: "OTHER", label: "Other" },
];

// Jewelry type images for hover preview (AI-generated, hosted on Cloudflare R2 CDN)
const JEWELLERY_TYPE_IMAGES: Record<string, string> = {
  RING: "https://images.orivraa.com/product/1769445057895-wcn56633.png",
  NECKLACE: "https://images.orivraa.com/product/1769445053991-4ytp6cgd.png",
  BRACELET: "https://images.orivraa.com/product/1769445045824-zjp8yki3.png",
  EARRING: "https://images.orivraa.com/product/1769445051626-dm5ke087.png",
  PENDANT: "https://images.orivraa.com/product/1769445056509-on5a83b5.png",
  BANGLE: "https://images.orivraa.com/product/1769445043166-phaausjg.png",
  CHAIN: "https://images.orivraa.com/product/1769445050194-b6e62x3n.png",
  ANKLET: "https://images.orivraa.com/product/1769445041034-oa8hfslv.png",
  BROOCH: "https://images.orivraa.com/product/1769445047396-q4pss35p.png",
  TIE_PIN: "https://images.orivraa.com/product/1770654788358-98tpi91v.png",
  CUFFLINKS: "https://images.orivraa.com/product/1770654794011-mbmfttye.png",
  NOSE_PIN: "https://images.orivraa.com/product/1770654801812-rx6d93j5.png",
  MANGALSUTRA: "https://images.orivraa.com/product/1770658985031-60d4dogq.png",
  MAANG_TIKKA: "https://images.orivraa.com/product/1770654756626-gmaz323x.png",
  OTHER: "https://images.orivraa.com/product/1769445057895-wcn56633.png",
};

// Surface finish images for hover preview (AI-generated, hosted on Cloudflare R2 CDN)
// Including various key formats for API compatibility
const SURFACE_FINISH_IMAGES: Record<
  string,
  { image: string; description: string }
> = {
  // API IDs (from backend SURFACE_FINISHES)
  HIGH_POLISH: {
    image: "https://images.orivraa.com/product/1769448671129-6anrd5rf.png",
    description: "Mirror-like shine, highly reflective surface",
  },
  MATTE: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Non-reflective, soft appearance",
  },
  BRUSHED: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Non-reflective, soft brushed appearance",
  },
  SATIN: {
    image: "https://images.orivraa.com/product/1769445073480-ji4q1p05.png",
    description: "Subtle sheen between matte and polish",
  },
  HAMMERED: {
    image: "https://images.orivraa.com/product/1769445062183-qd3i944l.png",
    description: "Textured surface with small indentations",
  },
  SANDBLASTED: {
    image: "https://images.orivraa.com/product/1769445070947-3o0y4equ.png",
    description: "Frosted, granular texture",
  },
  FLORENTINE: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Cross-hatched matte texture",
  },
  BARK_TEXTURE: {
    image: "https://images.orivraa.com/product/1769448676427-epn2otmh.png",
    description: "Natural bark-like texture",
  },
  DIAMOND_CUT: {
    image: "https://images.orivraa.com/product/1769448674243-38v0ta17.png",
    description: "Precision faceted cuts for sparkle",
  },
  ENGRAVED: {
    image: "https://images.orivraa.com/product/1769448679035-4xzpm0lm.png",
    description: "Decorative carved patterns",
  },
  // Fallback uppercase keys (for hardcoded SelectItems)
  POLISHED: {
    image: "https://images.orivraa.com/product/1769448671129-6anrd5rf.png",
    description: "Mirror-like shine, highly reflective surface",
  },
  SANDBLAST: {
    image: "https://images.orivraa.com/product/1769445070947-3o0y4equ.png",
    description: "Frosted, granular texture",
  },
  ANTIQUE: {
    image: "https://images.orivraa.com/product/1769445059769-uqh0w2ze.png",
    description: "Oxidized finish for vintage look",
  },
};

// Weight guidance for each jewelry type (in grams)
const WEIGHT_GUIDANCE: Record<string, { range: string; note: string }> = {
  RING: {
    range: "1-7g",
    note: "Women's rings typically 1-3g, men's rings 4-7g. Heavy statement rings can go up to 15g.",
  },
  NECKLACE: {
    range: "5-30g",
    note: "Simple chains 5-10g, medium pendants with chain 10-20g, heavy statement necklaces 30g+.",
  },
  BRACELET: {
    range: "5-20g",
    note: "Delicate bracelets 5-8g, tennis bracelets 10-15g, chunky designs 15-25g.",
  },
  EARRING: {
    range: "1-6g",
    note: "Per pair. Studs 0.5-2g, small hoops 1-3g, statement earrings 4-8g per pair.",
  },
  PENDANT: {
    range: "1-10g",
    note: "Excludes chain. Small pendants 1-3g, medium 3-6g, large statement pendants 8-15g.",
  },
  BANGLE: {
    range: "8-30g",
    note: "Thin bangles 8-12g, medium 15-20g, broad/heavy bangles 25-40g.",
  },
  CHAIN: {
    range: "5-25g",
    note: 'Depends on length and style. 18" light chain 5-10g, 24" medium chain 15-25g.',
  },
  ANKLET: {
    range: "2-8g",
    note: "Simple chains 2-4g, with charms or broader designs 5-10g.",
  },
  BROOCH: {
    range: "5-20g",
    note: "Small brooches 5-8g, medium 10-15g, elaborate designs 15-25g.",
  },
  TIE_PIN: {
    range: "3-8g",
    note: "Simple tie pins 3-5g, decorative designs with gemstones 5-8g.",
  },
  CUFFLINKS: {
    range: "5-15g",
    note: "Per pair. Simple cufflinks 5-8g, ornate designs 10-15g.",
  },
  NOSE_PIN: {
    range: "0.3-2g",
    note: "Studs 0.3-0.5g, small hoops/rings 0.5-1g, decorative nose pins up to 2g.",
  },
  MANGALSUTRA: {
    range: "10-30g",
    note: "Short mangalsutra 10-15g, medium length 15-20g, traditional long designs 25-40g.",
  },
  MAANG_TIKKA: {
    range: "3-10g",
    note: "Simple designs 3-5g, medium with stones 5-8g, elaborate bridal pieces 8-15g.",
  },
  OTHER: {
    range: "Varies",
    note: "Weight depends on the specific item. Contact us if unsure.",
  },
};

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

  // AI RFQ Builder state
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    confidence: number;
    reasoning: string;
    conversationalMessage: string;
    suggestions: string[];
    missingInfo?: string[];
    isGuest?: boolean;
    guestLimitReached?: boolean;
  } | null>(null);
  const [aiError, setAiError] = useState("");
  const [showAiAssistant, setShowAiAssistant] = useState(true);

  // Hover preview for jewellery type dropdown
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

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
  const detectedCountry = usePreferencesStore((state) => state.detectedCountry);
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
  const [regenerationFeedback, setRegenerationFeedback] = useState(""); // For refinement requests

  // Similar designs suggestions state
  interface SimilarDesign {
    id: string;
    imageUrl: string;
    jewelryType: string;
    buildMethod: string;
    metalType?: string;
    likesCount: number;
    ordersCount: number;
    similarityScore: number;
    creator?: { id: string; firstName: string };
  }
  const [similarDesigns, setSimilarDesigns] = useState<SimilarDesign[]>([]);
  const [loadingSimilarDesigns, setLoadingSimilarDesigns] = useState(false);
  const [similarDesignsChecked, setSimilarDesignsChecked] = useState(false);

  // Step 4: Submission success and seller matching state
  interface MatchingSeller {
    id: string;
    shopName: string;
    shopNameNe?: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    contactPhone?: string;
    whatsappNumber?: string;
    isVerified: boolean;
    makingChargePercent: number;
    codEnabled: boolean;
    estimatedPrice: number;
    materialCost: number;
    makingCharge: number;
    finishCost: number;
    baseMetalCost: number;
    platingCost: number;
    gemstoneCost: number;
    componentCost: number;
    hasCustomRate: boolean;
    averageRating: number;
    reviewCount: number;
    locationScore: number;
    locationMatch: "same_city" | "same_state" | "same_country" | "other";
    supportedJewelleryTypes: string[];
    supportedMethods: string[];
    supportedFinishes: string[];
    // Seller performance & tier
    sellerTier?: "STANDARD" | "SILVER" | "GOLD" | "ELITE";
    badges?: string[];
    sellerPerformance?: {
      totalOrders: number;
      successfulOrders: number;
      avgRating: number;
      onTimeDispatchRate: number;
    } | null;
  }

  interface SellerMatchingStats {
    totalMatching: number;
    sameCityCount: number;
    sameStateCount: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }

  interface SellerDiagnostics {
    totalShops: number;
    activeShops: number;
    verifiedShops: number;
    activeAndVerified: number;
    matchingBeforeCountryFilter: number;
    customerCountry: string;
    includeInternational: boolean;
    filtersApplied: {
      jewelleryType: string;
      buildMethod: string;
      metalType: string | null;
      minRating: number | null;
      maxPrice: number | null;
    };
  }

  interface SellerGroupInfo {
    label: string;
    count: number;
    sellerIds: string[];
  }

  interface SellerGroups {
    nearYou: SellerGroupInfo;
    sameState: SellerGroupInfo;
    sameCountry: SellerGroupInfo;
    international: SellerGroupInfo;
  }

  // Delivery address type
  interface DeliveryAddress {
    id: string;
    label: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }

  const [submittedRfqId, setSubmittedRfqId] = useState<string | null>(null);
  const [matchingSellers, setMatchingSellers] = useState<MatchingSeller[]>([]);
  const [sellerStats, setSellerStats] = useState<SellerMatchingStats | null>(
    null,
  );
  const [sellerDiagnostics, setSellerDiagnostics] =
    useState<SellerDiagnostics | null>(null);
  const [sellerGroups, setSellerGroups] = useState<SellerGroups | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellerSortBy, setSellerSortBy] = useState<
    "location" | "price" | "rating" | "popularity"
  >("location");
  const [sellerMinRating, setSellerMinRating] = useState<number | undefined>(
    undefined,
  );
  const [sellerMaxPrice, setSellerMaxPrice] = useState<number | undefined>(
    undefined,
  );

  // Delivery address state for Step 4
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>(
    [],
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Advanced filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string | undefined>(
    undefined,
  );
  const [filterCity, setFilterCity] = useState<string | undefined>(undefined);
  const [filterState, setFilterState] = useState<string | undefined>(undefined);
  const [includeInternational, setIncludeInternational] = useState(false);

  // Order request modal state
  const [selectedSeller, setSelectedSeller] = useState<MatchingSeller | null>(
    null,
  );
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderBudget, setOrderBudget] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);

  // Shop-specific component pricing (loaded when a seller is selected)
  const [shopPrices, setShopPrices] = useState<{
    baseMetalPrices?: Record<string, number>;
    platingPrices?: Record<string, number>;
    finishPrices?: Record<string, number>;
  } | null>(null);

  // Fetch shop component pricing when a seller is selected
  useEffect(() => {
    if (!selectedSeller?.id) {
      setShopPrices(null);
      return;
    }
    shopsApi
      .getComponentPricingPublic(selectedSeller.id)
      .then(
        (res: {
          data: {
            baseMetalPrices?: Record<string, number>;
            platingPrices?: Record<string, number>;
            finishPrices?: Record<string, number>;
          };
        }) => {
          const data = res.data;
          if (
            data &&
            (Object.keys(data.baseMetalPrices || {}).length > 0 ||
              Object.keys(data.platingPrices || {}).length > 0 ||
              Object.keys(data.finishPrices || {}).length > 0)
          ) {
            setShopPrices(data);
          }
        },
      )
      .catch(() => {
        /* ignore – fallback to system defaults */
      });
  }, [selectedSeller?.id]);

  // Dynamic tax rules fetched from backend (keyed by country code)
  const [taxRulesMap, setTaxRulesMap] = useState<Record<string, TaxRule[]>>({});

  // Fetch tax rules for customer's country (and seller countries when available)
  useEffect(() => {
    if (!country) return;
    const countryCodes = new Set<string>([country.toUpperCase()]);
    // Also fetch for any unique seller countries in results
    if (matchingSellers) {
      for (const s of matchingSellers) {
        if (s.country) countryCodes.add(s.country.toUpperCase());
      }
    }
    let cancelled = false;
    Promise.all(
      Array.from(countryCodes).map(async (cc) => {
        const data = await fetchTaxRules(cc);
        return [cc, data?.rules || []] as [string, TaxRule[]];
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, TaxRule[]> = {};
      for (const [cc, rules] of results) {
        map[cc] = rules;
      }
      setTaxRulesMap((prev) => ({ ...prev, ...map }));
    });
    return () => {
      cancelled = true;
    };
  }, [country, matchingSellers]);

  // Congratulatory messages with username placeholder
  const CONGRATULATORY_MESSAGES = [
    "🎉 Congratulations {name}! Your custom jewellery request has been submitted successfully!",
    "✨ Amazing choice, {name}! Your dream jewellery is now being matched with expert sellers.",
    "🌟 Well done, {name}! Your unique design request is on its way to our trusted sellers.",
    "💎 Fantastic, {name}! Your custom piece is about to come to life.",
    "🎊 Excellent, {name}! We're finding the perfect artisans for your jewellery.",
    "✨ Beautiful selection, {name}! Expert craftsmen are ready to bring your vision to life.",
    "🏆 Great job, {name}! Your request is now live and sellers are reviewing it.",
    "💫 Wonderful, {name}! Let's find the perfect maker for your custom jewellery.",
  ];

  const getCongratulatoryMessage = () => {
    const name = user?.firstName || "there";
    const randomIndex = Math.floor(
      Math.random() * CONGRATULATORY_MESSAGES.length,
    );
    return CONGRATULATORY_MESSAGES[randomIndex].replace("{name}", name);
  };

  const [congratsMessage] = useState(getCongratulatoryMessage);

  // Draft autosave state
  const DRAFT_STORAGE_KEY = "rfq-draft";
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [savedDraftTimestamp, setSavedDraftTimestamp] = useState<string | null>(
    null,
  );
  const [draftChecked, setDraftChecked] = useState(false);

  // Check for saved draft on mount
  useEffect(() => {
    // Don't check if coming from design gallery (prefill takes priority)
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("from") === "design") {
      setDraftChecked(true);
      return;
    }

    // Check for saved draft
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Check if draft has meaningful content (not just defaults)
        const hasContent =
          draft.formData?.jewelleryType ||
          draft.formData?.metalType ||
          draft.formData?.description ||
          draft.designPreviewUrl;
        if (hasContent && draft.timestamp) {
          setSavedDraftTimestamp(draft.timestamp);
          setShowResumeDraftDialog(true);
        } else {
          setDraftChecked(true);
        }
      } else {
        setDraftChecked(true);
      }
    } catch (err) {
      console.error("Failed to check for draft:", err);
      setDraftChecked(true);
    }
  }, []);

  // Resume draft handler
  const handleResumeDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) {
          // Filter out design preview URL from referenceImages (they shouldn't be shown on Step 2)
          const cleanedFormData = {
            ...draft.formData,
            referenceImages: (draft.formData.referenceImages || []).filter(
              (img: string) => img !== draft.designPreviewUrl,
            ),
          };
          setFormData(cleanedFormData);
        }
        if (draft.designPreviewUrl) {
          setDesignPreviewUrl(draft.designPreviewUrl);
        }
        if (draft.designId) {
          setDesignId(draft.designId);
        }
        if (draft.shareToGallery !== undefined) {
          setShareToGallery(draft.shareToGallery);
        }
      }
    } catch (err) {
      console.error("Failed to restore draft:", err);
    }
    setShowResumeDraftDialog(false);
    setDraftChecked(true);
  }, []);

  // Start fresh handler (clear draft)
  const handleStartFresh = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowResumeDraftDialog(false);
    setDraftChecked(true);
  }, []);

  // Clear draft when form is successfully submitted
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

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

          // Set the design preview image for Step 3 AI Preview section
          // This is the image user selected from gallery - show it prominently
          if (prefill.imageUrl) {
            setDesignPreviewUrl(prefill.imageUrl);
          }
          if (prefill.designId) {
            setDesignId(prefill.designId);
          }

          // Prefill form data with all specs from the design
          // NOTE: Do NOT add to referenceImages - that would show on Step 2 which is confusing
          // The design image will show on Step 3 in the AI Preview section
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
            // Don't populate referenceImages from prefill - keep Step 2 clean
            // referenceImages: prefill.referenceImages || prev.referenceImages,
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
          regenerationFeedback: regenerationFeedback || undefined, // Include refinement notes if any
        },
        // Don't share to gallery during preview generation - only publish when RFQ is submitted
        shareToGallery: false,
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

      // NOTE: Don't add to referenceImages - the preview is shown via designPreviewUrl on Step 3
      // Adding to referenceImages would show it on Step 2 which confuses users
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

  // Autosave draft when form changes (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Don't save if draft dialog is still showing or coming from design gallery
    if (!draftChecked || fromDesign) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save - wait 1 second after last change
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if there's meaningful content
      const hasContent =
        formData.jewelleryType ||
        formData.metalType ||
        formData.description ||
        designPreviewUrl;

      if (hasContent) {
        const draft = {
          formData,
          designPreviewUrl,
          designId,
          shareToGallery,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    formData,
    designPreviewUrl,
    designId,
    shareToGallery,
    draftChecked,
    fromDesign,
  ]);

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

  // Fetch similar designs when user enters Step 3
  useEffect(() => {
    if (step !== 3 || !formData.jewelleryType || similarDesignsChecked) return;

    const fetchSimilarDesigns = async () => {
      setLoadingSimilarDesigns(true);
      setSimilarDesignsChecked(true);

      try {
        // Build query params based on current form data
        const params = new URLSearchParams();
        params.append("jewelryType", formData.jewelleryType);
        if (formData.buildMethod)
          params.append("buildMethod", formData.buildMethod);
        if (formData.metalType) params.append("metalType", formData.metalType);
        if (formData.hasGemstones !== undefined)
          params.append("hasGemstones", String(formData.hasGemstones));
        if (formData.hasGemstones && formData.gemstonesV2.length > 0) {
          params.append("primaryStone", formData.gemstonesV2[0].stoneType);
        }
        if (formData.surfaceFinish)
          params.append("surfaceFinish", formData.surfaceFinish);
        params.append("limit", "6");

        const res = await fetch(
          `${API_URL}/designs/similar?${params.toString()}`,
        );
        if (res.ok) {
          const data = await res.json();
          // Only show if we have designs with 80%+ similarity
          if (data.designs && data.designs.length > 0) {
            setSimilarDesigns(data.designs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch similar designs:", err);
      } finally {
        setLoadingSimilarDesigns(false);
      }
    };

    fetchSimilarDesigns();
  }, [
    step,
    formData.jewelleryType,
    formData.buildMethod,
    formData.metalType,
    formData.hasGemstones,
    formData.gemstonesV2,
    formData.surfaceFinish,
    similarDesignsChecked,
  ]);

  // Reset similar designs check when going back to earlier steps
  useEffect(() => {
    if (step < 3) {
      setSimilarDesignsChecked(false);
      setSimilarDesigns([]);
    }
  }, [step]);

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

  // Function to fetch customer's delivery addresses
  const fetchDeliveryAddresses = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingAddresses(true);
    try {
      const response = await fetch(`${API_URL}/users/me/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const addresses = await response.json();
        setDeliveryAddresses(addresses);

        // Auto-select default address if none selected
        const defaultAddr = addresses.find((a: DeliveryAddress) => a.isDefault);
        if (defaultAddr && !selectedAddressId) {
          setSelectedAddressId(defaultAddr.id);
        } else if (addresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(addresses[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching delivery addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [selectedAddressId]);

  // Get currently selected delivery address
  const selectedAddress = useMemo(() => {
    return deliveryAddresses.find((a) => a.id === selectedAddressId) || null;
  }, [deliveryAddresses, selectedAddressId]);

  // Track when international sellers were auto-included (0 local sellers)
  const [autoInternational, setAutoInternational] = useState(false);

  // Function to fetch matching sellers for Step 4
  const fetchMatchingSellers = useCallback(async () => {
    setLoadingSellers(true);
    setAutoInternational(false);
    try {
      const weight = getWeightFromTemplate();

      // Get metal type based on build method
      let metalType: string | undefined = formData.metalType;
      let alloyType: string | undefined;
      let coreBaseMetal: string | undefined;
      let platingType: string | undefined;

      if (
        formData.buildMethod === "METHOD_B" &&
        formData.alloyConfig?.baseMetal
      ) {
        metalType = formData.alloyConfig.baseMetal;
        // Derive alloy type from karat/purity
        // Gold: GOLD + 18K → GOLD_18K, GOLD + 14K → GOLD_14K, GOLD + 10K → GOLD_10K
        // Silver: STERLING_925 → SILVER_925, ARGENTIUM_935 → SILVER_999 (uses fine silver rate)
        if (
          formData.alloyConfig.baseMetal === "GOLD" &&
          formData.alloyConfig.karat
        ) {
          alloyType = `GOLD_${formData.alloyConfig.karat}`;
        } else if (formData.alloyConfig.baseMetal === "SILVER") {
          // Map silver purity to MarketRate code
          const silverPurityMap: Record<string, string> = {
            STERLING_925: "SILVER_925",
            ARGENTIUM_935: "SILVER_999", // Uses fine silver rate as base
          };
          alloyType =
            silverPurityMap[
              formData.alloyConfig.silverPurity || "STERLING_925"
            ] || "SILVER_925";
        }
      } else if (
        formData.buildMethod === "METHOD_C" &&
        formData.methodCConfig?.baseMetal
      ) {
        coreBaseMetal = formData.methodCConfig.baseMetal;
        platingType = formData.methodCConfig.platingType;
        metalType = undefined; // Method C doesn't use precious metalType
      } else if (
        formData.buildMethod === "METHOD_D" &&
        formData.methodDConfig?.purity
      ) {
        // formData.metalType is already set correctly (e.g., "GOLD_22K") by the
        // purity selector's onValueChange handler, so we use it as-is.
        // Only override if metalType wasn't set (fallback: derive from purity code).
        if (!metalType) {
          const p = formData.methodDConfig.purity;
          metalType = p === "SILVER_925" ? "SILVER_925" : `GOLD_${p}`;
        }
      }

      const params = new URLSearchParams({
        jewelleryType: formData.jewelleryType,
        buildMethod: formData.buildMethod || "METHOD_A",
        estimatedWeight: String(weight || 5),
        sortBy: sellerSortBy,
        pageSize: "20",
      });

      if (metalType) params.append("metalType", metalType);
      if (alloyType) params.append("alloyType", alloyType);
      if (coreBaseMetal) params.append("baseMetal", coreBaseMetal);
      if (platingType) params.append("platingType", platingType);
      if (formData.surfaceFinish)
        params.append("surfaceFinish", formData.surfaceFinish);
      if (sellerMinRating !== undefined)
        params.append("minRating", String(sellerMinRating));
      if (sellerMaxPrice !== undefined)
        params.append("maxPrice", String(sellerMaxPrice));
      // Pass pre-computed gemstone cost from live calculator so seller matching includes it
      if (priceEstimate?.gemstoneCost && priceEstimate.gemstoneCost > 0) {
        params.append("gemstoneCost", String(priceEstimate.gemstoneCost));
      }

      // Priority 1: Use advanced filter values if set
      // Priority 2: Use selected delivery address location
      // Priority 3: Fall back to geo-detected country (most accurate)
      // Priority 4: Fall back to user's stored country preference
      const effectiveCountry =
        filterCountry || selectedAddress?.country || detectedCountry || country;
      const effectiveState = filterState || selectedAddress?.state;
      const effectiveCity = filterCity || selectedAddress?.city;

      if (effectiveCountry) params.append("customerCountry", effectiveCountry);
      if (effectiveState) params.append("customerState", effectiveState);
      if (effectiveCity) params.append("customerCity", effectiveCity);
      // Include international sellers only if toggled on
      if (includeInternational) params.append("includeInternational", "true");

      const url = `${API_URL}/shops/matching?${params.toString()}`;
      console.log("[fetchMatchingSellers] Calling:", url);
      console.log(
        "[fetchMatchingSellers] effectiveCountry:",
        effectiveCountry,
        "| includeInternational:",
        includeInternational,
      );

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("[fetchMatchingSellers] Response:", {
          sellersCount: data.sellers?.length,
          groups: data.groups,
          diagnostics: data.diagnostics,
        });

        // AUTO-FALLBACK: If 0 sellers found locally and international wasn't requested,
        // automatically retry with international sellers included
        if (
          (!data.sellers || data.sellers.length === 0) &&
          !includeInternational
        ) {
          console.log(
            "[fetchMatchingSellers] 0 local sellers — auto-retrying with international...",
          );
          const intlParams = new URLSearchParams(params);
          intlParams.set("includeInternational", "true");
          const intlUrl = `${API_URL}/shops/matching?${intlParams.toString()}`;
          const intlResponse = await fetch(intlUrl);
          if (intlResponse.ok) {
            const intlData = await intlResponse.json();
            console.log(
              "[fetchMatchingSellers] International fallback:",
              intlData.sellers?.length,
              "sellers",
            );
            if (intlData.sellers && intlData.sellers.length > 0) {
              setAutoInternational(true);
              setMatchingSellers(intlData.sellers);
              setSellerStats(intlData.stats || null);
              setSellerDiagnostics(intlData.diagnostics || null);
              setSellerGroups(intlData.groups || null);
              return; // skip the normal set below
            }
          }
        }

        setMatchingSellers(data.sellers || []);
        setSellerStats(data.stats || null);
        setSellerDiagnostics(data.diagnostics || null);
        setSellerGroups(data.groups || null);
      } else {
        console.error(
          "Failed to fetch matching sellers, status:",
          response.status,
        );
        setMatchingSellers([]);
        setSellerDiagnostics(null);
        setSellerGroups(null);
      }
    } catch (err) {
      console.error("Error fetching matching sellers:", err);
      setMatchingSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  }, [
    getWeightFromTemplate,
    formData.jewelleryType,
    formData.buildMethod,
    formData.metalType,
    formData.surfaceFinish,
    formData.alloyConfig,
    formData.methodCConfig,
    formData.methodDConfig,
    sellerSortBy,
    sellerMinRating,
    sellerMaxPrice,
    country,
    detectedCountry,
    selectedAddress,
    filterCountry,
    filterState,
    filterCity,
    includeInternational,
    priceEstimate,
  ]);

  // Fetch delivery addresses when reaching Step 4
  useEffect(() => {
    if (step === 4) {
      fetchDeliveryAddresses();
    }
  }, [step, fetchDeliveryAddresses]);

  // Refetch sellers when filters change (only on Step 4)
  useEffect(() => {
    if (step === 4 && submittedRfqId) {
      fetchMatchingSellers();
    }
  }, [
    step,
    submittedRfqId,
    sellerSortBy,
    sellerMinRating,
    sellerMaxPrice,
    selectedAddressId,
    filterCountry,
    filterState,
    filterCity,
    fetchMatchingSellers,
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
            !!formData.alloyConfig?.baseMetal &&
            (formData.alloyConfig.baseMetal === "GOLD"
              ? !!formData.alloyConfig.karat
              : !!formData.alloyConfig.silverPurity)
          );
        case "METHOD_C":
          return !!formData.methodCConfig?.baseMetal;
        case "METHOD_D":
          return !!formData.methodDConfig?.purity;
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

    // Add surface finish to estimate if selected
    if (formData.surfaceFinish) {
      request.surfaceFinish = {
        finishType: formData.surfaceFinish,
      };
    }

    // Inject shop-specific component prices when a seller is selected
    if (shopPrices) {
      request.shopPrices = shopPrices;
    }

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
    shopPrices,
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

  // AI RFQ Builder: parse natural language into form fields
  const handleAiBuild = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await intelligenceApi.buildRfq({
        description: aiInput,
        marketRegion: country || "NP",
      });
      const data = res.data;

      // Check if guest rate limit was hit
      if (data.guestLimitReached) {
        setAiResult({
          confidence: 0,
          reasoning: data.reasoning,
          conversationalMessage: data.conversationalMessage || data.reasoning,
          suggestions: data.suggestions || [],
          missingInfo: [],
          isGuest: true,
          guestLimitReached: true,
        });
        return;
      }

      // Only fill form if confidence > 5 (not gibberish)
      if (data.confidence > 5) {
        // Helper: parse material string like "GOLD_22K" into components
        const material = data.composition?.primary?.material || "GOLD_22K";

        // ─── Step 1: Jewellery Type ───
        if (data.jewelleryType) {
          updateFormData("jewelleryType", data.jewelleryType);
        }

        // ─── Step 1: Build Method + Metal Configuration ───
        // Determine the correct build method based on AI response AND material
        let resolvedMethod = data.buildMethod || "METHOD_B";

        // Validate METHOD_D is only for supported types
        const METHOD_D_TYPES = [
          "CHAIN",
          "NECKLACE",
          "BRACELET",
          "BANGLE",
          "ANKLET",
        ];
        if (
          resolvedMethod === "METHOD_D" &&
          data.jewelleryType &&
          !METHOD_D_TYPES.includes(data.jewelleryType)
        ) {
          resolvedMethod = "METHOD_B"; // Fallback to alloy if not a chain-type
        }

        // Smart method detection from material if AI didn't specify method configs
        if (!data.methodBConfig && !data.methodCConfig && !data.methodDConfig) {
          const pureMaterials = [
            "GOLD_24K",
            "SILVER_999",
            "PLATINUM_PT950",
            "PLATINUM_PT900",
            "PALLADIUM_PD950",
            "PALLADIUM_PD500",
          ];
          if (pureMaterials.includes(material)) {
            resolvedMethod = "METHOD_A";
          } else if (
            material.startsWith("GOLD_") ||
            material === "SILVER_925"
          ) {
            resolvedMethod = "METHOD_B";
          }
        }

        updateFormData("buildMethod", resolvedMethod as BuildMethod);

        // ─── METHOD_A (Pure Metal) ───
        if (resolvedMethod === "METHOD_A") {
          // Map material to valid PURE_METAL_IDS values
          const pureMetalMap: Record<string, string> = {
            GOLD_24K: "GOLD_24K",
            SILVER_999: "SILVER_999",
            PLATINUM_PT950: "PLATINUM_PT950",
            PLATINUM_PT900: "PLATINUM_PT900",
            PLATINUM_950: "PLATINUM_PT950",
            PALLADIUM_PD950: "PALLADIUM_PD950",
            PALLADIUM_PD500: "PALLADIUM_PD500",
          };
          const metalType = pureMetalMap[material] || "GOLD_24K";
          updateFormData("metalType", metalType);
        }

        // ─── METHOD_B (Precious Metal Alloy) ───
        if (resolvedMethod === "METHOD_B") {
          if (data.methodBConfig) {
            // AI provided explicit config
            updateFormData("alloyConfig", {
              baseMetal: data.methodBConfig.baseMetal || "GOLD",
              karat: data.methodBConfig.karat || undefined,
              alloyFamily: data.methodBConfig.alloyFamily || undefined,
              recipePresetId: undefined,
            });
          } else {
            // Derive from material string (e.g. "GOLD_22K" → baseMetal=GOLD, karat=22K)
            let baseMetal = "GOLD";
            let karat: string | undefined = "22K";
            let alloyFamily: string | undefined = "YELLOW_GOLD";

            if (material.startsWith("GOLD_")) {
              baseMetal = "GOLD";
              karat = material.replace("GOLD_", ""); // "22K", "18K", "14K", "10K"
              // Validate karat
              if (!["22K", "18K", "14K", "10K"].includes(karat as string)) {
                karat = "22K"; // Default
              }
            } else if (
              material === "SILVER_925" ||
              material.startsWith("SILVER")
            ) {
              baseMetal = "SILVER";
              karat = undefined;
              alloyFamily = undefined;
            }

            // Detect alloy family from AI description/instructions
            const aiText =
              `${data.description || ""} ${data.specialInstructions || ""} ${aiInput}`.toLowerCase();
            if (aiText.includes("rose") || aiText.includes("pink")) {
              alloyFamily = "ROSE_GOLD";
            } else if (
              aiText.includes("white gold") ||
              aiText.includes("white")
            ) {
              alloyFamily = "WHITE_GOLD";
            } else if (aiText.includes("green")) {
              alloyFamily = "GREEN_GOLD";
            }

            updateFormData("alloyConfig", {
              baseMetal,
              karat: baseMetal === "GOLD" ? karat : undefined,
              alloyFamily: baseMetal === "GOLD" ? alloyFamily : undefined,
              recipePresetId: undefined,
            });
          }
        }

        // ─── METHOD_C (Base Metal + Plating) ───
        if (resolvedMethod === "METHOD_C") {
          if (data.methodCConfig) {
            updateFormData("methodCConfig", {
              baseMetal: data.methodCConfig.baseMetal || "BRASS",
              platingType: data.methodCConfig.platingType || "GOLD_PLATED",
              platingTier: data.methodCConfig.platingTier || "STANDARD",
            });
          } else {
            updateFormData("methodCConfig", {
              baseMetal: "BRASS",
              platingType: "GOLD_PLATED",
              platingTier: "STANDARD",
            });
          }
        }

        // ─── METHOD_D (Italian Machine Made) ───
        if (resolvedMethod === "METHOD_D") {
          if (data.methodDConfig) {
            updateFormData("methodDConfig", {
              purity: data.methodDConfig.purity || "22K",
              chainStyle: data.methodDConfig.chainStyle || "",
            });
          } else {
            // Derive purity from material
            let purity = "22K";
            if (material.startsWith("GOLD_")) {
              purity = material.replace("GOLD_", "");
              if (!["22K", "18K", "14K"].includes(purity)) purity = "22K";
            } else if (material.includes("SILVER")) {
              purity = "SILVER_925";
            }
            updateFormData("methodDConfig", { purity, chainStyle: "" });
          }
        }

        // ─── Step 1: Weight ───
        // Always fill weight — use WEIGHT_GUIDANCE average if AI didn't provide one
        const WEIGHT_DEFAULTS: Record<string, number> = {
          RING: 3,
          NECKLACE: 12,
          BRACELET: 10,
          EARRING: 3,
          PENDANT: 4,
          BANGLE: 15,
          CHAIN: 12,
          ANKLET: 5,
          BROOCH: 10,
          TIE_PIN: 5,
          CUFFLINKS: 8,
          NOSE_PIN: 0.5,
          MANGALSUTRA: 15,
          MAANG_TIKKA: 5,
          OTHER: 8,
        };

        if (data.weightCategory) {
          updateFormData("weightCategory", data.weightCategory);
        } else {
          // Derive weight category from weight
          const w =
            data.estimatedWeight ||
            WEIGHT_DEFAULTS[data.jewelleryType || "OTHER"] ||
            8;
          updateFormData(
            "weightCategory",
            w < 5 ? "LIGHT" : w <= 15 ? "MEDIUM" : "HEAVY",
          );
        }

        if (data.estimatedWeight) {
          updateFormData("estimatedWeight", String(data.estimatedWeight));
        } else {
          // Fallback: use average weight for the jewellery type
          const defaultWeight =
            WEIGHT_DEFAULTS[data.jewelleryType || "OTHER"] || 8;
          updateFormData("estimatedWeight", String(defaultWeight));
        }

        // ─── Step 1: Surface Finish ───
        // Always fill surface finish (default to HIGH_POLISH)
        const validFinishes = [
          "HIGH_POLISH",
          "MATTE",
          "BRUSHED",
          "SATIN",
          "HAMMERED",
          "SANDBLASTED",
          "FLORENTINE",
          "BARK_TEXTURE",
          "DIAMOND_CUT",
          "ENGRAVED",
        ];
        const finish =
          data.surfaceFinish && validFinishes.includes(data.surfaceFinish)
            ? data.surfaceFinish
            : "HIGH_POLISH";
        updateFormData("surfaceFinish", finish);

        // ─── Step 2: Description ───
        if (data.description) {
          updateFormData("description", data.description);
        } else if (data.specialInstructions) {
          // Fallback: use specialInstructions as description if no separate description
          updateFormData("description", data.specialInstructions);
        }

        // ─── Step 2: Gemstones ───
        if (data.gemstones && data.gemstones.length > 0) {
          updateFormData("hasGemstones", true);
          // Create proper GemstoneEntryV2 objects
          const gemstonesV2: GemstoneEntryV2[] = data.gemstones.map(
            (
              gem: {
                stoneType?: string;
                shape?: string;
                count?: number;
                settingStyle?: string;
                color?: string;
                clarity?: string;
                sizeValue?: string;
              },
              i: number,
            ) => ({
              id: `gem-ai-${Date.now()}-${i}`,
              stoneType: gem.stoneType || "",
              shape: gem.shape || "ROUND",
              sizeUnit: "MM" as const,
              sizeValue: gem.sizeValue || "",
              color: gem.color || "",
              clarity: gem.clarity || "",
              cut: "",
              settingStyle: gem.settingStyle || "PRONG",
              count: gem.count || 1,
            }),
          );
          updateFormData("gemstonesV2", gemstonesV2);
        }

        // ─── Step 2: Special Instructions ───
        if (data.specialInstructions && data.description) {
          // Only set specialInstructions separately if description is also present
          updateFormData("specialInstructions", data.specialInstructions);
        }

        // ─── Step 3: Budget ───
        if (data.budgetMinNpr) {
          updateFormData("budgetMin", String(data.budgetMinNpr));
        }
        if (data.budgetMaxNpr) {
          updateFormData("budgetMax", String(data.budgetMaxNpr));
        }

        // ─── Step 3: Deadline ───
        if (data.deadline) {
          updateFormData("deadline", data.deadline);
        }
      }

      setAiResult({
        confidence: data.confidence,
        reasoning: data.reasoning,
        conversationalMessage: data.conversationalMessage || data.reasoning,
        suggestions: data.suggestions || [],
        missingInfo: data.missingInfo || [],
        isGuest: data.isGuest || false,
        guestLimitReached: false,
      });
    } catch (err: any) {
      setAiError(
        err?.response?.data?.message ||
          "AI assistant is temporarily unavailable. Please fill the form manually.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Handler to select a similar design as reference for AI preview
  const handleSelectSimilarDesign = useCallback((design: SimilarDesign) => {
    // Set the design image as the preview
    setDesignPreviewUrl(design.imageUrl);
    setDesignId(design.id);
    setFromDesign(true);

    // Populate form fields from the design (go back to step 1 and 2 configs)
    if (design.jewelryType) {
      setFormData((prev) => ({ ...prev, jewelleryType: design.jewelryType }));
    }
    if (design.buildMethod) {
      setFormData((prev) => ({
        ...prev,
        buildMethod: design.buildMethod as BuildMethod,
      }));
    }
    if (design.metalType) {
      setFormData((prev) => ({ ...prev, metalType: design.metalType || "" }));
    }
  }, []);

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
    console.log("[RFQ Submit] Starting submission...");

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Check both token AND session status for authentication
    console.log(
      "[RFQ Submit] Auth check - token exists:",
      !!token,
      "session status:",
      status,
    );

    if (!token && status !== "authenticated") {
      console.log("[RFQ Submit] Not authenticated, redirecting to login");
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

    console.log("[RFQ Submit] Making API call to:", `${API_URL}/rfq`);

    try {
      const response = await fetch(`${API_URL}/rfq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jewelleryType: formData.jewelleryType,
          buildMethod: formData.buildMethod,
          composition: {
            // Common fields
            estimatedWeight: weight,
            surfaceFinish: formData.surfaceFinish,
            hasGemstones: formData.hasGemstones,
            gemstoneDetails: formData.gemstoneDetails,
            // Method A: Solid Precious Metal
            ...(formData.buildMethod === "METHOD_A" && {
              preciousMetal: formData.metalType,
            }),
            // Method B: Standard Alloy / Alloy Builder
            ...(formData.buildMethod === "METHOD_B" && {
              alloyConfig: formData.alloyConfig,
            }),
            // Method C: Core Metal + Finish (flatten to top-level fields)
            ...(formData.buildMethod === "METHOD_C" && {
              coreMetal: formData.methodCConfig?.baseMetal || "BRASS",
              addGoldPlating: !!formData.methodCConfig?.platingType,
              platingTier: formData.methodCConfig?.platingTier || "STANDARD",
              isVermeil: formData.methodCConfig?.platingType === "VERMEIL",
            }),
            // Method D: Multi-Metal / Italian Machine Made
            ...(formData.buildMethod === "METHOD_D" && {
              multiMetalPattern: "TWO_TONE_SPLIT" as const,
              multiMetalMode: "MODE_D1" as const,
              modeConfig: {
                goldPurity: formData.methodDConfig?.purity || "18K",
                baseMetal: "STAINLESS_STEEL_316L",
                goldPercentByWeight: 30,
                targetTotalWeightG: weight,
              },
            }),
          },
          // Include AI preview image in referenceImages if available
          referenceImages: designPreviewUrl
            ? [
                designPreviewUrl,
                ...formData.referenceImages.filter(
                  (img) => img !== designPreviewUrl,
                ),
              ]
            : formData.referenceImages,
          // Link to the design from gallery if coming from "Build This"
          designId: designId || undefined,
          targetTotalWeightG: weight,
          budgetMinNpr: parseFloat(formData.budgetMin) || 0,
          budgetMaxNpr: parseFloat(formData.budgetMax) || 0,
          preferredDeliveryDays: formData.deadline
            ? Math.ceil(
                (new Date(formData.deadline).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : undefined,
          specialInstructions: formData.specialInstructions
            ? `${formData.description ? formData.description + "\n\n" : ""}${formData.specialInstructions}`
            : formData.description || undefined,
        }),
      });

      console.log("[RFQ Submit] Response status:", response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error("[RFQ Submit] API error:", data);
        throw new Error(data.message || "Failed to create request");
      }

      const data = await response.json();
      console.log("[RFQ Submit] Success! RFQ ID:", data.id);

      // Clear draft after successful submission
      clearDraft();

      // If user chose to share to gallery and we have a design, publish it now
      if (shareToGallery && designId) {
        console.log("[RFQ Submit] Publishing design to gallery:", designId);
        try {
          await fetch(`${API_URL}/designs/${designId}/visibility`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isPublic: true }),
          });
          console.log("[RFQ Submit] Design published to gallery successfully");
        } catch (publishErr) {
          // Don't fail the RFQ submission if gallery publish fails
          console.error(
            "[RFQ Submit] Failed to publish design to gallery:",
            publishErr,
          );
        }
      }

      // Store RFQ ID and move to Step 4 (seller matching)
      console.log("[RFQ Submit] Moving to Step 4 with RFQ ID:", data.id);
      setSubmittedRfqId(data.id);
      setStep(4);

      // Fetch matching sellers
      console.log("[RFQ Submit] Fetching matching sellers...");
      fetchMatchingSellers();
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
          !!formData.alloyConfig?.baseMetal &&
          (formData.alloyConfig.baseMetal === "GOLD"
            ? !!formData.alloyConfig.karat
            : !!formData.alloyConfig.silverPurity)
        );
      case "METHOD_C":
        return (
          !!formData.methodCConfig?.baseMetal &&
          !!formData.methodCConfig?.platingType
        );
      case "METHOD_D":
        return !!formData.methodDConfig?.purity;
      default:
        return !!formData.metalType;
    }
  };

  // Composition validation for Method B - returns warnings/errors for incomplete config
  const getCompositionValidation = (): {
    isComplete: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (formData.buildMethod === "METHOD_B") {
      const alloyConfig = formData.alloyConfig;

      if (!alloyConfig?.baseMetal) {
        errors.push("Please select a base metal (Gold or Silver)");
      } else if (alloyConfig.baseMetal === "GOLD") {
        if (!alloyConfig.karat) {
          errors.push("Please select a gold karat (22K, 18K, 14K, or 10K)");
        }
        if (alloyConfig.karat && !alloyConfig.alloyFamily) {
          errors.push(
            "Please select an alloy family (Yellow, White, Rose, or Green Gold)",
          );
        }
        if (
          alloyConfig.karat &&
          alloyConfig.alloyFamily &&
          !alloyConfig.recipePresetId
        ) {
          warnings.push(
            "No alloy recipe selected. Please select a specific recipe for best results.",
          );
        }
      } else if (alloyConfig.baseMetal === "SILVER") {
        if (!alloyConfig.silverPurity) {
          errors.push(
            "Please select a silver purity (Sterling 925 or Argentium 935)",
          );
        }
      }
    }

    return {
      isComplete: errors.length === 0,
      errors,
      warnings,
    };
  };

  // Get composition validation state
  const compositionValidation = getCompositionValidation();

  // For Method B, require complete alloy config (including family and recipe)
  const canProceedToStep2 =
    formData.jewelleryType &&
    formData.buildMethod &&
    hasValidMetalSelection() &&
    compositionValidation.isComplete;
  const canProceedToStep3 =
    formData.description && (hasRealTemplate || formData.estimatedWeight);

  // Form data validation for submit (budget, etc.)
  const formDataComplete =
    formData.budgetMin && formData.budgetMax && isVermeilValid();

  // Final submit check: form complete + user verified
  const canSubmit = formDataComplete && canSubmitOrder;
  const submitBlockReason = getSubmitBlockReason();

  // Helper: build the formData prop for LivePricingPanel (reused across steps)
  const buildLivePricingFormData = (): EstimateRequest => ({
    buildMethod: formData.buildMethod as BuildMethod,
    jewelleryType: formData.jewelleryType,
    country,
    currency,
    methodA:
      formData.buildMethod === "METHOD_A"
        ? { metal: formData.metalType, weightGrams: getWeightFromTemplate() }
        : undefined,
    methodB:
      formData.buildMethod === "METHOD_B"
        ? {
            baseMetal: formData.alloyConfig.baseMetal as "GOLD" | "SILVER",
            karat: formData.alloyConfig.karat,
            alloyFamily: formData.alloyConfig.alloyFamily,
            recipePresetId: formData.alloyConfig.recipePresetId,
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
      ? { finishType: formData.surfaceFinish }
      : undefined,
    marketRates: marketRates
      ? { metals: marketRates.metals, fx: marketRates.fx }
      : undefined,
  });

  // Show loading skeleton until client-side hydration is complete
  // This prevents hydration mismatch errors that break React interactivity
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-4 sm:py-8">
          <div className="container mx-auto px-3 sm:px-6 max-w-[1440px]">
            <div className="animate-pulse space-y-6">
              {/* Progress skeleton */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="ml-2 h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded hidden sm:block" />
                  </div>
                ))}
              </div>
              {/* Card skeleton */}
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-4">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
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
      {/* Resume Draft Dialog */}
      <AlertDialog
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Resume Your Design?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                We found a draft of your custom jewelry request from{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {savedDraftTimestamp
                    ? new Date(savedDraftTimestamp).toLocaleString()
                    : "earlier"}
                </span>
                .
              </p>
              <p>Would you like to continue where you left off?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleStartFresh}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResumeDraft}
              className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Resume Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-4 sm:py-8">
          <div className="container mx-auto px-3 sm:px-6 max-w-[1440px]">
            {/* Progress Steps */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center">
                {[1, 2, 3, 4].map((s) => (
                  <Fragment key={s}>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                          step >= s
                            ? s === 4 && step === 4
                              ? "bg-green-500 text-white"
                              : "bg-gold-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {step > s ? <Check className="h-5 w-5" /> : s}
                      </div>
                      <span
                        className={`hidden sm:inline text-sm font-medium whitespace-nowrap ${step >= s ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
                      >
                        {s === 1
                          ? "Basic Info"
                          : s === 2
                            ? "Design Details"
                            : s === 3
                              ? "Budget & Timeline"
                              : "Find Sellers"}
                      </span>
                    </div>
                    {s < 4 && (
                      <div
                        className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full ${step > s ? "bg-gold-500" : "bg-gray-200 dark:bg-gray-700"}`}
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* 3-Column Layout: Left Metal Rates | Center Form | Right Calculator */}
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_340px] gap-4 xl:gap-6 xl:items-start">
              {/* Left: Live Metal Prices */}
              <div className="hidden xl:block xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto scrollbar-thin">
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-[#1E1E1E] dark:to-[#181818] border border-slate-200 dark:border-amber-900/30 rounded-lg p-4 space-y-3 dark:shadow-[0_0_15px_rgba(184,134,11,0.08)]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 dark:text-amber-400 flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Today&apos;s Metal Prices
                    </h4>
                    {marketRates?.cache && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          marketRates.cache === "fresh"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {marketRates.cache === "fresh" ? "● Live" : "● Cached"}
                      </span>
                    )}
                  </div>

                  {marketRatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-amber-500" />
                      <span className="ml-2 text-xs text-slate-500 dark:text-gray-400">
                        Loading rates...
                      </span>
                    </div>
                  ) : marketRates ? (
                    <div className="space-y-3">
                      {/* Selected Metal Highlight */}
                      {(() => {
                        const selectedKey =
                          formData.buildMethod === "METHOD_A"
                            ? formData.metalType === "GOLD"
                              ? "GOLD_24K"
                              : formData.metalType === "SILVER"
                                ? "SILVER_999"
                                : formData.metalType === "PLATINUM"
                                  ? "PLATINUM_PT950"
                                  : null
                            : formData.buildMethod === "METHOD_B"
                              ? formData.alloyConfig?.baseMetal === "GOLD"
                                ? `GOLD_${formData.alloyConfig.karat || "22K"}`
                                : formData.alloyConfig?.baseMetal === "SILVER"
                                  ? "SILVER_925"
                                  : null
                              : formData.buildMethod === "METHOD_D"
                                ? formData.alloyConfig?.karat
                                  ? `GOLD_${formData.alloyConfig.karat}`
                                  : "GOLD_22K"
                                : null;

                        const selectedPrice = selectedKey
                          ? marketRates.metals[
                              selectedKey as keyof typeof marketRates.metals
                            ]
                          : null;

                        const selectedLabel = selectedKey
                          ? selectedKey
                              .replace("_", " ")
                              .replace("GOLD ", "Gold ")
                              .replace("SILVER ", "Silver ")
                              .replace("PLATINUM ", "Platinum ")
                          : null;

                        if (selectedPrice && selectedLabel) {
                          return (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                  Your Selection
                                </span>
                                <span className="text-[10px] text-amber-500 dark:text-amber-500/70">
                                  per gram
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-300">
                                  {selectedLabel}
                                </span>
                                <span className="text-lg font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap">
                                  {currencyInfo.symbol}
                                  {Math.round(selectedPrice).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Gold Rates */}
                      <div>
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">
                          Gold{" "}
                          <span className="font-normal text-amber-500 dark:text-amber-500/70">
                            / gram
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {[
                            { label: "24K Pure", key: "GOLD_24K" },
                            { label: "22K", key: "GOLD_22K" },
                            { label: "18K", key: "GOLD_18K" },
                            { label: "14K", key: "GOLD_14K" },
                            { label: "10K", key: "GOLD_10K" },
                          ].map(({ label, key }) => {
                            const isSelected =
                              (formData.buildMethod === "METHOD_A" &&
                                formData.metalType === "GOLD" &&
                                key === "GOLD_24K") ||
                              (formData.buildMethod === "METHOD_B" &&
                                formData.alloyConfig?.baseMetal === "GOLD" &&
                                key === `GOLD_${formData.alloyConfig.karat}`) ||
                              (formData.buildMethod === "METHOD_D" &&
                                key ===
                                  `GOLD_${formData.alloyConfig?.karat || "22K"}`);
                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                                  isSelected
                                    ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50"
                                    : "bg-white/70 dark:bg-white/5"
                                }`}
                              >
                                <span
                                  className={
                                    isSelected
                                      ? "font-semibold text-amber-900 dark:text-amber-300"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {label}
                                </span>
                                <span
                                  className={`font-mono font-semibold whitespace-nowrap ${isSelected ? "text-amber-900 dark:text-amber-200" : "text-amber-700 dark:text-amber-400"}`}
                                >
                                  {currencyInfo.symbol}
                                  {Math.round(
                                    marketRates.metals[
                                      key as keyof typeof marketRates.metals
                                    ] || 0,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Silver Rates */}
                      <div>
                        <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">
                          Silver{" "}
                          <span className="font-normal text-gray-400 dark:text-gray-500">
                            / gram
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {[
                            { label: "999 Fine", key: "SILVER_999" },
                            { label: "925 Sterling", key: "SILVER_925" },
                          ].map(({ label, key }) => {
                            const isSelected =
                              (formData.buildMethod === "METHOD_A" &&
                                formData.metalType === "SILVER" &&
                                key === "SILVER_999") ||
                              (formData.buildMethod === "METHOD_B" &&
                                formData.alloyConfig?.baseMetal === "SILVER" &&
                                key === "SILVER_925");
                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                                  isSelected
                                    ? "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    : "bg-white/70 dark:bg-white/5"
                                }`}
                              >
                                <span
                                  className={
                                    isSelected
                                      ? "font-semibold text-gray-900 dark:text-white"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {label}
                                </span>
                                <span
                                  className={`font-mono font-semibold whitespace-nowrap ${isSelected ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
                                >
                                  {currencyInfo.symbol}
                                  {Math.round(
                                    marketRates.metals[
                                      key as keyof typeof marketRates.metals
                                    ] || 0,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Platinum Rates */}
                      <div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">
                          Platinum{" "}
                          <span className="font-normal text-slate-400 dark:text-slate-500">
                            / gram
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {[
                            { label: "PT950", key: "PLATINUM_PT950" },
                            { label: "PT900", key: "PLATINUM_PT900" },
                          ].map(({ label, key }) => {
                            const isSelected =
                              formData.buildMethod === "METHOD_A" &&
                              formData.metalType === "PLATINUM" &&
                              key === "PLATINUM_PT950";
                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                                  isSelected
                                    ? "bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600"
                                    : "bg-white/70 dark:bg-white/5"
                                }`}
                              >
                                <span
                                  className={
                                    isSelected
                                      ? "font-semibold text-slate-900 dark:text-white"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {label}
                                </span>
                                <span
                                  className={`font-mono font-semibold whitespace-nowrap ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                                >
                                  {currencyInfo.symbol}
                                  {Math.round(
                                    marketRates.metals[
                                      key as keyof typeof marketRates.metals
                                    ] || 0,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Palladium Rate */}
                      <div>
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">
                          Palladium{" "}
                          <span className="font-normal text-blue-400 dark:text-blue-500">
                            / gram
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded px-2 py-1 text-xs">
                            <span className="text-muted-foreground">PD950</span>
                            <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                              {currencyInfo.symbol}
                              {Math.round(
                                marketRates.metals.PALLADIUM_PD950 || 0,
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Last updated */}
                      {marketRates.updatedAt && (
                        <div className="border-t pt-2 mt-1">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Updated{" "}
                            {new Date(marketRates.updatedAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <TrendingUp className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Select your location to see live metal prices.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Center: Form Content */}
              <div className="min-w-0">
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
                      {/* AI RFQ Builder Assistant */}
                      <div className="rounded-lg border border-gold-200 dark:border-amber-800/40 bg-gradient-to-r from-gold-50 to-amber-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-4">
                        <button
                          type="button"
                          onClick={() => setShowAiAssistant(!showAiAssistant)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-gold-600" />
                            <span className="font-medium text-gold-800 dark:text-amber-400">
                              Describe what you want — AI fills the form
                            </span>
                          </div>
                          {showAiAssistant ? (
                            <ChevronUp className="h-4 w-4 text-gold-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gold-600" />
                          )}
                        </button>

                        {showAiAssistant && (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Textarea
                                placeholder='e.g. "I want a 22k gold necklace for my wedding, budget around 2 lakh" or "Simple silver ring with small diamond, under 15k"'
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                className="min-h-[100px] sm:min-h-[80px] bg-white dark:bg-gray-900 text-sm flex-1 resize-y"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAiBuild();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={handleAiBuild}
                                disabled={aiLoading || !aiInput.trim()}
                                className="bg-gold-600 hover:bg-gold-700 text-white shrink-0 self-stretch sm:self-end"
                              >
                                {aiLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Fill
                                  </>
                                )}
                              </Button>
                            </div>

                            {aiError && (
                              <div className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {aiError}
                              </div>
                            )}

                            {aiResult && (
                              <div className="rounded-md bg-white dark:bg-gray-900 p-3 text-sm space-y-2 border border-gold-100">
                                {aiResult.guestLimitReached ? (
                                  /* Guest rate limit reached */
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-amber-700 font-medium">
                                      <AlertCircle className="h-4 w-4" />
                                      Guest limit reached
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                                      {aiResult.conversationalMessage}
                                    </p>
                                    <a
                                      href="/auth/login?redirect=/rfq/create"
                                      className="inline-flex items-center gap-1 text-xs bg-gold-600 text-white px-3 py-1.5 rounded-md hover:bg-gold-700 transition-colors"
                                    >
                                      Sign in for unlimited AI access →
                                    </a>
                                  </div>
                                ) : aiResult.confidence <= 10 ? (
                                  /* Gibberish/non-jewellery input */
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-red-600 font-medium">
                                      <AlertCircle className="h-4 w-4" />
                                      Could not understand your request
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                                      {aiResult.conversationalMessage}
                                    </p>
                                    {aiResult.suggestions.length > 0 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <span className="font-medium">
                                          Try something like:
                                        </span>
                                        <ul className="list-disc list-inside space-y-0.5 text-gray-600 dark:text-gray-300">
                                          {aiResult.suggestions.map((s, i) => (
                                            <li key={i}>{s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Normal result — conversational AI message */
                                  <>
                                    <div className="flex items-start gap-2">
                                      <Sparkles className="h-4 w-4 text-gold-500 mt-0.5 shrink-0" />
                                      <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                        {aiResult.conversationalMessage}
                                      </p>
                                    </div>

                                    {/* Live pricing note — shown after calculator loads */}
                                    {priceEstimate &&
                                      priceEstimate.total > 0 && (
                                        <div className="text-xs bg-gold-50 border border-gold-200 rounded p-2 flex items-start gap-1.5">
                                          <span className="text-gold-700">
                                            Based on current market rates, the
                                            estimated price for this comes to
                                            around{" "}
                                            <strong>
                                              {currencyInfo?.symbol || "Rs."}
                                              {priceEstimate.total.toLocaleString()}
                                            </strong>
                                            {priceEstimate.breakdown
                                              ?.weightGrams ? (
                                              <>
                                                {" "}
                                                (
                                                {
                                                  priceEstimate.breakdown
                                                    .weightGrams
                                                }
                                                g at{" "}
                                                {currencyInfo?.symbol || "Rs."}
                                                {priceEstimate.breakdown.ratePerGram.toLocaleString()}
                                                /g +{" "}
                                                {
                                                  priceEstimate.breakdown
                                                    .makingChargePercent
                                                }
                                                % making charge)
                                              </>
                                            ) : null}
                                            . You can adjust the weight or karat
                                            to change the price.
                                          </span>
                                        </div>
                                      )}

                                    {/* Missing info — shown as friendly suggestion */}
                                    {aiResult.missingInfo &&
                                      aiResult.missingInfo.length > 0 && (
                                        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                                          <span className="font-medium text-amber-800">
                                            Tip:{" "}
                                          </span>
                                          <span className="text-amber-700">
                                            Adding{" "}
                                            {aiResult.missingInfo.join(", ")}{" "}
                                            would help sellers give you better
                                            quotes.
                                          </span>
                                        </div>
                                      )}

                                    {aiResult.suggestions.length > 0 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">
                                          Tips:{" "}
                                        </span>
                                        {aiResult.suggestions.join(" • ")}
                                      </div>
                                    )}

                                    {/* Guest prompt: encourage login for full features */}
                                    {aiResult.isGuest && (
                                      <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 flex items-center justify-between">
                                        <span className="text-blue-800">
                                          ✨ Sign in to submit this to sellers
                                          and get real quotes
                                        </span>
                                        <a
                                          href="/auth/login?redirect=/rfq/create"
                                          className="text-blue-700 font-medium underline hover:text-blue-900 whitespace-nowrap ml-2"
                                        >
                                          Sign in →
                                        </a>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-gold-600/70">
                              You can always adjust the fields below after AI
                              fills them.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Jewellery Type *</Label>
                        <Select
                          value={formData.jewelleryType}
                          onValueChange={(v: string) => {
                            updateFormData("jewelleryType", v);
                            updateFormData("templateId", ""); // Reset template
                            setHoveredType(null);
                            // Reset build method if it's METHOD_D and new jewelry type doesn't support it
                            if (
                              formData.buildMethod === "METHOD_D" &&
                              !METHOD_D_SUPPORTED_TYPES.includes(v)
                            ) {
                              updateFormData("buildMethod", "");
                            }
                          }}
                          onOpenChange={(open) => {
                            if (!open) setHoveredType(null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select jewellery type" />
                          </SelectTrigger>
                          <SelectContent>
                            {JEWELLERY_TYPES.map((type) => (
                              <SelectItem
                                key={type.value}
                                value={type.value}
                                onMouseEnter={(e) => {
                                  if (JEWELLERY_TYPE_IMAGES[type.value]) {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setHoverPos({
                                      top: rect.top,
                                      left: rect.right + 8,
                                    });
                                    setHoveredType(type.value);
                                  }
                                }}
                                onMouseLeave={() => setHoveredType(null)}
                              >
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Fixed-position hover preview - renders outside Select portal */}
                        {hoveredType && JEWELLERY_TYPE_IMAGES[hoveredType] && (
                          <div
                            className="fixed z-[100] pointer-events-none"
                            style={{
                              top: hoverPos.top,
                              left: hoverPos.left,
                            }}
                          >
                            <div className="w-40 rounded-md border bg-white dark:bg-gray-900 shadow-lg overflow-hidden -translate-y-1/4">
                              <img
                                src={JEWELLERY_TYPE_IMAGES[hoveredType]}
                                alt={
                                  JEWELLERY_TYPES.find(
                                    (t) => t.value === hoveredType,
                                  )?.label || ""
                                }
                                className="w-full h-32 object-cover"
                              />
                              <p className="text-xs p-2 text-center font-medium">
                                {
                                  JEWELLERY_TYPES.find(
                                    (t) => t.value === hoveredType,
                                  )?.label
                                }
                              </p>
                            </div>
                          </div>
                        )}
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
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                  <span className="font-semibold">
                                    {cat.label}
                                  </span>
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
                          {/* Weight guidance message */}
                          {formData.jewelleryType &&
                            WEIGHT_GUIDANCE[formData.jewelleryType] && (
                              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                                <p className="text-sm text-amber-800">
                                  <span className="font-medium">
                                    💡 Typical weight for{" "}
                                    {JEWELLERY_TYPES.find(
                                      (t) => t.value === formData.jewelleryType,
                                    )?.label || formData.jewelleryType}
                                    :{" "}
                                  </span>
                                  <span className="font-semibold">
                                    {
                                      WEIGHT_GUIDANCE[formData.jewelleryType]
                                        .range
                                    }
                                  </span>
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                  {WEIGHT_GUIDANCE[formData.jewelleryType].note}
                                </p>
                              </div>
                            )}
                          <Input
                            type="number"
                            step="0.1"
                            placeholder={
                              displayWeightUnit === "GRAM"
                                ? "e.g., 10.5"
                                : "e.g., 1.0"
                            }
                            value={formData.estimatedWeight}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              updateFormData("estimatedWeight", e.target.value)
                            }
                          />
                          {/* Weight unit selector */}
                          {supportedWeightUnits.length > 1 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Unit:
                              </span>
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
                                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
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
                                      {formData.buildMethod ===
                                        method.value && (
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
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
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
                              <TooltipContent
                                side="right"
                                className="max-w-sm p-4"
                              >
                                <div className="space-y-2">
                                  <p className="font-semibold">
                                    {method.label}
                                  </p>
                                  {method.tooltip && (
                                    <div className="text-xs space-y-1">
                                      <p>
                                        <strong>What:</strong>{" "}
                                        {method.tooltip.what}
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
                          weightGrams={
                            parseFloat(formData.estimatedWeight) || 5
                          }
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
                          weightGrams={
                            parseFloat(formData.estimatedWeight) || 5
                          }
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
                                    v === "SILVER_925"
                                      ? "SILVER_925"
                                      : `GOLD_${v}`,
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
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Most popular for hollow chains
                                    </span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="18K">
                                  <div className="flex flex-col">
                                    <span>18K Gold (75%)</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Stronger, variety of colors
                                    </span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="14K">
                                  <div className="flex flex-col">
                                    <span>14K Gold (58.3%)</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      More durable, lighter color
                                    </span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="SILVER_925">
                                  <div className="flex flex-col">
                                    <span>Sterling Silver 925</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
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
                                            {Math.round(
                                              style.hollowDiscount * 100,
                                            )}
                                            % lighter
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
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
                                formData.methodDConfig
                                  .chainStyle as ChainStyleType
                              ] && (
                                <div className="bg-white dark:bg-gray-900 p-3 rounded border border-blue-200 text-sm">
                                  <div className="font-medium text-blue-900 mb-2">
                                    {
                                      CHAIN_STYLE_OPTIONS[
                                        formData.methodDConfig
                                          .chainStyle as ChainStyleType
                                      ].label
                                    }
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
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
                                        <span className="text-gray-500 dark:text-gray-400">
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
                                        <span className="text-gray-500 dark:text-gray-400">
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
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

                          <div className="bg-white dark:bg-gray-900 p-3 rounded border text-sm text-blue-900">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">
                                  About Italian Machine Made
                                </p>
                                <ul className="text-xs mt-1 space-y-1 text-gray-600 dark:text-gray-300">
                                  <li>
                                    • High-precision automated manufacturing
                                  </li>
                                  <li>
                                    • Hollow/semi-hollow for lighter weight
                                  </li>
                                  <li>• Consistent quality and patterns</li>
                                  <li>
                                    • Diamond-cut facets for extra sparkle
                                  </li>
                                  <li>
                                    • Price based on actual gold weight used
                                  </li>
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
                                <Tooltip key={type.id}>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  {SURFACE_FINISH_IMAGES[type.id] && (
                                    <TooltipContent
                                      side="right"
                                      className="p-0 overflow-hidden"
                                    >
                                      <div className="w-44">
                                        <img
                                          src={
                                            SURFACE_FINISH_IMAGES[type.id].image
                                          }
                                          alt={type.name}
                                          className="w-full h-32 object-cover"
                                        />
                                        <div className="p-2 bg-white dark:bg-gray-900">
                                          <p className="text-xs font-medium">
                                            {type.name}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {
                                              SURFACE_FINISH_IMAGES[type.id]
                                                .description
                                            }
                                          </p>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              ))
                            ) : (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="POLISHED">
                                        High Polish / Mirror Finish
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={
                                          SURFACE_FINISH_IMAGES.POLISHED.image
                                        }
                                        alt="Polished"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          High Polish
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.POLISHED
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="MATTE">
                                        Matte / Brushed Finish
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={SURFACE_FINISH_IMAGES.MATTE.image}
                                        alt="Matte"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          Matte / Brushed
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.MATTE
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="SATIN">
                                        Satin Finish
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={SURFACE_FINISH_IMAGES.SATIN.image}
                                        alt="Satin"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          Satin Finish
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.SATIN
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="HAMMERED">
                                        Hammered Texture
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={
                                          SURFACE_FINISH_IMAGES.HAMMERED.image
                                        }
                                        alt="Hammered"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          Hammered Texture
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.HAMMERED
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="SANDBLAST">
                                        Sandblasted
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={
                                          SURFACE_FINISH_IMAGES.SANDBLAST.image
                                        }
                                        alt="Sandblasted"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          Sandblasted
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.SANDBLAST
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem value="ANTIQUE">
                                        Antique / Oxidized
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="p-0 overflow-hidden"
                                  >
                                    <div className="w-44">
                                      <img
                                        src={
                                          SURFACE_FINISH_IMAGES.ANTIQUE.image
                                        }
                                        alt="Antique"
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white dark:bg-gray-900">
                                        <p className="text-xs font-medium">
                                          Antique / Oxidized
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {
                                            SURFACE_FINISH_IMAGES.ANTIQUE
                                              .description
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">How it works</p>
                          <p>
                            After submitting your request, multiple verified
                            jewellers will review your requirements and send you
                            competitive quotes. You can compare offers and
                            choose the best one.
                          </p>
                        </div>
                      </div>

                      {/* Composition Validation Warnings/Errors */}
                      {formData.buildMethod === "METHOD_B" &&
                        (compositionValidation.errors.length > 0 ||
                          compositionValidation.warnings.length > 0) && (
                          <div className="space-y-2">
                            {compositionValidation.errors.map((err, idx) => (
                              <div
                                key={`err-${idx}`}
                                className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2"
                              >
                                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{err}</p>
                              </div>
                            ))}
                            {compositionValidation.warnings.map((warn, idx) => (
                              <div
                                key={`warn-${idx}`}
                                className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2"
                              >
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700">{warn}</p>
                              </div>
                            ))}
                          </div>
                        )}

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
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Template:</span>{" "}
                            {
                              templates.find(
                                (t) => t.id === formData.templateId,
                              )?.name
                            }
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
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
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              updateFormData("estimatedWeight", e.target.value)
                            }
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            An approximate weight helps jewellers provide
                            accurate quotes
                          </p>
                          {/* Weight unit selector */}
                          {supportedWeightUnits.length > 1 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Unit:
                              </span>
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
                          placeholder="Describe the design you're envisioning. Include style (traditional, modern, minimalist), patterns or motifs (floral, geometric, filigree), dimensions, and any specific details. This description helps our AI create a preview and helps sellers understand exactly what you want to craft."
                          value={formData.description}
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>,
                          ) => updateFormData("description", e.target.value)}
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
                              onClick={() =>
                                updateFormData("hasGemstones", true)
                              }
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
                            onChange={(gems) =>
                              updateFormData("gemstonesV2", gems)
                            }
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
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Uploading... {uploadProgress}%
                                </p>
                                <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
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
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>,
                          ) =>
                            updateFormData(
                              "specialInstructions",
                              e.target.value,
                            )
                          }
                        />
                      </div>

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
                      {/* Similar Designs Suggestions */}
                      {(loadingSimilarDesigns || similarDesigns.length > 0) && (
                        <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <div>
                              <h3 className="font-medium text-purple-900">
                                It seems you&apos;re designing a{" "}
                                {JEWELLERY_TYPES.find(
                                  (t) => t.value === formData.jewelleryType,
                                )?.label || formData.jewelleryType}
                              </h3>
                              <p className="text-sm text-purple-700">
                                We have some great designs you might like!
                              </p>
                            </div>
                          </div>

                          {loadingSimilarDesigns ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                              <span className="ml-2 text-sm text-purple-600">
                                Finding similar designs...
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                              {similarDesigns.slice(0, 5).map((design) => (
                                <button
                                  key={design.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectSimilarDesign(design)
                                  }
                                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-400 transition-all cursor-pointer"
                                >
                                  <img
                                    src={design.imageUrl}
                                    alt={`${design.jewelryType} design`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-1 left-1 right-1">
                                      <p className="text-[10px] text-white font-medium truncate">
                                        Click to use as reference
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                              {/* See More Thumbnail */}
                              <Link
                                href={`/designs?jewelryType=${formData.jewelleryType}&sort=popular`}
                                className="group relative aspect-square rounded-lg overflow-hidden bg-purple-100 hover:bg-purple-200 transition-colors flex flex-col items-center justify-center border-2 border-dashed border-purple-300 hover:border-purple-400"
                              >
                                <ArrowRight className="h-6 w-6 text-purple-600 group-hover:translate-x-1 transition-transform" />
                                <span className="text-xs text-purple-700 font-medium mt-1">
                                  See More
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

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

                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Generate an AI visualization of your custom jewelry
                          design based on all your specifications.
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
                                  !isLoggedIn
                                    ? "text-blue-800"
                                    : "text-amber-800"
                                }`}
                              >
                                {!isLoggedIn
                                  ? "Sign In Required"
                                  : "Phone Verification Required"}
                              </p>
                              <p
                                className={`text-sm mt-1 ${
                                  !isLoggedIn
                                    ? "text-blue-700"
                                    : "text-amber-700"
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
                              alt={
                                fromDesign
                                  ? "Selected Design"
                                  : "AI Generated Design Preview"
                              }
                              className="w-full rounded-lg shadow-md border"
                            />
                            {/* Badge - Top Right: Different for selected vs generated */}
                            <div className="absolute top-2 right-2">
                              <Badge
                                className={
                                  fromDesign && !generatingPreview
                                    ? "bg-purple-500 text-white"
                                    : "bg-amber-500 text-white"
                                }
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {fromDesign && !generatingPreview
                                  ? "Selected Design"
                                  : "AI Generated"}
                              </Badge>
                            </div>
                            {/* Orivraa Logo Watermark - Bottom Right */}
                            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                              <div className="flex items-center gap-1">
                                <img
                                  src="/brand/orivraa-icon.svg"
                                  alt="Orivraa"
                                  className="h-4 w-4"
                                />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                  Orivraa
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-sm mx-auto aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <p className="text-sm">Preview will appear here</p>
                          </div>
                        )}

                        {/* Customization Feedback Field - Show when preview exists */}
                        {designPreviewUrl && (
                          <div className="w-full max-w-sm mx-auto space-y-2">
                            <Label className="text-sm text-gray-600 dark:text-gray-300">
                              {fromDesign
                                ? "Want to customize this design? Describe your changes:"
                                : "Don't like the AI design? Describe what you'd like to change:"}
                            </Label>
                            <Textarea
                              rows={2}
                              placeholder="e.g., Make it more traditional, add more detail, make the band thinner..."
                              value={regenerationFeedback}
                              onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>,
                              ) => setRegenerationFeedback(e.target.value)}
                              className="text-sm"
                            />
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
                                    !hasValidMetalSelection() ||
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
                              onChange={(e) =>
                                setShareToGallery(e.target.checked)
                              }
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="share-to-gallery"
                              className="text-sm text-gray-600 dark:text-gray-300"
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Complete jewelry type and metal selection to
                              enable preview generation
                            </p>
                          )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Minimum Budget ({currency}) *</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 50000"
                            value={formData.budgetMin}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => updateFormData("budgetMin", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Budget ({currency}) *</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 100000"
                            value={formData.budgetMax}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => updateFormData("budgetMax", e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Price estimate comparison */}

                      {/* Budget feasibility checker — rules-first warning */}
                      {(() => {
                        const estimatedTotal =
                          liveEstimate?.total || priceEstimate?.total || 0;
                        const maxBudget = parseFloat(formData.budgetMax || "0");
                        const minBudget = parseFloat(formData.budgetMin || "0");

                        if (
                          !formData.budgetMax ||
                          maxBudget <= 0 ||
                          estimatedTotal <= 0
                        )
                          return null;

                        const overBudgetPct = Math.round(
                          ((estimatedTotal - maxBudget) / maxBudget) * 100,
                        );
                        const underBudgetPct = Math.round(
                          ((maxBudget - estimatedTotal) / estimatedTotal) * 100,
                        );

                        // Budget is too low — estimated price exceeds max budget
                        if (estimatedTotal > maxBudget) {
                          const suggestions: string[] = [];
                          const weight = getWeightFromTemplate();

                          // Suggest reducing weight
                          if (weight > 2) {
                            const targetWeight =
                              Math.round(
                                weight * (maxBudget / estimatedTotal) * 10,
                              ) / 10;
                            suggestions.push(
                              `Reduce weight to ~${targetWeight}g`,
                            );
                          }

                          // Suggest lower purity
                          if (
                            formData.buildMethod === "METHOD_A" &&
                            formData.metalType === "GOLD"
                          ) {
                            suggestions.push(
                              "Switch to a lower karat (e.g., 18K or 14K)",
                            );
                          } else if (
                            formData.buildMethod === "METHOD_B" &&
                            formData.alloyConfig?.karat === "22K"
                          ) {
                            suggestions.push("Try 18K alloy instead of 22K");
                          }

                          // Suggest removing gemstones
                          if (
                            formData.gemstonesV2.length > 0 ||
                            formData.gemstones.length > 0
                          ) {
                            suggestions.push("Remove or reduce gemstones");
                          }

                          return (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div className="space-y-1 min-w-0">
                                  <p className="text-sm font-semibold text-red-800">
                                    Budget too low — estimated cost is{" "}
                                    {currencyInfo.symbol}
                                    {Math.round(
                                      estimatedTotal,
                                    ).toLocaleString()}{" "}
                                    ({overBudgetPct}% over your max of{" "}
                                    {currencyInfo.symbol}
                                    {Math.round(maxBudget).toLocaleString()})
                                  </p>
                                  <p className="text-xs text-red-700">
                                    Sellers are unlikely to offer at this price.
                                    Adjust your specs or increase budget.
                                  </p>
                                  {suggestions.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200">
                                      <p className="text-xs font-medium text-red-700 mb-1">
                                        Suggestions to fit your budget:
                                      </p>
                                      <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                                        {suggestions.map((s, i) => (
                                          <li key={i}>{s}</li>
                                        ))}
                                        <li>
                                          Increase max budget to at least{" "}
                                          {currencyInfo.symbol}
                                          {Math.round(
                                            estimatedTotal * 1.05,
                                          ).toLocaleString()}
                                        </li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Budget is way higher than estimate — may get poor offers
                        if (minBudget > 0 && minBudget > estimatedTotal * 1.5) {
                          return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-blue-700">
                                Your minimum budget ({currencyInfo.symbol}
                                {Math.round(minBudget).toLocaleString()}) is{" "}
                                {underBudgetPct}% above the estimated cost (
                                {currencyInfo.symbol}
                                {Math.round(estimatedTotal).toLocaleString()}).
                                You can lower your budget range for
                                better-matched offers.
                              </p>
                            </div>
                          );
                        }

                        // Budget looks ok — show green confirmation
                        if (estimatedTotal > 0 && maxBudget >= estimatedTotal) {
                          return (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600 shrink-0" />
                              <p className="text-sm text-green-700">
                                Budget looks good — estimated cost (
                                {currencyInfo.symbol}
                                {Math.round(estimatedTotal).toLocaleString()})
                                is within your budget range.
                              </p>
                            </div>
                          );
                        }

                        return null;
                      })()}

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
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Leave empty if you&apos;re flexible on timing
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold">Request Summary</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Type:
                          </span>
                          <span>
                            {
                              JEWELLERY_TYPES.find(
                                (t) => t.value === formData.jewelleryType,
                              )?.label
                            }
                          </span>

                          {hasRealTemplate && (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">
                                Template:
                              </span>
                              <span>
                                {
                                  templates.find(
                                    (t) => t.id === formData.templateId,
                                  )?.name
                                }
                              </span>
                            </>
                          )}

                          <span className="text-gray-500 dark:text-gray-400">
                            Build Method:
                          </span>
                          <span>
                            {
                              BUILD_METHODS.find(
                                (m) => m.value === formData.buildMethod,
                              )?.label.split(":")[1]
                            }
                          </span>

                          <span className="text-gray-500 dark:text-gray-400">
                            Metal:
                          </span>
                          <span>
                            {
                              getAvailableMetals().find(
                                (t) => t.id === formData.metalType,
                              )?.name
                            }
                          </span>

                          <span className="text-gray-500 dark:text-gray-400">
                            Weight:
                          </span>
                          <span>
                            {hasRealTemplate
                              ? `${getWeightFromTemplate()}g (${formData.weightCategory})`
                              : `${formData.estimatedWeight}g`}
                          </span>

                          {formData.surfaceFinish && (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">
                                Finish:
                              </span>
                              <span>
                                {formData.surfaceFinish.replace("_", " ")}
                              </span>
                            </>
                          )}

                          {formData.addGoldPlating && (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">
                                Plating:
                              </span>
                              <span>
                                {formData.platingType.replace("_", " ")} (
                                {formData.platingTier})
                              </span>
                            </>
                          )}

                          {formData.gemstones.length > 0 && (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">
                                Gemstones:
                              </span>
                              <span>
                                {formData.gemstones.length} stone type(s)
                              </span>
                            </>
                          )}

                          <span className="text-gray-500 dark:text-gray-400">
                            Budget:
                          </span>
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
                            <strong>Note:</strong> This piece uses base metal
                            with plating/coating. It is not solid gold and will
                            be labeled accordingly.
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

                {/* Step 4: Seller Matching (Post-Submission) */}
                {step === 4 && submittedRfqId && (
                  <div className="space-y-6">
                    {/* Congratulations Card */}
                    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center mb-6">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {congratsMessage}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300">
                            Your request ID:{" "}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {submittedRfqId.slice(0, 8)}...
                            </code>
                          </p>
                        </div>

                        {/* Preview Image & Summary */}
                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                          {/* Design Preview */}
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-gold-500" />
                              Your Jewellery Design
                            </h3>
                            {designPreviewUrl ? (
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={getImageUrl(designPreviewUrl)}
                                  alt="Your jewellery design"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square rounded-lg bg-gradient-to-br from-gold-50 to-amber-100 flex items-center justify-center">
                                <div className="text-center p-4">
                                  <Gem className="h-12 w-12 text-gold-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Custom design based on your specifications
                                  </p>
                                </div>
                              </div>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">
                              This is how your custom jewellery will look
                            </p>
                          </div>

                          {/* Order Summary */}
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Info className="h-5 w-5 text-blue-500" />
                              Order Summary
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Jewellery Type:
                                </span>
                                <span className="font-medium capitalize">
                                  {formData.jewelleryType
                                    ?.toLowerCase()
                                    .replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Build Method:
                                </span>
                                <span className="font-medium">
                                  {formData.buildMethod?.replace(
                                    "METHOD_",
                                    "Method ",
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Estimated Weight:
                                </span>
                                <span className="font-medium">
                                  {formatWeight(getWeightFromTemplate())}
                                </span>
                              </div>
                              {formData.surfaceFinish && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Surface Finish:
                                  </span>
                                  <span className="font-medium capitalize">
                                    {formData.surfaceFinish
                                      .toLowerCase()
                                      .replace("_", " ")}
                                  </span>
                                </div>
                              )}
                              <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-700 dark:text-gray-200 font-medium">
                                    Estimated Price:
                                  </span>
                                  <span className="text-lg font-bold text-gold-600">
                                    {priceEstimate
                                      ? `${currencyInfo?.symbol || "Rs."}${priceEstimate.total.toLocaleString()}`
                                      : "Pending quotes"}
                                  </span>
                                </div>
                                {formData.budgetMax && (
                                  <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Your Budget:
                                    </span>
                                    <span className="text-green-600 font-medium">
                                      Up to {currencyInfo?.symbol || "Rs."}
                                      {parseFloat(
                                        formData.budgetMax,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Delivery Address Selection */}
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <MapPin className="h-5 w-5 text-blue-500" />
                          Delivery Location
                        </CardTitle>
                        <CardDescription>
                          Select where you want your jewellery delivered to find
                          sellers near you
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingAddresses ? (
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading your addresses...</span>
                          </div>
                        ) : deliveryAddresses.length === 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-amber-800">
                                  No delivery address set
                                </h4>
                                <p className="text-sm text-amber-700 mt-1">
                                  Add a delivery address to see sellers in your
                                  area first. You can still browse all sellers
                                  below.
                                </p>
                                <a
                                  href="/dashboard/customer/settings"
                                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                                >
                                  <MapPin className="h-4 w-4" />
                                  Add Delivery Address
                                  <ArrowRight className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Where do you want it delivered?
                            </label>
                            <div className="grid gap-2">
                              {deliveryAddresses.map((addr) => (
                                <button
                                  key={addr.id}
                                  onClick={() => setSelectedAddressId(addr.id)}
                                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                    selectedAddressId === addr.id
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-900"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {addr.label}
                                        </span>
                                        {addr.isDefault && (
                                          <Badge className="bg-green-100 text-green-700 text-xs">
                                            Default
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        {addr.addressLine1}
                                        {addr.addressLine2 &&
                                          `, ${addr.addressLine2}`}
                                      </p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {addr.city}, {addr.state},{" "}
                                        {addr.postalCode}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {addr.country}
                                      </p>
                                    </div>
                                    {selectedAddressId === addr.id && (
                                      <Check className="h-5 w-5 text-blue-500" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <a
                              href="/dashboard/customer/settings"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              Manage addresses
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Seller Matching Section */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <MapPin className="h-6 w-6 text-gold-500" />
                              Matching Sellers
                            </CardTitle>
                            <CardDescription>
                              {sellerStats ? (
                                <>
                                  Found {sellerStats.totalMatching} seller
                                  {sellerStats.totalMatching !== 1
                                    ? "s"
                                    : ""}{" "}
                                  who can create your jewellery
                                </>
                              ) : (
                                "Finding the best artisans for your order..."
                              )}
                            </CardDescription>
                          </div>
                          {sellerStats && sellerStats.totalMatching > 0 && (
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                              <div>
                                Price range: {currencyInfo?.symbol || "Rs."}
                                {sellerStats.minPrice.toLocaleString()} -{" "}
                                {currencyInfo?.symbol || "Rs."}
                                {sellerStats.maxPrice.toLocaleString()}
                              </div>
                              {sellerStats.sameCityCount > 0 && (
                                <div className="text-green-600">
                                  {sellerStats.sameCityCount} in your city
                                </div>
                              )}
                              {sellerStats.sameStateCount > 0 && (
                                <div className="text-blue-600">
                                  {sellerStats.sameStateCount} in your state
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Sort by:
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "location",
                                "price",
                                "rating",
                                "popularity",
                              ] as const
                            ).map((sortOption) => (
                              <button
                                key={sortOption}
                                onClick={() => setSellerSortBy(sortOption)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                  sellerSortBy === sortOption
                                    ? "bg-gold-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                              >
                                {sortOption === "location"
                                  ? "📍 Nearest"
                                  : sortOption === "price"
                                    ? "💰 Lowest Price"
                                    : sortOption === "rating"
                                      ? "⭐ Top Rated"
                                      : "🔥 Most Popular"}
                              </button>
                            ))}
                          </div>

                          {/* Advanced Filter Toggle */}
                          <button
                            onClick={() =>
                              setShowAdvancedFilters(!showAdvancedFilters)
                            }
                            className="ml-auto flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            Advanced Filters
                            {showAdvancedFilters ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {/* Advanced Filters Panel */}
                        {showAdvancedFilters && (
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                            {/* Include International Sellers Toggle */}
                            <div className="mb-4 pb-3 border-b">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={includeInternational}
                                  onChange={(e) => {
                                    setIncludeInternational(e.target.checked);
                                    if (!e.target.checked) {
                                      setFilterCountry(undefined);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    🌍 Include international sellers
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Show sellers from other countries.
                                    International orders can be picked up from
                                    Orivraa routing centres.
                                  </p>
                                </div>
                              </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Country Filter - locked unless international is on */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  Country
                                  {!includeInternational && (
                                    <span className="text-xs text-gray-400 ml-1">
                                      (locked)
                                    </span>
                                  )}
                                </label>
                                <Select
                                  value={
                                    includeInternational
                                      ? filterCountry || "all"
                                      : country || "IN"
                                  }
                                  onValueChange={(val) =>
                                    setFilterCountry(
                                      val === "all" ? undefined : val,
                                    )
                                  }
                                  disabled={!includeInternational}
                                >
                                  <SelectTrigger
                                    className={`bg-white dark:bg-gray-900 ${!includeInternational ? "opacity-60" : ""}`}
                                  >
                                    <SelectValue placeholder="All countries" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">
                                      All countries
                                    </SelectItem>
                                    {(
                                      Object.entries(COUNTRIES) as [
                                        string,
                                        { name: string },
                                      ][]
                                    ).map(([code, c]) => (
                                      <SelectItem key={code} value={code}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* State Filter - dropdown */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  State / Region
                                </label>
                                {(() => {
                                  const effectiveFilterCountry =
                                    includeInternational
                                      ? filterCountry || country || "IN"
                                      : country || "IN";
                                  const states = getStatesForCountry(
                                    effectiveFilterCountry,
                                  );
                                  if (states.length > 0) {
                                    return (
                                      <Select
                                        value={filterState || "all"}
                                        onValueChange={(val) => {
                                          setFilterState(
                                            val === "all" ? undefined : val,
                                          );
                                          setFilterCity(undefined);
                                        }}
                                      >
                                        <SelectTrigger className="bg-white dark:bg-gray-900">
                                          <SelectValue placeholder="All states" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">
                                            All states
                                          </SelectItem>
                                          {states.map((s) => (
                                            <SelectItem
                                              key={s.code}
                                              value={s.code}
                                            >
                                              {s.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    );
                                  }
                                  return (
                                    <Input
                                      placeholder="e.g., Bihar"
                                      value={filterState || ""}
                                      onChange={(e) =>
                                        setFilterState(
                                          e.target.value || undefined,
                                        )
                                      }
                                      className="bg-white dark:bg-gray-900"
                                    />
                                  );
                                })()}
                              </div>

                              {/* City Filter - dropdown */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  City
                                </label>
                                {(() => {
                                  const effectiveFilterCountry =
                                    includeInternational
                                      ? filterCountry || country || "IN"
                                      : country || "IN";
                                  const cities = getCitiesForCountry(
                                    effectiveFilterCountry,
                                    filterState || undefined,
                                  );
                                  if (cities.length > 0) {
                                    return (
                                      <Select
                                        value={filterCity || "all"}
                                        onValueChange={(val) =>
                                          setFilterCity(
                                            val === "all" ? undefined : val,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="bg-white dark:bg-gray-900">
                                          <SelectValue placeholder="All cities" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">
                                            All cities
                                          </SelectItem>
                                          {cities.map((c) => (
                                            <SelectItem
                                              key={c.name}
                                              value={c.name}
                                            >
                                              {c.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    );
                                  }
                                  return (
                                    <Input
                                      placeholder="e.g., Patna"
                                      value={filterCity || ""}
                                      onChange={(e) =>
                                        setFilterCity(
                                          e.target.value || undefined,
                                        )
                                      }
                                      className="bg-white dark:bg-gray-900"
                                    />
                                  );
                                })()}
                              </div>

                              {/* Rating Filter */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                  Min Rating
                                </label>
                                <Select
                                  value={sellerMinRating?.toString() || "any"}
                                  onValueChange={(val) =>
                                    setSellerMinRating(
                                      val === "any" ? undefined : Number(val),
                                    )
                                  }
                                >
                                  <SelectTrigger className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="Any rating" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">
                                      Any rating
                                    </SelectItem>
                                    <SelectItem value="4">
                                      ⭐ 4+ stars
                                    </SelectItem>
                                    <SelectItem value="3">
                                      ⭐ 3+ stars
                                    </SelectItem>
                                    <SelectItem value="2">
                                      ⭐ 2+ stars
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Clear Filters Button */}
                            {(filterCountry ||
                              filterState ||
                              filterCity ||
                              sellerMinRating ||
                              sellerMaxPrice ||
                              includeInternational) && (
                              <div className="mt-4 pt-3 border-t">
                                <button
                                  onClick={() => {
                                    setFilterCountry(undefined);
                                    setFilterState(undefined);
                                    setFilterCity(undefined);
                                    setSellerMinRating(undefined);
                                    setSellerMaxPrice(undefined);
                                    setIncludeInternational(false);
                                  }}
                                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                                >
                                  <X className="h-4 w-4" />
                                  Clear all filters
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auto-international fallback banner */}
                        {autoInternational && matchingSellers.length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                            <span className="text-lg">🌍</span>
                            <div>
                              <p className="text-sm font-medium text-blue-800">
                                No sellers found in your country — showing
                                international sellers
                              </p>
                              <p className="text-xs text-blue-600 mt-0.5">
                                {matchingSellers.length} international seller
                                {matchingSellers.length !== 1 ? "s" : ""}{" "}
                                available. Toggle &quot;Include international
                                sellers&quot; above to control this.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Seller List */}
                        {loadingSellers ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
                            <span className="ml-3 text-gray-500 dark:text-gray-400">
                              Finding matching sellers...
                            </span>
                          </div>
                        ) : matchingSellers.length === 0 ? (
                          <div className="text-center py-12">
                            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-1">
                              No matching sellers found
                            </h3>
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 max-w-md mx-auto">
                              {sellerDiagnostics && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-left">
                                  <p className="font-medium text-amber-800 mb-1 text-xs">
                                    🔍 Diagnostics
                                  </p>
                                  <ul className="text-xs text-amber-700 space-y-0.5">
                                    <li>
                                      Total shops:{" "}
                                      {sellerDiagnostics.totalShops} | Active &
                                      verified:{" "}
                                      {sellerDiagnostics.activeAndVerified}
                                    </li>
                                    {sellerDiagnostics.matchingBeforeCountryFilter >
                                      0 &&
                                      sellerDiagnostics.activeAndVerified >
                                        0 && (
                                        <li>
                                          Shops matching type/method (before
                                          country filter):{" "}
                                          {
                                            sellerDiagnostics.matchingBeforeCountryFilter
                                          }
                                        </li>
                                      )}
                                    {sellerDiagnostics.activeAndVerified ===
                                      0 && (
                                      <li className="text-red-600 font-medium">
                                        No shops are both active and verified
                                        yet
                                      </li>
                                    )}
                                    {sellerDiagnostics.matchingBeforeCountryFilter >
                                      0 &&
                                      sellerDiagnostics.activeAndVerified >
                                        0 && (
                                        <li className="text-red-600 font-medium">
                                          Country filter excluded all remaining
                                          shops
                                        </li>
                                      )}
                                  </ul>
                                </div>
                              )}
                              <p>Possible reasons:</p>
                              <ul className="text-left list-disc pl-6 space-y-1">
                                {sellerDiagnostics &&
                                sellerDiagnostics.activeAndVerified === 0 ? (
                                  <li className="text-red-600">
                                    No shops are currently active and verified —
                                    sellers need to activate and verify their
                                    shop
                                  </li>
                                ) : (
                                  <>
                                    <li>
                                      No verified sellers in{" "}
                                      <strong>
                                        {country
                                          ? COUNTRIES[
                                              country as keyof typeof COUNTRIES
                                            ]?.name || country
                                          : "your region"}
                                      </strong>{" "}
                                      support this jewellery type
                                    </li>
                                    {filterState && (
                                      <li>
                                        No sellers found in the selected state —
                                        try &quot;All states&quot;
                                      </li>
                                    )}
                                    {filterCity && (
                                      <li>
                                        No sellers found in the selected city —
                                        try &quot;All cities&quot;
                                      </li>
                                    )}
                                    {sellerMinRating && (
                                      <li>
                                        Rating filter is too strict — try
                                        lowering it
                                      </li>
                                    )}
                                    <li>
                                      Sellers may not have enabled{" "}
                                      <strong>{formData.jewelleryType}</strong>{" "}
                                      or <strong>{formData.buildMethod}</strong>{" "}
                                      in their inventory
                                    </li>
                                  </>
                                )}
                              </ul>
                              <div className="flex flex-col items-center gap-2 mt-4">
                                {!includeInternational && (
                                  <button
                                    onClick={() =>
                                      setIncludeInternational(true)
                                    }
                                    className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                                  >
                                    🌍 Try including international sellers
                                  </button>
                                )}
                                <p className="text-xs text-gray-400">
                                  Your request has been saved — you&apos;ll be
                                  notified when sellers respond.
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/rfq/${submittedRfqId}`}
                              className="inline-flex items-center gap-2 mt-4 text-gold-600 hover:text-gold-700 font-medium"
                            >
                              View your request
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {matchingSellers.map((seller, index) => {
                              // Insert group header when location tier changes
                              const prevSeller =
                                index > 0 ? matchingSellers[index - 1] : null;
                              const showGroupHeader =
                                !prevSeller ||
                                prevSeller.locationMatch !==
                                  seller.locationMatch;

                              const groupHeaderInfo: Record<
                                string,
                                {
                                  icon: string;
                                  label: string;
                                  color: string;
                                  bgColor: string;
                                  borderColor: string;
                                }
                              > = {
                                same_city: {
                                  icon: "📍",
                                  label:
                                    sellerGroups?.nearYou?.label || "Near You",
                                  color: "text-green-700",
                                  bgColor: "bg-green-50",
                                  borderColor: "border-green-200",
                                },
                                same_state: {
                                  icon: "🏛️",
                                  label:
                                    sellerGroups?.sameState?.label ||
                                    "Same State",
                                  color: "text-blue-700",
                                  bgColor: "bg-blue-50",
                                  borderColor: "border-blue-200",
                                },
                                same_country: {
                                  icon: "🇮🇳",
                                  label:
                                    sellerGroups?.sameCountry?.label ||
                                    "Same Country",
                                  color: "text-amber-700",
                                  bgColor: "bg-amber-50",
                                  borderColor: "border-amber-200",
                                },
                                other: {
                                  icon: "🌍",
                                  label:
                                    sellerGroups?.international?.label ||
                                    "International",
                                  color: "text-purple-700",
                                  bgColor: "bg-purple-50",
                                  borderColor: "border-purple-200",
                                },
                              };

                              const groupInfo =
                                groupHeaderInfo[seller.locationMatch] ||
                                groupHeaderInfo.same_country;
                              const groupCount = matchingSellers.filter(
                                (s) => s.locationMatch === seller.locationMatch,
                              ).length;

                              const platformCommission = 5;
                              const totalMakingPercent =
                                seller.makingChargePercent + platformCommission;
                              const totalMakingCharge = Math.round(
                                seller.materialCost *
                                  (totalMakingPercent / 100),
                              );
                              const subtotal =
                                seller.materialCost +
                                totalMakingCharge +
                                (seller.componentCost || 0);
                              const isInternational =
                                seller.country &&
                                country &&
                                seller.country.toLowerCase() !==
                                  country.toLowerCase();

                              // Tax calculation: always use seller's country tax (tax is applied at origin)
                              const taxCountryCode =
                                seller.country?.toUpperCase() || "";
                              const countryRules =
                                taxRulesMap[taxCountryCode] || [];
                              // For RFQ: use PRECIOUS_METAL rate (gold items), fallback to ALL
                              const taxLookup = lookupTaxRate(
                                countryRules,
                                "PRECIOUS_METAL",
                              );
                              const taxRate = taxLookup.rate;
                              const taxLabel = isInternational
                                ? `${seller.country?.toUpperCase()} ${taxLookup.name}`
                                : taxLookup.name;
                              const taxAmount = Math.round(subtotal * taxRate);
                              const totalPrice = subtotal + taxAmount;
                              return (
                                <div key={seller.id}>
                                  {showGroupHeader && (
                                    <div
                                      className={`flex items-center gap-2 px-3 py-2 ${groupInfo.bgColor} ${groupInfo.borderColor} border rounded-lg ${index > 0 ? "mt-4" : ""} mb-3`}
                                    >
                                      <span className="text-lg">
                                        {groupInfo.icon}
                                      </span>
                                      <h3
                                        className={`font-semibold text-sm ${groupInfo.color}`}
                                      >
                                        {groupInfo.label}
                                      </h3>
                                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border">
                                        {groupCount} seller
                                        {groupCount !== 1 ? "s" : ""}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                                      seller.locationMatch === "same_city"
                                        ? "border-green-200 bg-green-50/50"
                                        : isInternational
                                          ? "border-orange-200 bg-orange-50/30"
                                          : ""
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-semibold text-gray-900 dark:text-white">
                                            {seller.shopName}
                                          </h4>
                                          {seller.isVerified && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Verified Seller
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {seller.sellerTier &&
                                            seller.sellerTier !==
                                              "STANDARD" && (
                                              <SellerTierBadge
                                                tier={seller.sellerTier}
                                                compact
                                              />
                                            )}
                                          {seller.locationMatch ===
                                            "same_city" && (
                                            <Badge className="bg-green-100 text-green-700 text-xs">
                                              Same City
                                            </Badge>
                                          )}
                                          {seller.locationMatch ===
                                            "same_state" && (
                                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                                              Same State
                                            </Badge>
                                          )}
                                          {isInternational && (
                                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                                              🌍 International
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {[
                                              seller.city,
                                              seller.state,
                                              seller.country,
                                            ]
                                              .filter(Boolean)
                                              .join(", ") ||
                                              "Location not specified"}
                                          </span>
                                          {seller.averageRating > 0 && (
                                            <span className="flex items-center gap-1">
                                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                              {seller.averageRating.toFixed(1)}{" "}
                                              ({seller.reviewCount} reviews)
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {seller.codEnabled &&
                                            !isInternational && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                COD Available
                                              </Badge>
                                            )}
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Making Charge: {totalMakingPercent}%
                                          </Badge>
                                          {seller.hasCustomRate && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs text-green-600 border-green-200"
                                            >
                                              Custom Pricing
                                            </Badge>
                                          )}
                                        </div>

                                        {/* International delivery notice */}
                                        {isInternational && (
                                          <div className="mt-3 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                                            <p className="text-xs text-orange-800 flex items-start gap-1.5">
                                              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                              <span>
                                                <strong>
                                                  International Order:
                                                </strong>{" "}
                                                This item will not be delivered
                                                directly to you. You can pick it
                                                up from an Orivraa routing
                                                centre in your city. Location
                                                details will be shared once the
                                                order is received by Orivraa.
                                              </span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right ml-4">
                                        <div className="text-lg font-bold text-gold-600">
                                          {currencyInfo?.symbol || "Rs."}
                                          {totalPrice.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          Material:{" "}
                                          {currencyInfo?.symbol || "Rs."}
                                          {seller.materialCost.toLocaleString()}
                                          <br />
                                          Making ({totalMakingPercent}%):{" "}
                                          {currencyInfo?.symbol || "Rs."}
                                          {totalMakingCharge.toLocaleString()}
                                          {(seller.componentCost || 0) > 0 && (
                                            <>
                                              <br />
                                              Finish/Components:{" "}
                                              {currencyInfo?.symbol || "Rs."}
                                              {seller.componentCost.toLocaleString()}
                                            </>
                                          )}
                                          {(seller.gemstoneCost || 0) > 0 && (
                                            <>
                                              <br />
                                              Gemstones:{" "}
                                              {currencyInfo?.symbol || "Rs."}
                                              {seller.gemstoneCost.toLocaleString()}
                                            </>
                                          )}
                                          {taxRate > 0 && (
                                            <>
                                              <br />
                                              {taxLabel}:{" "}
                                              {currencyInfo?.symbol || "Rs."}
                                              {taxAmount.toLocaleString()}
                                            </>
                                          )}
                                        </div>
                                        {isInternational && (
                                          <p className="text-[10px] text-orange-600 mt-1 font-medium">
                                            + Import duty will be applied
                                          </p>
                                        )}
                                        <MarketComparison
                                          ourPrice={totalPrice}
                                          currencySymbol={
                                            currencyInfo?.symbol || "Rs."
                                          }
                                          makingChargePercent={
                                            totalMakingPercent
                                          }
                                        />
                                        <div className="mt-3">
                                          <button
                                            onClick={() => {
                                              setSelectedSeller(seller);
                                              setOrderBudget(
                                                String(totalPrice),
                                              );
                                              setOrderMessage("");
                                              setShowOrderModal(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-semibold text-sm rounded-lg hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400 shadow-sm hover:shadow transition-all"
                                          >
                                            <ShoppingBag className="h-4 w-4" />
                                            Order from this seller
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Buyer Education - Country-specific pricing callout */}
                        <BuyerEducation country={country} />

                        {/* Actions */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t">
                          <Link
                            href={`/rfq/${submittedRfqId}`}
                            className="text-gold-600 hover:text-gold-700 font-medium flex items-center gap-2"
                          >
                            View full request details
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link href="/rfq/create">
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Reset form for new request
                                setStep(1);
                                setSubmittedRfqId(null);
                                setMatchingSellers([]);
                                setSellerStats(null);
                                setSellerGroups(null);
                                setSellerDiagnostics(null);
                              }}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Create Another Request
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Mobile-only LivePricingPanel (hidden on xl where sidebars show) */}
                <div className="xl:hidden mt-6">
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={buildLivePricingFormData()}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />
                </div>
              </div>
              {/* end Center column */}

              {/* Right: Live Calculator */}
              <div className="hidden xl:block xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto scrollbar-thin">
                <LivePricingPanel
                  buildMethod={formData.buildMethod as BuildMethod}
                  formData={buildLivePricingFormData()}
                  marketRates={marketRates}
                  marketRatesLoading={marketRatesLoading}
                  marketRatesWarning={marketRatesWarning}
                  currencySymbol={currencyInfo.symbol}
                />
              </div>
            </div>
          </div>
        </main>

        <DynamicFooter />
      </div>

      {/* Order from Seller Modal */}
      <AlertDialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-500" />
              Send Order Request
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {selectedSeller && (
                  <>
                    <p className="text-gray-600 dark:text-gray-300">
                      You&apos;re sending your custom jewellery request to{" "}
                      <strong>{selectedSeller.shopName}</strong>
                      {selectedSeller.city && ` in ${selectedSeller.city}`}.
                    </p>

                    {/* International notice */}
                    {selectedSeller.country &&
                      country &&
                      selectedSeller.country.toLowerCase() !==
                        country.toLowerCase() && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800 flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>International Order:</strong> This order
                              will be crafted in {selectedSeller.country} and
                              shipped to an Orivraa routing centre near you.
                              You&apos;ll pick it up from there after quality
                              verification. Location details will be shared once
                              the order is received.
                            </span>
                          </p>
                        </div>
                      )}

                    {/* Budget input */}
                    <div>
                      {/* Live Price Summary */}
                      {(() => {
                        const platformCommission = 5;
                        const totalMakingPercent =
                          selectedSeller.makingChargePercent +
                          platformCommission;
                        const totalMakingCharge = Math.round(
                          selectedSeller.materialCost *
                            (totalMakingPercent / 100),
                        );
                        const subtotal =
                          selectedSeller.materialCost +
                          totalMakingCharge +
                          (selectedSeller.componentCost || 0);
                        const isIntl =
                          selectedSeller.country &&
                          country &&
                          selectedSeller.country.toLowerCase() !==
                            country.toLowerCase();
                        const taxCountryCode =
                          (isIntl
                            ? country?.toUpperCase()
                            : selectedSeller.country?.toUpperCase()) || "";
                        const modalRules = taxRulesMap[taxCountryCode] || [];
                        const modalTaxLookup = lookupTaxRate(
                          modalRules,
                          "PRECIOUS_METAL",
                        );
                        const taxRate = modalTaxLookup.rate;
                        const taxLabel = isIntl
                          ? `Local ${modalTaxLookup.name}`
                          : modalTaxLookup.name;
                        const taxAmount = Math.round(subtotal * taxRate);
                        const grandTotal = subtotal + taxAmount;
                        const sym = currencyInfo?.symbol || "Rs.";
                        return (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                            <p className="text-sm font-semibold text-amber-900 mb-2">
                              Order Price Summary
                            </p>
                            <div className="space-y-1 text-sm text-amber-800">
                              <div className="flex justify-between">
                                <span>Material Cost</span>
                                <span>
                                  {sym}
                                  {selectedSeller.materialCost.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>
                                  Making Charge ({totalMakingPercent}%)
                                </span>
                                <span>
                                  {sym}
                                  {totalMakingCharge.toLocaleString()}
                                </span>
                              </div>
                              {(selectedSeller.componentCost || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span>Finish / Components</span>
                                  <span>
                                    {sym}
                                    {selectedSeller.componentCost.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {taxRate > 0 && (
                                <div className="flex justify-between">
                                  <span>{taxLabel}</span>
                                  <span>
                                    {sym}
                                    {taxAmount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between pt-1 border-t border-amber-300 font-bold text-amber-950">
                                <span>Total</span>
                                <span>
                                  {sym}
                                  {grandTotal.toLocaleString()}
                                </span>
                              </div>
                              {isIntl && (
                                <p className="text-xs text-orange-600 font-medium pt-1">
                                  + Import duty will be applied at delivery
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Your Budget ({currencyInfo?.symbol || "Rs."})
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter your budget"
                        value={orderBudget}
                        onChange={(e) => setOrderBudget(e.target.value)}
                        className="text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pre-filled with the total price above. The seller may
                        counter with a different price.
                      </p>
                    </div>

                    {/* Optional message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Message to Seller (Optional)
                      </label>
                      <Textarea
                        placeholder="Any specific requirements or notes for the seller..."
                        value={orderMessage}
                        onChange={(e) => setOrderMessage(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Flow explanation */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>What happens next:</strong> The seller will
                        review your request and can accept, counter with a
                        different price, or decline. If they counter, you can
                        accept or reject — no further bargaining. Track your
                        order from your dashboard.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingOrder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={sendingOrder || !orderBudget}
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedSeller || !submittedRfqId || !orderBudget) return;
                setSendingOrder(true);
                try {
                  const token =
                    typeof window !== "undefined"
                      ? localStorage.getItem("token")
                      : null;
                  if (!token) {
                    setError("Please log in to send an order request");
                    return;
                  }
                  const budgetNum = parseFloat(orderBudget);
                  const response = await fetch(
                    `${API_URL}/rfq/${submittedRfqId}/send-to-seller`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        shopId: selectedSeller.id,
                        budgetMinNpr: Math.round(budgetNum * 0.9),
                        budgetMaxNpr: Math.round(budgetNum),
                        message: orderMessage || undefined,
                      }),
                    },
                  );

                  if (response.ok) {
                    const data = await response.json();
                    setShowOrderModal(false);
                    // Navigate to customer's RFQ tracking page
                    router.push(`/dashboard/customer/rfqs/${submittedRfqId}`);
                  } else {
                    const errorData = await response.json().catch(() => null);
                    setError(
                      errorData?.message ||
                        "Failed to send order request. Please try again.",
                    );
                  }
                } catch (err) {
                  setError("Failed to send order request. Please try again.");
                } finally {
                  setSendingOrder(false);
                }
              }}
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-semibold hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400"
            >
              {sendingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Order Request
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
