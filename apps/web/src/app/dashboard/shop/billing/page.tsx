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
import { T } from "@/components/ui/T";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import {
    aiCreditsApi,
    paymentGatewayApi,
    sellerSubscriptionsApi,
    subscriptionPlansApi,
} from "@/lib/api";
import { formatAiCredits, toCreditNumber } from "@gold-shop/shared";
import { useT } from "@/providers/translation-provider";
import {
    ArrowRight,
    BarChart3,
    CheckCircle,
    CreditCard,
    Crown,
    Loader2,
    Package,
    Receipt,
    Sparkles,
    Store,
    Zap,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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

interface GatewayOption {
  gatewayName: string;
  displayName: string;
  supportedMethods: string[];
  commissionInfo: string | null;
  isConfigured: boolean;
}

interface PreferredGateways {
  resolvedCountry: string;
  preferred: GatewayOption | null;
  alternatives: GatewayOption[];
  fallbackUsed: boolean;
  countrySource: "override" | "shop" | "geo" | "default";
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
  const t = useT();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const billingTab =
    tabParam === "credits" || tabParam === "upgrade" ? tabParam : "plan";

  useEffect(() => {
    const creditsStatus = searchParams.get("credits");
    if (creditsStatus === "success") {
      toast({
        title: t("Payment received"),
        description: t(
          "Your AI credits will appear in a few seconds. Refresh this tab if the balance has not updated yet.",
        ),
      });
      window.history.replaceState({}, "", "/dashboard/shop/billing?tab=credits");
      return;
    }
    if (creditsStatus === "cancelled") {
      toast({
        title: t("Purchase cancelled"),
        description: t("No credits were added. You can buy credits anytime from this tab."),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/shop/billing?tab=credits");
      return;
    }
    if (searchParams.get("success") === "true") {
      toast({
        title: t("Payment Successful!"),
        description: t("Your subscription has been activated. Welcome aboard!"),
      });
      // Clean up URL
      window.history.replaceState({}, "", "/dashboard/shop/billing");
    } else if (searchParams.get("cancelled") === "true") {
      toast({
        title: t("Payment Cancelled"),
        description: t(
          "You can subscribe anytime from the Available Plans tab.",
        ),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/shop/billing");
    }
  }, [searchParams, t]);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              <T>Billing</T>
            </h1>
            <p className="text-muted-foreground">
              <T>Manage your subscription plan and AI credits.</T>
            </p>
          </div>

          <Tabs defaultValue={billingTab} className="space-y-4" data-tour="billing-tabs">
            <TabsList>
              <TabsTrigger value="plan">
                <T>My Plan</T>
              </TabsTrigger>
              <TabsTrigger value="credits" data-tour="billing-credits">
                <T>AI Credits</T>
              </TabsTrigger>
              <TabsTrigger value="upgrade">
                <T>Available Plans</T>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plan" data-tour="billing-plan">
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
  const t = useT();
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
  const [activatingTrial, setActivatingTrial] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, []);

  const handleActivateTrial = async () => {
    try {
      setActivatingTrial(true);
      await sellerSubscriptionsApi.activateTrial();
      toast({
        title: t("Premium Trial Activated!"),
        description: t("Welcome to PRO! Enjoy 60 days of premium CRM and POS features completely free."),
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: t("Trial Activation Failed"),
        description: err?.response?.data?.message || t("Could not activate trial. Please contact support."),
        variant: "destructive",
      });
    } finally {
      setActivatingTrial(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async () => {
    if (!sub) return;
    const reason = prompt("Reason for cancellation (optional):");
    try {
      await sellerSubscriptionsApi.cancel(sub.id, {
        reason: reason || undefined,
        immediate: false,
      });
      toast({
        title: t("Success"),
        description: t(
          "Subscription will be cancelled at the end of the billing period",
        ),
      });
      fetchData();
    } catch {
      toast({
        title: t("Error"),
        description: t("Failed to cancel subscription"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <T>Loading your plan...</T>
      </div>
    );
  }

  const isFreePlan = !sub || sub.plan.name === "FREE" || sub.status === "FREE";

  return (
    <div className="space-y-4">
      {isFreePlan && (
        <Card className="border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-100/30 dark:from-amber-950/20 dark:via-yellow-900/10 dark:to-orange-950/20 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group">
          <div className="absolute top-0 right-0 p-32 bg-amber-400/5 blur-3xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-400 dark:from-amber-700 dark:to-yellow-600 flex items-center justify-center shadow-inner">
                <Crown className="h-5 w-5 text-amber-950 dark:text-amber-100" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <T>Unlock 60 Days of Premium Free Trial!</T>
                </CardTitle>
                <CardDescription className="text-xs text-amber-800/80 dark:text-amber-400/80">
                  <T>Supercharge your business with premium PRO features securely</T>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <p className="text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              <T>Get full access to all premium mobile POS capabilities—including walk-in Quotes, karigar Repairs tracking, customer CRM directories, and gold Savings Schemes—completely free for 60 days with absolutely no credit card required.</T>
            </p>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 w-full sm:w-auto"
              disabled={activatingTrial}
              onClick={handleActivateTrial}
            >
              {activatingTrial ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin animate-infinite" />
                  <T>Activating Premium Trial...</T>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-white" />
                  <T>Start 60-Day Premium Free Trial</T>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {sub ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-yellow-500" />
                <div>
                  <CardTitle>{sub.plan.displayName}</CardTitle>
                  <CardDescription>
                    {t(
                      `${sub.billingCycle === "ANNUAL" ? "Annual" : "Monthly"} billing`,
                    )}{" "}
                    · {sub.plan.country} · {sub.plan.currency}
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
                <p className="text-sm text-muted-foreground">
                  <T>Price</T>
                </p>
                <p className="text-lg font-semibold">
                  {sub.plan.monthlyPrice === 0
                    ? t("Free")
                    : `${sub.plan.currency} ${sub.billingCycle === "ANNUAL" ? sub.plan.annualPrice : sub.plan.monthlyPrice}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <T>Commission Rate</T>
                </p>
                <p className="text-lg font-semibold">
                  {sub.plan.commissionPercent}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <T>AI Credits/mo</T>
                </p>
                <p className="text-lg font-semibold">
                  {sub.plan.includesAi
                    ? sub.plan.monthlyAiCredits
                    : t("Not included")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <T>Period Ends</T>
                </p>
                <p className="text-lg font-semibold">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>

            {sub.plan.catalogueLimit && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  <T>Items per Catalogue</T>:{" "}
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
                  <T>Resource Usage</T>
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <UsageBar
                    icon={<Package className="h-4 w-4" />}
                    label={t("Products")}
                    info={usage.limits.products}
                  />
                  <UsageBar
                    icon={<Receipt className="h-4 w-4" />}
                    label={t("Invoices / mo")}
                    info={usage.limits.invoicesPerMonth}
                  />
                  <UsageBar
                    icon={<Store className="h-4 w-4" />}
                    label={t("Catalogues")}
                    info={usage.limits.catalogues}
                  />
                  <UsageBar
                    icon={<Store className="h-4 w-4" />}
                    label={t("Orders / mo")}
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
                  <T>Plan Features</T>
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(
                    features.features.reduce(
                      (acc, f) => {
                        if (!acc[f.category]) acc[f.category] = [];
                        acc[f.category].push(f);
                        return acc;
                      },
                      {} as Record<string, typeof features.features>,
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

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {sub.status === "PAST_DUE" && (
                <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <T>
                    Your last payment failed. Update your payment method in the
                    billing portal to keep your subscription active.
                  </T>
                </div>
              )}
              {(sub.status === "ACTIVE" || sub.status === "PAST_DUE") &&
                sub.plan.monthlyPrice > 0 && (
                  <>
                    <Button
                      variant={sub.status === "PAST_DUE" ? "default" : "outline"}
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
                            title: t("Error"),
                            description: t("Could not open billing portal"),
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      <T>
                        {sub.status === "PAST_DUE"
                          ? "Update Payment Method"
                          : "Manage Billing"}
                      </T>
                    </Button>
                    {sub.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <T>Cancel Subscription</T>
                      </Button>
                    )}
                  </>
                )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              <T>No active subscription. Choose a plan below to get started.</T>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <T>Subscription History</T>
            </CardTitle>
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
        <p className="text-xs text-muted-foreground">
          <T>Unlimited</T>
        </p>
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
          <T>Limit reached — upgrade to continue</T>
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// AI CREDITS TAB
// ═══════════════════════════════════════════════════

function AiCreditsTab() {
  const t = useT();
  const { user } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const canPurchase = hasFeature("purchasableAiCredits");
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

  const fetchData = useCallback(async () => {
    try {
      const [balRes, ledRes, arRes, subRes] = await Promise.all([
        aiCreditsApi.getBalance(),
        aiCreditsApi.getLedger({ limit: 30 }),
        aiCreditsApi.getAutoRecharge().catch(() => ({ data: null })),
        sellerSubscriptionsApi
          .getMySubscription()
          .catch(() => ({ data: null })),
      ]);
      setBalance(toCreditNumber(balRes.data?.balance));
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
        title: t("Error"),
        description: t("Failed to load credit information"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyCredits = async () => {
    if (!canPurchase) {
      toast({
        title: t("Feature Not Available"),
        description: t(
          "Purchasable AI Credits is not enabled on your plan. Upgrade from the Available Plans tab.",
        ),
        variant: "destructive",
      });
      return;
    }
    if (!planInfo || planInfo.extraCreditPrice <= 0) {
      toast({
        title: t("Not Configured"),
        description: t(
          "Credit pricing is not configured for your plan. Contact support.",
        ),
        variant: "destructive",
      });
      return;
    }

    try {
      setBuying(true);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("pendingAiCreditPurchase", "1");
      }
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
          title: t("Payment Initiated"),
          description: t(
            "Complete the payment in the payment sheet to receive your credits.",
          ),
        });
        // In future: open Stripe Elements inline
      }
    } catch (err: any) {
      toast({
        title: t("Error"),
        description:
          err?.response?.data?.message ||
          t("Failed to initiate credit purchase"),
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
        title: t("Saved"),
        description: autoRecharge.autoRechargeEnabled
          ? t(
              `Auto-recharge enabled: ${autoRecharge.autoRechargePack} credits when balance drops below ${autoRecharge.autoRechargeThreshold}`,
            )
          : t("Auto-recharge disabled"),
      });
    } catch {
      toast({
        title: t("Error"),
        description: t("Failed to save auto-recharge settings"),
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
        <T>Loading credits...</T>
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
                  <T>Available AI Credits</T>
                </p>
                <p className="text-3xl font-bold">
                  {formatAiCredits(balance ?? 0)}
                </p>
              </div>
            </div>
            {autoRecharge.autoRechargeEnabled && (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600"
              >
                <Zap className="mr-1 h-3 w-3" />
                <T>Auto-Recharge ON</T>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits Card */}
      <Card className={!canPurchase ? "opacity-60" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            <T>Buy Credits</T>
            {!canPurchase && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                <T>Upgrade to unlock</T>
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {!canPurchase
              ? t("This feature is not included in your current plan.")
              : planInfo && planInfo.extraCreditPrice > 0
                ? t(
                    `${planInfo.currency} ${planInfo.extraCreditPrice} per credit`,
                  )
                : t("Credit pricing not configured — contact support.")}
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
                {t(`${pack} credits`)}
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
            disabled={
              buying ||
              !canPurchase ||
              !planInfo ||
              planInfo.extraCreditPrice <= 0
            }
            className="w-full sm:w-auto"
          >
            {buying ? (
              t("Processing...")
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                {t(`Buy ${buyAmount} Credits`)}
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
              <T>Auto-Recharge</T>
            </CardTitle>
            <CardDescription>
              <T>Automatically buy credits when your balance runs low, so your AI features never stop working.</T>
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
                {autoRecharge.autoRechargeEnabled
                  ? t("Enabled")
                  : t("Disabled")}
              </span>
            </div>

            {autoRecharge.autoRechargeEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    <T>Recharge when balance drops below</T>
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
                    <T>Credits to buy per recharge</T>
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
                  <T>Each recharge will charge</T>{" "}
                  <strong>
                    {planInfo.currency}{" "}
                    {(
                      autoRecharge.autoRechargePack * planInfo.extraCreditPrice
                    ).toFixed(2)}
                  </strong>{" "}
                  <T>to your saved payment method.</T>
                </p>
              )}

            <Button
              variant="outline"
              onClick={handleSaveAutoRecharge}
              disabled={savingRecharge}
            >
              {savingRecharge ? t("Saving...") : t("Save Settings")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base"><T>Recent Transactions</T></CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <T>No transactions yet.</T>
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
                      {formatAiCredits(entry.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      bal: {formatAiCredits(entry.balanceAfter)}
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
  const t = useT();
  const { user } = useAuth();
  const shopCountry = user?.shop?.country || "";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [gateways, setGateways] = useState<PreferredGateways | null>(null);
  const [showAltGateways, setShowAltGateways] = useState(false);

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
        title: t("Error"),
        description: t("Failed to load available plans"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Resolve the preferred payment gateway for this shop's country.
  const fetchGateways = async () => {
    try {
      const res = await paymentGatewayApi.getPreferredGateway(
        shopCountry || undefined,
      );
      setGateways(res.data ?? null);
    } catch {
      // Non-critical: checkout still works via server-side gateway routing.
      setGateways(null);
    }
  };

  useEffect(() => {
    fetchData();
    fetchGateways();
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
      toast({ title: t("Success"), description: t("Subscription activated!") });
      fetchData();
    } catch (err: any) {
      toast({
        title: t("Error"),
        description:
          err?.response?.data?.message || t("Failed to subscribe to plan"),
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <T>Loading plans...</T>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <T>Pick a plan that suits your business. Upgrade anytime.</T>
      </p>

      {/* ── Preferred payment method for this region ───────── */}
      {gateways?.preferred && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <T>Preferred payment method</T>:{" "}
                  <span className="font-semibold">
                    {gateways.preferred.displayName}
                  </span>
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {gateways.resolvedCountry}
                </Badge>
              </div>
              {gateways.alternatives.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAltGateways((v) => !v)}
                >
                  {showAltGateways ? (
                    <T>Hide other methods</T>
                  ) : (
                    <T>Show other methods</T>
                  )}
                </Button>
              )}
            </div>

            {gateways.fallbackUsed && (
              <p className="text-xs text-muted-foreground">
                <T>
                  No local gateway is configured for your region — a global
                  provider will be used.
                </T>
              </p>
            )}

            {showAltGateways && gateways.alternatives.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {gateways.alternatives.map((g) => (
                  <Badge
                    key={g.gatewayName}
                    variant="outline"
                    className="font-normal"
                  >
                    {g.displayName}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <T>No plans available at the moment.</T>
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
                        <T>Current</T>
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
                      <span className="text-muted-foreground">
                        <T>Monthly</T>
                      </span>
                      <span className="font-semibold">
                        {plan.monthlyPrice === 0
                          ? t("Free")
                          : `${plan.currency} ${plan.monthlyPrice}`}
                      </span>
                    </div>
                    {plan.annualPrice && plan.annualPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <T>Annual</T>
                        </span>
                        <span className="font-semibold">
                          {plan.currency} {plan.annualPrice}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Commission</T>
                      </span>
                      <span>{plan.commissionPercent}%</span>
                    </div>

                    {/* ── Resource Limits ─────────────────── */}
                    <div className="my-1 border-t pt-2 text-xs font-medium text-muted-foreground">
                      <T>Limits</T>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Products</T>
                      </span>
                      <span>{plan.maxProducts ?? t("Unlimited")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Invoices/mo</T>
                      </span>
                      <span>{plan.maxInvoicesPerMonth ?? t("Unlimited")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Catalogues</T>
                      </span>
                      <span>{plan.maxCatalogues ?? t("Unlimited")}</span>
                    </div>
                    {plan.catalogueLimit && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <T>Items/catalogue</T>
                        </span>
                        <span>{plan.catalogueLimit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Orders/mo</T>
                      </span>
                      <span>{plan.maxOrdersPerMonth ?? t("Unlimited")}</span>
                    </div>

                    {plan.includesAi && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <T>AI Credits/mo</T>
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
                        <T>Current Plan</T>
                      </>
                    ) : subscribing === plan.id ? (
                      t("Processing...")
                    ) : (
                      <>
                        {plan.monthlyPrice === 0
                          ? t("Activate Free Plan")
                          : t("Subscribe")}
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
