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
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileDown,
  Globe,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Tax rates by country (same source as pricing engine) ──
const TAX_OPTIONS: Record<string, { rate: number; label: string }[]> = {
  NP: [
    { rate: 0.13, label: "VAT 13%" },
    { rate: 0, label: "No Tax" },
  ],
  IN: [
    { rate: 0.03, label: "GST 3% (Jewellery)" },
    { rate: 0.05, label: "GST 5%" },
    { rate: 0.18, label: "GST 18%" },
    { rate: 0, label: "No Tax" },
  ],
  AE: [
    { rate: 0.05, label: "VAT 5%" },
    { rate: 0, label: "No Tax" },
  ],
  US: [
    { rate: 0, label: "No Federal Tax" },
    { rate: 0.08, label: "State Tax ~8%" },
  ],
  GB: [
    { rate: 0.2, label: "VAT 20%" },
    { rate: 0, label: "Zero-rated" },
  ],
  EU: [
    { rate: 0.19, label: "VAT 19%" },
    { rate: 0.21, label: "VAT 21%" },
    { rate: 0, label: "No Tax" },
  ],
  AU: [
    { rate: 0.1, label: "GST 10%" },
    { rate: 0, label: "No Tax" },
  ],
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

const CATEGORIES = ["METAL", "MAKING", "GEMSTONE", "FINISH", "LABOUR", "OTHER"];

interface RichLineItem {
  label: string;
  category: string;
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
  // Cost breakdown
  metalCost: string;
  gemstoneCost: string;
  makingCost: string;
}

const emptyLineItem = (): RichLineItem => ({
  label: "",
  category: "METAL",
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

interface CustomerLookupResult {
  found: boolean;
  customer?: {
    name: string;
    phone: string;
    phoneCountryCode: string;
    email?: string;
    address: string;
    city: string;
    country: string;
  };
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { symbol: currencySymbol, country: shopCountry } = useShopCurrency();

  const [loading, setLoading] = useState(false);

  // ── Country & Tax ──
  const [invoiceCountry, setInvoiceCountry] = useState(shopCountry);
  const countryTaxOptions = TAX_OPTIONS[invoiceCountry] || TAX_OPTIONS["IN"];
  const [selectedTaxIdx, setSelectedTaxIdx] = useState(0);
  const [customTax, setCustomTax] = useState(false);
  const [taxRate, setTaxRate] = useState(countryTaxOptions[0]?.rate ?? 0);
  const [taxLabel, setTaxLabel] = useState(countryTaxOptions[0]?.label ?? "");

  // When country changes, reset tax to first option for that country
  useEffect(() => {
    const opts = TAX_OPTIONS[invoiceCountry] || TAX_OPTIONS["IN"];
    setSelectedTaxIdx(0);
    setCustomTax(false);
    setTaxRate(opts[0]?.rate ?? 0);
    setTaxLabel(opts[0]?.label ?? "");
  }, [invoiceCountry]);

  // ── Customer ──
  const [customerName, setCustomerName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    COUNTRIES.find((c) => c.code === shopCountry)?.phone || "+91",
  );
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerCountry, setCustomerCountry] = useState(
    COUNTRIES.find((c) => c.code === shopCountry)?.name || "India",
  );

  // ── Customer lookup (same debounce pattern as walk-in quotes) ──
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(null);
  const [showReturningAlert, setShowReturningAlert] = useState(false);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const lookupCustomer = useCallback(
    async (pcc: string, phone: string) => {
      if (phone.length < 7) {
        setLookupResult(null);
        setShowReturningAlert(false);
        return;
      }
      setIsLookingUp(true);
      try {
        const response = await shopQuotesApi.lookupCustomer({
          phoneCountryCode: pcc,
          phone,
        });
        const result = response.data as CustomerLookupResult;
        setLookupResult(result);
        if (result.found && result.customer) setShowReturningAlert(true);
      } catch {
        setLookupResult(null);
      } finally {
        setIsLookingUp(false);
      }
    },
    [],
  );

  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      lookupCustomer(phoneCountryCode, phone);
    }, 500);
  };

  const handleAutoFillCustomer = () => {
    if (lookupResult?.customer) {
      const c = lookupResult.customer;
      setCustomerName(c.name);
      setPhoneCountryCode(c.phoneCountryCode);
      setCustomerPhone(c.phone.replace(c.phoneCountryCode, ""));
      setCustomerEmail(c.email || "");
      setCustomerAddress(c.address || "");
      setCustomerCity(c.city || "");
      setCustomerCountry(c.country || "");
      setShowReturningAlert(false);
      toast({
        title: "Customer details auto-filled",
        description: `Welcome back, ${c.name}!`,
      });
    }
  };

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

    // Metal item
    const metalLabel =
      quote.jewelleryType || quote.metalType || "Jewellery Item";
    const metalItem = emptyLineItem();
    metalItem.label = metalLabel;
    metalItem.category = "METAL";
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

  // ── Discount & notes ──
  const [discountAmount, setDiscountAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Payment due upon delivery. All sales are final.",
  );
  const [dueDate, setDueDate] = useState("");

  // ── Totals ──
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * taxRate;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + tax - discount;

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
      // Build flat line items for API (with enriched details)
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

      const fullAddress = [customerAddress, customerCity, customerCountry]
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
        taxRate,
        taxLabel: taxLabel || undefined,
        discountAmount: discount || undefined,
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

          {/* Country & Tax Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Country &amp; Tax
              </CardTitle>
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
                  <Label>Tax</Label>
                  {!customTax ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedTaxIdx}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value);
                          setSelectedTaxIdx(idx);
                          const opt = countryTaxOptions[idx];
                          if (opt) {
                            setTaxRate(opt.rate);
                            setTaxLabel(opt.label);
                          }
                        }}
                        className="flex-1 h-10 px-3 text-sm border rounded-md bg-background"
                      >
                        {countryTaxOptions.map((opt, idx) => (
                          <option key={idx} value={idx}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 text-xs"
                        onClick={() => setCustomTax(true)}
                      >
                        Custom
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        className="w-24"
                        type="number"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                      />
                      <Input
                        className="flex-1"
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        placeholder="Tax label"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 text-xs"
                        onClick={() => {
                          setCustomTax(false);
                          const opt = countryTaxOptions[selectedTaxIdx];
                          if (opt) {
                            setTaxRate(opt.rate);
                            setTaxLabel(opt.label);
                          }
                        }}
                      >
                        Preset
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details with Phone Lookup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                Customer Details
              </CardTitle>
              <CardDescription>
                Enter phone number to auto-fill returning customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Returning customer alert */}
              {showReturningAlert && lookupResult?.customer && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Returning customer found: {lookupResult.customer.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {lookupResult.customer.phone} •{" "}
                      {lookupResult.customer.city},{" "}
                      {lookupResult.customer.country}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 text-xs"
                      onClick={handleAutoFillCustomer}
                    >
                      Auto-fill
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowReturningAlert(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Phone row */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label>Country Code</Label>
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => {
                      setPhoneCountryCode(e.target.value);
                      if (customerPhone.length >= 7)
                        lookupCustomer(e.target.value, customerPhone);
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
                <div className="col-span-5">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Input
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="9876543210"
                    />
                    {isLookingUp && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
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

              {/* Email + Address */}
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
                  <Label>City</Label>
                  <Input
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Full address (multi-line)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Line Items</CardTitle>
              <CardDescription>
                Add items with metal &amp; gemstone details. Click on an item to expand details.
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
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
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
                            <Label className="text-xs">Weight (g)</Label>
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
                                updateLineItem(
                                  idx,
                                  "gemstoneType",
                                  e.target.value,
                                )
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
                                updateLineItem(
                                  idx,
                                  "gemstoneCut",
                                  e.target.value,
                                )
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
                                updateLineItem(
                                  idx,
                                  "gemstoneClarity",
                                  e.target.value,
                                )
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
                                updateLineItem(
                                  idx,
                                  "gemstoneCaratWeight",
                                  e.target.value,
                                )
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
                                updateLineItem(
                                  idx,
                                  "gemstoneColor",
                                  e.target.value,
                                )
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
                                updateLineItem(
                                  idx,
                                  "gemstoneCost",
                                  e.target.value,
                                )
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

                      {/* Cost breakdown summary */}
                      {(parseFloat(item.metalCost) > 0 ||
                        parseFloat(item.gemstoneCost) > 0 ||
                        parseFloat(item.makingCost) > 0) && (
                        <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t">
                          <span>
                            Metal: {currencySymbol}{" "}
                            {(parseFloat(item.metalCost) || 0).toLocaleString()}
                          </span>
                          <span>
                            Gemstone: {currencySymbol}{" "}
                            {(
                              parseFloat(item.gemstoneCost) || 0
                            ).toLocaleString()}
                          </span>
                          <span>
                            Making: {currencySymbol}{" "}
                            {(
                              parseFloat(item.makingCost) || 0
                            ).toLocaleString()}
                          </span>
                          <span className="font-medium text-foreground">
                            = {currencySymbol} {item.unitPrice.toLocaleString()}
                          </span>
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

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {currencySymbol} {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {taxLabel || "Tax"}{" "}
                      <span className="text-xs">
                        ({(taxRate * 100).toFixed(1)}%)
                      </span>
                    </span>
                    <span>
                      {currencySymbol} {tax.toLocaleString()}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>
                        -{currencySymbol} {discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">Discount</span>
                    <Input
                      className="w-28 text-xs"
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-amber-600">
                      {currencySymbol} {total.toLocaleString()}
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
