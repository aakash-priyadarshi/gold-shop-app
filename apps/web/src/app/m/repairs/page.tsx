"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { useHaptics } from "@/hooks/useHaptics";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
    Check,
    CheckCircle,
    ChevronRight,
    Loader2,
    MessageCircle,
    Plus,
    Wrench,
    X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface RepairJob {
  id: string;
  customerName: string;
  customerPhone?: string;
  itemDescription: string;
  issueDescription: string;
  status: "RECEIVED" | "DIAGNOSING" | "IN_REPAIR" | "READY" | "DELIVERED";
  estimatedCost?: number;
  finalCost?: number;
  createdAt: string;
  expectedReadyDate?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<
  RepairJob["status"],
  { label: string; color: string; bg: string }
> = {
  RECEIVED: { label: "Received", color: "text-blue-700", bg: "bg-blue-50" },
  DIAGNOSING: { label: "Diagnosing", color: "text-yellow-700", bg: "bg-yellow-50" },
  IN_REPAIR: { label: "In Repair", color: "text-purple-700", bg: "bg-purple-50" },
  READY: { label: "Ready for Pickup", color: "text-green-700", bg: "bg-green-50" },
  DELIVERED: { label: "Delivered", color: "text-gray-600", bg: "bg-gray-100" },
};

function LogForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    itemDescription: "",
    issueDescription: "",
    estimatedCost: "",
    expectedReadyDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.customerName || !form.itemDescription || !form.issueDescription) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/repairs", {
        shopId: user?.shop?.id,
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        itemDescription: form.itemDescription,
        issueDescription: form.issueDescription,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        expectedReadyDate: form.expectedReadyDate || undefined,
        notes: form.notes || undefined,
        status: "RECEIVED",
      });
      toast({ title: "Repair job logged!" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to save repair",
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
          <h2 className="text-base font-semibold"><T>Log Repair Job</T></h2>
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
              placeholder="Customer name"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </Field>
          <Field label="Customer Phone">
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="+977 98XXXXXXXX"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </Field>
          <Field label="Item Description *">
            <input
              type="text"
              value={form.itemDescription}
              onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
              placeholder="e.g. Gold necklace 22K, broken clasp"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </Field>
          <Field label="Issue / Work Required *">
            <textarea
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              placeholder="Describe the repair work needed…"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated Cost (NPR)">
              <input
                type="number"
                inputMode="numeric"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </Field>
            <Field label="Ready By">
              <input
                type="date"
                value={form.expectedReadyDate}
                onChange={(e) => setForm({ ...form, expectedReadyDate: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </Field>
          </div>
          <Field label="Internal Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes for your team…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </Field>
        </div>
        <div className="p-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            <T>Log Repair Job</T>
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
      {children}
    </div>
  );
}

function JobCard({ job, onStatusUpdate }: { job: RepairJob; onStatusUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const haptic = useHaptics();
  const s = STATUS_CONFIG[job.status];

  const NEXT: Partial<Record<RepairJob["status"], RepairJob["status"]>> = {
    RECEIVED: "DIAGNOSING",
    DIAGNOSING: "IN_REPAIR",
    IN_REPAIR: "READY",
    READY: "DELIVERED",
  };
  const nextStatus = NEXT[job.status];

  const advance = async () => {
    if (!nextStatus) return;
    haptic("medium");
    setUpdating(true);
    try {
      await api.patch(`/repairs/${job.id}/status`, { status: nextStatus });
      haptic("success");
      toast({ title: `Status updated to ${STATUS_CONFIG[nextStatus].label}` });
      onStatusUpdate();
    } catch {
      haptic("error");
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const notifyWhatsApp = () => {
    if (!job.customerPhone) {
      toast({ title: "No phone number for this customer", variant: "destructive" });
      return;
    }
    const msg = encodeURIComponent(
      `Hello ${job.customerName},\n\nYour repair item (${job.itemDescription}) is now *${s.label}*!\n` +
        (job.status === "READY"
          ? `Please visit our store to collect it.\n`
          : `We will notify you when it is ready.\n`) +
        (job.finalCost ? `Final charge: NPR ${job.finalCost.toLocaleString()}\n` : "") +
        `\nThank you for trusting us with your jewellery.`,
    );
    window.open(
      `https://wa.me/${job.customerPhone.replace(/\D/g, "")}?text=${msg}`,
      "_blank",
      "noreferrer",
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{job.customerName}</p>
          <p className="text-xs text-gray-500">{job.itemDescription}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
          {s.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
        {job.issueDescription}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {new Date(job.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
        {job.estimatedCost && (
          <span>Est: NPR {job.estimatedCost.toLocaleString()}</span>
        )}
        {job.expectedReadyDate && (
          <span>
            Ready by:{" "}
            {new Date(job.expectedReadyDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {job.customerPhone && (
          <button
            onClick={notifyWhatsApp}
            className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4" />
            <T>Notify</T>
          </button>
        )}
        {nextStatus && (
          <button
            onClick={advance}
            disabled={updating}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {STATUS_CONFIG[nextStatus].label}
          </button>
        )}
        {job.status === "DELIVERED" && (
          <div className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            <T>Done</T>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RepairsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    const shopId = user?.shop?.id;
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get("/repairs", {
        params: { shopId, limit: 50 },
      });
      setJobs(res.data?.items ?? res.data ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.shop?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const displayJobs =
    filter === "active"
      ? jobs.filter((j) => j.status !== "DELIVERED")
      : jobs;

  return (
    <MobileFeatureGate feature="mobileRepairs" featureName="Repair Tracker">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900"><T>Repair Tracker</T></h1>
              <p className="text-xs text-gray-400">
                {displayJobs.length} {filter === "active" ? "active" : "total"} jobs
              </p>
            </div>
            <div className="flex items-center gap-1">
              <MobileHelpButton
                title="Repair Tracker"
                description="Log every repair job and keep customers updated as it moves through the workshop."
                tips={[
                  "Tap Log Job to add a new repair with item, customer & estimate",
                  "Update status: Received → In Progress → Ready → Delivered",
                  "Customer gets an automatic WhatsApp update on each status change",
                  "Switch to All to see completed jobs and historical work",
                ]}
              />
              <button
                onClick={() => setShowForm(true)}
                className="h-9 px-4 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <T>Log Job</T>
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-4 py-1.5 rounded-full font-medium ${
                  filter === f
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {f === "active" ? <T>Active</T> : <T>All</T>}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div data-tour="m-repairs-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Wrench className="h-10 w-10" />
              <p className="text-sm font-medium"><T>No repair jobs</T></p>
              <button
                data-tour="m-repairs-log"
                onClick={() => setShowForm(true)}
                className="text-sm text-amber-600 font-medium underline underline-offset-2"
              >
                <T>Log your first repair</T>
              </button>
            </div>
          ) : (
            displayJobs.map((job) => (
              <JobCard key={job.id} job={job} onStatusUpdate={load} />
            ))
          )}
        </div>
      </div>

      {showForm && (
        <LogForm onClose={() => setShowForm(false)} onSaved={load} />
      )}
    </MobileFeatureGate>
  );
}
