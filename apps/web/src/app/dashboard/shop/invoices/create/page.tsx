"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LiveRatesWidget, type LiveRateData } from "@/components/pricing/LiveRatesWidget";
import { WeighingScalePanel } from "@/components/scale/WeighingScalePanel";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { WEIGHT_UNIT_SYMBOLS, type WeightUnit } from "@/hooks/useMarket";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { loadTradeInPayload } from "@/lib/oldGoldTradeIn";
import { useCurrency } from "@/store/preferences";
import { getApiUrl, invoicesApi, pricingApi, shopQuotesApi, shopsApi } from "@/lib/api";
import { getCounterPaymentMethods } from "@/lib/counterPayments";
import { JEWELLERY_TYPES } from "@/lib/constants/jewellery";
import {
    canIssueSriLankaTaxInvoice,
    detectTaxIdKindForCustomer,
    taxIdLabelForKind,
    TAX_EXEMPT_REASONS,
    validateTaxId,
} from "@/lib/tax/validators";
import { useT } from "@/providers/translation-provider";
import { toGrams, fromGrams, getSupportedWeightUnits, getDefaultWeightUnit } from "@gold-shop/shared";
import {
    ArrowLeft,
    Check,
    ChevronDown,
    FileDown,
    Globe,
    Loader2,
    Phone,
    Plus,
    RefreshCw,
    Scale,
    Trash2,
    User,
    X,
    Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TaxCategoryKey =
  | "PRECIOUS_METAL"
  | "MAKING_CHARGE"
  | "GEMSTONE"
  | "FINISH";

interface CountryTaxConfig {
  taxType: string;
  taxName: string;
  rates: Record<TaxCategoryKey, number>;
  defaultRate: number;
}

interface TaxRuleResponse {
  taxType?: string;
  taxName?: string;
  category?: string;
  rate?: number;
}

// ── Fallback tax rates used while backend tax rules load ──
const FALLBACK_CATEGORY_TAX_RATES: Record<
  string,
  CountryTaxConfig
> = {
  IN: {
    taxType: "GST",
    taxName: "GST",
    rates: {
      PRECIOUS_METAL: 0.03,
      MAKING_CHARGE: 0.05,
      GEMSTONE: 0.03,
      FINISH: 0.18,
    },
    defaultRate: 0.03,
  },
  NP: {
    taxType: "SKILL_PROMOTION_FEE",
    taxName: "Skill Promotion Fee / VAT",
    rates: {
      PRECIOUS_METAL: 0.005,
      MAKING_CHARGE: 0.005,
      GEMSTONE: 0.13,
      FINISH: 0.005,
    },
    defaultRate: 0.005,
  },
  AE: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.05,
      MAKING_CHARGE: 0.05,
      GEMSTONE: 0.05,
      FINISH: 0.05,
    },
    defaultRate: 0.05,
  },
  US: {
    taxType: "SALES_TAX",
    taxName: "Sales Tax",
    rates: {
      PRECIOUS_METAL: 0.0,
      MAKING_CHARGE: 0.0,
      GEMSTONE: 0.0,
      FINISH: 0.0,
    },
    defaultRate: 0.0,
  },
  GB: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.2,
      MAKING_CHARGE: 0.2,
      GEMSTONE: 0.2,
      FINISH: 0.2,
    },
    defaultRate: 0.2,
  },
  EU: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.19,
      MAKING_CHARGE: 0.19,
      GEMSTONE: 0.19,
      FINISH: 0.19,
    },
    defaultRate: 0.19,
  },
  AU: {
    taxType: "GST",
    taxName: "GST",
    rates: {
      PRECIOUS_METAL: 0.1,
      MAKING_CHARGE: 0.1,
      GEMSTONE: 0.1,
      FINISH: 0.1,
    },
    defaultRate: 0.1,
  },
  LK: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.18,
      MAKING_CHARGE: 0.18,
      GEMSTONE: 0.18,
      FINISH: 0.18,
    },
    defaultRate: 0.18,
  },
};

const PRICING_REGION_BY_INVOICE_COUNTRY: Record<string, string> = {
  IN: "IN",
  NP: "NP",
  AE: "AE",
  US: "US",
  GB: "UK",
  UK: "UK",
  EU: "EU",
  LK: "LK",
};

const TAX_CATEGORIES: TaxCategoryKey[] = [
  "PRECIOUS_METAL",
  "MAKING_CHARGE",
  "GEMSTONE",
  "FINISH",
];

function getFallbackCountryTax(countryCode: string): CountryTaxConfig {
  return FALLBACK_CATEGORY_TAX_RATES[countryCode] || {
    taxType: "NONE",
    taxName: "Tax unavailable",
    rates: {
      PRECIOUS_METAL: 0,
      MAKING_CHARGE: 0,
      GEMSTONE: 0,
      FINISH: 0,
    },
    defaultRate: 0,
  };
}

function normalizeInvoiceCountryCode(countryCode: string): string {
  return countryCode === "UK" ? "GB" : countryCode;
}

function buildCountryTaxConfig(
  countryCode: string,
  rules?: TaxRuleResponse[],
): CountryTaxConfig {
  const fallback = getFallbackCountryTax(countryCode);

  if (!rules?.length) {
    return fallback;
  }

  const rates = { ...fallback.rates };
  let defaultRate = fallback.defaultRate;

  for (const rule of rules) {
    if (rule.category === "ALL" && typeof rule.rate === "number") {
      defaultRate = rule.rate;
      continue;
    }

    if (
      TAX_CATEGORIES.includes(rule.category as TaxCategoryKey) &&
      typeof rule.rate === "number"
    ) {
      rates[rule.category as TaxCategoryKey] = rule.rate;
    }
  }

  return {
    taxType: rules[0]?.taxType || fallback.taxType,
    taxName: rules[0]?.taxName || fallback.taxName,
    rates,
    defaultRate,
  };
}

const COUNTRIES = [
  { code: "IN", name: "India", phone: "+91", currency: "INR" },
  { code: "NP", name: "Nepal", phone: "+977", currency: "NPR" },
  { code: "AE", name: "UAE", phone: "+971", currency: "AED" },
  { code: "US", name: "United States", phone: "+1", currency: "USD" },
  { code: "GB", name: "United Kingdom", phone: "+44", currency: "GBP" },
  { code: "EU", name: "Europe", phone: "+49", currency: "EUR" },
  { code: "AU", name: "Australia", phone: "+61", currency: "AUD" },
  { code: "LK", name: "Sri Lanka", phone: "+94", currency: "LKR" },
];

// Currencies for converter (Frankfurter supported + NPR/LKR derived)
const CONVERTIBLE_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "NPR", symbol: "रू", name: "Nepalese Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "LKR", symbol: "Rs.", name: "Sri Lankan Rupee" },
];

const METAL_TYPES = [
  { value: "GOLD_24K", label: "Gold 24K (999)" },
  { value: "GOLD_22K", label: "Gold 22K (916)" },
  { value: "GOLD_18K", label: "Gold 18K (750)" },
  { value: "GOLD_14K", label: "Gold 14K (585)" },
  { value: "SILVER_999", label: "Silver 999" },
  { value: "SILVER_925", label: "Silver 925 (Sterling)" },
  { value: "PLATINUM_950", label: "Platinum 950" },
  { value: "PLATINUM_900", label: "Platinum 900" },
];

const GEMSTONE_TYPES = [
  "Diamond",
  "Ruby",
  "Emerald",
  "Sapphire",
  "Pearl",
  "Opal",
  "Topaz",
  "Amethyst",
  "Garnet",
  "Tourmaline",
  "Other",
];
const GEMSTONE_CUTS = [
  "Round Brilliant",
  "Princess",
  "Oval",
  "Cushion",
  "Emerald",
  "Pear",
  "Marquise",
  "Radiant",
  "Heart",
  "Asscher",
  "Cabochon",
  "Other",
];
const GEMSTONE_CLARITIES = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
  "I2",
  "I3",
  "N/A",
];

// Jewellery categories from shared constants
const INVOICE_CATEGORIES = JEWELLERY_TYPES.map((jt) => ({
  value: jt.value,
  label: jt.label,
}));

// ── Gemstone entry (multiple per line item) ──
interface GemstoneEntry {
  type: string;
  cut: string;
  clarity: string;
  caratWeight: string;
  color: string;
  cost: string;
}

const emptyGemstone = (): GemstoneEntry => ({
  type: "",
  cut: "",
  clarity: "",
  caratWeight: "",
  color: "",
  cost: "",
});

interface RichLineItem {
  label: string;
  category: string;
  quantity: number;
  details: string;
  // Metal details
  metalType: string;
  metalWeightG: string;
  metalCost: string;
  // Multiple gemstones
  gemstones: GemstoneEntry[];
  // Making
  makingCost: string;
}

const emptyLineItem = (): RichLineItem => ({
  label: "",
  category: "RING",
  quantity: 1,
  details: "",
  metalType: "",
  metalWeightG: "",
  metalCost: "",
  gemstones: [],
  makingCost: "",
});

// Compute total for a line item
function lineItemTotal(item: RichLineItem): number {
  const mc = parseFloat(item.metalCost) || 0;
  const gc = item.gemstones.reduce((s, g) => s + (parseFloat(g.cost) || 0), 0);
  const mk = parseFloat(item.makingCost) || 0;
  return (mc + gc + mk) * item.quantity;
}

// Gemstone cost total for a line item
function gemstoneTotal(item: RichLineItem): number {
  return item.gemstones.reduce((s, g) => s + (parseFloat(g.cost) || 0), 0);
}

interface CustomerSuggestion {
  id: string;
  name: string;
  phone: string;
  phoneCountryCode: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  isRegistered?: boolean;
}

// ── Toggle Switch Component ──
function ModeToggle({
  value,
  onChange,
  leftLabel,
  rightLabel,
  activeColor,
}: {
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
  leftLabel: string;
  rightLabel: string;
  activeColor: string;
}) {
  return (
    <div className="inline-flex h-8 rounded-full border bg-muted p-0.5 gap-0">
      <button
        type="button"
        onClick={() => onChange("left")}
        className={`px-3 text-xs font-medium rounded-full transition-all ${
          value === "left"
            ? `${activeColor} text-white shadow-sm`
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("right")}
        className={`px-3 text-xs font-medium rounded-full transition-all ${
          value === "right"
            ? `${activeColor} text-white shadow-sm`
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { symbol: currencySymbol, country: shopCountry } = useShopCurrency();
  const { currency: selectedCurrency, currencyInfo } = useCurrency();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [isMockInsured, setIsMockInsured] = useState(false);

  // ── Market rates for live metal pricing ──
  const [marketRates, setMarketRates] = useState<LiveRateData | null>(null);
  const [marketRatesLoading, setMarketRatesLoading] = useState(false);

  // ── Weight unit helpers (based on shop's country, not buyer's market) ──
  const supportedWeightUnits = getSupportedWeightUnits(shopCountry);
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<WeightUnit>(
    getDefaultWeightUnit(shopCountry),
  );
  const setWeightUnit = useCallback((unit: WeightUnit) => setSelectedWeightUnit(unit), []);
  const weightUnitSymbol = WEIGHT_UNIT_SYMBOLS[selectedWeightUnit] || "g";

  // Reset weight unit to shop's default when country changes
  useEffect(() => {
    setSelectedWeightUnit(getDefaultWeightUnit(shopCountry));
  }, [shopCountry]);

  // Convert display weight (in selected unit) to grams for storage
  const displayToGrams = useCallback(
    (displayValue: number): number => {
      try {
        return toGrams(displayValue, selectedWeightUnit);
      } catch {
        return displayValue; // fallback to grams
      }
    },
    [selectedWeightUnit],
  );

  // Convert grams (stored) to display unit
  const gramsToDisplay = useCallback(
    (grams: number): number => {
      try {
        return fromGrams(grams, selectedWeightUnit);
      } catch {
        return grams;
      }
    },
    [selectedWeightUnit],
  );

  // Fetch market rates (used on mount and via refresh button)
  // Passes the selected currency from the header currency changer
  const fetchMarketRates = useCallback(async () => {
    setMarketRatesLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/market-rates?country=${shopCountry}&currency=${selectedCurrency}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMarketRates(data);
      }
    } catch {
      // Silent fail — live rates are optional
    } finally {
      setMarketRatesLoading(false);
    }
  }, [shopCountry, selectedCurrency]);

  // Fetch market rates on mount and when country/currency changes
  useEffect(() => {
    fetchMarketRates();
  }, [fetchMarketRates]);

  // Refresh user data on mount to get the latest KYC approval status from the server.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Unverified shops can still create invoices (KYC is never a hard blocker) —
  // their bills simply print with a watermark unless a Customer Tax ID is given.
  const isShopUnverified = useMemo(
    () => Boolean(user?.shop && !user.shop.isVerified),
    [user?.shop],
  );

  const isSandboxMode = useMemo(() => {
    if (!user || !user.shop || user.shop.isVerified) return false;
    const createdDate = new Date(user.createdAt).getTime();
    const diffDays = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }, [user]);

  const daysLeft = useMemo(() => {
    if (!user) return 0;
    const createdDate = new Date(user.createdAt).getTime();
    const diffDays = 7 - (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diffDays));
  }, [user]);

  // Handle Nepalese / standard days left calculation variable cleanly
  const daysLeftVal = useMemo(() => {
    if (!user) return 0;
    const createdDate = new Date(user.createdAt).getTime();
    const diffDays = 7 - (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diffDays));
  }, [user]);

  // ── Country ──
  const [invoiceCountry, setInvoiceCountry] = useState(
    normalizeInvoiceCountryCode(shopCountry),
  );
  const [countryTax, setCountryTax] = useState<CountryTaxConfig>(() =>
    getFallbackCountryTax(normalizeInvoiceCountryCode(shopCountry)),
  );

  useEffect(() => {
    setInvoiceCountry(normalizeInvoiceCountryCode(shopCountry));
  }, [shopCountry]);

  useEffect(() => {
    const fallback = getFallbackCountryTax(invoiceCountry);
    const region = PRICING_REGION_BY_INVOICE_COUNTRY[invoiceCountry];
    let isCancelled = false;

    setCountryTax(fallback);

    if (!region) {
      return () => {
        isCancelled = true;
      };
    }

    pricingApi
      .getTaxRules(region)
      .then((response) => {
        if (isCancelled) return;

        setCountryTax(
          buildCountryTaxConfig(invoiceCountry, response.data?.rules),
        );
      })
      .catch(() => {
        if (isCancelled) return;
        setCountryTax(fallback);
      });

    return () => {
      isCancelled = true;
    };
  }, [invoiceCountry]);

  // ── Tax filing fields (Sprint 1 universal) ──
  const [customerType, setCustomerType] = useState<"B2C" | "B2B">("B2C");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [taxExemptReason, setTaxExemptReason] = useState("EXPORT");
  const [useCustomTaxRate, setUseCustomTaxRate] = useState(false);
  const [customTaxRatePercent, setCustomTaxRatePercent] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [requestTaxInvoice, setRequestTaxInvoice] = useState(false);
  const [supplyDate, setSupplyDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [sellerLkTaxId, setSellerLkTaxId] = useState("");
  const [sellerVatRegistrationStatus, setSellerVatRegistrationStatus] =
    useState(() =>
      String((user?.shop as any)?.vatRegistrationStatus || "NOT_REGISTERED"),
    );

  const taxIdKind = detectTaxIdKindForCustomer(invoiceCountry, customerType);
  const taxIdValidation = useMemo(() => {
    if (!customerTaxId || !taxIdKind) return null;
    return validateTaxId(customerTaxId, taxIdKind);
  }, [customerTaxId, taxIdKind]);
  const sellerHasValidLkTin = /^\d{9}$/.test(sellerLkTaxId.trim());
  const sellerLkVatVerified = sellerVatRegistrationStatus === "VERIFIED";
  const lkVatChargeBlocked =
    invoiceCountry === "LK" && !sellerLkVatVerified;
  const isLkTaxInvoice = canIssueSriLankaTaxInvoice({
    country: invoiceCountry,
    requested: requestTaxInvoice,
    customerType,
    sellerTaxId: sellerLkTaxId,
    sellerVatRegistrationStatus,
    purchaserTaxId: customerTaxId,
  });

  useEffect(() => {
    if (invoiceCountry !== "LK") {
      setRequestTaxInvoice(false);
      setSellerLkTaxId("");
      setSellerVatRegistrationStatus("NOT_REGISTERED");
      return;
    }

    let cancelled = false;
    Promise.allSettled([shopsApi.getKyc(), invoicesApi.getSettings()]).then(
      ([kycResult, settingsResult]) => {
        if (cancelled) return;
        const kyc =
          kycResult.status === "fulfilled"
            ? kycResult.value.data ?? kycResult.value
            : {};
        const settings =
          settingsResult.status === "fulfilled"
            ? settingsResult.value.data ?? settingsResult.value
            : {};
        const candidates = [kyc.vatNumber, kyc.panNumber, settings.gstin];
        setSellerLkTaxId(
          String(candidates.find((value) => /^\d{9}$/.test(String(value || "").trim())) || ""),
        );
        setSellerVatRegistrationStatus(
          String(
            kyc.vatRegistrationStatus ||
              (user?.shop as any)?.vatRegistrationStatus ||
              "NOT_REGISTERED",
          ).toUpperCase(),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [invoiceCountry, user?.shop]);

  // ── Customer ──
  const [customerName, setCustomerName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    COUNTRIES.find((c) => c.code === shopCountry)?.phone || "",
  );
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [customerCountry, setCustomerCountry] = useState(
    COUNTRIES.find((c) => c.code === shopCountry)?.name || "India",
  );

  // ── Customer live search ──
  const [isSearching, setIsSearching] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<
    CustomerSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedWalkInCustomerId, setSelectedWalkInCustomerId] = useState<
    string | null
  >(null);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const searchCustomers = useCallback(async (pcc: string, phone: string) => {
    if (phone.length < 3) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await shopQuotesApi.searchCustomers({
        phoneCountryCode: pcc,
        phone,
      });
      const result = response.data as {
        customers: CustomerSuggestion[];
        count: number;
      };
      setCustomerSuggestions(result.customers || []);
      setShowSuggestions((result.customers || []).length > 0);
    } catch {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    setSelectedWalkInCustomerId(null);
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      searchCustomers(phoneCountryCode, phone);
    }, 400);
  };

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    const cc = customer.phoneCountryCode || phoneCountryCode;
    let localPhone = customer.phone || "";
    if (cc && localPhone.startsWith(cc)) {
      localPhone = localPhone.slice(cc.length);
    } else if (localPhone.startsWith("+") && cc) {
      localPhone = localPhone.replace(cc, "");
    }
    setCustomerName(customer.name);
    setPhoneCountryCode(cc);
    setCustomerPhone(localPhone);
    setCustomerEmail(customer.email || "");
    if (customer.address) {
      const parts = customer.address.split(", ");
      setAddressLine1(parts[0] || "");
      setAddressLine2(parts[1] || "");
    }
    setCustomerCity(customer.city || "");
    setCustomerCountry(customer.country || "");
    // Only walk-in customers have a WalkInCustomer id we can link on the invoice
    setSelectedWalkInCustomerId(
      customer.isRegistered ? null : customer.id || null,
    );
    setShowSuggestions(false);
    setCustomerSuggestions([]);
    toast({
      title: "Customer details filled",
      description: `Welcome back, ${customer.name}!`,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Line items ──
  const [lineItems, setLineItems] = useState<RichLineItem[]>([emptyLineItem()]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const [scaleItemIdx, setScaleItemIdx] = useState<number | null>(null);

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem()]);
    setExpandedItems(
      (prev) => new Set([...Array.from(prev), lineItems.length]),
    );
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
    setExpandedItems((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateLineItem = (
    index: number,
    field: keyof RichLineItem,
    value: any,
  ) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  // Autofill metal cost from live rate: cost = weight(g) × rate per gram
  const autofillMetalCost = useCallback(
    (idx: number) => {
      if (!marketRates?.metals) {
        toast({
          title: t("Live rates unavailable"),
          description: t("Market rates are still loading. Please try again in a moment."),
        });
        return;
      }
      const item = lineItems[idx];
      if (!item || !item.metalWeightG || !item.metalType) {
        toast({
          title: t("Missing weight or metal type"),
          description: t("Enter the weight and select a metal type first."),
        });
        return;
      }
      const weightGrams = parseFloat(item.metalWeightG);
      if (!weightGrams || weightGrams <= 0) return;

      // Try exact metal type match, then base metal fallback
      let ratePerGram = marketRates.metals[item.metalType] ||
        marketRates.metals[item.metalType.toLowerCase()];
      if (!ratePerGram) {
        const isGold = item.metalType.startsWith("GOLD");
        const isSilver = item.metalType.startsWith("SILVER");
        const isPlatinum = item.metalType.startsWith("PLATINUM");
        const baseKey = isGold ? "GOLD" : isSilver ? "SILVER" : isPlatinum ? "PLATINUM" : null;
        if (baseKey) {
          ratePerGram = marketRates.metals[baseKey] || marketRates.metals[baseKey.toLowerCase()];
        }
      }

      if (!ratePerGram || ratePerGram <= 0) {
        toast({
          title: t("Rate not available"),
          description: t("No live rate found for this metal type."),
        });
        return;
      }

      const calculatedCost = weightGrams * ratePerGram;
      updateLineItem(idx, "metalCost", calculatedCost.toFixed(2));
      toast({
        title: t("Metal cost autofilled"),
        description: `${weightGrams.toFixed(3)}g × ${currencySymbol}${ratePerGram.toFixed(2)}/g = ${currencySymbol}${calculatedCost.toFixed(2)}`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketRates, lineItems, currencySymbol, t],
  );

  // ── Gemstone helpers ──
  const addGemstone = (itemIdx: number) => {
    const updated = [...lineItems];
    updated[itemIdx].gemstones = [
      ...updated[itemIdx].gemstones,
      emptyGemstone(),
    ];
    setLineItems(updated);
  };

  const removeGemstone = (itemIdx: number, gemIdx: number) => {
    const updated = [...lineItems];
    updated[itemIdx].gemstones = updated[itemIdx].gemstones.filter(
      (_, i) => i !== gemIdx,
    );
    setLineItems(updated);
  };

  const updateGemstone = (
    itemIdx: number,
    gemIdx: number,
    field: keyof GemstoneEntry,
    value: string,
  ) => {
    const updated = [...lineItems];
    updated[itemIdx].gemstones = [...updated[itemIdx].gemstones];
    updated[itemIdx].gemstones[gemIdx] = {
      ...updated[itemIdx].gemstones[gemIdx],
      [field]: value,
    };
    setLineItems(updated);
  };

  // ── Walk-in Quote Import ──
  const [showQuoteImport, setShowQuoteImport] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [shopQuotes, setShopQuotes] = useState<any[]>([]);

  const loadShopQuotes = async () => {
    setQuotesLoading(true);
    try {
      const res = await shopQuotesApi.getAll({ status: "APPROVED" });
      setShopQuotes(res.data?.quotes || res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load quotes" });
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleImportQuote = (quote: any) => {
    if (quote.customerName) setCustomerName(quote.customerName);
    if (quote.customerPhone) {
      setCustomerPhone(quote.customerPhone);
      setPhoneCountryCode(quote.phoneCountryCode || "");
    }
    if (quote.customerEmail) setCustomerEmail(quote.customerEmail);

    const metalLabel =
      quote.jewelleryType || quote.metalType || "Jewellery Item";
    const item = emptyLineItem();
    item.label = metalLabel;
    const matchingCat = INVOICE_CATEGORIES.find(
      (c) => c.value === quote.jewelleryType || c.label === quote.jewelleryType,
    );
    item.category = matchingCat?.value || "OTHER";
    item.metalType = quote.metalType || quote.alloyConfig?.baseMetal || "";
    item.metalWeightG = quote.targetTotalWeightG || "";
    item.metalCost = String(
      quote.metalCostOverride || quote.estimatedTotal?.metalCost || "",
    );
    item.makingCost = String(
      quote.makingChargeOverride || quote.estimatedTotal?.makingCharge || "",
    );

    const gcVal =
      quote.gemstoneCostOverride || quote.estimatedTotal?.gemstoneCost || 0;
    if (gcVal) {
      item.gemstones = [{ ...emptyGemstone(), cost: String(gcVal) }];
    }
    item.details = quote.specialInstructions || "";

    setLineItems([item]);
    setExpandedItems(new Set([0]));
    setShowQuoteImport(false);
    toast({
      title: "Quote imported",
      description: `Imported "${metalLabel}" from walk-in quote`,
    });
  };

  // ── Making charge & Discount ──
  const [makingChargeMode, setMakingChargeMode] = useState<"left" | "right">(
    "left",
  ); // left = %, right = fixed
  const [makingChargeValue, setMakingChargeValue] = useState("");
  const [discountMode, setDiscountMode] = useState<"left" | "right">("right"); // left = %, right = fixed
  const [discountValue, setDiscountValue] = useState("");
  const [tradeInNote, setTradeInNote] = useState("");
  // Tax is shown as a single line by default; jewellers can expand the
  // per-category bifurcation (metal / gemstone / making) on demand.
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // ── Currency converter (Frankfurter API) ──
  const [showConverter, setShowConverter] = useState(false);
  const [convertToCurrency, setConvertToCurrency] = useState("USD");
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState("");

  // Determine the shop's base currency code
  const shopCurrencyCode =
    COUNTRIES.find((c) => c.code === shopCountry)?.currency || "NPR";

  const fetchFxRates = useCallback(async () => {
    setFxLoading(true);
    setFxError("");
    try {
      // Frankfurter API — free, no key needed
      // NPR is not supported by Frankfurter, so we fetch USD base and derive NPR from INR
      const resp = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=USD",
      );
      if (!resp.ok) throw new Error("Frankfurter API error");
      const data = await resp.json();
      const rates: Record<string, number> = { USD: 1, ...data.rates };
      // Derive NPR from INR (fixed ratio ~1.6)
      if (rates.INR && !rates.NPR) {
        rates.NPR = rates.INR * 1.6;
      }
      setFxRates(rates);
    } catch {
      setFxError("Failed to load exchange rates");
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showConverter && Object.keys(fxRates).length === 0) {
      fetchFxRates();
    }
  }, [showConverter, fxRates, fetchFxRates]);

  // Convert amount from shop currency to target
  const convertAmount = useCallback(
    (amount: number, toCurrency: string): number => {
      if (!fxRates[shopCurrencyCode] || !fxRates[toCurrency]) return amount;
      const amountInUsd = amount / fxRates[shopCurrencyCode];
      return amountInUsd * fxRates[toCurrency];
    },
    [fxRates, shopCurrencyCode],
  );

  // ── Notes & terms ──
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Payment due upon delivery. All sales are final.",
  );
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  // Same country selector as tax — payment rails follow invoice country / preference.
  const availablePaymentMethods = useMemo(
    () => getCounterPaymentMethods(invoiceCountry),
    [invoiceCountry],
  );

  useEffect(() => {
    if (!availablePaymentMethods.some((m) => m.value === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]?.value || "CASH");
    }
  }, [availablePaymentMethods, paymentMethod]);

  // Prefill old-gold trade-in credit from calculator handoff
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("tradeInCredit");
    let credit = fromQuery ? parseFloat(fromQuery) : NaN;
    let reason = "";
    const payload = loadTradeInPayload();
    if (payload?.finalCredit && (!Number.isFinite(credit) || credit <= 0)) {
      credit = payload.finalCredit;
    }
    if (payload?.overrideReason) reason = payload.overrideReason;
    if (
      payload?.calculatedCredit &&
      payload.finalCredit !== payload.calculatedCredit
    ) {
      reason =
        reason ||
        `Old gold trade-in (calculated ${payload.calculatedCredit}, applied ${payload.finalCredit})`;
    }
    if (Number.isFinite(credit) && credit > 0) {
      setDiscountMode("right");
      setDiscountValue(String(Math.round(credit)));
      const note =
        reason || `Old gold trade-in credit: ${Math.round(credit)}`;
      setTradeInNote(note);
      setNotes((prev) =>
        prev?.includes("Old gold")
          ? prev
          : [prev, note].filter(Boolean).join("\n"),
      );
    }
  }, []);

  // ── Totals ──
  const subtotal = lineItems.reduce(
    (sum, item) => sum + lineItemTotal(item),
    0,
  );

  const makingChargeAmount = useMemo(() => {
    const val = parseFloat(makingChargeValue) || 0;
    return makingChargeMode === "left" ? subtotal * (val / 100) : val;
  }, [subtotal, makingChargeMode, makingChargeValue]);

  const taxBreakdown = useMemo(() => {
    if (isTaxExempt || lkVatChargeBlocked) {
      return { metalTax: 0, gemstoneTax: 0, makingTax: 0, totalTax: 0 };
    }
    const rates = countryTax.rates;
    let metalTax = 0;
    let gemstoneTax = 0;
    let makingTax = 0;

    for (const item of lineItems) {
      const mc = parseFloat(item.metalCost) || 0;
      const gc = gemstoneTotal(item);
      const mk = parseFloat(item.makingCost) || 0;

      metalTax += mc * item.quantity * rates.PRECIOUS_METAL;
      gemstoneTax += gc * item.quantity * rates.GEMSTONE;
      makingTax += mk * item.quantity * rates.MAKING_CHARGE;
    }

    makingTax += makingChargeAmount * rates.MAKING_CHARGE;

    // Items without breakdown → default rate
    for (const item of lineItems) {
      const mc = parseFloat(item.metalCost) || 0;
      const gc = gemstoneTotal(item);
      const mk = parseFloat(item.makingCost) || 0;
      const tot = lineItemTotal(item);
      if (mc === 0 && gc === 0 && mk === 0 && tot > 0) {
        metalTax += tot * countryTax.defaultRate;
      }
    }

    return {
      metalTax,
      gemstoneTax,
      makingTax,
      totalTax: metalTax + gemstoneTax + makingTax,
    };
  }, [
    lineItems,
    countryTax,
    makingChargeAmount,
    isTaxExempt,
    lkVatChargeBlocked,
  ]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    return discountMode === "left"
      ? (subtotal + makingChargeAmount) * (val / 100)
      : val;
  }, [subtotal, makingChargeAmount, discountMode, discountValue]);

  const total =
    subtotal + makingChargeAmount + taxBreakdown.totalTax - discountAmount;

  // Converted total
  const convertedTotal = useMemo(() => {
    if (!showConverter || !fxRates[convertToCurrency]) return null;
    return convertAmount(total, convertToCurrency);
  }, [showConverter, fxRates, convertToCurrency, total, convertAmount]);

  const convertedSymbol =
    CONVERTIBLE_CURRENCIES.find((c) => c.code === convertToCurrency)?.symbol ||
    convertToCurrency;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!customerName) {
      toast({ variant: "destructive", title: "Missing customer name" });
      return;
    }
    if (lineItems.every((li) => !li.label || lineItemTotal(li) <= 0)) {
      toast({
        variant: "destructive",
        title: "Add at least one valid line item",
      });
      return;
    }
    if (customerType === "B2B" && customerTaxId && taxIdValidation && !taxIdValidation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid tax ID",
        description: taxIdValidation.message || "Check the customer tax ID format",
      });
      return;
    }
    if (invoiceCountry === "LK" && requestTaxInvoice) {
      if (customerType !== "B2B") {
        toast({
          variant: "destructive",
          title: t("Tax invoice requires a VAT-registered purchaser"),
        });
        return;
      }
      if (!sellerHasValidLkTin) {
        toast({
          variant: "destructive",
          title: t("Seller TIN required"),
          description: t("Add a valid 9-digit IRD TIN/VAT registration in KYC or invoice settings."),
        });
        return;
      }
      if (!sellerLkVatVerified) {
        toast({
          variant: "destructive",
          title: t("VAT registration is not verified"),
          description: t("An admin must verify the Sri Lanka VAT registration before a TAX INVOICE can be issued."),
        });
        return;
      }
      if (!taxIdValidation?.valid) {
        toast({
          variant: "destructive",
          title: t("Purchaser TIN required"),
          description: t("A Sri Lanka tax invoice requires the purchaser's valid 9-digit TIN."),
        });
        return;
      }
      if (!supplyDate) {
        toast({
          variant: "destructive",
          title: t("Date of supply required"),
        });
        return;
      }
    }

    setLoading(true);
    try {
      const apiLineItems = lineItems
        .filter((li) => li.label && lineItemTotal(li) > 0)
        .map((li) => {
          const detailParts = [
            li.details,
            li.metalType ? `Metal: ${li.metalType}` : null,
            li.metalWeightG ? `Weight: ${li.metalWeightG}g` : null,
            li.gemstones.length > 0
              ? `Gemstones: ${li.gemstones
                  .map((g) =>
                    [g.type, g.cut, g.caratWeight ? `${g.caratWeight}ct` : null]
                      .filter(Boolean)
                      .join(" "),
                  )
                  .join("; ")}`
              : null,
          ].filter(Boolean);

          // Only send DTO-whitelisted fields — ValidationPipe rejects extras
          // like metalType / metalWeightG / makingCharge.
          return {
            label: li.label,
            category: li.category,
            quantity: li.quantity,
            unitPrice: lineItemTotal(li) / li.quantity,
            amount: lineItemTotal(li),
            details: detailParts.length ? detailParts.join(" · ") : undefined,
          };
        });

      const fullAddress = [
        addressLine1,
        addressLine2,
        [customerCity, pincode].filter(Boolean).join(" - "),
        customerCountry,
      ]
        .filter(Boolean)
        .join(", ");

      const response = await invoicesApi.create({
        walkInCustomerId: selectedWalkInCustomerId || undefined,
        customerName,
        customerPhone: customerPhone
          ? `${phoneCountryCode}${customerPhone}`
          : undefined,
        customerEmail: customerEmail || undefined,
        customerAddress: fullAddress || undefined,
        lineItems: apiLineItems,
        taxRate: isTaxExempt || lkVatChargeBlocked
          ? 0
          : useCustomTaxRate
            ? (parseFloat(customTaxRatePercent) || 0) / 100
            : countryTax.defaultRate,
        taxLabel: isTaxExempt
          ? "Tax Exempt"
          : lkVatChargeBlocked
            ? "VAT not charged - registration not verified"
            : countryTax.taxName || undefined,
        taxBreakdown: {
          metalTax: isTaxExempt || lkVatChargeBlocked ? 0 : taxBreakdown.metalTax,
          gemstoneTax: isTaxExempt || lkVatChargeBlocked ? 0 : taxBreakdown.gemstoneTax,
          makingTax: isTaxExempt || lkVatChargeBlocked ? 0 : taxBreakdown.makingTax,
          totalTax: isTaxExempt || lkVatChargeBlocked ? 0 : taxBreakdown.totalTax,
          country: invoiceCountry,
          isMockInsured,
          lkTaxInvoice: isLkTaxInvoice,
          sellerTaxId: invoiceCountry === "LK" ? sellerLkTaxId || undefined : undefined,
          supplyDate: invoiceCountry === "LK" ? supplyDate : undefined,
          placeOfSupply: invoiceCountry === "LK" ? placeOfSupply || undefined : undefined,
          purchaserVatRegistered: invoiceCountry === "LK" ? customerType === "B2B" : undefined,
        },
        // Tax filing
        isTaxExempt,
        taxExemptReason: isTaxExempt ? taxExemptReason : undefined,
        customerType,
        taxInvoiceRequested:
          invoiceCountry === "LK" ? requestTaxInvoice : undefined,
        customerTaxId: customerTaxId || undefined,
        invoiceCountry,
        placeOfSupply: placeOfSupply || undefined,
        supplyDate: invoiceCountry === "LK" ? supplyDate : undefined,
        makingChargesAmt: makingChargeAmount || undefined,
        discountAmount: discountAmount || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        paymentMethod,
      });

      toast({
        title: "Invoice Created",
        description: `Invoice ${response.data.invoiceNumber} has been created`,
      });
      // Redirect to invoice detail page (has Print & Pay)
      router.push(`/dashboard/shop/invoices/${response.data.id}?created=true`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create invoice",
        description: error.response?.data?.message || "Error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Main invoice form */}
          <div className="space-y-6 flex-1 min-w-0 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold"><T>Create Invoice</T></h1>
              <p className="text-muted-foreground text-sm">
                <T>Generate a new invoice for a customer</T>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowQuoteImport(true);
                loadShopQuotes();
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Import from Quote
            </Button>
          </div>

          {/* Sandbox / unverified warning banner — non-blocking */}
          {isShopUnverified && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/40 dark:border-amber-700/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">
                    {isSandboxMode
                      ? `KYC Sandbox Mode — ${daysLeftVal} ${daysLeftVal === 1 ? 'day' : 'days'} left`
                      : 'Verify your shop to remove the bill watermark'}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                    You can keep creating invoices freely. Generated bills will print with a bold watermark <span className="font-semibold text-red-500">DEMO BILL - NOT FOR COMMERCIAL SALE</span> until your shop's business verification is completed.
                    <span className="block mt-1 font-medium text-amber-900 dark:text-amber-200">
                      💡 Tax ID Bypass: Providing a valid Customer Tax ID (GST/VAT/PAN) below will automatically suppress the watermark on prints.
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100/40 h-8 text-xs font-semibold whitespace-nowrap"
                  onClick={() => router.push("/dashboard/shop/kyc")}
                >
                  Complete KYC Now
                </Button>
              </div>
            </div>
          )}

          {/* Quote Import Modal */}
          {showQuoteImport && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Import from Walk-in Quote
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuoteImport(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Select an approved quote to pre-fill invoice details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading quotes...
                  </div>
                ) : shopQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No approved quotes found
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {shopQuotes.map((quote: any) => (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#161B22] rounded-lg border hover:border-amber-300 cursor-pointer transition-colors"
                        onClick={() => handleImportQuote(quote)}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {quote.jewelleryType || "Jewellery"} —{" "}
                            {quote.customerName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.metalType} • {quote.targetTotalWeightG}g •{" "}
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Country & Tax */}
          <Card data-tour="invoice-create-country">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <T>Country &amp; Tax</T>
              </CardTitle>
              <CardDescription>
                <T>Tax is auto-calculated per category based on country</T>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label><T>Invoice Country</T></Label>
                  <select
                    value={invoiceCountry}
                    onChange={(e) => setInvoiceCountry(e.target.value)}
                    className="w-full h-10 px-3 text-sm border rounded-md bg-background"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tax Rates ({countryTax.taxName})</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded text-xs">
                      <span className="text-amber-700 dark:text-amber-300">
                        Metal
                      </span>
                      <span className="font-medium">
                        {(countryTax.rates.PRECIOUS_METAL * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 rounded text-xs">
                      <span className="text-purple-700 dark:text-purple-300">
                        Gemstone
                      </span>
                      <span className="font-medium">
                        {(countryTax.rates.GEMSTONE * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded text-xs">
                      <span className="text-blue-700 dark:text-blue-300">
                        Making
                      </span>
                      <span className="font-medium">
                        {(countryTax.rates.MAKING_CHARGE * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded text-xs">
                      <span className="text-green-700 dark:text-green-300">
                        Finish
                      </span>
                      <span className="font-medium">
                        {(countryTax.rates.FINISH * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tax filing controls ───────────────────────────── */}
              <div className="mt-4 pt-4 border-t space-y-4">
                {/* B2B/B2C selector + country-aware tax ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label><T>Customer Type</T></Label>
                    <div className="flex gap-2 mt-1">
                      {(["B2C", "B2B"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setCustomerType(t);
                            if (t === "B2C") setRequestTaxInvoice(false);
                            // Clear tax ID when switching type — GSTIN ≠ PAN etc.
                            setCustomerTaxId("");
                          }}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border transition ${
                            customerType === t
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold"
                              : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          }`}
                        >
                          <T>
                            {t === "B2C"
                              ? "Consumer (B2C)"
                              : invoiceCountry === "LK"
                                ? "VAT-registered business (B2B)"
                                : "Business (B2B)"}
                          </T>
                        </button>
                      ))}
                    </div>
                  </div>
                  {taxIdKind ? (
                    <div>
                      <Label>
                        <T>
                          {customerType === "B2B"
                            ? `${taxIdLabelForKind(taxIdKind)} (business)`
                            : `${taxIdLabelForKind(taxIdKind)} (optional)`}
                        </T>
                        {invoiceCountry === "LK" && requestTaxInvoice && (
                          <span className="text-xs text-amber-600 ml-1">
                            <T>— required for TAX INVOICE</T>
                          </span>
                        )}
                      </Label>
                      <Input
                        value={customerTaxId}
                        onChange={(e) => setCustomerTaxId(e.target.value.toUpperCase())}
                        placeholder={
                          taxIdKind === "GSTIN"
                            ? "22AAAAA0000A1Z5"
                            : taxIdKind === "PAN_IN"
                              ? "ABCDE1234F"
                              : taxIdKind === "TRN_AE"
                                ? "100123456700003"
                                : taxIdKind === "VAT_GB"
                                  ? "GB123456789"
                                  : taxIdKind === "PAN_NP"
                                    ? "123456789"
                                    : taxIdKind === "TIN_LK"
                                      ? "123456789"
                                      : taxIdKind === "EIN_US"
                                        ? "12-3456789"
                                        : "Tax ID"
                        }
                        inputMode={
                          taxIdKind === "TIN_LK" || taxIdKind === "PAN_NP"
                            ? "numeric"
                            : undefined
                        }
                        maxLength={
                          taxIdKind === "TIN_LK" || taxIdKind === "PAN_NP"
                            ? 9
                            : taxIdKind === "PAN_IN"
                              ? 10
                              : taxIdKind === "GSTIN"
                                ? 15
                                : undefined
                        }
                        className={
                          taxIdValidation && !taxIdValidation.valid
                            ? "border-red-400 focus-visible:ring-red-400"
                            : taxIdValidation?.valid
                              ? "border-green-400"
                              : ""
                        }
                      />
                      {customerType === "B2C" && taxIdKind === "PAN_IN" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <T>
                            Consumers use PAN. GSTIN is only for B2B businesses.
                          </T>
                        </p>
                      )}
                      {customerType === "B2B" && taxIdKind === "GSTIN" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <T>
                            Enter the buyer&apos;s GSTIN for B2B / GST filing.
                          </T>
                        </p>
                      )}
                      {taxIdValidation && (
                        <p
                          className={`text-xs mt-1 ${
                            taxIdValidation.valid
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {taxIdValidation.valid
                            ? `✓ Valid${taxIdValidation.stateCode ? ` · State ${taxIdValidation.stateCode}` : ""}`
                            : taxIdValidation.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center">
                      <T>
                        No customer tax ID needed for B2C in this market. Switch
                        to B2B to enter a business VAT / tax registration.
                      </T>
                    </div>
                  )}
                </div>

                {invoiceCountry === "LK" && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                    <label className="flex items-start gap-3" htmlFor="lk-tax-invoice">
                      <input
                        id="lk-tax-invoice"
                        type="checkbox"
                        className="mt-1"
                        checked={requestTaxInvoice}
                        disabled={
                          customerType !== "B2B" ||
                          !sellerHasValidLkTin ||
                          !sellerLkVatVerified
                        }
                        onChange={(event) => setRequestTaxInvoice(event.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          <T>Issue a Sri Lanka TAX INVOICE</T>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          <T>
                            Use this only for a VAT-registered B2B purchaser. A valid
                            9-digit seller TIN and purchaser TIN are required.
                          </T>
                        </span>
                      </span>
                    </label>
                    {!sellerHasValidLkTin && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        <T>
                          Add a valid 9-digit seller IRD TIN/VAT registration in KYC
                          or invoice settings to enable TAX INVOICE.
                        </T>
                      </p>
                    )}
                    {sellerHasValidLkTin && !sellerLkVatVerified && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        <T>VAT registration status</T>: {sellerVatRegistrationStatus.replace(/_/g, " ")}.{" "}
                        <T>
                          VAT will not be charged and TAX INVOICE remains disabled
                          until an admin verifies the registration.
                        </T>
                      </p>
                    )}
                    {customerType === "B2C" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <T>
                          B2C sales remain ordinary invoices or receipts; output VAT
                          is still calculated.
                        </T>
                      </p>
                    )}
                  </div>
                )}

                {invoiceCountry === "LK" && requestTaxInvoice && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lk-supply-date">
                        <T>Date of supply</T> *
                      </Label>
                      <Input
                        id="lk-supply-date"
                        type="date"
                        value={supplyDate}
                        onChange={(event) => setSupplyDate(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lk-place-of-supply">
                        <T>Place of supply (optional)</T>
                      </Label>
                      <Input
                        id="lk-place-of-supply"
                        value={placeOfSupply}
                        onChange={(event) => setPlaceOfSupply(event.target.value)}
                        placeholder={t("e.g. Colombo")}
                      />
                    </div>
                  </div>
                )}

                {/* India: Place of Supply for IGST detection */}
                {invoiceCountry === "IN" && customerType === "B2B" && (
                  <div>
                    <Label>Place of Supply (state for IGST detection)</Label>
                    <Input
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      placeholder="e.g. Maharashtra, Karnataka"
                    />
                  </div>
                )}

                {/* Custom tax-rate override */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="custom-tax-rate"
                    checked={useCustomTaxRate}
                    onChange={(e) => setUseCustomTaxRate(e.target.checked)}
                    className="mt-1"
                    disabled={isTaxExempt || lkVatChargeBlocked}
                  />
                  <div className="flex-1">
                    <label htmlFor="custom-tax-rate" className="text-sm font-medium cursor-pointer">
                      Override default tax rate
                    </label>
                    {useCustomTaxRate && !isTaxExempt && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={customTaxRatePercent}
                          onChange={(e) => setCustomTaxRatePercent(e.target.value)}
                          placeholder="0.00"
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax-exempt toggle */}
                <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                  <input
                    type="checkbox"
                    id="tax-exempt"
                    checked={isTaxExempt}
                    onChange={(e) => setIsTaxExempt(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="tax-exempt" className="text-sm font-medium cursor-pointer">
                      Mark as tax-exempt
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Force tax to zero. Use for exports, composite dealers, investment gold, or below-threshold sales.
                    </p>
                    {isTaxExempt && (
                      <select
                        value={taxExemptReason}
                        onChange={(e) => setTaxExemptReason(e.target.value)}
                        className="mt-2 w-full md:w-72 h-9 px-2 text-sm border rounded-md bg-background"
                      >
                        {TAX_EXEMPT_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card data-tour="invoice-create-customer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                <T>Customer Details</T>
              </CardTitle>
              <CardDescription>
                <T>Start typing phone number to search existing &amp; registered customers</T>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label>Country Code</Label>
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => {
                      setPhoneCountryCode(e.target.value);
                      if (customerPhone.length >= 3)
                        searchCustomers(e.target.value, customerPhone);
                    }}
                    className="w-full h-10 px-2 text-sm border rounded-md bg-background"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.phone}>
                        {c.phone} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 relative" ref={suggestionsRef}>
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Input
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onFocus={() => {
                        if (customerSuggestions.length > 0)
                          setShowSuggestions(true);
                      }}
                      placeholder="Start typing to search..."
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-white dark:bg-[#161B22] border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {customerSuggestions.map((cust) => (
                        <button
                          type="button"
                          key={cust.id}
                          className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer border-b last:border-b-0 transition-colors text-left"
                          onMouseDown={(e) => {
                            // Prevent input blur from closing before selection lands
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectCustomer(cust);
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              {cust.name}
                              {cust.isRegistered && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200">
                                  Registered
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cust.phone}
                              {cust.city && ` • ${cust.city}`}
                            </p>
                          </div>
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-4">
                  <Label>Customer Name *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Address Line 1</Label>
                  <Input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House/Building number, locality"
                  />
                </div>
                <div>
                  <Label>Address Line 2 (Street)</Label>
                  <Input
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Street name, area"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Pincode / ZIP</Label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Pincode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card data-tour="invoice-create-items">
            <CardHeader className="pb-3">
              <CardTitle className="text-base"><T>Line Items</T></CardTitle>
              <CardDescription>
                Add jewellery items with metal &amp; gemstone cost breakdowns.
                Tax applies per category automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, idx) => {
                const itemAmount = lineItemTotal(item);
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    {/* Compact row: Item name + Category + Amount + controls */}
                    <div
                      className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer"
                      onClick={() => toggleExpanded(idx)}
                    >
                      <div className="flex-1 min-w-0">
                        <Input
                          value={item.label}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateLineItem(idx, "label", e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Item name (e.g. Gold Necklace)"
                          className="text-sm"
                        />
                      </div>
                      <select
                        value={item.category}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateLineItem(idx, "category", e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-32 h-10 px-2 text-sm border rounded-md bg-background"
                      >
                        {INVOICE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <div className="w-40 h-10 px-3 flex items-center justify-end text-sm font-semibold bg-gray-50 dark:bg-gray-800/50 border rounded-md">
                        {currencySymbol} {itemAmount.toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(idx);
                        }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedItems.has(idx) ? "rotate-180" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLineItem(idx);
                        }}
                        disabled={lineItems.length <= 1}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>

                    {/* Expanded details */}
                    {expandedItems.has(idx) && (
                      <div className="p-3 pt-2 border-t bg-white dark:bg-[#161B22] space-y-3">
                        {/* Quantity */}
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(
                                  idx,
                                  "quantity",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              min={1}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Notes / Details</Label>
                            <Input
                              value={item.details}
                              onChange={(e) =>
                                updateLineItem(idx, "details", e.target.value)
                              }
                              placeholder="Additional notes"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>

                        {/* Metal details */}
                        <div>
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                            Metal Details
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs"><T>Metal Type</T></Label>
                              <select
                                value={item.metalType}
                                onChange={(e) =>
                                  updateLineItem(
                                    idx,
                                    "metalType",
                                    e.target.value,
                                  )
                                }
                                className="w-full h-9 px-2 text-xs border rounded-md bg-background"
                              >
                                <option value="">— Select —</option>
                                {METAL_TYPES.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <Label className="text-xs">
                                  {t("Weight")} ({weightUnitSymbol})
                                </Label>
                                <div className="flex items-center gap-1">
                                  {supportedWeightUnits.length > 1 && (
                                    <Select
                                      value={selectedWeightUnit}
                                      onValueChange={(v) => setWeightUnit(v as WeightUnit)}
                                    >
                                      <SelectTrigger className="h-6 w-16 text-[10px] px-1">
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
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setScaleItemIdx(
                                        scaleItemIdx === idx ? null : idx,
                                      )
                                    }
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
                                      scaleItemIdx === idx
                                        ? "bg-amber-100 border-amber-400 text-amber-700 dark:text-amber-300"
                                        : "bg-muted border-border text-muted-foreground hover:bg-accent"
                                    }`}
                                  >
                                    <Scale className="h-3 w-3" />
                                    {t("Scale")}
                                  </button>
                                </div>
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                value={
                                  item.metalWeightG
                                    ? gramsToDisplay(parseFloat(item.metalWeightG) || 0).toFixed(3)
                                    : ""
                                }
                                onChange={(e) => {
                                  const displayVal = parseFloat(e.target.value) || 0;
                                  const gramsVal = displayToGrams(displayVal);
                                  updateLineItem(
                                    idx,
                                    "metalWeightG",
                                    gramsVal.toFixed(3),
                                  );
                                }}
                                placeholder="0.00"
                                className="h-9 text-xs"
                              />
                              {selectedWeightUnit !== "GRAM" && item.metalWeightG && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  = {(parseFloat(item.metalWeightG) || 0).toFixed(3)}g
                                </p>
                              )}
                              {scaleItemIdx === idx && (
                                <div className="mt-2">
                                  <WeighingScalePanel
                                    compact
                                    onWeightCapture={(weightGrams) => {
                                      updateLineItem(
                                        idx,
                                        "metalWeightG",
                                        weightGrams.toFixed(3),
                                      );
                                      toast({
                                        title: t("Weight Captured"),
                                        description: `${weightGrams.toFixed(3)}g ${t("captured from scale")}`,
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <Label className="text-xs">
                                  {t("Metal Cost")} ({currencySymbol})
                                </Label>
                                <button
                                  type="button"
                                  onClick={() => autofillMetalCost(idx)}
                                  disabled={marketRatesLoading || !marketRates}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
                                    marketRates
                                      ? "bg-emerald-100 border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200"
                                      : "bg-muted border-border text-muted-foreground"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={t("Autofill from live market rate")}
                                >
                                  <Zap className="h-3 w-3" />
                                  {marketRatesLoading ? "..." : t("Live")}
                                </button>
                              </div>
                              <Input
                                type="number"
                                value={item.metalCost}
                                onChange={(e) =>
                                  updateLineItem(
                                    idx,
                                    "metalCost",
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Gemstones (multiple) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                              Gemstones{" "}
                              {item.gemstones.length > 0 &&
                                `(${item.gemstones.length})`}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addGemstone(idx)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Gemstone
                            </Button>
                          </div>

                          {item.gemstones.length === 0 && (
                            <p className="text-xs text-muted-foreground italic py-2">
                              No gemstones added. Click &ldquo;Add
                              Gemstone&rdquo; to include one.
                            </p>
                          )}

                          {item.gemstones.map((gem, gIdx) => (
                            <div
                              key={gIdx}
                              className="border rounded p-2 mb-2 bg-purple-50/30 dark:bg-purple-950/30"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                  Gemstone #{gIdx + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeGemstone(idx, gIdx)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <select
                                    value={gem.type}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "type",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                                  >
                                    <option value="">— Select —</option>
                                    {GEMSTONE_TYPES.map((g) => (
                                      <option key={g} value={g}>
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Cut</Label>
                                  <select
                                    value={gem.cut}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "cut",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                                  >
                                    <option value="">—</option>
                                    {GEMSTONE_CUTS.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Clarity</Label>
                                  <select
                                    value={gem.clarity}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "clarity",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                                  >
                                    <option value="">—</option>
                                    {GEMSTONE_CLARITIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Carat</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={gem.caratWeight}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "caratWeight",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Color</Label>
                                  <Input
                                    value={gem.color}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "color",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g. D, E, F"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">
                                    Cost ({currencySymbol})
                                  </Label>
                                  <Input
                                    type="number"
                                    value={gem.cost}
                                    onChange={(e) =>
                                      updateGemstone(
                                        idx,
                                        gIdx,
                                        "cost",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Cost summary */}
                        {itemAmount > 0 && (
                          <div className="pt-1 border-t space-y-1">
                            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                              <span>
                                Metal: {currencySymbol}{" "}
                                {(
                                  parseFloat(item.metalCost) || 0
                                ).toLocaleString()}
                              </span>
                              <span>
                                Gemstones: {currencySymbol}{" "}
                                {gemstoneTotal(item).toLocaleString()}
                              </span>
                              <span>
                                Making: {currencySymbol}{" "}
                                {(
                                  parseFloat(item.makingCost) || 0
                                ).toLocaleString()}
                              </span>
                              {item.quantity > 1 && (
                                <span>× {item.quantity}</span>
                              )}
                              <span className="font-medium text-foreground">
                                = {currencySymbol} {itemAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex gap-4 text-xs text-blue-600 dark:text-blue-400 flex-wrap">
                              <span>
                                Metal tax:{" "}
                                {(
                                  countryTax.rates.PRECIOUS_METAL * 100
                                ).toFixed(1)}
                                % = {currencySymbol}{" "}
                                {(
                                  (parseFloat(item.metalCost) || 0) *
                                  item.quantity *
                                  countryTax.rates.PRECIOUS_METAL
                                ).toLocaleString()}
                              </span>
                              {gemstoneTotal(item) > 0 && (
                                <span>
                                  Gem tax:{" "}
                                  {(countryTax.rates.GEMSTONE * 100).toFixed(1)}
                                  % = {currencySymbol}{" "}
                                  {(
                                    gemstoneTotal(item) *
                                    item.quantity *
                                    countryTax.rates.GEMSTONE
                                  ).toLocaleString()}
                                </span>
                              )}
                              {(parseFloat(item.makingCost) || 0) > 0 && (
                                <span>
                                  Making tax:{" "}
                                  {(
                                    countryTax.rates.MAKING_CHARGE * 100
                                  ).toFixed(1)}
                                  % = {currencySymbol}{" "}
                                  {(
                                    (parseFloat(item.makingCost) || 0) *
                                    item.quantity *
                                    countryTax.rates.MAKING_CHARGE
                                  ).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" /> <T>Add Line Item</T>
              </Button>

              <Separator />

              {/* Totals */}
              <div className="flex justify-end" data-tour="invoice-create-totals">
                <div className="w-[420px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span><T>Subtotal</T></span>
                    <span className="font-medium">
                      {currencySymbol} {subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Making Charge — pill toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400 w-28 flex-shrink-0">
                      <T>Making Charge</T>
                    </span>
                    <ModeToggle
                      value={makingChargeMode}
                      onChange={setMakingChargeMode}
                      leftLabel="%"
                      rightLabel={currencySymbol}
                      activeColor="bg-blue-600"
                    />
                    <Input
                      className="w-24 text-xs"
                      type="number"
                      value={makingChargeValue}
                      onChange={(e) => setMakingChargeValue(e.target.value)}
                      placeholder="0"
                    />
                    {makingChargeAmount > 0 && (
                      <span className="text-sm ml-auto">
                        +{currencySymbol} {makingChargeAmount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Tax — single line by default, breakdown on demand */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <button
                        type="button"
                        onClick={() => setShowTaxBreakdown((v) => !v)}
                        className="flex items-center gap-1 text-left hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        aria-expanded={showTaxBreakdown}
                      >
                        <span>{countryTax.taxName}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${showTaxBreakdown ? "rotate-180" : ""}`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {showTaxBreakdown ? "Hide breakdown" : "View breakdown"}
                        </span>
                      </button>
                      <span className="font-medium">
                        {currencySymbol}{" "}
                        {taxBreakdown.totalTax.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {showTaxBreakdown && (
                      <div className="space-y-1 pl-3 border-l-2 border-amber-100 dark:border-amber-900/40 ml-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {countryTax.taxName} on Metal (
                            {(countryTax.rates.PRECIOUS_METAL * 100).toFixed(1)}%)
                          </span>
                          <span>
                            {currencySymbol}{" "}
                            {taxBreakdown.metalTax.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {taxBreakdown.gemstoneTax > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {countryTax.taxName} on Gemstone (
                              {(countryTax.rates.GEMSTONE * 100).toFixed(1)}%)
                            </span>
                            <span>
                              {currencySymbol}{" "}
                              {taxBreakdown.gemstoneTax.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                        {taxBreakdown.makingTax > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {countryTax.taxName} on Making (
                              {(countryTax.rates.MAKING_CHARGE * 100).toFixed(1)}%)
                            </span>
                            <span>
                              {currencySymbol}{" "}
                              {taxBreakdown.makingTax.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount — pill toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400 w-28 flex-shrink-0">
                      <T>Discount</T>
                      {tradeInNote ? (
                        <span className="block text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                          <T>Old gold</T>
                        </span>
                      ) : null}
                    </span>
                    <ModeToggle
                      value={discountMode}
                      onChange={setDiscountMode}
                      leftLabel="%"
                      rightLabel={currencySymbol}
                      activeColor="bg-green-600"
                    />
                    <Input
                      className="w-24 text-xs"
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                    />
                    {discountAmount > 0 && (
                      <span className="text-sm text-green-600 dark:text-green-400 ml-auto">
                        -{currencySymbol} {discountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span><T>Total</T></span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {currencySymbol}{" "}
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Currency Converter */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showConverter}
                        onChange={(e) => setShowConverter(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-muted-foreground">
                        Show total in a different currency
                      </span>
                    </label>

                    {showConverter && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-24 flex-shrink-0">
                            Convert to
                          </Label>
                          <select
                            value={convertToCurrency}
                            onChange={(e) =>
                              setConvertToCurrency(e.target.value)
                            }
                            className="flex-1 h-8 px-2 text-xs border rounded-md bg-background"
                          >
                            {CONVERTIBLE_CURRENCIES.filter(
                              (c) => c.code !== shopCurrencyCode,
                            ).map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.symbol} {c.code} — {c.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={fetchFxRates}
                            disabled={fxLoading}
                            title="Refresh rates"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${fxLoading ? "animate-spin" : ""}`}
                            />
                          </Button>
                        </div>
                        {fxError && (
                          <p className="text-xs text-red-500">{fxError}</p>
                        )}
                        {fxLoading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading
                            rates...
                          </div>
                        ) : convertedTotal !== null ? (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              1 {shopCurrencyCode} ≈{" "}
                              {convertAmount(1, convertToCurrency).toFixed(4)}{" "}
                              {convertToCurrency}
                            </span>
                            <span className="font-bold text-lg text-amber-600 dark:text-amber-400">
                              {convertedSymbol}{" "}
                              {convertedTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground opacity-60">
                          Rates from Frankfurter API (free) • For reference only
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mock Jewelry Insurance Toggle */}
          <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                🛡️ Orivraa Protection
              </CardTitle>
              <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80">
                Enable complementary third-party jewelry insurance and safe custody certification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-[#161B22] border rounded-lg hover:border-emerald-400 transition-colors">
                <input
                  type="checkbox"
                  id="mock-insurance"
                  checked={isMockInsured}
                  onChange={(e) => setIsMockInsured(e.target.checked)}
                  className="mt-1 accent-emerald-600"
                />
                <div className="flex-1">
                  <label htmlFor="mock-insurance" className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer block">
                    Add Orivraa Jewelry Insurance
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complementary gold &amp; diamond damage, burglary and theft protection underwritten by premium Orivraa bank partners. Activates a green-gold certified security shield on the receipt.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>
                  <T>Payment Method</T>
                </Label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availablePaymentMethods.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        paymentMethod === pm.value
                          ? "bg-amber-50 border-amber-500 text-amber-700"
                          : "border-gray-100 text-gray-600 bg-white hover:border-gray-200"
                      }`}
                    >
                      <T>{pm.label}</T>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label><T>Notes</T></Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the customer..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-2 pb-8">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              <T>Create Invoice</T>
            </Button>
          </div>
        </div>
          {/* Sticky live rates sidebar — invoice page only */}
          <div className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <LiveRatesWidget
                rates={marketRates}
                loading={marketRatesLoading}
                currencySymbol={currencyInfo.symbol}
                onRefresh={fetchMarketRates}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
