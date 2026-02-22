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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  aiCreditsApi,
  sellerSubscriptionsApi,
  subscriptionPlansApi,
} from "@/lib/api";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  CreditCard,
  Crown,
  Package,
  Receipt,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  country: string;
  currency: string;
  monthlyPrice: number;
  annualPrice?: number;
  maxProducts?: number | null;
  maxInvoicesPerMonth?: number | null;
  maxCatalogues?: number | null;
  catalogueLimit?: number | null;
  maxOrdersPerMonth?: number | null;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  overageBehavior: string;
  features?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: string;
  shopId: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  cancellationReason?: string;
  plan: Plan;
}

interface LedgerEntry {
  id: string;
  action: string;
  amount: number;
  balanceAfter: number;
  reason?: string;
  createdAt: string;
}

interface UsageLimitInfo {
  used: number;
  limit: number | null;
  unlimited: boolean;
}

interface UsageSummary {
  planName: string;
  planId: string | null;
  limits: {
    products: UsageLimitInfo;
    invoicesPerMonth: UsageLimitInfo;
    catalogues: UsageLimitInfo;
    ordersPerMonth: UsageLimitInfo;
  };
  features: Record<string, unknown>;
}

// ─── Main Page ───────────────────────────────────

export default function SellerBillingPage() {
  return (
    <Suspense fallback={null}>
      <SellerBillingPageInner />
    </Suspense>
  );
}

function SellerBillingPageInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Welcome aboard!",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/dashboard/shop/billing");
    } else if (searchParams.get("cancelled") === "true") {
      toast({
        title: "Payment Cancelled",
        description: "You can subscribe anytime from the Available Plans tab.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/shop/billing");
    }
  }, [searchParams]);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription plan and AI credits.
            </p>
          </div>

          <Tabs defaultValue="plan" className="space-y-4">
            <TabsList>
              <TabsTrigger value="plan">My Plan</TabsTrigger>
              <TabsTrigger value="credits">AI Credits</TabsTrigger>
              <TabsTrigger value="upgrade">Available Plans</TabsTrigger>
            </TabsList>

            <TabsContent value="plan">
              <CurrentPlanTab />
            </TabsContent>
            <TabsContent value="credits">
              <AiCreditsTab />
            </TabsContent>
            <TabsContent value="upgrade">
              <AvailablePlansTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}

// ═══════════════════════════════════════════════════
// CURRENT PLAN TAB
// ═══════════════════════════════════════════════════

function CurrentPlanTab() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [features, setFeatures] = useState<{
    planName: string;
    features: {
      key: string;
      label: string;
      category: string;
      enabled: boolean;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, histRes, usageRes, featRes] = await Promise.all([
        sellerSubscriptionsApi.getMySubscription(),
        sellerSubscriptionsApi.getMyHistory(),
        sellerSubscriptionsApi.getMyUsage().catch(() => ({ data: null })),
        sellerSubscriptionsApi.getMyFeatures().catch(() => ({ data: null })),
      ]);
      setSub(subRes.data || null);
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);
      setUsage(usageRes.data || null);
      setFeatures(featRes.data || null);
    } catch {
      // No active subscription or error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async () => {
    if (!sub) return;
    const reason = prompt("Reason for cancellation (optional):");
    try {
      await sellerSubscriptionsApi.cancel(sub.id, {
        reason: reason || undefined,
        immediate: false,
      });
      toast({
        title: "Success",
        description:
          "Subscription will be cancelled at the end of the billing period",
      });
      fetchData();
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading your plan...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sub ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-yellow-500" />
                <div>
                  <CardTitle>{sub.plan.displayName}</CardTitle>
                  <CardDescription>
                    {sub.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}{" "}
                    billing · {sub.plan.country} · {sub.plan.currency}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={
                  sub.status === "ACTIVE"
                    ? "default"
                    : sub.status === "TRIALING"
                      ? "secondary"
                      : "destructive"
                }
              >
                {sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-lg font-semibold">
                  {sub.plan.monthlyPrice === 0
                    ? "Free"
                    : `${sub.plan.currency} ${sub.billingCycle === "ANNUAL" ? sub.plan.annualPrice : sub.plan.monthlyPrice}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
                <p className="text-lg font-semibold">
                  {sub.plan.commissionPercent}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Credits/mo</p>
                <p className="text-lg font-semibold">
                  {sub.plan.includesAi
                    ? sub.plan.monthlyAiCredits
                    : "Not included"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period Ends</p>
                <p className="text-lg font-semibold">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>

            {sub.plan.catalogueLimit && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  Items per Catalogue:{" "}
                  <span className="font-medium text-foreground">
                    {sub.plan.catalogueLimit}
                  </span>
                </p>
              </div>
            )}

            {/* ── Usage vs Limits ──────────────────────────────── */}
            {usage && (
              <div className="mt-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4" />
                  Resource Usage
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <UsageBar
                    icon={<Package className="h-4 w-4" />}
                    label="Products"
                    info={usage.limits.products}
                  />
                  <UsageBar
                    icon={<Receipt className="h-4 w-4" />}
                    label="Invoices / mo"
                    info={usage.limits.invoicesPerMonth}
                  />
                  <UsageBar
                    icon={<Store className="h-4 w-4" />}
                    label="Catalogues"
                    info={usage.limits.catalogues}
                  />
                  <UsageBar
                    icon={<Store className="h-4 w-4" />}
                    label="Orders / mo"
                    info={usage.limits.ordersPerMonth}
                  />
                </div>
              </div>
            )}

            {/* ── Plan Features ────────────────────────────────── */}
            {features && features.features.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Plan Features
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(
                    features.features.reduce(
                      (acc, f) => {
                        if (!acc[f.category]) acc[f.category] = [];
                        acc[f.category].push(f);
                        return acc;
                      },
                      {} as Record<
                        string,
                        typeof features.features
                      >,
                    ),
                  ).map(([category, items]) => (
                    <div key={category} className="rounded-lg border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </p>
                      <div className="space-y-1">
                        {items.map((f) => (
                          <div
                            key={f.key}
                            className="flex items-center gap-2 text-sm"
                          >
                            {f.enabled ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                            )}
                            <span
                              className={
                                f.enabled
                                  ? "text-foreground"
                                  : "text-muted-foreground line-through"
                              }
                            >
                              {f.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {sub.status === "ACTIVE" && sub.plan.monthlyPrice > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res =
                          await sellerSubscriptionsApi.getBillingPortal();
                        if (res.data?.url) {
                          window.location.href = res.data.url;
                        }
                      } catch {
                        toast({
                          title: "Error",
                          description: "Could not open billing portal",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel Subscription
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No active subscription. Choose a plan below to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{h.plan.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.currentPeriodStart).toLocaleDateString()} →{" "}
                      {new Date(h.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{h.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// USAGE BAR COMPONENT
// ═══════════════════════════════════════════════════

function UsageBar({
  icon,
  label,
  info,
}: {
  icon: React.ReactNode;
  label: string;
  info: UsageLimitInfo;
}) {
  if (info.unlimited) {
    return (
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon} {label}
        </div>
        <p className="mt-1 text-lg font-semibold">{info.used}</p>
        <p className="text-xs text-muted-foreground">Unlimited</p>
      </div>
    );
  }
  const pct = info.limit ? Math.min(100, (info.used / info.limit) * 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon} {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {info.used}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          / {info.limit}
        </span>
      </p>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="mt-1 text-xs text-red-500">
          Limit reached — upgrade to continue
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AI CREDITS TAB
// ═══════════════════════════════════════════════════

function AiCreditsTab() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy credits state
  const [buyAmount, setBuyAmount] = useState(50);
  const [buying, setBuying] = useState(false);

  // Auto-recharge state
  const [autoRecharge, setAutoRecharge] = useState({
    autoRechargeEnabled: false,
    autoRechargeThreshold: 5,
    autoRechargePack: 50,
  });
  const [savingRecharge, setSavingRecharge] = useState(false);

  // Get current plan info
  const [planInfo, setPlanInfo] = useState<{
    extraCreditPrice: number;
    currency: string;
    country: string;
    overageBehavior: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const [balRes, ledRes, arRes, subRes] = await Promise.all([
        aiCreditsApi.getBalance(),
        aiCreditsApi.getLedger({ limit: 30 }),
        aiCreditsApi.getAutoRecharge().catch(() => ({ data: null })),
        sellerSubscriptionsApi
          .getMySubscription()
          .catch(() => ({ data: null })),
      ]);
      setBalance(balRes.data?.balance ?? 0);
      setLedger(
        Array.isArray(ledRes.data) ? ledRes.data : (ledRes.data?.data ?? []),
      );
      if (arRes.data) {
        setAutoRecharge(arRes.data);
      }
      if (subRes.data?.plan) {
        setPlanInfo({
          extraCreditPrice: subRes.data.plan.extraCreditPrice || 0,
          currency: subRes.data.plan.currency || "USD",
          country: subRes.data.plan.country || "US",
          overageBehavior: subRes.data.plan.overageBehavior || "BLOCK",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load credit information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBuyCredits = async () => {
    if (!planInfo || planInfo.extraCreditPrice <= 0) {
      toast({
        title: "Not Available",
        description:
          "Credit purchases are not available on your current plan. Please upgrade.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBuying(true);
      const res = await aiCreditsApi.purchaseCredits({
        creditAmount: buyAmount,
        pricePerCredit: planInfo.extraCreditPrice,
        currency: planInfo.currency,
        country: planInfo.country,
      });
      // Redirect to payment if URL provided
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      if (res.data?.clientSecret) {
        toast({
          title: "Payment Initiated",
          description:
            "Complete the payment in the payment sheet to receive your credits.",
        });
        // In future: open Stripe Elements inline
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to initiate credit purchase",
        variant: "destructive",
      });
    } finally {
      setBuying(false);
    }
  };

  const handleSaveAutoRecharge = async () => {
    try {
      setSavingRecharge(true);
      const res = await aiCreditsApi.updateAutoRecharge(autoRecharge);
      setAutoRecharge(res.data);
      toast({
        title: "Saved",
        description: autoRecharge.autoRechargeEnabled
          ? `Auto-recharge enabled: ${autoRecharge.autoRechargePack} credits when balance drops below ${autoRecharge.autoRechargeThreshold}`
          : "Auto-recharge disabled",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save auto-recharge settings",
        variant: "destructive",
      });
    } finally {
      setSavingRecharge(false);
    }
  };

  const ACTION_COLORS: Record<string, string> = {
    GRANT: "text-green-500",
    DEBIT: "text-red-500",
    REFUND: "text-blue-500",
    EXPIRE: "text-orange-500",
    ADMIN_ADJUST: "text-purple-500",
    OVERAGE: "text-yellow-500",
    PURCHASE: "text-emerald-500",
  };

  const CREDIT_PACKS = [10, 25, 50, 100, 200, 500];

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading credits...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Available AI Credits
                </p>
                <p className="text-3xl font-bold">
                  {balance?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>
            {autoRecharge.autoRechargeEnabled && (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600"
              >
                <Zap className="mr-1 h-3 w-3" />
                Auto-Recharge ON
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Buy Credits
          </CardTitle>
          <CardDescription>
            {planInfo && planInfo.extraCreditPrice > 0
              ? `${planInfo.currency} ${planInfo.extraCreditPrice} per credit`
              : "Upgrade your plan to purchase extra credits"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack}
                onClick={() => setBuyAmount(pack)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  buyAmount === pack
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                {pack} credits
                {planInfo && planInfo.extraCreditPrice > 0 && (
                  <span className="ml-1 text-xs opacity-75">
                    ({planInfo.currency}{" "}
                    {(pack * planInfo.extraCreditPrice).toFixed(2)})
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button
            onClick={handleBuyCredits}
            disabled={buying || !planInfo || planInfo.extraCreditPrice <= 0}
            className="w-full sm:w-auto"
          >
            {buying ? (
              "Processing..."
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Buy {buyAmount} Credits
                {planInfo && planInfo.extraCreditPrice > 0 && (
                  <span className="ml-1">
                    — {planInfo.currency}{" "}
                    {(buyAmount * planInfo.extraCreditPrice).toFixed(2)}
                  </span>
                )}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Recharge Card */}
      {planInfo && planInfo.overageBehavior === "AUTO_CHARGE" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Auto-Recharge
            </CardTitle>
            <CardDescription>
              Automatically buy credits when your balance runs low, so your AI
              features never stop working.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setAutoRecharge({
                    ...autoRecharge,
                    autoRechargeEnabled: !autoRecharge.autoRechargeEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRecharge.autoRechargeEnabled
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    autoRecharge.autoRechargeEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">
                {autoRecharge.autoRechargeEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {autoRecharge.autoRechargeEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Recharge when balance drops below
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
                    value={autoRecharge.autoRechargeThreshold}
                    onChange={(e) =>
                      setAutoRecharge({
                        ...autoRecharge,
                        autoRechargeThreshold: parseInt(e.target.value) || 5,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Credits to buy per recharge
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
                    value={autoRecharge.autoRechargePack}
                    onChange={(e) =>
                      setAutoRecharge({
                        ...autoRecharge,
                        autoRechargePack: parseInt(e.target.value) || 50,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {autoRecharge.autoRechargeEnabled &&
              planInfo.extraCreditPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Each recharge will charge{" "}
                  <strong>
                    {planInfo.currency}{" "}
                    {(
                      autoRecharge.autoRechargePack * planInfo.extraCreditPrice
                    ).toFixed(2)}
                  </strong>{" "}
                  to your saved payment method.
                </p>
              )}

            <Button
              variant="outline"
              onClick={handleSaveAutoRecharge}
              disabled={savingRecharge}
            >
              {savingRecharge ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{entry.action}</Badge>
                    <span className="text-muted-foreground">
                      {entry.reason || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono font-medium ${ACTION_COLORS[entry.action] || ""}`}
                    >
                      {entry.action === "DEBIT" || entry.action === "EXPIRE"
                        ? "-"
                        : "+"}
                      {entry.amount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      bal: {entry.balanceAfter}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AVAILABLE PLANS TAB
// ═══════════════════════════════════════════════════

function AvailablePlansTab() {
  const { user } = useAuth();
  const shopCountry = user?.shop?.country || "";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch plans for the shop's country and current subscription in parallel
      const [plansRes, subRes] = await Promise.all([
        subscriptionPlansApi.getAvailable(shopCountry),
        sellerSubscriptionsApi
          .getMySubscription()
          .catch(() => ({ data: null })),
      ]);
      setPlans(
        Array.isArray(plansRes.data)
          ? plansRes.data
          : (plansRes.data?.data ?? []),
      );
      if (subRes.data?.planId) {
        setCurrentPlanId(subRes.data.planId);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load available plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopCountry]);

  const handleSubscribe = async (plan: Plan) => {
    try {
      setSubscribing(plan.id);
      const res = await sellerSubscriptionsApi.subscribe({
        shopId: "", // server reads from JWT
        planId: plan.id,
        country: plan.country,
        billingCycle: "MONTHLY",
      });
      // Stripe Checkout redirect (paid plans)
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      // Legacy paymentUrl fallback
      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
        return;
      }
      // Free plan — activated immediately
      toast({ title: "Success", description: "Subscription activated!" });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to subscribe to plan",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading plans...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick a plan that suits your business. Upgrade anytime.
      </p>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No plans available at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;
            return (
              <Card
                key={plan.id}
                className={`flex flex-col ${isCurrentPlan ? "border-primary ring-2 ring-primary/20" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {plan.displayName}
                    </CardTitle>
                    {isCurrentPlan && (
                      <Badge className="flex items-center gap-1 bg-primary">
                        <CheckCircle className="h-3 w-3" />
                        Current
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {plan.country} · {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly</span>
                      <span className="font-semibold">
                        {plan.monthlyPrice === 0
                          ? "Free"
                          : `${plan.currency} ${plan.monthlyPrice}`}
                      </span>
                    </div>
                    {plan.annualPrice && plan.annualPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual</span>
                        <span className="font-semibold">
                          {plan.currency} {plan.annualPrice}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission</span>
                      <span>{plan.commissionPercent}%</span>
                    </div>

                    {/* ── Resource Limits ─────────────────── */}
                    <div className="my-1 border-t pt-2 text-xs font-medium text-muted-foreground">
                      Limits
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products</span>
                      <span>{plan.maxProducts ?? "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoices/mo</span>
                      <span>{plan.maxInvoicesPerMonth ?? "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Catalogues</span>
                      <span>{plan.maxCatalogues ?? "Unlimited"}</span>
                    </div>
                    {plan.catalogueLimit && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Items/catalogue
                        </span>
                        <span>{plan.catalogueLimit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Orders/mo</span>
                      <span>{plan.maxOrdersPerMonth ?? "Unlimited"}</span>
                    </div>

                    {plan.includesAi && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          AI Credits/mo
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          {plan.monthlyAiCredits}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="mt-4 w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || subscribing === plan.id}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isCurrentPlan ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Current Plan
                      </>
                    ) : subscribing === plan.id ? (
                      "Processing..."
                    ) : (
                      <>
                        {plan.monthlyPrice === 0
                          ? "Activate Free Plan"
                          : "Subscribe"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
