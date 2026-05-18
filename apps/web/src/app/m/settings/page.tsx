"use client";

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { shopsApi } from "@/lib/api";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COUNTRIES = [
  { code: "NP", name: "Nepal", currency: "NPR", flag: "🇳🇵" },
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  { code: "AE", name: "UAE", currency: "AED", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "DE", name: "Germany (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "FR", name: "France (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "IT", name: "Italy (EU)", currency: "EUR", flag: "🇪🇺" },
  { code: "ES", name: "Spain (EU)", currency: "EUR", flag: "🇪🇺" },
];

export default function MobileStoreSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
  // Bank details
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [swiftCode, setSwiftCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await shopsApi.getSettings();
        const s = res.data ?? res;
        if (cancelled) return;
        setCountry(s.country || "NP");
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
    try {
      await shopsApi.updateSettings({
        country,
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
        bankAccountDetails: (bankName || accountNumber || accountName || branchName || swiftCode) ? {
          bankName: bankName || undefined,
          accountNumber: accountNumber || undefined,
          accountName: accountName || undefined,
          branchName: branchName || undefined,
          swiftCode: swiftCode || undefined,
        } : undefined,
      });
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/m/pos"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900"><T>Store Settings</T></h1>
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
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.currency}</p>
                    </div>
                  </div>
                  {active && <Check className="h-5 w-5 text-amber-600" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            <T>Live rates and tax forms switch automatically to</T>{" "}
            <span className="font-semibold">{selectedCountry.currency}</span>.
          </p>
        </section>

        {/* Shop Info */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Shop Info</T>
          </label>
          <input
            type="text"
            placeholder="Shop Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none"
          />
          <input
            type="email"
            placeholder="Business email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
        </section>

        {/* Location */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Location</T>
          </label>
          <input
            type="text"
            placeholder="State / Province"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Pincode / ZIP"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Contact Numbers</T>
          </label>
          <input
            type="tel"
            placeholder="Contact phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="tel"
            placeholder="WhatsApp number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
        </section>

        {/* Making charge */}
        <section>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            <T>Default Making Charge (%)</T>
          </label>
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={makingChargePercent}
            onChange={(e) => setMakingChargePercent(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            <T>Used as the default in POS and quotes. Can be overridden per bill.</T>
          </p>
        </section>

        {/* Business Settings */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Business Settings</T>
          </label>
          {/* isActive toggle */}
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
              isActive ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900"><T>Shop Active</T></p>
              <p className="text-xs text-gray-500"><T>Accept new orders from customers</T></p>
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
              codEnabled ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900"><T>Cash on Delivery</T></p>
              <p className="text-xs text-gray-500"><T>Allow COD orders</T></p>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors relative ${codEnabled ? "bg-amber-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${codEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
          {codEnabled && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500"><T>Max COD Order Value</T></label>
              <input
                type="number"
                min={0}
                value={codMaxValueNpr || ""}
                onChange={(e) => setCodMaxValueNpr(Number(e.target.value))}
                placeholder="0 = no limit"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1"><T>Min Order Value</T></label>
              <input
                type="number"
                min={0}
                value={minOrderValueNpr || ""}
                onChange={(e) => setMinOrderValueNpr(Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1"><T>Max Order Value</T></label>
              <input
                type="number"
                min={0}
                value={maxOrderValueNpr || ""}
                onChange={(e) => setMaxOrderValueNpr(Number(e.target.value))}
                placeholder="0 = no limit"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Bank Account Details</T>
          </label>
          <input
            type="text"
            placeholder="Bank name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Branch name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Account holder name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="SWIFT / IFSC code"
            value={swiftCode}
            onChange={(e) => setSwiftCode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
        </section>

        {/* Hardware link */}
        <section>
          <Link
            href="/m/settings/hardware"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                <T>POS Hardware</T>
              </p>
              <p className="text-[11px] text-gray-500">
                <T>Barcode scanner · Receipt printer · Cash drawer</T>
              </p>
            </div>
            <span className="text-amber-600 text-sm">→</span>
          </Link>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Sticky Save */}
        <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-4 bg-gradient-to-t from-white via-white to-transparent">
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
