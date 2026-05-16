"use client";

/**
 * Pending Payments Register
 *
 * Jewelry shops frequently extend credit or take partial payments.
 * This page tracks those open balances:
 *   - Customer name / phone
 *   - Total sale amount
 *   - Amount paid so far
 *   - Balance due
 *   - Due date (optional)
 *   - Notes
 *
 * Data stored in localStorage — works offline, no backend change needed.
 * Call customer directly from the list (tel: link).
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useHaptics } from "@/hooks/useHaptics";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Phone,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PendingEntry {
  id: string;
  customerName: string;
  phone: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  dueDate?: string;
  notes: string;
  createdAt: string;
  settled: boolean;
}

const STORAGE_KEY = "orivraa_pending_payments";
const CURRENCIES = ["NPR", "INR", "AED", "USD", "GBP", "EUR"];

function load(): PendingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: PendingEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

function daysLeft(dueDate?: string): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PendingPage() {
  const haptic = useHaptics();

  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPaymentId, setAddPaymentId] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [formPaid, setFormPaid] = useState("");
  const [formCurrency, setFormCurrency] = useState("NPR");
  const [formDue, setFormDue] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    setEntries(load());
  }, []);

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormTotal(""); setFormPaid("");
    setFormCurrency("NPR"); setFormDue(""); setFormNotes("");
  };

  const addEntry = () => {
    const total = parseFloat(formTotal);
    const paid = parseFloat(formPaid) || 0;
    if (!formName.trim() || isNaN(total) || total <= 0) return;
    haptic("success");

    const entry: PendingEntry = {
      id: crypto.randomUUID(),
      customerName: formName.trim(),
      phone: formPhone.trim(),
      totalAmount: total,
      paidAmount: Math.min(paid, total),
      currency: formCurrency,
      dueDate: formDue || undefined,
      notes: formNotes.trim(),
      createdAt: new Date().toISOString(),
      settled: paid >= total,
    };

    const next = [entry, ...entries];
    setEntries(next);
    save(next);
    resetForm();
    setShowForm(false);
  };

  const addPayment = (id: string) => {
    const extra = parseFloat(extraPayment);
    if (isNaN(extra) || extra <= 0) return;
    haptic("success");

    const next = entries.map((e) => {
      if (e.id !== id) return e;
      const newPaid = Math.min(e.paidAmount + extra, e.totalAmount);
      return { ...e, paidAmount: newPaid, settled: newPaid >= e.totalAmount };
    });

    setEntries(next);
    save(next);
    setAddPaymentId(null);
    setExtraPayment("");
  };

  const deleteEntry = (id: string) => {
    haptic("medium");
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    save(next);
  };

  const open = entries.filter((e) => !e.settled);
  const settled = entries.filter((e) => e.settled);
  const totalDue = open.reduce((s, e) => s + (e.totalAmount - e.paidAmount), 0);
  const overdue = open.filter((e) => {
    const d = daysLeft(e.dueDate);
    return d !== null && d < 0;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Pending Payments</T></h1>
          <p className="text-xs text-gray-400">
            {open.length} open · {open.length > 0 ? fmt(totalDue, open[0]?.currency ?? "NPR") + " due" : "all settled"}
          </p>
        </div>
        <MobileHelpButton
          title="Pending Payments Register"
          description="Track customers who paid partially or promised to pay later. Record any extra payment as it comes in."
          tips={[
            "Tap + to record a new credit sale or advance booking",
            "Tap any entry to see details and add a payment",
            "Red entries are overdue — call the customer directly",
            "Tap the phone icon to call the customer from the app",
            "Settled entries are archived, not deleted",
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Summary */}
        {open.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{open.length}</p>
              <p className="text-[11px] text-amber-600"><T>Open</T></p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
              <p className="text-lg font-bold text-red-600">{overdue.length}</p>
              <p className="text-[11px] text-red-500"><T>Overdue</T></p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
              <p className="text-lg font-bold text-green-700">{settled.length}</p>
              <p className="text-[11px] text-green-600"><T>Settled</T></p>
            </div>
          </div>
        )}

        {/* Open entries */}
        {open.length > 0 ? (
          <div className="space-y-2">
            {open.map((e) => {
              const balance = e.totalAmount - e.paidAmount;
              const pct = Math.round((e.paidAmount / e.totalAmount) * 100);
              const days = daysLeft(e.dueDate);
              const isOverdue = days !== null && days < 0;
              const expanded = expandedId === e.id;

              return (
                <div
                  key={e.id}
                  className={`bg-white rounded-2xl border ${isOverdue ? "border-red-200" : "border-gray-100"}`}
                >
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3"
                    onClick={() => { haptic("light"); setExpandedId(expanded ? null : e.id); }}
                  >
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-amber-700">
                        {e.customerName[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{e.customerName}</p>
                        {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-red-600 font-bold">{fmt(balance, e.currency)}</p>
                      <p className="text-[10px] text-gray-400">
                        {days === null ? "No due date" : isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-300 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-400"><T>Total</T></p>
                          <p className="font-semibold">{fmt(e.totalAmount, e.currency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400"><T>Paid</T></p>
                          <p className="font-semibold text-green-700">{fmt(e.paidAmount, e.currency)}</p>
                        </div>
                      </div>
                      {e.notes && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{e.notes}</p>
                      )}

                      {addPaymentId === e.id ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={extraPayment}
                            onChange={(ev) => setExtraPayment(ev.target.value)}
                            placeholder={`Amount in ${e.currency}`}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button onClick={() => addPayment(e.id)} className="px-4 py-2 bg-green-500 text-white text-sm rounded-xl font-medium">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setAddPaymentId(null)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {e.phone && (
                            <a
                              href={`tel:${e.phone}`}
                              className="flex-1 h-9 rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <T>Call</T>
                            </a>
                          )}
                          <button
                            onClick={() => setAddPaymentId(e.id)}
                            className="flex-1 h-9 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-medium flex items-center justify-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <T>Add Payment</T>
                          </button>
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
            <Wallet className="h-10 w-10" />
            <p className="text-sm text-center"><T>No open balances. All payments settled!</T></p>
          </div>
        )}

        {/* Settled history toggle */}
        {settled.length > 0 && (
          <div>
            <button
              onClick={() => setShowSettled((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSettled ? "rotate-180" : ""}`} />
              <T>Settled</T> ({settled.length})
            </button>
            {showSettled && (
              <div className="space-y-2">
                {settled.map((e) => (
                  <div key={e.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 opacity-60">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{e.customerName}</p>
                      <p className="text-xs text-gray-400">{fmt(e.totalAmount, e.currency)}</p>
                    </div>
                    <button onClick={() => deleteEntry(e.id)} className="text-gray-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-sm font-semibold text-gray-900"><T>New Pending Payment</T></p>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Customer name *"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="Phone number"
            type="tel"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <input
              value={formTotal}
              onChange={(e) => setFormTotal(e.target.value)}
              placeholder="Total amount *"
              type="number"
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="relative">
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="appearance-none px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl pr-7 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <input
            value={formPaid}
            onChange={(e) => setFormPaid(e.target.value)}
            placeholder="Paid so far (0 if none)"
            type="number"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            value={formDue}
            onChange={(e) => setFormDue(e.target.value)}
            type="date"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-600"
          />
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Notes (item name, occasion, etc.)"
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"><T>Cancel</T></button>
            <button onClick={addEntry} disabled={!formName.trim() || !formTotal} className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"><T>Save</T></button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => { haptic("light"); setShowForm(true); }}
            className="w-full h-12 rounded-2xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <T>Record Pending Payment</T>
          </button>
        </div>
      )}
    </div>
  );
}
