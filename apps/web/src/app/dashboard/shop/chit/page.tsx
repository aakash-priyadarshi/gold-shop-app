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
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { chitApi } from "@/lib/api";
import { usePreferencesStore } from "@/store/preferences";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ChitMember {
  id: string;
  ticketNumber: number;
  customerName: string;
  customerPhone?: string | null;
  hasWon: boolean;
  wonCycleNumber?: number | null;
}

interface ChitCycle {
  id: string;
  cycleNumber: number;
  dueDate: string;
  status: "OPEN" | "CLOSED";
  netPrize?: number | null;
  foremanCommission?: number | null;
  winnerMemberId?: string | null;
  payments?: Array<{ memberId: string; amount: number }>;
  winner?: { id: string; customerName: string; ticketNumber: number } | null;
}

interface ChitGroup {
  id: string;
  name: string;
  chitValue: number;
  memberSlots: number;
  installmentAmount: number;
  foremanCommissionPercent: number;
  currency: string;
  startDate: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  members?: ChitMember[];
  cycles?: ChitCycle[];
  _count?: { members: number; cycles: number };
}

function ChitCommitteesPage() {
  const { user } = useAuth();
  const shopCurrency =
    usePreferencesStore((s) => s.currency) || user?.shop?.currency || "NPR";
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    group: ChitGroup;
    openCycle: ChitCycle | null;
    arrears: ChitMember[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [memberForm, setMemberForm] = useState({
    customerName: "",
    customerPhone: "",
  });
  const [form, setForm] = useState({
    name: "",
    chitValue: "",
    memberSlots: "20",
    foremanCommissionPercent: "5",
    currency: shopCurrency,
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    setForm((f) => ({ ...f, currency: shopCurrency }));
  }, [shopCurrency]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chitApi.list();
      setGroups(res.data?.groups ?? []);
    } catch {
      toast({ title: "Failed to load chit groups", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await chitApi.get(id);
      setDetail(res.data);
      setSelectedId(id);
    } catch {
      toast({ title: "Failed to load group", variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const createGroup = async () => {
    if (!form.name.trim() || !form.chitValue || !form.memberSlots) {
      toast({ title: "Name, value and slots are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const slots = parseInt(form.memberSlots, 10);
      const value = parseFloat(form.chitValue);
      const res = await chitApi.create({
        name: form.name.trim(),
        chitValue: value,
        memberSlots: slots,
        installmentAmount: Number((value / slots).toFixed(2)),
        foremanCommissionPercent: parseFloat(form.foremanCommissionPercent) || 0,
        currency: form.currency,
        startDate: form.startDate,
      });
      toast({ title: "Chit committee created" });
      setShowForm(false);
      await loadGroups();
      if (res.data?.id) await loadDetail(res.data.id);
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message || "Create failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addMember = async () => {
    if (!selectedId || !memberForm.customerName.trim()) return;
    setBusy(true);
    try {
      await chitApi.addMember(selectedId, {
        customerName: memberForm.customerName.trim(),
        customerPhone: memberForm.customerPhone.trim() || undefined,
      });
      setMemberForm({ customerName: "", customerPhone: "" });
      await loadDetail(selectedId);
      await loadGroups();
      toast({ title: "Member added" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message || "Could not add member",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const openCycle = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await chitApi.openCycle(selectedId);
      await loadDetail(selectedId);
      toast({ title: "Cycle opened" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message || "Could not open cycle",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (memberId: string) => {
    if (!selectedId || !detail?.openCycle) return;
    setBusy(true);
    try {
      await chitApi.recordPayment(selectedId, detail.openCycle.id, { memberId });
      await loadDetail(selectedId);
      toast({ title: "Payment recorded" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message || "Payment failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const declareWinner = async (winnerMemberId: string) => {
    if (!selectedId || !detail?.openCycle) return;
    setBusy(true);
    try {
      await chitApi.declareWinner(selectedId, detail.openCycle.id, {
        winnerMemberId,
      });
      await loadDetail(selectedId);
      await loadGroups();
      toast({ title: "Winner declared — cycle closed" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message || "Could not declare winner",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: number, currency: string) =>
    `${currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="chit-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-600" />
              <T>Chit Committees</T>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <T>
                Rotating committee ledger — monthly dues, manual winner, foreman
                commission. Separate from individual gold savings schemes.
              </T>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadGroups}>
              <RefreshCw className="h-4 w-4 mr-1" />
              <T>Refresh</T>
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" />
              <T>New Committee</T>
            </Button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                <T>Create committee</T>
              </CardTitle>
              <CardDescription>
                <T>Installment defaults to chit value ÷ member slots</T>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>
                  <T>Name</T>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="August 2026 Committee"
                />
              </div>
              <div>
                <Label>
                  <T>Chit value</T>
                </Label>
                <Input
                  type="number"
                  value={form.chitValue}
                  onChange={(e) =>
                    setForm({ ...form, chitValue: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>
                  <T>Member slots</T>
                </Label>
                <Input
                  type="number"
                  value={form.memberSlots}
                  onChange={(e) =>
                    setForm({ ...form, memberSlots: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>
                  <T>Foreman commission %</T>
                </Label>
                <Input
                  type="number"
                  value={form.foremanCommissionPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      foremanCommissionPercent: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>
                  <T>Start date</T>
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createGroup} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <T>Create</T>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">
                <T>Groups</T>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  <T>No committees yet</T>
                </p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => loadDetail(g.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedId === g.id
                        ? "border-amber-500 bg-amber-50"
                        : "hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{g.name}</span>
                      <Badge variant="outline">{g.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmt(g.chitValue, g.currency)} ·{" "}
                      {g._count?.members ?? g.members?.length ?? 0}/
                      {g.memberSlots} <T>members</T>
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {detail ? detail.group.name : <T>Select a committee</T>}
              </CardTitle>
              {detail && (
                <CardDescription>
                  {fmt(detail.group.installmentAmount, detail.group.currency)}{" "}
                  <T>per member / cycle</T> · {detail.group.foremanCommissionPercent}%{" "}
                  <T>foreman</T>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!detail ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  <T>Choose a group to manage members, dues and winners</T>
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !!detail.openCycle}
                      onClick={openCycle}
                    >
                      <T>Open next cycle</T>
                    </Button>
                    {detail.openCycle && (
                      <Badge className="bg-amber-600">
                        <T>Cycle</T> #{detail.openCycle.cycleNumber}{" "}
                        <T>open</T>
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      <T>Add member</T>
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Customer name"
                        value={memberForm.customerName}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            customerName: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Phone"
                        value={memberForm.customerPhone}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            customerPhone: e.target.value,
                          })
                        }
                      />
                      <Button size="sm" disabled={busy} onClick={addMember}>
                        <T>Add</T>
                      </Button>
                    </div>
                  </div>

                  {detail.openCycle && detail.arrears.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        <T>Arrears this cycle</T> ({detail.arrears.length})
                      </p>
                      <p className="text-xs text-amber-800">
                        {detail.arrears
                          .map((m) => `#${m.ticketNumber} ${m.customerName}`)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      <T>Members</T>
                    </h3>
                    <div className="space-y-2">
                      {(detail.group.members || []).map((m) => {
                        const paid = detail.openCycle?.payments?.some(
                          (p) => p.memberId === m.id,
                        );
                        return (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                #{m.ticketNumber} {m.customerName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.customerPhone || "—"}
                                {m.hasWon
                                  ? ` · Won cycle #${m.wonCycleNumber}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {detail.openCycle && (
                                <>
                                  {paid ? (
                                    <Badge variant="secondary">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      <T>Paid</T>
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() => markPaid(m.id)}
                                    >
                                      <T>Mark paid</T>
                                    </Button>
                                  )}
                                  {!m.hasWon && (
                                    <Button
                                      size="sm"
                                      disabled={busy}
                                      onClick={() => declareWinner(m.id)}
                                    >
                                      <T>Declare winner</T>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(detail.group.cycles || []).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        <T>Cycle history</T>
                      </h3>
                      <div className="space-y-1 text-sm">
                        {(detail.group.cycles || []).map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between border-b py-1.5"
                          >
                            <span>
                              <T>Cycle</T> #{c.cycleNumber} · {c.status}
                              {c.winner
                                ? ` · ${c.winner.customerName}`
                                : ""}
                            </span>
                            <span className="text-muted-foreground">
                              {c.netPrize != null
                                ? fmt(c.netPrize, detail.group.currency)
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ShopGuard>
      <ChitCommitteesPage />
    </ShopGuard>
  );
}
