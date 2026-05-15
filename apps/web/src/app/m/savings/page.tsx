"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
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
      await api.post("/savings-schemes", {
        shopId: user?.shop?.id,
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
      <div className="bg-white rounded-t-2xl w-full max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold"><T>Enroll in Savings Scheme</T></h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100">
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
                      : "bg-gray-100 text-gray-600"
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
            <div className="bg-amber-50 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800"><T>Payout Preview</T></p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Paid ({totalInst} × NPR {installAmt.toLocaleString()})</span>
                <span className="font-medium">NPR {totalSaved.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Bonus ({bonusInst} free)</span>
                <span className="font-medium text-amber-700">+ NPR {bonusAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-amber-200 pt-1.5">
                <span><T>Total Payout</T></span>
                <span className="text-amber-700">NPR {payoutTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t">
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
        }
        :global(.input:focus) {
          outline: none;
          box-shadow: 0 0 0 2px #f59e0b;
        }
      `}</style>
      {children}
    </div>
  );
}

function MemberCard({ member, onRecord }: { member: SavingsMember; onRecord: () => void }) {
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
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{member.customerName}</p>
          <p className="text-xs text-gray-500">
            {SCHEME_LABELS[member.schemeType]} — {member.currency}{" "}
            {member.installmentAmount.toLocaleString()}/installment
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
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
          <p className="text-gray-500">Saved</p>
          <p className="font-bold text-gray-800">
            {member.currency} {member.totalSaved.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Bonus</p>
          <p className="font-bold text-amber-600">
            +{member.currency} {member.bonusAmount.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Payout</p>
          <p className="font-bold text-green-700">
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
      </div>
    </div>
  );
}

export default function SavingsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<SavingsMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");

  const load = useCallback(async () => {
    const shopId = user?.shop?.id;
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get("/savings-schemes", {
        params: { shopId, limit: 50, status: filter === "ALL" ? undefined : "ACTIVE" },
      });
      setMembers(res.data?.members ?? res.data?.items ?? res.data ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.shop?.id, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const recordPayment = async (memberId: string) => {
    try {
      await api.post(`/savings-schemes/${memberId}/payment`);
      toast({ title: "Payment recorded!" });
      load();
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    }
  };

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const totalPool = members
    .filter((m) => m.status === "ACTIVE")
    .reduce((s, m) => s + m.totalSaved, 0);

  return (
    <MobileFeatureGate feature="mobileSavings" featureName="Gold Savings Scheme">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div data-tour="m-savings-header" className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900"><T>Gold Savings</T></h1>
              <p className="text-xs text-gray-400">
                {activeCount} active · NPR {totalPool.toLocaleString()} in pool
              </p>
            </div>
            <button
              data-tour="m-savings-enroll"
              onClick={() => setShowForm(true)}
              className="h-9 px-4 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <T>Enroll</T>
            </button>
          </div>
          <div className="flex gap-2">
            {(["ACTIVE", "ALL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-4 py-1.5 rounded-full font-medium ${
                  filter === f ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {f === "ACTIVE" ? <T>Active</T> : <T>All</T>}
              </button>
            ))}
          </div>
        </div>

        <div data-tour="m-savings-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
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


