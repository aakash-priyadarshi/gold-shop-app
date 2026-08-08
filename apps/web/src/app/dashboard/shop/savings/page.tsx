"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { usePreferencesStore } from "@/store/preferences";
import {
  CheckCircle2,
  Loader2,
  PiggyBank,
  Plus,
  RefreshCw,
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
  bonusInstallments?: number;
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

function SavingsSchemesPage() {
  const { user } = useAuth();
  const shopCurrency = usePreferencesStore((s) => s.currency) || user?.shop?.currency || "NPR";
  const [members, setMembers] = useState<SavingsMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    schemeType: "MONTHLY" as SavingsMember["schemeType"],
    installmentAmount: "",
    totalInstallments: "11",
    bonusInstallments: "1",
    startDate: new Date().toISOString().split("T")[0],
    currency: shopCurrency,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, currency: shopCurrency }));
  }, [shopCurrency]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/savings-schemes", {
        params: {
          limit: 100,
          status: filter === "ACTIVE" ? "ACTIVE" : undefined,
        },
      });
      setMembers(res.data?.members ?? []);
    } catch {
      toast({ title: "Failed to load schemes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const enroll = async () => {
    if (!form.customerName || !form.installmentAmount) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/savings-schemes", {
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        schemeType: form.schemeType,
        installmentAmount: parseFloat(form.installmentAmount),
        totalInstallments: parseInt(form.totalInstallments, 10) || 11,
        bonusInstallments: parseInt(form.bonusInstallments, 10) || 0,
        currency: form.currency,
        startDate: form.startDate,
      });
      toast({ title: "Member enrolled" });
      setShowForm(false);
      setForm({
        customerName: "",
        customerPhone: "",
        schemeType: "MONTHLY",
        installmentAmount: "",
        totalInstallments: "11",
        bonusInstallments: "1",
        startDate: new Date().toISOString().split("T")[0],
        currency: shopCurrency,
      });
      await load();
    } catch (err: any) {
      toast({
        title: "Could not enroll",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/savings-schemes/${id}/payment`, {});
      toast({ title: "Payment recorded" });
      await load();
    } catch (err: any) {
      toast({
        title: "Payment failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const redeem = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/savings-schemes/${id}/redeem`, {});
      toast({ title: "Scheme redeemed" });
      await load();
    } catch (err: any) {
      toast({
        title: "Redeem failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const pool = members
    .filter((m) => m.status === "ACTIVE" || m.status === "MATURED")
    .reduce((s, m) => s + (m.totalSaved || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <PiggyBank className="h-7 w-7 text-amber-500" />
              <T>Savings Schemes</T>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <T>Enroll customers, record installments, and redeem at the counter.</T>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              <T>Refresh</T>
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <T>Enroll Member</T>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription><T>Active members</T></CardDescription>
              <CardTitle className="text-3xl">{activeCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription><T>Scheme pool</T></CardDescription>
              <CardTitle className="text-3xl">
                {shopCurrency} {pool.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex gap-2">
          {(["ACTIVE", "ALL"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className={filter === f ? "bg-amber-500 hover:bg-amber-600" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "ACTIVE" ? <T>Active</T> : <T>All</T>}
            </Button>
          ))}
        </div>

        {loading && members.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PiggyBank className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium"><T>No scheme members yet</T></p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <T>Enroll first customer</T>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const pct = Math.round(
                (m.installmentsPaid / Math.max(m.totalInstallments, 1)) * 100,
              );
              return (
                <Card key={m.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {m.customerName}
                          </p>
                          <Badge variant="secondary">{m.status}</Badge>
                          <Badge variant="outline">
                            {SCHEME_LABELS[m.schemeType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {m.currency} {m.installmentAmount.toLocaleString()} / installment
                          {m.customerPhone ? ` · ${m.customerPhone}` : ""}
                        </p>
                        <div className="mt-3 max-w-md">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>
                              {m.installmentsPaid}/{m.totalInstallments} paid
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <span>
                            <T>Saved</T>:{" "}
                            <strong>
                              {m.currency} {m.totalSaved.toLocaleString()}
                            </strong>
                          </span>
                          <span>
                            <T>Bonus</T>:{" "}
                            <strong className="text-amber-600">
                              +{m.currency} {m.bonusAmount.toLocaleString()}
                            </strong>
                          </span>
                          <span>
                            <T>Payout</T>:{" "}
                            <strong className="text-green-700 dark:text-green-400">
                              {m.currency} {m.payoutTotal.toLocaleString()}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        {m.status === "ACTIVE" && (
                          <Button
                            size="lg"
                            className="bg-amber-500 hover:bg-amber-600 text-white min-w-[160px]"
                            disabled={busyId === m.id}
                            onClick={() => recordPayment(m.id)}
                          >
                            {busyId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            <T>Record Payment</T>
                          </Button>
                        )}
                        {(m.status === "ACTIVE" || m.status === "MATURED") && (
                          <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                            disabled={busyId === m.id}
                            onClick={() => redeem(m.id)}
                          >
                            {busyId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            <T>Redeem</T>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold"><T>Enroll Member</T></h3>
            <p className="text-sm text-muted-foreground">
              <T>Large buttons and short form — enter name, amount, and months.</T>
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label><T>Customer name</T> *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-1">
                <Label><T>Phone</T></Label>
                <Input
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerPhone: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label><T>Scheme type</T></Label>
                  <Select
                    value={form.schemeType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        schemeType: v as SavingsMember["schemeType"],
                      }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY"><T>Monthly</T></SelectItem>
                      <SelectItem value="WEEKLY"><T>Weekly</T></SelectItem>
                      <SelectItem value="DAILY"><T>Daily</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label><T>Currency</T></Label>
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        currency: (e.target.value || shopCurrency) as typeof shopCurrency,
                      }))
                    }
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label><T>Installment</T> *</Label>
                  <Input
                    type="number"
                    value={form.installmentAmount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        installmentAmount: e.target.value,
                      }))
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <Label><T>Total</T></Label>
                  <Input
                    type="number"
                    value={form.totalInstallments}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        totalInstallments: e.target.value,
                      }))
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
                  <Label><T>Bonus</T></Label>
                  <Input
                    type="number"
                    value={form.bonusInstallments}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bonusInstallments: e.target.value,
                      }))
                    }
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label><T>Start date</T></Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white min-w-[140px]"
                disabled={saving}
                onClick={enroll}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                <T>Enroll</T>
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function SavingsSchemesPageWithGuard() {
  return (
    <ShopGuard>
      <SavingsSchemesPage />
    </ShopGuard>
  );
}
