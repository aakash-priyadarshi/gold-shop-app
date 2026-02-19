"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WeighingScalePanel } from "@/components/scale/WeighingScalePanel";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { invoicesApi, shopQuotesApi } from "@/lib/api";
import { JEWELLERY_TYPES } from "@/lib/constants/jewellery";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Per-category tax rates by country (mirrors backend DEFAULT_TAX_RATES) ──
const CATEGORY_TAX_RATES: Record<
  string,
  {
    taxType: string;
    taxName: string;
    rates: {
      PRECIOUS_METAL: number;
      MAKING_CHARGE: number;
      GEMSTONE: number;
      FINISH: number;
    };
    defaultRate: number;
  }
> = {
  IN: {
    taxType: "GST",
    taxName: "GST",
    rates: {
      PRECIOUS_METAL: 0.03,
      MAKING_CHARGE: 0.18,
      GEMSTONE: 0.03,
      FINISH: 0.18,
    },
    defaultRate: 0.03,
  },
  NP: {
    taxType: "LUXURY_TAX",
    taxName: "Luxury Tax / VAT",
    rates: {
      PRECIOUS_METAL: 0.02,
      MAKING_CHARGE: 0.02,
      GEMSTONE: 0.13,
      FINISH: 0.02,
    },
    defaultRate: 0.02,
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
};

const COUNTRIES = [
  { code: "IN", name: "India", phone: "+91", currency: "INR" },
  { code: "NP", name: "Nepal", phone: "+977", currency: "NPR" },
  { code: "AE", name: "UAE", phone: "+971", currency: "AED" },
  { code: "US", name: "United States", phone: "+1", currency: "USD" },
  { code: "GB", name: "United Kingdom", phone: "+44", currency: "GBP" },
  { code: "EU", name: "Europe", phone: "+49", currency: "EUR" },
  { code: "AU", name: "Australia", phone: "+61", currency: "AUD" },
];

// Currencies for converter (Frankfurter supported + NPR derived)
const CONVERTIBLE_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "NPR", symbol: "रू", name: "Nepalese Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
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
  const { symbol: currencySymbol, country: shopCountry } = useShopCurrency();
  const [loading, setLoading] = useState(false);

  // ── Country ──
  const [invoiceCountry, setInvoiceCountry] = useState(shopCountry);
  const countryTax =
    CATEGORY_TAX_RATES[invoiceCountry] || CATEGORY_TAX_RATES["IN"];

  // ── Customer ──
  const [customerName, setCustomerName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    COUNTRIES.find((c) => c.code === shopCountry)?.phone || "+91",
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
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      searchCustomers(phoneCountryCode, phone);
    }, 400);
  };

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    setCustomerName(customer.name);
    setPhoneCountryCode(customer.phoneCountryCode);
    setCustomerPhone(customer.phone.replace(customer.phoneCountryCode, ""));
    setCustomerEmail(customer.email || "");
    if (customer.address) {
      const parts = customer.address.split(", ");
      setAddressLine1(parts[0] || "");
      setAddressLine2(parts[1] || "");
    }
    setCustomerCity(customer.city || "");
    setCustomerCountry(customer.country || "");
    setShowSuggestions(false);
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
      setPhoneCountryCode(quote.phoneCountryCode || "+91");
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
  }, [lineItems, countryTax, makingChargeAmount]);

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

    setLoading(true);
    try {
      const apiLineItems = lineItems
        .filter((li) => li.label && lineItemTotal(li) > 0)
        .map((li) => ({
          label: li.label,
          category: li.category,
          quantity: li.quantity,
          unitPrice: lineItemTotal(li) / li.quantity,
          amount: lineItemTotal(li),
          details: li.details,
          metalType: li.metalType || undefined,
          metalWeightG: li.metalWeightG
            ? parseFloat(li.metalWeightG)
            : undefined,
          // First gemstone for backward compat
          gemstoneType: li.gemstones[0]?.type || undefined,
          gemstoneCut: li.gemstones[0]?.cut || undefined,
          gemstoneClarity: li.gemstones[0]?.clarity || undefined,
          gemstoneCaratWeight: li.gemstones[0]?.caratWeight
            ? parseFloat(li.gemstones[0].caratWeight)
            : undefined,
          gemstoneColor: li.gemstones[0]?.color || undefined,
          metalCost: li.metalCost ? parseFloat(li.metalCost) : undefined,
          gemstoneCost: gemstoneTotal(li) || undefined,
          makingCost: li.makingCost ? parseFloat(li.makingCost) : undefined,
          // Full gemstone list as extra data
          gemstones:
            li.gemstones.length > 0
              ? li.gemstones.map((g) => ({
                  type: g.type,
                  cut: g.cut,
                  clarity: g.clarity,
                  caratWeight: g.caratWeight
                    ? parseFloat(g.caratWeight)
                    : undefined,
                  color: g.color,
                  cost: g.cost ? parseFloat(g.cost) : undefined,
                }))
              : undefined,
        }));

      const fullAddress = [
        addressLine1,
        addressLine2,
        [customerCity, pincode].filter(Boolean).join(" - "),
        customerCountry,
      ]
        .filter(Boolean)
        .join(", ");

      const response = await invoicesApi.create({
        customerName,
        customerPhone: customerPhone
          ? `${phoneCountryCode}${customerPhone}`
          : undefined,
        customerEmail: customerEmail || undefined,
        customerAddress: fullAddress || undefined,
        lineItems: apiLineItems,
        taxRate: countryTax.defaultRate,
        taxLabel: countryTax.taxName || undefined,
        taxBreakdown: {
          metalTax: taxBreakdown.metalTax,
          gemstoneTax: taxBreakdown.gemstoneTax,
          makingTax: taxBreakdown.makingTax,
          totalTax: taxBreakdown.totalTax,
          country: invoiceCountry,
        },
        makingCharge: makingChargeAmount || undefined,
        discountAmount: discountAmount || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
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
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Create Invoice</h1>
              <p className="text-muted-foreground text-sm">
                Generate a new invoice for a customer
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Country &amp; Tax
              </CardTitle>
              <CardDescription>
                Tax is auto-calculated per category based on country
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Country</Label>
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
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                Customer Details
              </CardTitle>
              <CardDescription>
                Start typing phone number to search existing &amp; registered
                customers
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
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#161B22] border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customerSuggestions.map((cust) => (
                        <div
                          key={cust.id}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => handleSelectCustomer(cust)}
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
                        </div>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Line Items</CardTitle>
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
                              <Label className="text-xs">Metal Type</Label>
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
                                <Label className="text-xs">Weight (g)</Label>
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
                                  Scale
                                </button>
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.metalWeightG}
                                onChange={(e) =>
                                  updateLineItem(
                                    idx,
                                    "metalWeightG",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="h-9 text-xs"
                              />
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
                                        title: "Weight Captured",
                                        description: `${weightGrams.toFixed(3)}g captured from scale`,
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">
                                Metal Cost ({currencySymbol})
                              </Label>
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

                        {/* Making cost */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">
                              Making Charge ({currencySymbol})
                            </Label>
                            <Input
                              type="number"
                              value={item.makingCost}
                              onChange={(e) =>
                                updateLineItem(
                                  idx,
                                  "makingCost",
                                  e.target.value,
                                )
                              }
                              placeholder="0"
                              className="h-9 text-xs"
                            />
                          </div>
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
                <Plus className="h-4 w-4 mr-2" /> Add Line Item
              </Button>

              <Separator />

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-[420px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {currencySymbol} {subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Making Charge — pill toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400 w-28 flex-shrink-0">
                      Making Charge
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

                  {/* Tax breakdown */}
                  <div className="space-y-1">
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
                    <div className="flex justify-between text-sm">
                      <span>Total Tax</span>
                      <span>
                        {currencySymbol}{" "}
                        {taxBreakdown.totalTax.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Discount — pill toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400 w-28 flex-shrink-0">
                      Discount
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
                    <span>Total</span>
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
                <Label>Notes</Label>
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
              Create Invoice
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
