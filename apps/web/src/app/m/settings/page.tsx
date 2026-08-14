"use client";

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import api, { shopsApi } from "@/lib/api";
import {
  extractPriceConversion,
  syncShopCountryToPreferences,
  unwrapShopSettings,
} from "@/lib/shop-settings";
import { resolveShopCurrency } from "@gold-shop/shared";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COUNTRIES = [
  { code: "NP", name: "Nepal", currency: "NPR", flag: "🇳🇵" },
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  { code: "LK", name: "Sri Lanka", currency: "LKR", flag: "🇱🇰" },
  { code: "AE", name: "UAE", currency: "AED", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺" },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", currency: "SGD", flag: "🇸🇬" },
  { code: "DE", name: "Germany (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "FR", name: "France (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "IT", name: "Italy (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "ES", name: "Spain (EU)", currency: "EUR", flag: "🇪🇺" },
];

export default function MobileStoreSettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conversionNote, setConversionNote] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("NP");
  const [city, setCity] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [makingChargePercent, setMakingChargePercent] = useState<number>(10);
  // Shop identity
  const [shopName, setShopName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  // Location
  const [state, setState] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  // Business rules
  const [isActive, setIsActive] = useState<boolean>(true);
  const [codEnabled, setCodEnabled] = useState<boolean>(false);
  const [codMaxValueNpr, setCodMaxValueNpr] = useState<number>(0);
  const [minOrderValueNpr, setMinOrderValueNpr] = useState<number>(0);
  const [maxOrderValueNpr, setMaxOrderValueNpr] = useState<number>(0);
  // Bank details & Karigar persistence
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [swiftCode, setSwiftCode] = useState<string>("");
  const [karigarSupplyChain, setKarigarSupplyChain] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await shopsApi.getSettings();
        const s = unwrapShopSettings(res);
        if (cancelled) return;
        setCountry(s.country || user?.shop?.country || "NP");
        setCity(s.city || "");
        setAddress(s.address || "");
        setContactPhone(s.contactPhone || "");
        setWhatsappNumber(s.whatsappNumber || "");
        setMakingChargePercent(Number(s.makingChargePercent ?? 10));
        setShopName(s.shopName || "");
        setDescription(s.description || "");
        setContactEmail(s.contactEmail || "");
        setState(s.state || "");
        setPincode(s.pincode || "");
        setIsActive(s.isActive !== false);
        setCodEnabled(s.codEnabled ?? false);
        setCodMaxValueNpr(Number(s.codMaxValueNpr ?? 0));
        setMinOrderValueNpr(Number(s.minOrderValueNpr ?? 0));
        setMaxOrderValueNpr(Number(s.maxOrderValueNpr ?? 0));
        setBankName(s.bankAccountDetails?.bankName || "");
        setAccountNumber(s.bankAccountDetails?.accountNumber || "");
        setAccountName(s.bankAccountDetails?.accountName || "");
        setBranchName(s.bankAccountDetails?.branchName || "");
        setSwiftCode(s.bankAccountDetails?.swiftCode || "");
        setKarigarSupplyChain(s.bankAccountDetails?.karigarSupplyChain || null);
        syncShopCountryToPreferences(s);
      } catch {
        // ignore, fall back to defaults from user.shop
        if (user?.shop) {
          setCountry(user.shop.country || "NP");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.shop]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    setConversionNote(null);
    try {
      const defaultCurrency = resolveShopCurrency({
        country,
        currency: COUNTRIES.find((c) => c.code === country)?.currency,
      });
      
      // Update shop settings
      const saveRes = await shopsApi.updateSettings({
        country,
        currency: defaultCurrency,
        city: city || undefined,
        address: address || undefined,
        contactPhone: contactPhone || undefined,
        whatsappNumber: whatsappNumber || undefined,
        makingChargePercent: Number(makingChargePercent) || undefined,
        shopName: shopName || undefined,
        description: description || undefined,
        contactEmail: contactEmail || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        isActive,
        codEnabled,
        codMaxValueNpr: codMaxValueNpr || undefined,
        minOrderValueNpr: minOrderValueNpr || undefined,
        maxOrderValueNpr: maxOrderValueNpr || undefined,
        bankAccountDetails: {
          bankName: bankName || undefined,
          accountNumber: accountNumber || undefined,
          accountName: accountName || undefined,
          branchName: branchName || undefined,
          swiftCode: swiftCode || undefined,
          karigarSupplyChain: karigarSupplyChain || undefined,
        },
      });

      // Synchronize the user preferences so they match the shop country and currency
      try {
        await api.patch("/users/me/preferences", {
          preferredLanguage: user?.preferredLanguage || "en",
          preferredCurrency: defaultCurrency,
          preferredCountry: country,
        });
      } catch (prefErr) {
        console.error("Failed to sync user preferences:", prefErr);
      }

      syncShopCountryToPreferences({ country, currency: defaultCurrency });

      await refreshUser();
      const conversion = extractPriceConversion(saveRes.data);
      if (conversion) {
        setConversionNote(
          `Prices converted ${conversion.fromCurrency} → ${conversion.toCurrency} at ${conversion.rate}. Invoices were not changed.`,
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Reload page after a short delay so currency/tax UI uses new country
      setTimeout(() => router.refresh(), 800);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/m/pos"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Store Settings</T></h1>
          <p className="text-xs text-gray-400"><T>Country, currency, contact</T></p>
        </div>
        <MobileHelpButton
          title="Store settings"
          description="Change your shop's country to switch the currency and tax engine used across the app."
          tips={[
            "Switching country instantly changes the bill currency",
            "Tax rules (GST / VAT / MTD / OSS) follow the selected country",
            "Update WhatsApp number to receive customer messages",
          ]}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Country selector */}
        <section>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            <T>Country & Currency</T>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {COUNTRIES.map((c) => {
              const active = c.code === country;
              return (
                <button
                   key={c.code}
                   type="button"
                   onClick={() => setCountry(c.code)}
                   className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                     active
                       ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                       : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850"
                   }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.currency}</p>
                    </div>
                  </div>
                  {active && <Check className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            <T>Live rates, tax forms, and catalog prices switch to</T>{" "}
            <span className="font-semibold">{selectedCountry.currency}</span>.{" "}
            <T>
              Existing product and quote amounts are converted at the live
              exchange rate. Invoices keep their original currency.
            </T>
          </p>
        </section>

        {/* KYC Verification Status Settings Card */}
        <section className="space-y-2">
          <label className="block text-xs font-semibold text-gray-655 dark:text-gray-400 uppercase tracking-wide">
            <T>Verification Status</T>
          </label>
          <div className={`p-4 rounded-2xl border ${
            user?.shop?.isVerified
              ? "border-green-200 bg-green-50/40 dark:bg-green-950/10 text-green-800 dark:text-green-300"
              : "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 text-amber-850 dark:text-amber-300"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <span className="text-lg mt-0.5">{user?.shop?.isVerified ? "✅" : "⚠️"}</span>
                <div>
                  <h4 className="font-bold text-xs">
                    {user?.shop?.isVerified ? "Verified Shopkeeper" : "Unverified (Sandbox Mode)"}
                  </h4>
                  <p className="text-[10px] opacity-80 mt-0.5 leading-relaxed">
                    {user?.shop?.isVerified
                      ? "Your account is fully approved for unlimited retail counter POS billing."
                      : "Account has limited sandbox access. Prints will include diagonal watermarks unless you enter a Customer Tax ID on the POS receipt."}
                  </p>
                </div>
              </div>
            </div>
            {!user?.shop?.isVerified && (
              <Link
                href="/m/settings/kyc"
                className="block text-center py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
              >
                Submit KYC Verification Documents
              </Link>
            )}
          </div>
        </section>

        {/* Shop Info */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <T>Shop Info</T>
          </label>
          <input
            type="text"
            placeholder="Shop Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <input
            type="email"
            placeholder="Business email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </section>

        {/* Location */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <T>Location</T>
          </label>
          <input
            type="text"
            placeholder="State / Province"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="Pincode / ZIP"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <T>Contact Numbers</T>
          </label>
          <input
            type="tel"
            placeholder="Contact phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="tel"
            placeholder="WhatsApp number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </section>

        {/* Making charge */}
        <section>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            <T>Default Making Charge (%)</T>
          </label>
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={makingChargePercent}
            onChange={(e) => setMakingChargePercent(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            <T>Used as the default in POS and quotes. Can be overridden per bill.</T>
          </p>
        </section>

        {/* Business Settings */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <T>Business Settings</T>
          </label>
          {/* isActive toggle */}
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
              isActive ? "border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-900" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100"><T>Shop Active</T></p>
              <p className="text-xs text-gray-500 dark:text-gray-400"><T>Accept new orders from customers</T></p>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors relative ${isActive ? "bg-green-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
          {/* COD toggle */}
          <button
            type="button"
            onClick={() => setCodEnabled((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
              codEnabled ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100"><T>Cash on Delivery</T></p>
              <p className="text-xs text-gray-500 dark:text-gray-400"><T>Allow COD orders</T></p>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors relative ${codEnabled ? "bg-amber-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${codEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
          {codEnabled && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400"><T>Max COD Order Value</T></label>
              <input
                type="number"
                min={0}
                value={codMaxValueNpr || ""}
                onChange={(e) => setCodMaxValueNpr(Number(e.target.value))}
                placeholder="0 = no limit"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><T>Min Order Value</T></label>
              <input
                type="number"
                min={0}
                value={minOrderValueNpr || ""}
                onChange={(e) => setMinOrderValueNpr(Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><T>Max Order Value</T></label>
              <input
                type="number"
                min={0}
                value={maxOrderValueNpr || ""}
                onChange={(e) => setMaxOrderValueNpr(Number(e.target.value))}
                placeholder="0 = no limit"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <T>Bank Account Details</T>
          </label>
          <input
            type="text"
            placeholder="Bank name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="Branch name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="Account holder name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="SWIFT / IFSC code"
            value={swiftCode}
            onChange={(e) => setSwiftCode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </section>

        {/* Hardware link */}
        <section data-tour="m-settings-hardware">
          <Link
            href="/m/settings/hardware"
            className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <T>POS Hardware</T>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                <T>Barcode scanner · Receipt printer · Cash drawer</T>
              </p>
            </div>
            <span className="text-amber-600 dark:text-amber-400 text-sm">→</span>
          </Link>
        </section>

        {conversionNote && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 text-sm">
            {conversionNote}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Sticky Save */}
        <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-4 bg-gradient-to-t from-white dark:from-gray-950 via-white dark:via-gray-950 to-transparent">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-60 active:bg-amber-600"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-5 w-5" />
                <T>Saved</T>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <T>Save changes</T>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
