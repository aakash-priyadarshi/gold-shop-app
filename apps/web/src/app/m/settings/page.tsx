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

        {/* Contact */}
        <section className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <T>Shop Contact</T>
          </label>
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
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
