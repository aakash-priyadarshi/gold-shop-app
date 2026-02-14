"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
  Percent,
  Phone,
  Plus,
  Search,
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
    rates: { PRECIOUS_METAL: 0.03, MAKING_CHARGE: 0.18, GEMSTONE: 0.03, FINISH: 0.18 },
    defaultRate: 0.03,
  },
  NP: {
    taxType: "LUXURY_TAX",
    taxName: "Luxury Tax / VAT",
    rates: { PRECIOUS_METAL: 0.02, MAKING_CHARGE: 0.02, GEMSTONE: 0.13, FINISH: 0.02 },
    defaultRate: 0.02,
  },
  AE: {
    taxType: "VAT",
    taxName: "VAT",
    rates: { PRECIOUS_METAL: 0.05, MAKING_CHARGE: 0.05, GEMSTONE: 0.05, FINISH: 0.05 },
    defaultRate: 0.05,
  },
  US: {
    taxType: "SALES_TAX",
    taxName: "Sales Tax",
    rates: { PRECIOUS_METAL: 0.0, MAKING_CHARGE: 0.0, GEMSTONE: 0.0, FINISH: 0.0 },
    defaultRate: 0.0,
  },
  GB: {
    taxType: "VAT",
    taxName: "VAT",
    rates: { PRECIOUS_METAL: 0.2, MAKING_CHARGE: 0.2, GEMSTONE: 0.2, FINISH: 0.2 },
    defaultRate: 0.2,
  },
  EU: {
    taxType: "VAT",
    taxName: "VAT",
    rates: { PRECIOUS_METAL: 0.19, MAKING_CHARGE: 0.19, GEMSTONE: 0.19, FINISH: 0.19 },
    defaultRate: 0.19,
  },
  AU: {
    taxType: "GST",
    taxName: "GST",
    rates: { PRECIOUS_METAL: 0.1, MAKING_CHARGE: 0.1, GEMSTONE: 0.1, FINISH: 0.1 },
    defaultRate: 0.1,
  },
};

const COUNTRIES = [
  { code: "IN", name: "India", phone: "+91" },
  { code: "NP", name: "Nepal", phone: "+977" },
  { code: "AE", name: "UAE", phone: "+971" },
  { code: "US", name: "United States", phone: "+1" },
  { code: "GB", name: "United Kingdom", phone: "+44" },
  { code: "EU", name: "Europe", phone: "+49" },
  { code: "AU", name: "Australia", phone: "+61" },
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
  "Diamond", "Ruby", "Emerald", "Sapphire", "Pearl", "Opal",
  "Topaz", "Amethyst", "Garnet", "Tourmaline", "Other",
];

const GEMSTONE_CUTS = [
  "Round Brilliant", "Princess", "Oval", "Cushion", "Emerald",
  "Pear", "Marquise", "Radiant", "Heart", "Asscher", "Cabochon", "Other",
];

const GEMSTONE_CLARITIES = [
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3", "N/A",
];

// Jewellery categories from shared constants
const INVOICE_CATEGORIES = JEWELLERY_TYPES.map((jt) => ({
  value: jt.value,
  label: jt.label,
}));

interface RichLineItem {
  label: string;
  category: string; // JEWELLERY_TYPE value (RING, NECKLACE, etc.)
  quantity: number;
  unitPrice: number;
  amount: number;
  details: string;
  // Metal details
  metalType: string;
  metalWeightG: string;
  // Gemstone details
  gemstoneType: string;
  gemstoneCut: string;
  gemstoneClarity: string;
  gemstoneCaratWeight: string;
  gemstoneColor: string;
  // Cost breakdown (used for per-category tax)
  metalCost: string;
  gemstoneCost: string;
  makingCost: string;
}

const emptyLineItem = (): RichLineItem => ({
  label: "",
  category: "RING",
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  details: "",
  metalType: "",
  metalWeightG: "",
  gemstoneType: "",
  gemstoneCut: "",
  gemstoneClarity: "",
  gemstoneCaratWeight: "",
  gemstoneColor: "",
  metalCost: "",
  gemstoneCost: "",
  makingCost: "",
});

interface CustomerSuggestion {
  id: string;
  name: string;
  phone: string;
  phoneCountryCode: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { symbol: currencySymbol, country: shopCountry } = useShopCurrency();

  const [loading, setLoading] = useState(false);

  // ── Country (tax is auto-computed per category) ──
  const [invoiceCountry, setInvoiceCountry] = useState(shopCountry);
  const countryTax = CATEGORY_TAX_RATES[invoiceCountry] || CATEGORY_TAX_RATES["IN"];

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

  // ── Customer live search (partial phone → up to 5 suggestions) ──
  const [isSearching, setIsSearching] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const searchCustomers = useCallback(
    async (pcc: string, phone: string) => {
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
        const result = response.data as { customers: CustomerSuggestion[]; count: number };
        setCustomerSuggestions(result.customers || []);
        setShowSuggestions((result.customers || []).length > 0);
      } catch {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

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
    // Parse stored address — try to split if it was previously formatted
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Line items ──
  const [lineItems, setLineItems] = useState<RichLineItem[]>([emptyLineItem()]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem()]);
    setExpandedItems((prev) => new Set([...Array.from(prev), lineItems.length]));
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
    setExpandedItems((prev) => {
      const next = new Set<number>(Array.from(prev));
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
    value: string | number,
  ) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    // Auto-calculate amount from cost breakdown or qty * unitPrice
    if (["metalCost", "gemstoneCost", "makingCost"].includes(field)) {
      const mc = parseFloat(updated[index].metalCost) || 0;
      const gc = parseFloat(updated[index].gemstoneCost) || 0;
      const mk = parseFloat(updated[index].makingCost) || 0;
      const sum = mc + gc + mk;
      if (sum > 0) {
        updated[index].unitPrice = sum;
        updated[index].amount = sum * updated[index].quantity;
      }
    }
    if (field === "quantity" || field === "unitPrice") {
      updated[index].amount =
        updated[index].quantity * updated[index].unitPrice;
    }
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
    // Pre-fill customer
    if (quote.customerName) setCustomerName(quote.customerName);
    if (quote.customerPhone) {
      setCustomerPhone(quote.customerPhone);
      setPhoneCountryCode(quote.phoneCountryCode || "+91");
    }
    if (quote.customerEmail) setCustomerEmail(quote.customerEmail);

    // Build line items from quote details
    const items: RichLineItem[] = [];
    const metalLabel = quote.jewelleryType || quote.metalType || "Jewellery Item";
    const metalItem = emptyLineItem();
    metalItem.label = metalLabel;
    // Map jewellery type to category
    const matchingCat = INVOICE_CATEGORIES.find(
      (c) => c.value === quote.jewelleryType || c.label === quote.jewelleryType,
    );
    metalItem.category = matchingCat?.value || "OTHER";
    metalItem.metalType = quote.metalType || quote.alloyConfig?.baseMetal || "";
    metalItem.metalWeightG = quote.targetTotalWeightG || "";
    metalItem.metalCost = String(quote.metalCostOverride || quote.estimatedTotal?.metalCost || "");
    metalItem.makingCost = String(quote.makingChargeOverride || quote.estimatedTotal?.makingCharge || "");
    metalItem.gemstoneCost = String(quote.gemstoneCostOverride || quote.estimatedTotal?.gemstoneCost || "");

    const mc = parseFloat(metalItem.metalCost) || 0;
    const gc = parseFloat(metalItem.gemstoneCost) || 0;
    const mk = parseFloat(metalItem.makingCost) || 0;
    metalItem.unitPrice = mc + gc + mk;
    metalItem.amount = metalItem.unitPrice * metalItem.quantity;
    metalItem.details = quote.specialInstructions || "";
    items.push(metalItem);

    setLineItems(items.length > 0 ? items : [emptyLineItem()]);
    setExpandedItems(new Set([0]));
    setShowQuoteImport(false);

    toast({
      title: "Quote imported",
      description: `Imported "${metalLabel}" from walk-in quote`,
    });
  };

  // ── Making charge & Discount (near subtotal) ──
  const [makingChargeMode, setMakingChargeMode] = useState<"percent" | "fixed">("percent");
  const [makingChargeValue, setMakingChargeValue] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState("");

  // ── Notes & terms ──
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Payment due upon delivery. All sales are final.",
  );
  const [dueDate, setDueDate] = useState("");

  // ── Totals (per-category tax) ──
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Making charge computation
  const makingChargeAmount = useMemo(() => {
    const val = parseFloat(makingChargeValue) || 0;
    if (makingChargeMode === "percent") return subtotal * (val / 100);
    return val;
  }, [subtotal, makingChargeMode, makingChargeValue]);

  // Per-category tax breakdown
  const taxBreakdown = useMemo(() => {
    const rates = countryTax.rates;
    let metalTax = 0;
    let gemstoneTax = 0;
    let makingTax = 0;

    // Tax on each line item's cost components
    for (const item of lineItems) {
      const mc = parseFloat(item.metalCost) || 0;
      const gc = parseFloat(item.gemstoneCost) || 0;
      const mk = parseFloat(item.makingCost) || 0;

      metalTax += mc * item.quantity * rates.PRECIOUS_METAL;
      gemstoneTax += gc * item.quantity * rates.GEMSTONE;
      makingTax += mk * item.quantity * rates.MAKING_CHARGE;
    }

    // Tax on global making charge
    makingTax += makingChargeAmount * rates.MAKING_CHARGE;

    // For items without breakdown (only unitPrice set), use default rate
    for (const item of lineItems) {
      const mc = parseFloat(item.metalCost) || 0;
      const gc = parseFloat(item.gemstoneCost) || 0;
      const mk = parseFloat(item.makingCost) || 0;
      if (mc === 0 && gc === 0 && mk === 0 && item.amount > 0) {
        metalTax += item.amount * countryTax.defaultRate;
      }
    }

    const totalTax = metalTax + gemstoneTax + makingTax;

    return {
      metalTax,
      gemstoneTax,
      makingTax,
      totalTax,
    };
  }, [lineItems, countryTax, makingChargeAmount]);

  // Discount computation
  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountMode === "percent") return (subtotal + makingChargeAmount) * (val / 100);
    return val;
  }, [subtotal, makingChargeAmount, discountMode, discountValue]);

  const total = subtotal + makingChargeAmount + taxBreakdown.totalTax - discountAmount;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!customerName) {
      toast({ variant: "destructive", title: "Missing customer name" });
      return;
    }
    if (lineItems.every((li) => !li.label || li.amount <= 0)) {
      toast({ variant: "destructive", title: "Add at least one valid line item" });
      return;
    }

    setLoading(true);
    try {
      // Build flat line items for API
      const apiLineItems = lineItems
        .filter((li) => li.label && li.amount > 0)
        .map((li) => ({
          label: li.label,
          category: li.category,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.amount,
          details: li.details,
          metalType: li.metalType || undefined,
          metalWeightG: li.metalWeightG ? parseFloat(li.metalWeightG) : undefined,
          gemstoneType: li.gemstoneType || undefined,
          gemstoneCut: li.gemstoneCut || undefined,
          gemstoneClarity: li.gemstoneClarity || undefined,
          gemstoneCaratWeight: li.gemstoneCaratWeight
            ? parseFloat(li.gemstoneCaratWeight)
            : undefined,
          gemstoneColor: li.gemstoneColor || undefined,
          metalCost: li.metalCost ? parseFloat(li.metalCost) : undefined,
          gemstoneCost: li.gemstoneCost ? parseFloat(li.gemstoneCost) : undefined,
          makingCost: li.makingCost ? parseFloat(li.makingCost) : undefined,
        }));

      // Format structured address for billing
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
      router.push(`/dashboard/shop/invoices/${response.data.id}`);
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
                        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-amber-300 cursor-pointer transition-colors"
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

          {/* Country Selection (tax is automatic per category) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Country &amp; Tax
              </CardTitle>
              <CardDescription>
                Tax is auto-calculated per category based on the country
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
                    <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs">
                      <span className="text-amber-700">Metal</span>
                      <span className="font-medium">{(countryTax.rates.PRECIOUS_METAL * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50 border border-purple-200 rounded text-xs">
                      <span className="text-purple-700">Gemstone</span>
                      <span className="font-medium">{(countryTax.rates.GEMSTONE * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="text-blue-700">Making</span>
                      <span className="font-medium">{(countryTax.rates.MAKING_CHARGE * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs">
                      <span className="text-green-700">Finish</span>
                      <span className="font-medium">{(countryTax.rates.FINISH * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details with Live Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                Customer Details
              </CardTitle>
              <CardDescription>
                Start typing phone number to search existing customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone row with live suggestions */}
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
                        if (customerSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Start typing to search..."
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {/* Live suggestions dropdown */}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customerSuggestions.map((cust) => (
                        <div
                          key={cust.id}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => handleSelectCustomer(cust)}
                        >
                          <div>
                            <p className="text-sm font-medium">{cust.name}</p>
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

              {/* Email & Country */}
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

              {/* Structured Address */}
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
                Add jewellery items with metal &amp; gemstone cost breakdowns. Tax is applied per category automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Compact row */}
                  <div className="grid grid-cols-12 gap-2 items-center p-3 bg-muted/30">
                    <div className="col-span-3">
                      {idx === 0 && (
                        <Label className="text-xs text-muted-foreground">
                          Item
                        </Label>
                      )}
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          updateLineItem(idx, "label", e.target.value)
                        }
                        placeholder="Item name"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && (
                        <Label className="text-xs text-muted-foreground">
                          Category
                        </Label>
                      )}
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateLineItem(idx, "category", e.target.value)
                        }
                        className="w-full h-10 px-2 text-sm border rounded-md bg-background"
                      >
                        {INVOICE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && (
                        <Label className="text-xs text-muted-foreground">
                          Qty
                        </Label>
                      )}
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            idx,
                            "quantity",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        min={1}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && (
                        <Label className="text-xs text-muted-foreground">
                          Unit Price
                        </Label>
                      )}
                      <Input
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateLineItem(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && (
                        <Label className="text-xs text-muted-foreground">
                          Amount
                        </Label>
                      )}
                      <div className="h-10 px-3 flex items-center text-sm font-medium bg-gray-50 border rounded-md">
                        {currencySymbol} {item.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-1 items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(idx)}
                        className="flex-shrink-0"
                        title="Toggle details"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedItems.has(idx) ? "rotate-180" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length <= 1}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedItems.has(idx) && (
                    <div className="p-3 pt-2 border-t bg-white space-y-3">
                      {/* Metal details */}
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-2">
                          Metal Details
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Metal Type</Label>
                            <select
                              value={item.metalType}
                              onChange={(e) =>
                                updateLineItem(idx, "metalType", e.target.value)
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
                            <Label className="text-xs">Weight (g)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.metalWeightG}
                              onChange={(e) =>
                                updateLineItem(idx, "metalWeightG", e.target.value)
                              }
                              placeholder="0.00"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              Metal Cost ({currencySymbol})
                            </Label>
                            <Input
                              type="number"
                              value={item.metalCost}
                              onChange={(e) =>
                                updateLineItem(idx, "metalCost", e.target.value)
                              }
                              placeholder="0"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gemstone details */}
                      <div>
                        <p className="text-xs font-semibold text-purple-700 mb-2">
                          Gemstone Details
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Gemstone</Label>
                            <select
                              value={item.gemstoneType}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneType", e.target.value)
                              }
                              className="w-full h-9 px-2 text-xs border rounded-md bg-background"
                            >
                              <option value="">— None —</option>
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
                              value={item.gemstoneCut}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneCut", e.target.value)
                              }
                              className="w-full h-9 px-2 text-xs border rounded-md bg-background"
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
                              value={item.gemstoneClarity}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneClarity", e.target.value)
                              }
                              className="w-full h-9 px-2 text-xs border rounded-md bg-background"
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
                            <Label className="text-xs">Carat Weight</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.gemstoneCaratWeight}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneCaratWeight", e.target.value)
                              }
                              placeholder="0.00"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Color</Label>
                            <Input
                              value={item.gemstoneColor}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneColor", e.target.value)
                              }
                              placeholder="e.g. D, E, F"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              Gemstone Cost ({currencySymbol})
                            </Label>
                            <Input
                              type="number"
                              value={item.gemstoneCost}
                              onChange={(e) =>
                                updateLineItem(idx, "gemstoneCost", e.target.value)
                              }
                              placeholder="0"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Making cost & notes */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">
                            Making Charge ({currencySymbol})
                          </Label>
                          <Input
                            type="number"
                            value={item.makingCost}
                            onChange={(e) =>
                              updateLineItem(idx, "makingCost", e.target.value)
                            }
                            placeholder="0"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Notes / Details</Label>
                          <Input
                            value={item.details}
                            onChange={(e) =>
                              updateLineItem(idx, "details", e.target.value)
                            }
                            placeholder="Additional notes for this item"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      {/* Cost breakdown summary with per-category tax preview */}
                      {(parseFloat(item.metalCost) > 0 ||
                        parseFloat(item.gemstoneCost) > 0 ||
                        parseFloat(item.makingCost) > 0) && (
                        <div className="pt-1 border-t space-y-1">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>
                              Metal: {currencySymbol}{" "}
                              {(parseFloat(item.metalCost) || 0).toLocaleString()}
                            </span>
                            <span>
                              Gemstone: {currencySymbol}{" "}
                              {(parseFloat(item.gemstoneCost) || 0).toLocaleString()}
                            </span>
                            <span>
                              Making: {currencySymbol}{" "}
                              {(parseFloat(item.makingCost) || 0).toLocaleString()}
                            </span>
                            <span className="font-medium text-foreground">
                              = {currencySymbol} {item.unitPrice.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-blue-600">
                            <span>
                              Metal tax: {(countryTax.rates.PRECIOUS_METAL * 100).toFixed(1)}% = {currencySymbol}{" "}
                              {((parseFloat(item.metalCost) || 0) * item.quantity * countryTax.rates.PRECIOUS_METAL).toLocaleString()}
                            </span>
                            <span>
                              Gem tax: {(countryTax.rates.GEMSTONE * 100).toFixed(1)}% = {currencySymbol}{" "}
                              {((parseFloat(item.gemstoneCost) || 0) * item.quantity * countryTax.rates.GEMSTONE).toLocaleString()}
                            </span>
                            <span>
                              Making tax: {(countryTax.rates.MAKING_CHARGE * 100).toFixed(1)}% = {currencySymbol}{" "}
                              {((parseFloat(item.makingCost) || 0) * item.quantity * countryTax.rates.MAKING_CHARGE).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" /> Add Line Item
              </Button>

              <Separator />

              {/* Totals with Making Charge + Per-category Tax + Discount */}
              <div className="flex justify-end">
                <div className="w-96 space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {currencySymbol} {subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Making Charge toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 w-28">Making Charge</span>
                    <button
                      onClick={() =>
                        setMakingChargeMode((m) => (m === "percent" ? "fixed" : "percent"))
                      }
                      className={`flex items-center gap-0.5 px-2 py-1 text-xs rounded border transition-colors ${
                        makingChargeMode === "percent"
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-gray-50 border-gray-300 text-gray-700"
                      }`}
                      title="Toggle % or fixed amount"
                    >
                      {makingChargeMode === "percent" ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <span>{currencySymbol}</span>
                      )}
                    </button>
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
                        {countryTax.taxName} on Metal ({(countryTax.rates.PRECIOUS_METAL * 100).toFixed(1)}%)
                      </span>
                      <span>{currencySymbol} {taxBreakdown.metalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {taxBreakdown.gemstoneTax > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {countryTax.taxName} on Gemstone ({(countryTax.rates.GEMSTONE * 100).toFixed(1)}%)
                        </span>
                        <span>{currencySymbol} {taxBreakdown.gemstoneTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {taxBreakdown.makingTax > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {countryTax.taxName} on Making ({(countryTax.rates.MAKING_CHARGE * 100).toFixed(1)}%)
                        </span>
                        <span>{currencySymbol} {taxBreakdown.makingTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Total Tax</span>
                      <span>
                        {currencySymbol} {taxBreakdown.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Discount toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 w-28">Discount</span>
                    <button
                      onClick={() =>
                        setDiscountMode((m) => (m === "percent" ? "fixed" : "percent"))
                      }
                      className={`flex items-center gap-0.5 px-2 py-1 text-xs rounded border transition-colors ${
                        discountMode === "percent"
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "bg-gray-50 border-gray-300 text-gray-700"
                      }`}
                      title="Toggle % or fixed amount"
                    >
                      {discountMode === "percent" ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <span>{currencySymbol}</span>
                      )}
                    </button>
                    <Input
                      className="w-24 text-xs"
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                    />
                    {discountAmount > 0 && (
                      <span className="text-sm text-green-600 ml-auto">
                        -{currencySymbol} {discountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-amber-600">
                      {currencySymbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
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
