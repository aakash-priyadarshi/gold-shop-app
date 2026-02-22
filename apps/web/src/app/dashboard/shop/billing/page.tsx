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
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, histRes, usageRes] = await Promise.all([
        sellerSubscriptionsApi.getMySubscription(),
        sellerSubscriptionsApi.getMyHistory(),
        sellerSubscriptionsApi.getMyUsage().catch(() => ({ data: null })),
      ]);
      setSub(subRes.data || null);
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);
      setUsage(usageRes.data || null);
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
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [balRes, ledRes] = await Promise.all([
          aiCreditsApi.getBalance(),
          aiCreditsApi.getLedger({ limit: 30 }),
        ]);
        setBalance(balRes.data?.balance ?? 0);
        setLedger(
          Array.isArray(ledRes.data) ? ledRes.data : (ledRes.data?.data ?? []),
        );
      } catch {
        toast({
          title: "Error",
          description: "Failed to load credit information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const ACTION_COLORS: Record<string, string> = {
    GRANT: "text-green-500",
    DEBIT: "text-red-500",
    REFUND: "text-blue-500",
    EXPIRE: "text-orange-500",
    ADMIN_ADJUST: "text-purple-500",
    OVERAGE: "text-yellow-500",
  };

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
        </CardContent>
      </Card>

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
                      {entry.amount > 0 ? "+" : ""}
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
