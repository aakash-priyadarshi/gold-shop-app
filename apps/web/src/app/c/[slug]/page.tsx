"use client";

import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { catalogueApi, rfqApi } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Lock,
  MessageSquare,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------- Walk-in RFQ Modal (3-step) ---------- */
function WalkInRfqModal({
  items,
  slug,
  onClose,
  onSuccess,
}: {
  items: CatalogueItemPublic[];
  slug: string;
  onClose: () => void;
  onSuccess: (rfqId: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Items
  const [selectedItems, setSelectedItems] = useState<
    { item: CatalogueItemPublic; variantId?: string; qty: number }[]
  >(items.map((i) => ({ item: i, qty: 1 })));

  // Step 2 — Request details
  const [jewelleryType, setJewelleryType] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("");
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState({
    ringSize: "",
    wristSize: "",
    chainLength: "",
    bangleSize: "",
  });

  // Step 3 — Walk-in customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const removeItem = (idx: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQty = (idx: number, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((si, i) => (i === idx ? { ...si, qty: Math.max(1, qty) } : si)),
    );
  };

  const selectVariant = (idx: number, variantId: string) => {
    setSelectedItems((prev) =>
      prev.map((si, i) => (i === idx ? { ...si, variantId } : si)),
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Please select at least one item",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        catalogueSlug: slug,
        items: selectedItems.map((si) => ({
          inventoryItemId: si.item.inventoryItemId,
          variantId: si.variantId || undefined,
          qty: si.qty,
        })),
      };
      if (jewelleryType) payload.jewelleryType = jewelleryType;
      if (budgetMin) payload.budgetMin = Number(budgetMin);
      if (budgetMax) payload.budgetMax = Number(budgetMax);
      if (deadlineDays) payload.deadlineDays = Number(deadlineDays);
      if (notes) payload.notes = notes;
      const m = measurements;
      if (m.ringSize || m.wristSize || m.chainLength || m.bangleSize) {
        payload.measurements = {};
        if (m.ringSize) payload.measurements.ringSize = m.ringSize;
        if (m.wristSize) payload.measurements.wristSize = m.wristSize;
        if (m.chainLength) payload.measurements.chainLength = m.chainLength;
        if (m.bangleSize) payload.measurements.bangleSize = m.bangleSize;
      }
      if (customerName || customerPhone || customerNotes) {
        payload.walkInCustomer = {};
        if (customerName) payload.walkInCustomer.name = customerName;
        if (customerPhone) payload.walkInCustomer.phone = customerPhone;
        if (customerNotes) payload.walkInCustomer.notes = customerNotes;
      }
      const res = await rfqApi.createWalkInRfq(payload);
      onSuccess(res.data.id || res.data.rfqId || "");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Failed to create walk-in RFQ",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";
  const labelClass =
    "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Create Walk-in RFQ
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Step {step} of 3 —{" "}
              {step === 1
                ? "Select Items"
                : step === 2
                  ? "Request Details"
                  : "Customer Info"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-4 pt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? "bg-gold-500" : "bg-gray-200 dark:bg-gray-700"}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {step === 1 && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected items from showroom session:
              </p>
              {selectedItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  No items selected.
                </p>
              )}
              {selectedItems.map((si, idx) => (
                <div
                  key={si.item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  {si.item.inventoryItem.images?.[0] ? (
                    <img
                      src={si.item.inventoryItem.images[0]}
                      className="w-12 h-12 rounded-lg object-cover"
                      alt={`${si.item.inventoryItem.title} thumbnail`}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {si.item.inventoryItem.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {si.item.inventoryItem.metal}
                      {si.item.inventoryItem.purity
                        ? ` · ${si.item.inventoryItem.purity}`
                        : ""}
                    </div>
                    {/* Variant selector */}
                    {si.item.inventoryItem.variants &&
                      si.item.inventoryItem.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {si.item.inventoryItem.variants.map((v) => (
                            <button
                              key={v.id}
                              disabled={v.stock <= 0}
                              onClick={() => selectVariant(idx, v.id)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                si.variantId === v.id
                                  ? "border-gold-500 bg-gold-50 dark:bg-gold-900/30 text-gold-600"
                                  : v.stock > 0
                                    ? "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-400"
                                    : "border-gray-200 dark:border-gray-700 text-gray-400 line-through cursor-not-allowed"
                              }`}
                            >
                              {v.size}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(idx, si.qty - 1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm text-gray-900 dark:text-white">
                      {si.qty}
                    </span>
                    <button
                      onClick={() => updateQty(idx, si.qty + 1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className={labelClass}>Jewellery Type</label>
                <select
                  value={jewelleryType}
                  onChange={(e) => setJewelleryType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select type (optional)</option>
                  {[
                    "RING",
                    "NECKLACE",
                    "BRACELET",
                    "BANGLE",
                    "EARRING",
                    "PENDANT",
                    "CHAIN",
                    "ANKLET",
                    "BROOCH",
                    "OTHER",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Budget Min (NPR)</label>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Budget Max (NPR)</label>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Timeline (days)</label>
                <input
                  type="number"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  placeholder="e.g. 14"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Special instructions, engraving, etc."
                  className={inputClass}
                />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">
                Measurements (optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ring Size</label>
                  <input
                    value={measurements.ringSize}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        ringSize: e.target.value,
                      })
                    }
                    placeholder="e.g. 7"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Wrist Size</label>
                  <input
                    value={measurements.wristSize}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        wristSize: e.target.value,
                      })
                    }
                    placeholder="e.g. 6.5 inches"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Chain Length</label>
                  <input
                    value={measurements.chainLength}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        chainLength: e.target.value,
                      })
                    }
                    placeholder="e.g. 18 inches"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bangle Size</label>
                  <input
                    value={measurements.bangleSize}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        bangleSize: e.target.value,
                      })
                    }
                    placeholder="e.g. 2.4"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                This info is stored for shop internal follow-up only. It is
                never shared in platform chat or visible to buyers.
              </div>
              <div>
                <label className={labelClass}>Customer Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Customer Phone</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  placeholder="Any internal notes about this customer"
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && selectedItems.length === 0}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-gold-600 text-white hover:bg-gold-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedItems.length === 0}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-gold-600 text-white hover:bg-gold-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Walk-in RFQ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- types ---------- */
interface CataloguePublic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mode: string;
  isPublic: boolean;
  requiresPassword: boolean;
  expiresAt?: string;
  shop: { id: string; name: string; logo?: string; slug: string };
}

interface CatalogueItemPublic {
  id: string;
  inventoryItemId: string;
  sortOrder: number;
  overridePrice?: number;
  isHidden: boolean;
  inventoryItem: {
    id: string;
    title: string;
    titleNe?: string;
    metal?: string;
    purity?: string;
    images: string[];
    totalPriceNpr?: number;
    status: string;
    variants?: { id: string; size: string; stock: number }[];
  };
}

/* ---------- password unlock form ---------- */
function PasswordGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const params = useParams();
  const slug = params.slug as string;
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await catalogueApi.unlockCatalogue(slug, pw);
      onUnlock(res.data.token);
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center space-y-4">
        <Lock className="h-10 w-10 mx-auto text-gold-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          This catalogue is protected
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter the password to view items.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white text-center"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={submit}
          disabled={loading || !pw}
          className="w-full py-2.5 rounded-lg bg-gold-600 text-white text-sm font-medium hover:bg-gold-700 disabled:opacity-50"
        >
          {loading ? "Unlocking..." : "Unlock Catalogue"}
        </button>
      </div>
    </div>
  );
}

/* ---------- showroom carousel ---------- */
function ShowroomView({
  items,
  isOwner,
  onWalkInRfq,
}: {
  items: CatalogueItemPublic[];
  isOwner: boolean;
  onWalkInRfq: (selectedItems: CatalogueItemPublic[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [sessionItems, setSessionItems] = useState<CatalogueItemPublic[]>([]);
  const [showSession, setShowSession] = useState(false);
  const item = items[idx];

  const prev = () => setIdx((i) => (i > 0 ? i - 1 : items.length - 1));
  const next = () => setIdx((i) => (i < items.length - 1 ? i + 1 : 0));

  const toggleSession = (itm: CatalogueItemPublic) => {
    setSessionItems((prev) =>
      prev.find((s) => s.id === itm.id)
        ? prev.filter((s) => s.id !== itm.id)
        : [...prev, itm],
    );
  };

  const inSession = (itm: CatalogueItemPublic) =>
    sessionItems.some((s) => s.id === itm.id);

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full bg-white/10 text-white backdrop-blur-sm"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-white text-sm font-medium">
          {idx + 1} / {items.length}
        </span>
        <button
          onClick={() => setShowSession(!showSession)}
          className="relative p-2 rounded-full bg-white/10 text-white backdrop-blur-sm"
        >
          <ShoppingBag className="h-5 w-5" />
          {sessionItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-gold-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {sessionItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {item.inventoryItem.images?.[0] ? (
          <img
            src={item.inventoryItem.images[0]}
            alt={item.inventoryItem.title}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="w-64 h-64 bg-gray-800 rounded-xl flex items-center justify-center text-gray-600">
            No Image
          </div>
        )}

        {/* Nav arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="bg-gradient-to-t from-black/80 to-transparent p-6 space-y-3">
        <h3 className="text-xl font-semibold text-white">
          {item.inventoryItem.title}
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span>{item.inventoryItem.metal}</span>
          {item.inventoryItem.purity && (
            <span>· {item.inventoryItem.purity}</span>
          )}
          <span className="text-gold-400 font-semibold">
            NPR{" "}
            {(
              item.overridePrice ||
              item.inventoryItem.totalPriceNpr ||
              0
            ).toLocaleString()}
          </span>
        </div>

        {/* Variants */}
        {item.inventoryItem.variants &&
          item.inventoryItem.variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.inventoryItem.variants.map((v) => (
                <span
                  key={v.id}
                  className={`px-2 py-1 text-xs rounded-full border ${
                    v.stock > 0
                      ? "border-green-500/30 text-green-400"
                      : "border-gray-600 text-gray-500 line-through"
                  }`}
                >
                  {v.size} {v.stock > 0 ? "" : "(out)"}
                </span>
              ))}
            </div>
          )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => toggleSession(item)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
              inSession(item)
                ? "bg-gold-600 text-white"
                : "bg-white/10 text-white backdrop-blur-sm"
            }`}
          >
            {inSession(item) ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {inSession(item) ? "Remove from Session" : "Add to Session"}
          </button>
        </div>
      </div>

      {/* Session sidebar */}
      {showSession && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-lg z-20 flex flex-col border-l border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">
              Session ({sessionItems.length})
            </h3>
            <button
              onClick={() => setShowSession(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessionItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-8">
                Add items to your session for a quick quote.
              </p>
            ) : (
              sessionItems.map((si) => (
                <div
                  key={si.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-lg p-3"
                >
                  {si.inventoryItem.images?.[0] ? (
                    <img
                      src={si.inventoryItem.images[0]}
                      className="w-10 h-10 rounded object-cover"
                      alt={`${si.inventoryItem.title} thumbnail`}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {si.inventoryItem.title}
                    </div>
                    <div className="text-xs text-gray-400">
                      NPR{" "}
                      {(
                        si.overridePrice ||
                        si.inventoryItem.totalPriceNpr ||
                        0
                      ).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSession(si)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          {/* Staff walk-in RFQ button */}
          {isOwner && sessionItems.length > 0 && (
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => onWalkInRfq(sessionItems)}
                className="w-full py-3 rounded-xl bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Create Walk-in RFQ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- main page ---------- */
export default function PublicCataloguePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();

  const [catalogue, setCatalogue] = useState<CataloguePublic | null>(null);
  const [items, setItems] = useState<CatalogueItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showShowroom, setShowShowroom] = useState(false);
  const [error, setError] = useState("");

  const isOwner = useMemo(() => {
    if (!user || !catalogue) return false;
    return user.role === "SHOPKEEPER" && user.shop?.id === catalogue.shop.id;
  }, [user, catalogue]);

  // Fetch catalogue metadata
  const fetchCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await catalogueApi.getPublicCatalogue(slug);
      const data = res.data;
      setCatalogue(data);
      let storedToken: string | null = null;
      if (data.requiresPassword) {
        // Check localStorage for token
        storedToken = localStorage.getItem(`cat_token_${slug}`);
        if (storedToken) {
          setToken(storedToken);
        } else {
          setNeedsPassword(true);
          setLoading(false);
          return;
        }
      }
      await fetchItems(storedToken || undefined);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Catalogue not found or has expired.");
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchItems = async (tkn?: string) => {
    try {
      const t = tkn || token || undefined;
      const res = await catalogueApi.getPublicItems(slug, t);
      setItems(
        (res.data || []).filter((i: CatalogueItemPublic) => !i.isHidden),
      );
    } catch {
      setError("Failed to load items.");
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  // Check for showroom mode
  useEffect(() => {
    if (
      catalogue &&
      (catalogue.mode === "SHOWROOM" || searchParams.get("mode") === "showroom")
    ) {
      setShowShowroom(true);
    }
  }, [catalogue, searchParams]);

  // Record view
  useEffect(() => {
    if (catalogue && !needsPassword) {
      catalogueApi.recordView(slug).catch(() => {});
    }
  }, [catalogue, needsPassword, slug]);

  const handleUnlock = async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem(`cat_token_${slug}`, newToken);
    setNeedsPassword(false);
    setLoading(true);
    await fetchItems(newToken);
    setLoading(false);
  };

  const handleMessageShop = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/c/${slug}`);
      return;
    }
    try {
      await catalogueApi.messageShop(slug);
      toast({ title: "Conversation started! Check your messages." });
      router.push("/dashboard/customer/messages");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Failed to start conversation",
      });
    }
  };

  const handleRequestQuote = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/c/${slug}`);
      return;
    }
    try {
      const quoteItems = items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        qty: 1,
      }));
      await catalogueApi.requestQuote(slug, { items: quoteItems });
      toast({ title: "Quote requested! The shop will respond shortly." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.response?.data?.message || "Failed to request quote",
      });
    }
  };

  // Walk-in RFQ modal state
  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInItems, setWalkInItems] = useState<CatalogueItemPublic[]>([]);

  const handleWalkInRfq = (selectedItems: CatalogueItemPublic[]) => {
    setWalkInItems(selectedItems);
    setWalkInModal(true);
  };

  const handleWalkInRfqClose = () => {
    setWalkInModal(false);
    setWalkInItems([]);
  };

  // Password gate
  if (needsPassword) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center space-y-3">
          <Store className="h-12 w-12 mx-auto text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading || !catalogue) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Showroom mode
  if (showShowroom && items.length > 0) {
    return (
      <>
        <ShowroomView
          items={items}
          isOwner={isOwner}
          onWalkInRfq={handleWalkInRfq}
        />
        {walkInModal && (
          <WalkInRfqModal
            items={walkInItems}
            slug={slug}
            onClose={handleWalkInRfqClose}
            onSuccess={(rfqId) => {
              handleWalkInRfqClose();
              toast({
                title: `Walk-in RFQ created!${rfqId ? ` ID: ${rfqId.slice(0, 8)}...` : ""}`,
              });
              router.push(`/dashboard/shop/rfqs`);
            }}
          />
        )}
      </>
    );
  }

  // Normal catalogue view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {catalogue.shop.logo && (
              <img
                src={catalogue.shop.logo}
                alt={catalogue.shop.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gold-200 dark:border-gold-800"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {catalogue.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                by {catalogue.shop.name}
              </p>
            </div>
          </div>
          {catalogue.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {catalogue.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleMessageShop}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <MessageSquare className="h-4 w-4" />
              Message Shop
            </button>
            <button
              onClick={handleRequestQuote}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gold-600 text-white hover:bg-gold-700"
            >
              <FileText className="h-4 w-4" />
              Request Quote
            </button>
            {catalogue.mode === "SHOWROOM" && (
              <button
                onClick={() => setShowShowroom(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                <Eye className="h-4 w-4" />
                Showroom Mode
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {items.length} items
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>This catalogue has no items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-square relative overflow-hidden">
                  {item.inventoryItem.images?.[0] ? (
                    <img
                      src={item.inventoryItem.images[0]}
                      alt={item.inventoryItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {/* Variants badge */}
                  {item.inventoryItem.variants &&
                    item.inventoryItem.variants.length > 0 && (
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {item.inventoryItem.variants.length} sizes
                      </div>
                    )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.inventoryItem.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{item.inventoryItem.metal}</span>
                    {item.inventoryItem.purity && (
                      <>
                        <span>·</span>
                        <span>{item.inventoryItem.purity}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                    NPR{" "}
                    {(
                      item.overridePrice ||
                      item.inventoryItem.totalPriceNpr ||
                      0
                    ).toLocaleString()}
                  </div>
                  {/* Size chips */}
                  {item.inventoryItem.variants &&
                    item.inventoryItem.variants.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.inventoryItem.variants.slice(0, 4).map((v) => (
                          <span
                            key={v.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              v.stock > 0
                                ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400 line-through"
                            }`}
                          >
                            {v.size}
                          </span>
                        ))}
                        {item.inventoryItem.variants.length > 4 && (
                          <span className="text-[10px] text-gray-400">
                            +{item.inventoryItem.variants.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff floating CTA */}
      {isOwner && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowShowroom(true)}
            className="px-5 py-3 rounded-full bg-gold-600 text-white shadow-lg hover:bg-gold-700 flex items-center gap-2 text-sm font-semibold"
          >
            <Eye className="h-4 w-4" />
            Open Showroom
          </button>
        </div>
      )}

      {/* Walk-in RFQ modal */}
      {walkInModal && (
        <WalkInRfqModal
          items={walkInItems}
          slug={slug}
          onClose={handleWalkInRfqClose}
          onSuccess={(rfqId) => {
            handleWalkInRfqClose();
            toast({
              title: `Walk-in RFQ created!${rfqId ? ` ID: ${rfqId.slice(0, 8)}...` : ""}`,
            });
            router.push(`/dashboard/shop/rfqs`);
          }}
        />
      )}
    </div>
  );
}
