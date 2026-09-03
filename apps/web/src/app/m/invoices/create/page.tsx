"use client";

import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { inventoryApi, invoicesApi, ordersApi, shopQuotesApi } from "@/lib/api";
import { getCurrencyForCountry } from "@/lib/currency";
import { JEWELLERY_TYPES } from "@/lib/constants/jewellery";
import {
  emptyGemstone,
  emptyLineItem,
  gemstoneTotal,
  lineItemTotal,
  mapToCreateDto,
  type RichLineItem,
  useInvoicePricing,
  validateInvoiceDraft,
  type MakingMode,
} from "@/lib/invoice";
import {
  mobileInvoiceDetailPath,
  resolveCreatedInvoice,
  unwrapInvoiceRecord,
} from "@/lib/mobileInvoice";
import { getDefaultWeightUnit, fromGrams, toGrams, getSupportedWeightUnits, type WeightUnit } from "@gold-shop/shared";
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { METAL_TYPES } from "@/lib/invoice/lineItemTypes";

const MARKETS = ["NP", "IN", "LK", "AE", "GB", "DE", "FR", "US"];
const STEPS = ["Customer", "Lines", "Review"] as const;
const COUNTRY_PHONE_CODES: Record<string, string> = {
  NP: "+977",
  IN: "+91",
  AE: "+971",
  LK: "+94",
  US: "+1",
  GB: "+44",
  DE: "+49",
  FR: "+33",
};

function MobileInvoiceCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const shopCountry = user?.shop?.country || "";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [country, setCountry] = useState(shopCountry);
  const [customerType, setCustomerType] = useState<"B2C" | "B2B">("B2C");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [requestTaxInvoice, setRequestTaxInvoice] = useState(false);
  const [supplyDate, setSupplyDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [walkInCustomerId, setWalkInCustomerId] = useState<string | undefined>();
  const [customerHits, setCustomerHits] = useState<
    { id: string; name?: string; phone?: string; email?: string; address?: string }[]
  >([]);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shopQuoteId, setShopQuoteId] = useState<string | undefined>(
    searchParams.get("shopQuoteId") || undefined,
  );
  const orderId = searchParams.get("orderId") || undefined;

  const [expandedIdx, setExpandedIdx] = useState(0);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    getDefaultWeightUnit(shopCountry) as WeightUnit,
  );
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("FIXED");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const {
    lineItems,
    setLineItems,
    wastagePct,
    setWastagePct,
    wastageRule,
    invoiceWastagePct,
    countryTax,
    useLiveRate,
    setUseLiveRate,
    makingMode,
    setMakingMode,
    makingValue,
    setMakingValue,
    updateLine,
    applyMakingOnLine,
    addFromCatalog,
    mergeQuoteImport,
    subtotal,
    wastageTotal,
    taxBreakdown,
    discountAmount,
    grandTotal,
  } = useInvoicePricing({
    invoiceCountry: country,
    shopCountry,
    shopCurrency: getCurrencyForCountry(shopCountry),
    shopId: user?.shop?.id,
    discountType,
    discountValue,
  });

  const currency = useMemo(() => getCurrencyForCountry(country), [country]);

  useEffect(() => {
    setWeightUnit(getDefaultWeightUnit(country) as WeightUnit);
  }, [country]);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Prefill from shopQuoteId query
  useEffect(() => {
    const qid = searchParams.get("shopQuoteId");
    if (!qid) return;
    shopQuotesApi
      .getById(qid)
      .then((res) => {
        const quote = res.data?.data || res.data;
        if (!quote) return;
        const imported = mergeQuoteImport(quote);
        setShopQuoteId(imported.shopQuoteId);
        if (imported.customer.name) setCustomerName(imported.customer.name);
        if (imported.customer.phone) setCustomerPhone(imported.customer.phone);
        if (imported.customer.email) setCustomerEmail(imported.customer.email);
        if (imported.customer.id) setWalkInCustomerId(imported.customer.id);
        setExpandedIdx(0);
        setStep(1);
        toast({ title: "Quote imported", description: imported.line.label });
      })
      .catch(() =>
        toast({
          title: "Could not load quote",
          variant: "destructive",
        }),
      );
  }, [searchParams, mergeQuoteImport]);

  // Prefill customer from orderId (invoice lines still manual/catalog)
  useEffect(() => {
    if (!orderId) return;
    ordersApi
      .getById(orderId)
      .then((res) => {
        const o = res.data?.data || res.data;
        const customer = o?.customer;
        if (!customer) return;
        const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        if (name) setCustomerName(name);
        if (customer.phone) setCustomerPhone(customer.phone);
        if (customer.email) setCustomerEmail(customer.email);
      })
      .catch(() => undefined);
  }, [orderId]);

  const searchCatalog = useCallback(
    async (q: string) => {
      if (!user?.shop?.id) return;
      setCatalogLoading(true);
      try {
        const res = await inventoryApi.getShopInventory(user.shop.id, {
          search: q || undefined,
          status: "AVAILABLE",
          inStock: true,
          excludeSetComponents: true,
          limit: 30,
        });
        setCatalogItems(res.data?.items || res.data?.data?.items || res.data || []);
      } catch {
        setCatalogItems([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [user?.shop?.id],
  );

  useEffect(() => {
    if (!catalogOpen) return;
    const t = setTimeout(() => void searchCatalog(catalogSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [catalogOpen, catalogSearch, searchCatalog]);

  const loadQuotes = async () => {
    setQuotesLoading(true);
    try {
      const res = await shopQuotesApi.getAll();
      const all = res.data?.quotes || res.data?.data?.quotes || res.data || [];
      setQuotes(
        (Array.isArray(all) ? all : []).filter(
          (q: any) =>
            !q.invoiceNumber && !["CANCELLED", "COMPLETED"].includes(q.status),
        ),
      );
    } catch {
      setQuotes([]);
    } finally {
      setQuotesLoading(false);
    }
  };

  const searchWalkInCustomers = useCallback(async (phone: string) => {
    if (phone.replace(/\D/g, "").length < 3) {
      setCustomerHits([]);
      return;
    }
    try {
      const res = await shopQuotesApi.searchCustomers({
        phoneCountryCode: COUNTRY_PHONE_CODES[shopCountry] || "+977",
        phone,
      });
      const result = res.data as { customers?: typeof customerHits };
      setCustomerHits(result.customers || []);
    } catch {
      setCustomerHits([]);
    }
  }, [shopCountry]);

  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    setWalkInCustomerId(undefined);
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => {
      void searchWalkInCustomers(phone);
    }, 400);
  };

  const addManualLine = () => {
    setLineItems((c) => [...c, emptyLineItem()]);
    setExpandedIdx(lineItems.length);
  };

  const removeLine = (index: number) => {
    setLineItems((c) => (c.length <= 1 ? c : c.filter((_, i) => i !== index)));
    setExpandedIdx(0);
  };

  const handleAddFromCatalog = async (item: any) => {
    const result = await addFromCatalog(item);
    if (!result.ok) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }
    const { line, warning, missingRates, liveRateNote } = result.result;
    setExpandedIdx(result.result.nextLines.length - 1);
    setCatalogOpen(false);
    if (missingRates && missingRates.length > 0) {
      toast({
        title: "Some metal rates missing",
        description: `Could not price: ${missingRates.join(", ")}`,
        variant: "destructive",
      });
    }
    toast({
      title: liveRateNote ? "Metal from live rate" : "Added from catalog",
      description: warning || liveRateNote || line.label,
    });
  };

  const handleAddFromQuote = (quote: any) => {
    const imported = mergeQuoteImport(quote);
    setShopQuoteId(imported.shopQuoteId);
    if (imported.customer.name) setCustomerName(imported.customer.name);
    if (imported.customer.phone) setCustomerPhone(imported.customer.phone);
    if (imported.customer.email) setCustomerEmail(imported.customer.email);
    if (imported.customer.id) setWalkInCustomerId(imported.customer.id);
    setExpandedIdx(0);
    setQuoteOpen(false);
    toast({ title: "Quote imported", description: imported.line.label });
  };

  const goNext = () => {
    if (step === 0) {
      if (!customerName.trim()) {
        toast({ title: "Enter customer name", variant: "destructive" });
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      const v = validateInvoiceDraft({
        customerName,
        lineItems,
        customerType,
        customerTaxId,
        invoiceCountry: country,
        requestTaxInvoice,
        customerAddress,
        supplyDate,
      });
      if (!v.ok) {
        toast({
          title: "Complete required fields",
          description: v.errors[0],
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    }
  };

  const submit = async () => {
    const v = validateInvoiceDraft({
      customerName,
      lineItems,
      customerType,
      customerTaxId,
      invoiceCountry: country,
      requestTaxInvoice,
      customerAddress,
      supplyDate,
    });
    if (!v.ok) {
      toast({
        title: "Cannot create invoice",
        description: v.errors[0],
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = mapToCreateDto({
        lineItems,
        invoiceWastagePct,
        wastageRule,
        customerName,
        customerPhone: customerPhone.trim() || undefined,
        phoneCountryCode: COUNTRY_PHONE_CODES[shopCountry] || "+977",
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerType,
        customerTaxId: customerTaxId.trim() || undefined,
        invoiceCountry: country,
        currency,
        walkInCustomerId,
        shopQuoteId,
        orderId,
        taxRate: countryTax.defaultRate,
        taxLabel: countryTax.taxName,
        taxBreakdown: {
          ...taxBreakdown,
          country,
          lkTaxInvoice: country === "LK" && requestTaxInvoice,
          supplyDate: country === "LK" ? supplyDate : undefined,
          purchaserVatRegistered: country === "LK" ? customerType === "B2B" : undefined,
        },
        taxInvoiceRequested: country === "LK" ? requestTaxInvoice : undefined,
        purchaserVatRegistered: country === "LK" ? customerType === "B2B" : undefined,
        supplyDate: country === "LK" ? supplyDate : undefined,
        discountAmount: discountAmount || undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
      });

      const response = await invoicesApi.create(payload);
      const invoice = resolveCreatedInvoice(response.data);
      if (!invoice?.id) {
        toast({
          title: "Invoice created",
          description: "Open Invoices from the menu to find your new bill.",
        });
        router.replace("/m/invoices");
        return;
      }
      // Seed detail page so navigation does not wait on a second full fetch
      const created = unwrapInvoiceRecord(response.data) || invoice;
      try {
        sessionStorage.setItem(
          `m-invoice-seed:${invoice.id}`,
          JSON.stringify(created),
        );
      } catch {
        /* private mode / quota — detail will fetch normally */
      }
      toast({
        title: "Invoice created",
        description: invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : undefined,
      });
      router.replace(mobileInvoiceDetailPath(invoice.id, { created: true }));
    } catch (error: any) {
      toast({
        title: "Could not create invoice",
        description: error?.response?.data?.message ?? "Please review the bill",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const setWeightDisplay = (index: number, displayValue: string) => {
    const n = Number(displayValue);
    if (!Number.isFinite(n) || n < 0) {
      updateLine(index, { metalWeightG: "" });
      return;
    }
    const grams = toGrams(n, weightUnit);
    updateLine(index, { metalWeightG: String(grams) });
  };

  const getWeightDisplay = (line: RichLineItem) => {
    const g = parseFloat(line.metalWeightG) || 0;
    if (!g) return "";
    return String(Number(fromGrams(g, weightUnit).toFixed(4)));
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-44 text-gray-900 dark:text-gray-100" data-tour="mobile-invoice-create">
      <div className="flex items-center gap-3">
        <Link href="/m/invoices" className="rounded-xl bg-gray-100 p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">
            <T>New invoice</T>
          </h1>
          <p className="text-xs text-gray-500">
            <T>Full jewellery billing — metal, making, wastage & tax</T>
          </p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold ${
              i === step
                ? "bg-white text-amber-700 shadow"
                : i < step
                  ? "text-amber-600"
                  : "text-gray-400"
            }`}
          >
            {i < step ? <Check className="mx-auto h-3.5 w-3.5" /> : null}
            <T>{label}</T>
          </button>
        ))}
      </div>

      {/* Step 0 — Customer */}
      {step === 0 && (
        <section className="space-y-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <label className="block text-xs font-bold text-gray-500">
            <T>Invoice country</T>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
            >
              {MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m} · {getCurrencyForCountry(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-gray-500">
            <T>Customer name</T>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
              data-tour="invoice-customer-name"
            />
          </label>
          <label className="block text-xs font-bold text-gray-500">
            <T>Customer phone</T>
            <input
              value={customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              inputMode="tel"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>
          {customerHits.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 overflow-hidden">
              {customerHits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => {
                    setWalkInCustomerId(hit.id);
                    if (hit.name) setCustomerName(hit.name);
                    if (hit.phone) setCustomerPhone(hit.phone);
                    if (hit.email) setCustomerEmail(hit.email);
                    if (hit.address) setCustomerAddress(hit.address);
                    setCustomerHits([]);
                  }}
                  className="block w-full border-b border-amber-100 px-3 py-2 text-left text-sm last:border-0"
                >
                  <span className="font-bold">{hit.name || "Customer"}</span>
                  {hit.phone ? (
                    <span className="ml-2 text-xs text-gray-500">{hit.phone}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          <label className="block text-xs font-bold text-gray-500">
            <T>Customer email</T>
            <input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              type="email"
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block text-xs font-bold text-gray-500">
            <T>Customer address</T>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCustomerType("B2C")}
              className={`rounded-xl border py-2 text-sm font-bold ${
                customerType === "B2C"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200"
              }`}
            >
              <T>Consumer</T>
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("B2B")}
              className={`rounded-xl border py-2 text-sm font-bold ${
                customerType === "B2B"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200"
              }`}
            >
              <T>Business</T>
            </button>
          </div>
          {customerType === "B2B" && (
            <label className="block text-xs font-bold text-gray-500">
              <T>Customer tax ID</T>
              <input
                value={customerTaxId}
                onChange={(e) => setCustomerTaxId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
          )}
          {country === "LK" && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requestTaxInvoice}
                  onChange={(e) => setRequestTaxInvoice(e.target.checked)}
                />
                <T>Request Sri Lankan TAX INVOICE</T>
              </label>
              <label className="block text-xs font-bold text-gray-500">
                <T>Date of supply</T>
                <input
                  type="date"
                  value={supplyDate}
                  onChange={(e) => setSupplyDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
                />
              </label>
            </>
          )}
        </section>
      )}

      {/* Step 1 — Lines */}
      {step === 1 && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCatalogOpen(true);
                void searchCatalog("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
              data-tour="invoice-add-from-catalog"
            >
              <Package className="h-3.5 w-3.5" />
              <T>Catalog</T>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuoteOpen(true);
                void loadQuotes();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"
              data-tour="invoice-add-from-quote"
            >
              <FileText className="h-3.5 w-3.5" />
              <T>Quote</T>
            </button>
            <button
              type="button"
              onClick={addManualLine}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <T>Manual</T>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-500"><T>Weight unit</T></span>
            {getSupportedWeightUnits(country).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setWeightUnit(u as WeightUnit)}
                className={`rounded-lg px-2 py-1 font-bold ${
                  weightUnit === u
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <label className="block text-xs font-bold text-gray-500">
            <T>Invoice wastage %</T>
            <input
              value={wastagePct}
              onChange={(e) => setWastagePct(e.target.value)}
              type="number"
              min="0"
              step="0.1"
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>

          {lineItems.map((line, index) => {
            const open = expandedIdx === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIdx(open ? -1 : index)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-bold text-sm">
                      {line.label || <T>Untitled line</T>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {line.source || "MANUAL"} · {currency}{" "}
                      {(lineItemTotal(line) + (parseFloat(line.wastageCost || "") || 0) * line.quantity).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={lineItems.length === 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLine(index);
                    }}
                    className="rounded-lg p-2 text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </button>

                {open && (
                  <div className="space-y-2 border-t border-gray-50 px-4 pb-4 pt-2">
                    <input
                      value={line.label}
                      onChange={(e) => updateLine(index, { label: e.target.value })}
                      placeholder="Description (e.g. 22K Ring)"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <select
                      value={line.category}
                      onChange={(e) => updateLine(index, { category: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                      {JEWELLERY_TYPES.map((jt) => (
                        <option key={jt.value} value={jt.value}>
                          {jt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={line.metalType}
                      onChange={(e) => updateLine(index, { metalType: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                      data-tour="invoice-metal-type"
                    >
                      <option value="">Metal type</option>
                      {METAL_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-bold text-gray-500">
                        <T>Weight</T> ({weightUnit.toLowerCase()})
                        <input
                          value={getWeightDisplay(line)}
                          onChange={(e) => setWeightDisplay(index, e.target.value)}
                          type="number"
                          min="0"
                          step="0.001"
                          className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                          data-tour="invoice-metal-weight"
                        />
                      </label>
                      <label className="block text-xs font-bold text-gray-500">
                        <T>Metal cost</T>
                        <input
                          value={line.metalCost}
                          onChange={(e) =>
                            updateLine(index, { metalCost: e.target.value })
                          }
                          type="number"
                          min="0"
                          className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                          data-tour="invoice-metal-cost"
                        />
                      </label>
                    </div>

                    {/* Making */}
                    <div className="rounded-xl bg-amber-50 p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-800">
                        <T>Making charge</T>
                      </p>
                      <div className="flex gap-1">
                        {(["PERCENT", "PER_GRAM", "FIXED"] as MakingMode[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMakingMode(m)}
                            className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold ${
                              makingMode === m
                                ? "bg-amber-500 text-white"
                                : "bg-white text-amber-800"
                            }`}
                          >
                            {m === "PERCENT" ? "%" : m === "PER_GRAM" ? "/g" : "Flat"}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={makingValue}
                          onChange={(e) => setMakingValue(e.target.value)}
                          type="number"
                          min="0"
                          className="flex-1 rounded-xl border border-amber-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const result = applyMakingOnLine(index);
                            if (!result.ok) {
                              toast({
                                title: result.message || "Could not apply making",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          <T>Apply</T>
                        </button>
                      </div>
                      <p className="text-xs text-amber-700">
                        <T>Making</T>: {currency}{" "}
                        {(parseFloat(line.makingCost) || 0).toLocaleString()}
                      </p>
                    </div>

                    {/* Wastage */}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-bold text-gray-500">
                        <T>Wastage %</T>
                        <input
                          value={line.wastagePercent || wastagePct}
                          onChange={(e) =>
                            updateLine(index, { wastagePercent: e.target.value })
                          }
                          type="number"
                          min="0"
                          className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                        />
                      </label>
                      <label className="block text-xs font-bold text-gray-500">
                        <T>Wastage cost</T>
                        <input
                          value={line.wastageCost || ""}
                          onChange={(e) =>
                            updateLine(index, { wastageCost: e.target.value })
                          }
                          type="number"
                          min="0"
                          className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                        />
                      </label>
                    </div>

                    {/* Gemstones */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500">
                          <T>Gemstones</T>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(index, {
                              gemstones: [...line.gemstones, emptyGemstone()],
                            })
                          }
                          className="text-xs font-bold text-amber-700"
                        >
                          <T>+ Add</T>
                        </button>
                      </div>
                      {line.gemstones.map((g, gi) => (
                        <div key={gi} className="grid grid-cols-[1fr_auto] gap-2">
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              value={g.type}
                              onChange={(e) => {
                                const gems = [...line.gemstones];
                                gems[gi] = { ...g, type: e.target.value };
                                updateLine(index, { gemstones: gems });
                              }}
                              placeholder="Type"
                              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                            />
                            <input
                              value={g.cost}
                              onChange={(e) => {
                                const gems = [...line.gemstones];
                                gems[gi] = { ...g, cost: e.target.value };
                                updateLine(index, { gemstones: gems });
                              }}
                              placeholder="Cost"
                              type="number"
                              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(index, {
                                gemstones: line.gemstones.filter((_, i) => i !== gi),
                              })
                            }
                            className="text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {line.gemstones.length > 0 && (
                        <p className="text-xs text-gray-500">
                          <T>Gem total</T>: {currency} {gemstoneTotal(line).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
            <p className="font-bold">{customerName}</p>
            <p className="text-xs text-gray-500">
              {customerPhone || "—"} · {country} · {customerType}
            </p>
            {lineItems
              .filter((li) => li.label && lineItemTotal(li) > 0)
              .map((li, i) => (
                <div key={i} className="flex justify-between text-sm border-t pt-2">
                  <span>
                    {li.label}
                    {li.metalType ? ` · ${li.metalType}` : ""}
                  </span>
                  <strong>
                    {currency}{" "}
                    {(
                      lineItemTotal(li) +
                      (parseFloat(li.wastageCost || "") || 0) * li.quantity
                    ).toLocaleString()}
                  </strong>
                </div>
              ))}
          </div>

          <div
            className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-1 text-sm text-gray-800 dark:text-amber-100"
            data-tour="invoice-tax-breakdown"
          >
            <div className="flex justify-between text-xs text-gray-600">
              <span><T>Subtotal</T></span>
              <span>
                {currency} {subtotal.toLocaleString()}
              </span>
            </div>
            {wastageTotal > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span><T>Wastage</T></span>
                <span>
                  {currency} {wastageTotal.toLocaleString()}
                </span>
              </div>
            )}
            {taxBreakdown.totalTax > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span><T>Tax</T> ({countryTax.taxName})</span>
                <span>
                  {currency} {taxBreakdown.totalTax.toLocaleString()}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span><T>Discount</T></span>
                <span>
                  −{currency} {discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-amber-200 dark:border-amber-800 pt-1.5 text-sm font-black text-amber-900 dark:text-amber-100">
              <span><T>Grand total</T></span>
              <span>
                {currency} {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
            <div className="flex gap-2">
              {(["FIXED", "PERCENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDiscountType(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    discountType === t
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {t === "FIXED" ? currency : "%"}
                </button>
              ))}
              <input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                type="number"
                min="0"
                placeholder="Discount"
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI / QR</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="ESEWA">eSewa</option>
              <option value="KHALTI">Khalti</option>
            </select>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
      </section>
      )}

      {/* Catalog picker */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="max-h-[80vh] overflow-auto rounded-t-3xl bg-white dark:bg-gray-900 p-4 space-y-3 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-bold"><T>Add from catalog</T></h2>
              <button type="button" onClick={() => setCatalogOpen(false)} className="text-sm font-bold text-gray-500">
                <T>Close</T>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useLiveRate}
                onChange={(e) => setUseLiveRate(e.target.checked)}
              />
              <T>Use live rate</T>
            </label>
            {catalogLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : catalogItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                <T>No products found</T>
              </p>
            ) : (
              catalogItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleAddFromCatalog(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-3 text-left active:bg-amber-50"
                >
                  <div>
                    <p className="font-bold text-sm">{item.nameEn || item.sku}</p>
                    <p className="text-xs text-gray-500">
                      {item.jewelleryType} · {item.totalWeightGrams ? `${item.totalWeightGrams}g` : "—"}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-amber-600" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quote picker */}
      {quoteOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="max-h-[80vh] overflow-auto rounded-t-3xl bg-white dark:bg-gray-900 p-4 space-y-3 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-bold"><T>Import shop quote</T></h2>
              <button type="button" onClick={() => setQuoteOpen(false)} className="text-sm font-bold text-gray-500">
                <T>Close</T>
              </button>
            </div>
            {quotesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                <T>No open quotes</T>
              </p>
            ) : (
              quotes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleAddFromQuote(q)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-3 text-left active:bg-blue-50"
                >
                  <div>
                    <p className="font-bold text-sm">
                      #{q.quoteNumber} · {q.walkInCustomer?.name || "Walk-in"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {q.jewelleryType || q.metalType || "Quote"}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-blue-600" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom dock: compact totals + CTA (clears mobile tab bar at bottom-16) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-900 dark:text-gray-100">
        {(step === 1 || step === 2) && (
          <div
            className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs"
            data-tour="invoice-live-totals"
          >
            <span className="truncate text-gray-600">
              <T>Total</T>
              {wastageTotal > 0 ? (
                <>
                  {" "}
                  · <T>Wastage</T> {currency} {wastageTotal.toLocaleString()}
                </>
              ) : null}
              {taxBreakdown.totalTax > 0 ? (
                <>
                  {" "}
                  · <T>Tax</T> {currency} {taxBreakdown.totalTax.toLocaleString()}
                </>
              ) : null}
            </span>
            <strong className="shrink-0 text-sm text-amber-900">
              {currency} {grandTotal.toLocaleString()}
            </strong>
          </div>
        )}
        <div className="p-3">
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white"
            >
              <T>Continue</T>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              data-tour="invoice-create-submit"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <T>Creating…</T>
                </span>
              ) : (
                <>
                  <T>Create invoice</T>
                  {" · "}
                  {currency} {grandTotal.toLocaleString()}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MobileInvoiceCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      }
    >
      <MobileInvoiceCreateInner />
    </Suspense>
  );
}
