"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { useHaptics } from "@/hooks/useHaptics";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getDB, type LocalSavingsMember } from "@/lib/offline/db";
import {
  enrollMember,
  recordPayment as recordPaymentOffline,
  redeemMember,
  refreshSavings,
} from "@/lib/offline/savings";
import { useLiveQuery } from "dexie-react-hooks";
import {
    Check,
    Loader2,
    MessageCircle,
    Plus,
    TrendingUp,
    X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface SavingsMember {
  id: string;
  customerName: string;
  customerPhone?: string;
  schemeType: "DAILY" | "WEEKLY" | "MONTHLY";
  installmentAmount: number;
  installmentsPaid: number;
  totalInstallments: number;
  currency: string;
  totalSaved: number;
  bonusAmount: number;
  payoutTotal: number;
  startDate: string;
  maturityDate: string;
  status: "ACTIVE" | "MATURED" | "REDEEMED" | "CANCELLED";
}

const SCHEME_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const STATUS_CONFIG: Record<
  SavingsMember["status"],
  { label: string; color: string; bg: string }
> = {
  ACTIVE: { label: "Active", color: "text-green-700", bg: "bg-green-50" },
  MATURED: { label: "Matured", color: "text-amber-700", bg: "bg-amber-50" },
  REDEEMED: { label: "Redeemed", color: "text-gray-600", bg: "bg-gray-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
};

function EnrollForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const haptic = useHaptics();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    schemeType: "MONTHLY" as SavingsMember["schemeType"],
    installmentAmount: "",
    totalInstallments: "11",
    bonusInstallments: "1",
    startDate: new Date().toISOString().split("T")[0],
    currency: "NPR",
  });
  const [saving, setSaving] = useState(false);

  const installAmt = parseFloat(form.installmentAmount) || 0;
  const totalInst = parseInt(form.totalInstallments) || 11;
  const bonusInst = parseInt(form.bonusInstallments) || 1;
  const totalSaved = installAmt * totalInst;
  const bonusAmount = installAmt * bonusInst;
  const payoutTotal = totalSaved + bonusAmount;

  const handleSubmit = async () => {
    if (!form.customerName || !form.installmentAmount) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await enrollMember(user?.shop?.id ?? "", {
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        schemeType: form.schemeType,
        installmentAmount: installAmt,
        totalInstallments: totalInst,
        bonusInstallments: bonusInst,
        currency: form.currency,
        startDate: form.startDate,
      });
      toast({ title: "Member enrolled in savings scheme!" });
      haptic("success");
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to enroll",
        description: err?.response?.data?.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-h-[90dvh] flex flex-col border-t border-gray-100 dark:border-gray-850">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-850">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100"><T>Enroll in Savings Scheme</T></h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <Field label="Customer Name *">
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer full name"
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="+977 98XXXXXXXX"
              className="input"
            />
          </Field>
          <Field label="Scheme Type">
            <div className="flex gap-2">
              {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, schemeType: t })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    form.schemeType === t
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {SCHEME_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Installment (NPR) *">
              <input
                type="number"
                inputMode="numeric"
                value={form.installmentAmount}
                onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
                placeholder="e.g. 1000"
                className="input"
              />
            </Field>
            <Field label="# of Installments">
              <input
                type="number"
                inputMode="numeric"
                value={form.totalInstallments}
                onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Bonus Installments (Free)">
            <input
              type="number"
              inputMode="numeric"
              value={form.bonusInstallments}
              onChange={(e) => setForm({ ...form, bonusInstallments: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="input"
            />
          </Field>

          {/* Payout preview */}
          {installAmt > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400"><T>Payout Preview</T></p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Paid ({totalInst} × NPR {installAmt.toLocaleString()})</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">NPR {totalSaved.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Bonus ({bonusInst} free)</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">+ NPR {bonusAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-amber-200 dark:border-amber-900/60 pt-1.5">
                <span><T>Total Payout</T></span>
                <span className="text-amber-700 dark:text-amber-400">NPR {payoutTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-850">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            <T>Enroll Customer</T>
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1"><T>{label}</T></label>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          background-color: white;
          color: #111827;
        }
        :global(.input:focus) {
          outline: none;
          box-shadow: 0 0 0 2px #f59e0b;
        }
        :global(.dark .input) {
          border-color: #374151;
          background-color: #030712;
          color: #f9fafb;
        }
      `}</style>
      {children}
    </div>
  );
}

function MemberCard({
  member,
  onRecord,
  onRedeem,
}: {
  member: SavingsMember;
  onRecord: () => void;
  onRedeem: () => void;
}) {
  const s = STATUS_CONFIG[member.status];
  const pct = Math.round((member.installmentsPaid / member.totalInstallments) * 100);

  const whatsappSummary = () => {
    if (!member.customerPhone) return;
    const msg = encodeURIComponent(
      `Hello ${member.customerName},\n\nYour Gold Savings Scheme update:\n` +
        `✅ Installments Paid: ${member.installmentsPaid}/${member.totalInstallments}\n` +
        `💰 Total Saved: ${member.currency} ${member.totalSaved.toLocaleString()}\n` +
        `🎁 Bonus: ${member.currency} ${member.bonusAmount.toLocaleString()}\n` +
        `📦 Payout Total: ${member.currency} ${member.payoutTotal.toLocaleString()}\n\n` +
        (member.status === "MATURED"
          ? `🎉 Your scheme has MATURED! Please visit us to redeem.`
          : `Maturity Date: ${new Date(member.maturityDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`),
    );
    window.open(
      `https://wa.me/${member.customerPhone.replace(/\D/g, "")}?text=${msg}`,
      "_blank",
      "noreferrer",
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{member.customerName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {SCHEME_LABELS[member.schemeType]} — {member.currency}{" "}
            {member.installmentAmount.toLocaleString()}/installment
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} dark:bg-gray-800/80 ${s.color} dark:text-amber-400`}>
          {s.label}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            {member.installmentsPaid}/{member.totalInstallments} paid
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Saved</p>
          <p className="font-bold text-gray-805 dark:text-gray-200">
            {member.currency} {member.totalSaved.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Bonus</p>
          <p className="font-bold text-amber-600 dark:text-amber-400">
            +{member.currency} {member.bonusAmount.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 dark:text-gray-400">Payout</p>
          <p className="font-bold text-green-700 dark:text-green-400">
            {member.currency} {member.payoutTotal.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {member.customerPhone && (
          <button
            onClick={whatsappSummary}
            className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> <T>Update</T>
          </button>
        )}
        {member.status === "ACTIVE" && (
          <button
            onClick={onRecord}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> <T>Record Payment</T>
          </button>
        )}
        {(member.status === "MATURED" || member.status === "ACTIVE") && (
          <button
            onClick={onRedeem}
            className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" /> <T>Redeem</T>
          </button>
        )}
      </div>
    </div>
  );
}

export default function SavingsPage() {
  const { user } = useAuth();
  const shopId = user?.shop?.id;
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");

  // Local-first: read from IndexedDB so the list is instant & offline-safe.
  const allMembers = (useLiveQuery(
    () =>
      shopId
        ? getDB().savingsMembers.where("shopId").equals(shopId).reverse().sortBy("id")
        : Promise.resolve([] as LocalSavingsMember[]),
    [shopId],
  ) ?? []) as SavingsMember[];

  const members =
    filter === "ALL"
      ? allMembers
      : allMembers.filter((m) => m.status === "ACTIVE");

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      await refreshSavings(shopId, filter === "ALL" ? undefined : "ACTIVE");
    } catch {
      // Offline or server error — keep showing the local cache.
    } finally {
      setLoading(false);
    }
  }, [shopId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const recordPayment = async (memberId: string) => {
    try {
      await recordPaymentOffline(memberId);
      toast({ title: "Payment recorded!" });
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    }
  };

  const redeem = async (memberId: string) => {
    try {
      await redeemMember(memberId);
      toast({ title: "Scheme redeemed!" });
    } catch {
      toast({ title: "Failed to redeem", variant: "destructive" });
    }
  };

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const totalPool = members
    .filter((m) => m.status === "ACTIVE")
    .reduce((s, m) => s + m.totalSaved, 0);

  return (
    <MobileFeatureGate feature="mobileSavings" featureName="Gold Savings Scheme">
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-850 px-4 py-4">
          <div data-tour="m-savings-header" className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Gold Savings</T></h1>
              <p className="text-xs text-gray-400">
                {activeCount} active · NPR {totalPool.toLocaleString()} in pool
              </p>
            </div>
            <div className="flex items-center gap-1">
              <MobileHelpButton
                title="Gold Savings Scheme"
                description="Run your shop's monthly Gold Savings programme — customers deposit each month and redeem at maturity rate."
                tips={[
                  "Tap Enroll to add a new member with their monthly amount and tenure",
                  "Each member's deposits convert to grams of gold at the day's rate",
                  "Get reminders for due deposits and maturity dates",
                  "On maturity, redeem against any jewelry purchase at the locked rate",
                ]}
              />
              <button
                data-tour="m-savings-enroll"
                onClick={() => setShowForm(true)}
                className="h-9 px-4 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <T>Enroll</T>
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {(["ACTIVE", "ALL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-4 py-1.5 rounded-full font-medium ${
                  filter === f ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {f === "ACTIVE" ? <T>Active</T> : <T>All</T>}
              </button>
            ))}
          </div>
        </div>

        <div data-tour="m-savings-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && members.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <TrendingUp className="h-10 w-10" />
              <p className="text-sm font-medium"><T>No savings scheme members</T></p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-amber-600 font-medium underline underline-offset-2"
              >
                <T>Enroll first customer</T>
              </button>
            </div>
          ) : (
            members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onRecord={() => recordPayment(m.id)}
                onRedeem={() => redeem(m.id)}
              />
            ))
          )}
        </div>
      </div>

      {showForm && (
        <EnrollForm onClose={() => setShowForm(false)} onSaved={load} />
      )}
    </MobileFeatureGate>
  );
}


