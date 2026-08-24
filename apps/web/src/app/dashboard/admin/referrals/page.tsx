"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { sellerPerformanceApi } from "@/lib/api";
import {
  Banknote,
  CheckCircle,
  Gift,
  Loader2,
  Settings,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ReferralData {
  id: string;
  refereeEmail: string;
  referralCode: string;
  status: "PENDING" | "SIGNED_UP" | "PLAN_PURCHASED" | "COMPLETED" | "EXPIRED";
  invitedAt: string;
  signedUpAt: string | null;
  completedAt: string | null;
  referrerRewarded: boolean;
  refereeRewarded: boolean;
  referrerShop?: {
    id: string;
    shopName: string;
    user?: { firstName?: string; lastName?: string; email?: string };
  } | null;
  refereeShop: { shopName: string; isVerified: boolean } | null;
}

interface ReferralSettingsData {
  id: string;
  isActive: boolean;
  commissionPercent: number;
  applyToInvoiceFirst: boolean;
  minCashoutAmount: number;
  maxReferralsPerShop: number;
  expirationDays: number;
}

interface PayoutRequestRow {
  id: string;
  shopId: string;
  amount: number;
  currency: string;
  status: string;
  bankHolderName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankRoutingCode: string | null;
  bankCountry: string | null;
  monthsGranted: number | null;
  payoutReference: string | null;
  adminNote: string | null;
  createdAt: string;
  shop: {
    shopName: string;
    country: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

interface CommissionRow {
  id: string;
  commissionAmount: number;
  currency: string;
  status: string;
  stripeInvoiceId: string;
  createdAt: string;
  referrerShop: { shopName: string };
  refereeShop: { shopName: string };
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<ReferralSettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expiringOld, setExpiringOld] = useState(false);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRequestRow[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getAdminReferrals(
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setReferrals(res?.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load referrals" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await sellerPerformanceApi.getReferralSettings();
      setSettings(res?.data || null);
    } catch {
      console.warn("Failed to load referral settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const res = await sellerPerformanceApi.getAdminReferralPayouts();
      setPayouts(res?.data || []);
    } catch {
      console.warn("Failed to load referral payouts");
    } finally {
      setPayoutsLoading(false);
    }
  }, []);

  const loadCommissions = useCallback(async () => {
    setCommissionsLoading(true);
    try {
      const res = await sellerPerformanceApi.getAdminReferralCommissions();
      setCommissions(res?.data || []);
    } catch {
      console.warn("Failed to load referral commissions");
    } finally {
      setCommissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const handleComplete = async (referralId: string) => {
    if (!window.confirm("Mark this referral as completed?")) return;
    setActionLoading(referralId);
    try {
      await sellerPerformanceApi.completeReferral(referralId);
      toast({ title: "Referral marked complete. Commission accrues on paid invoices." });
      loadReferrals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to complete referral",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantPro = async (shopId?: string) => {
    if (!shopId) return;
    if (!window.confirm("Are you sure you want to gift 1 month of Pro to this shop?")) return;
    setActionLoading(`pro-${shopId}`);
    try {
      await sellerPerformanceApi.adminGrantReferralPro(shopId, { months: 1 });
      toast({ title: "Granted 1 month of Pro" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to grant Pro",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolvePayout = async (
    id: string,
    action: "paid" | "rejected" | "grant_sub",
  ) => {
    const promptMsg =
      action === "paid"
        ? "Are you sure you want to mark this payout as paid?"
        : action === "rejected"
          ? "Are you sure you want to return this payout to the referral wallet?"
          : "Are you sure you want to convert this payout to Pro months?";
    if (!window.confirm(promptMsg)) return;

    setActionLoading(id);
    try {
      const refVal = payoutRefs[id]?.trim() || undefined;
      await sellerPerformanceApi.resolveReferralPayout(id, {
        action,
        payoutReference: refVal,
      });
      toast({
        title:
          action === "paid"
            ? "Marked as paid"
            : action === "rejected"
              ? "Returned to wallet"
              : "Converted to Pro months",
      });
      setPayoutRefs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      loadPayouts();
      loadCommissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not update payout",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await sellerPerformanceApi.updateReferralSettings({
        isActive: settings.isActive,
        commissionPercent: settings.commissionPercent,
        applyToInvoiceFirst: settings.applyToInvoiceFirst,
        minCashoutAmount: settings.minCashoutAmount,
        maxReferralsPerShop: settings.maxReferralsPerShop,
        expirationDays: settings.expirationDays,
      });
      toast({ title: "Referral settings saved!" });
      loadSettings();
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExpireOld = async () => {
    setExpiringOld(true);
    try {
      const res = await sellerPerformanceApi.expireOldReferrals();
      toast({
        title: `Expired ${res?.data?.expiredCount || 0} old referrals`,
      });
      loadReferrals();
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to expire old referrals",
      });
    } finally {
      setExpiringOld(false);
    }
  };

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "PENDING").length,
    signedUp: referrals.filter(
      (r) => r.status === "SIGNED_UP" || r.status === "PLAN_PURCHASED",
    ).length,
    completed: referrals.filter((r) => r.status === "COMPLETED").length,
    expired: referrals.filter((r) => r.status === "EXPIRED").length,
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="h-6 w-6 text-purple-500" />
                Referral Programme — Admin
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage invitations, commission ledger, and{" "}
                {settings?.commissionPercent ?? 10}% invoice-share settings
              </p>
            </div>
          </div>

          <Tabs defaultValue="referrals">
            <TabsList>
              <TabsTrigger value="referrals" className="gap-1.5">
                <Users className="h-4 w-4" /> Referrals
                {stats.signedUp > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {stats.signedUp}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-1.5">
                <Wallet className="h-4 w-4" /> Commissions
              </TabsTrigger>
              <TabsTrigger value="payouts" className="gap-1.5">
                <Banknote className="h-4 w-4" /> Payouts
                {payouts.filter((p) => p.status === "PENDING").length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {payouts.filter((p) => p.status === "PENDING").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* ═══ REFERRALS TAB ═══ */}
            <TabsContent value="referrals" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Invited</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.signedUp}
                    </p>
                    <p className="text-xs text-muted-foreground">Signed Up</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {stats.expired}
                    </p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter + Actions */}
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="PENDING">Invited</SelectItem>
                    <SelectItem value="SIGNED_UP">Signed Up</SelectItem>
                    <SelectItem value="PLAN_PURCHASED">Plan Purchased</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpireOld}
                  disabled={expiringOld}
                >
                  {expiringOld ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Expire Old
                </Button>
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No referrals found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referee Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Referee Shop</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((ref) => (
                          <TableRow key={ref.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {ref.referrerShop?.shopName || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    ref.referrerShop?.user?.firstName,
                                    ref.referrerShop?.user?.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") || ref.referrerShop?.user?.email || "—"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {ref.refereeEmail}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ref.status === "COMPLETED"
                                    ? "default"
                                    : ref.status === "SIGNED_UP"
                                      ? "secondary"
                                      : ref.status === "EXPIRED"
                                        ? "destructive"
                                        : "outline"
                                }
                                className={
                                  ref.status === "COMPLETED"
                                    ? "bg-green-600"
                                    : ""
                                }
                              >
                                {ref.status === "PENDING"
                                  ? "Invited"
                                  : ref.status === "SIGNED_UP"
                                    ? "Signed Up"
                                    : ref.status === "PLAN_PURCHASED"
                                      ? "Plan Purchased"
                                      : ref.status === "COMPLETED"
                                        ? "Completed"
                                        : "Expired"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {ref.refereeShop ? (
                                <div>
                                  <p>{ref.refereeShop.shopName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ref.refereeShop.isVerified
                                      ? "✓ Verified"
                                      : "Not verified"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(ref.invitedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {(ref.status === "SIGNED_UP" ||
                                ref.status === "PLAN_PURCHASED") && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleComplete(ref.id)}
                                  disabled={actionLoading === ref.id}
                                >
                                  {actionLoading === ref.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Mark complete
                                </Button>
                              )}
                              {ref.status === "COMPLETED" && ref.referrerShop?.id && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-green-600 font-medium">
                                    Earning on paid invoices
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleGrantPro(ref.referrerShop?.id)
                                    }
                                    disabled={
                                      actionLoading ===
                                      `pro-${ref.referrerShop.id}`
                                    }
                                  >
                                    {actionLoading ===
                                    `pro-${ref.referrerShop.id}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                      <Gift className="h-4 w-4 mr-1" />
                                    )}
                                    Gift 1 mo Pro
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-0">
                  {commissionsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : commissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No commissions accrued yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referee</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.referrerShop?.shopName}</TableCell>
                            <TableCell>{row.refereeShop?.shopName}</TableCell>
                            <TableCell>
                              {new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: row.currency || "USD",
                              }).format(row.commissionAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{row.status}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {row.stripeInvoiceId}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(row.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Leftover bank payouts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Shops in countries Stripe Connect does not support save bank
                    details here. Send the transfer from your bank, then mark
                    paid — or convert the leftover to Pro months instead.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {payoutsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No leftover payout requests yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Bank</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <p className="font-medium">{row.shop.shopName}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.shop.user.email} · {row.shop.country}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">
                                {new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: row.currency || "USD",
                                }).format(row.amount)}
                              </p>
                              {row.monthsGranted ? (
                                <p className="text-xs text-muted-foreground">
                                  {row.monthsGranted} mo Pro
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.bankHolderName ? (
                                <div>
                                  <p>{row.bankHolderName}</p>
                                  <p>{row.bankName}</p>
                                  <p className="font-mono">
                                    {row.bankAccountNumber}
                                  </p>
                                  {row.bankRoutingCode && (
                                    <p>{row.bankRoutingCode}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  row.status === "PENDING"
                                    ? "secondary"
                                    : row.status === "PAID" ||
                                        row.status === "CONVERTED_TO_SUB"
                                      ? "default"
                                      : "destructive"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(row.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {row.status === "PENDING" && (
                                <div className="flex flex-col gap-1 min-w-[140px]">
                                  <Input
                                    className="h-7 text-xs"
                                    placeholder="Ref / Wise ID (opt)"
                                    value={payoutRefs[row.id] || ""}
                                    onChange={(e) =>
                                      setPayoutRefs((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                    onClick={() =>
                                      handleResolvePayout(row.id, "paid")
                                    }
                                    disabled={actionLoading === row.id}
                                  >
                                    {actionLoading === row.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : null}
                                    Mark paid
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      handleResolvePayout(row.id, "grant_sub")
                                    }
                                    disabled={actionLoading === row.id}
                                  >
                                    Grant Pro instead
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      handleResolvePayout(row.id, "rejected")
                                    }
                                    disabled={actionLoading === row.id}
                                  >
                                    Return to wallet
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ SETTINGS TAB ═══ */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              {settingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : settings ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Referral Programme Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">
                          Programme Active
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          When disabled, sellers cannot send new referrals
                        </p>
                      </div>
                      <Switch
                        checked={settings.isActive}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, isActive: checked })
                        }
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="commissionPercent">
                          Commission percent
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          Share of each paid subscription invoice for the referrer
                        </p>
                        <Input
                          id="commissionPercent"
                          type="number"
                          min={1}
                          max={50}
                          value={settings.commissionPercent}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              commissionPercent: Number(e.target.value) || 10,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="minCashoutAmount">
                          Minimum cash-out
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          Leftover bank cash-out threshold (invoice currency)
                        </p>
                        <Input
                          id="minCashoutAmount"
                          type="number"
                          min={0}
                          value={settings.minCashoutAmount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              minCashoutAmount: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between sm:col-span-2">
                        <div>
                          <Label className="text-sm font-medium">
                            Apply to referrer invoice first
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Credit their next Orivraa invoice (no extra Stripe fee) before bank cash-out
                          </p>
                        </div>
                        <Switch
                          checked={settings.applyToInvoiceFirst}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              applyToInvoiceFirst: checked,
                            })
                          }
                        />
                      </div>

                      {/* Max referrals */}
                      <div>
                        <Label htmlFor="maxReferrals">
                          Max Referrals per Shop
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          How many invitations each seller can send
                        </p>
                        <Input
                          id="maxReferrals"
                          type="number"
                          min={1}
                          max={100}
                          value={settings.maxReferralsPerShop}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxReferralsPerShop: Number(e.target.value) || 10,
                            })
                          }
                        />
                      </div>

                      {/* Expiry days */}
                      <div>
                        <Label htmlFor="expiryDays">
                          Invitation Expiry (days)
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          After how many days an unclaimed invite expires
                        </p>
                        <Input
                          id="expiryDays"
                          type="number"
                          min={7}
                          max={365}
                          value={settings.expirationDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              expirationDays: Number(e.target.value) || 30,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {savingSettings ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Failed to load settings.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
