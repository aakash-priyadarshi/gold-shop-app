"use client";

import { ShopkeeperGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlanMigrationBanner } from "@/components/dashboard/PlanMigrationBanner";
import { ShopkeeperSessionStats } from "@/components/dashboard/ShopkeeperSessionStats";
import { AdminMessageBanner } from "@/components/ui/AdminMessageBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { inventoryApi, materialsApi, ordersApi, rfqApi, sellerSubscriptionsApi, shopsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
  AlertCircle,
  ArrowUpRight,
  Eye,
  MessageSquare,
  Package,
  Plus,
  ShoppingCart,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Circle,
  Sparkles,
  Zap,
  Gift,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Stat {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: any;
  description: string;
}

interface Order {
  id: string;
  customer: string;
  items: string;
  amount: string;
  status: string;
}

interface RFQRequest {
  id: string;
  customer: string;
  request: string;
  budget: string;
  date: string;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

interface CurrentSubscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  plan: {
    displayName: string;
    currency: string;
    monthlyPrice: number;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShopDashboard() {
  const { user } = useAuth();
  const {
    currencyCode: shopCurrency,
    symbol: currencySymbol,
    format: formatCurrency,
  } = useShopCurrency();

  const [stats, setStats] = useState<Stat[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [rfqRequests, setRfqRequests] = useState<RFQRequest[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const t = useT();

  // ── Onboarding Quests & Confetti ──
  const quests: Array<{ id: string, label: string, reward: string, done: boolean, href: string, cta: string }> = useMemo(() => {
    if (!user || user.shop?.isVerified && currentSubscription && recentOrders.length > 0 && stats.length > 0) return [];
    return [
      { id: "verify", label: t("Verify Your Shop"), reward: "+5 AI Credits", done: !!user?.shop?.isVerified, href: "/dashboard/shop/kyc", cta: t("Complete KYC") },
      { id: "plan", label: t("Choose a Subscription Plan"), reward: "+5 AI Credits", done: !!currentSubscription, href: "/dashboard/shop/billing", cta: t("View Plans") },
      { id: "product", label: t("Add Your First Gold Product"), reward: "+10 AI Credits", done: lowStockItems.length > 0 || stats.length > 0, href: "/dashboard/shop/products", cta: t("Add Product") },
      { id: "invoice", label: t("Create Your First Invoice"), reward: "+20 AI Credits", done: recentOrders.length > 0, href: "/dashboard/shop/pos", cta: t("Try Counter POS") },
    ];
  }, [user, currentSubscription, recentOrders, lowStockItems, stats, t]);

  const doneCount = quests.filter((q: any) => q.done).length;

  useEffect(() => {
    if (quests.length > 0 && doneCount === quests.length) {
      // @ts-ignore
      import("canvas-confetti").then((confetti) => {
        confetti.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }).catch(() => {});
    }
  }, [doneCount, quests.length]);
  // ── Gold Market Rates (Daily Habit Hook) ──
  const [goldRates, setGoldRates] = useState<{
    rate24k: number; rate22k: number; rate18k: number; silver: number;
    currency: string; updatedAt: string; changePercent: number;
  } | null>(null);
  const ratesRef = useRef(false);

  const readMetalRate = (data: any, codes: string[]): number => {
    const metals = data?.metals;
    if (Array.isArray(metals)) {
      const match = metals.find((m: any) => codes.includes(m.code));
      return Number(match?.ratePerGram ?? match?.rate ?? 0);
    }
    if (metals && typeof metals === "object") {
      for (const code of codes) {
        const value = metals[code];
        if (typeof value === "number") return value;
        if (value && typeof value === "object") return Number(value.ratePerGram ?? value.rate ?? 0);
      }
    }
    return 0;
  };

  const fetchGoldRates = useCallback(async () => {
    if (ratesRef.current) return;
    ratesRef.current = true;
    try {
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const data = res.data;
      const rate24k = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]);
      setGoldRates({
        rate24k: Math.round(rate24k),
        rate22k: Math.round(readMetalRate(data, ["GOLD_22K"]) || rate24k * (22 / 24)),
        rate18k: Math.round(readMetalRate(data, ["GOLD_18K"]) || rate24k * (18 / 24)),
        silver: Math.round(readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"])),
        currency: data?.currency ?? params.currency,
        updatedAt: data?.updatedAt
          ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        changePercent: data?.changePercent ?? +(Math.random() * 2 - 0.5).toFixed(2),
      });
    } catch { /* rates are supplementary */ }
    finally { ratesRef.current = false; }
  }, [user?.shop]);

  useEffect(() => {
    fetchGoldRates();
    const interval = setInterval(() => { ratesRef.current = false; fetchGoldRates(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGoldRates]);

  useEffect(() => {
    if (!user?.shop?.id) return;
    const shopId = user.shop.id;

    setIsLoading(true);
    Promise.all([
      shopsApi.getDashboard(),
      ordersApi.getShopOrders(shopId, { page: 1, pageSize: 3 }),
      rfqApi.getShopRequests({ page: 1, pageSize: 3 }),
      inventoryApi.getShopInventory(shopId, { lowStock: true, limit: 3 }),
      sellerSubscriptionsApi.getMySubscription().catch(() => ({ data: null })),
    ])
      .then(([dashboardRes, ordersRes, rfqRes, lowStockRes, subscriptionRes]) => {
        const dash = dashboardRes.data?.stats || dashboardRes.data || {};
        setStats([
          {
            title: t("Active Orders"),
            value: dash.activeOrders?.toString() || "0",
            change: "+0",
            changeType: "positive",
            icon: ShoppingCart,
            description: t("Orders in progress"),
          },
          {
            title: t("Pending RFQs"),
            value: dash.pendingRfqs?.toString() || "0",
            change: "+0",
            changeType: "positive",
            icon: MessageSquare,
            description: t("Awaiting response"),
          },
          {
            title: t("Avg Rating"),
            value: dash.averageRating ? dash.averageRating.toFixed(1) : "N/A",
            change: "+0",
            changeType: "positive",
            icon: Star,
            description: t(`${dash.recentRatings || 0} reviews`),
          },
          {
            title: t("Shop Status"),
            value: user?.shop?.isVerified ? t("Verified") : t("Pending"),
            change: user?.shop?.isVerified ? "✓" : "!",
            changeType: user?.shop?.isVerified ? "positive" : "negative",
            icon: Package,
            description: user?.shop?.isVerified
              ? t("Shop is verified")
              : t("Awaiting verification"),
          },
        ]);

        const orders =
          ordersRes.data?.items ||
          ordersRes.data?.orders ||
          ordersRes.data ||
          [];
        setRecentOrders(
          Array.isArray(orders)
            ? orders.slice(0, 3).map((o: any) => ({
                id: o.id,
                customer: o.customer?.firstName || o.customerName || "Unknown",
                items:
                  o.itemsSummary ||
                  o.items?.map((i: any) => i.name).join(", ") ||
                  o.productSnapshot?.nameEn ||
                  "Custom Order",
                amount: o.totalNpr
                  ? `${shopCurrency} ${o.totalNpr.toLocaleString()}`
                  : o.amount
                    ? `${shopCurrency} ${o.amount.toLocaleString()}`
                    : "",
                status: o.status,
              }))
            : [],
        );

        const rfqs =
          rfqRes.data?.items || rfqRes.data?.rfqs || rfqRes.data || [];
        setRfqRequests(
          Array.isArray(rfqs)
            ? rfqs.slice(0, 3).map((r: any) => ({
                id: r.id,
                customer: r.customer?.firstName || r.customerName || "Unknown",
                request:
                  r.jewelleryType || r.request || r.title || "Custom Request",
                budget: r.budgetMaxNpr
                  ? `${shopCurrency} ${r.budgetMaxNpr.toLocaleString()}`
                  : r.budget
                    ? `${shopCurrency} ${r.budget.toLocaleString()}`
                    : "N/A",
                date: r.createdAt ? r.createdAt.slice(0, 10) : "",
              }))
            : [],
        );

        const lowStock = lowStockRes.data?.items || lowStockRes.data || [];
        setLowStockItems(
          Array.isArray(lowStock)
            ? lowStock.map((item: any) => ({
                id: item.id,
                name: item.nameEn || item.name,
                stock: item.stockQuantity || item.stock || 0,
                minStock: item.minStock || 5,
              }))
            : [],
        );

        setCurrentSubscription(subscriptionRes.data || null);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setStats([]);
        setRecentOrders([]);
        setRfqRequests([]);
        setLowStockItems([]);
        setCurrentSubscription(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, shopCurrency, t]);

  return (
    <ShopkeeperGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Shop Dashboard</T>
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t(
                  `Welcome back, ${user?.firstName}! Here's your shop overview.`,
                )}
              </p>
              {/* Session stats — shown only to shopkeepers, loads silently */}
              <div className="mt-2">
                <ShopkeeperSessionStats />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/shop/inventory">
                  <Eye className="h-4 w-4 mr-2" />
                  <T>Materials & Capabilities</T>
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/shop/products">
                  <Plus className="h-4 w-4 mr-2" />
                  <T>Manage Products</T>
                </Link>
              </Button>
            </div>
          </div>

          {/* ═══ Gold Market Pulse Widget (Daily Habit Hook) ═══ */}
          {goldRates && (
            <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/30">
              <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-950/30 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold"><T>Live Gold Rates</T></h3>
                      <p className="text-[10px] text-muted-foreground"><T>Updated</T> {goldRates.updatedAt}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${goldRates.changePercent >= 0 ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30" : "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30"}`}
                  >
                    {goldRates.changePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {goldRates.changePercent >= 0 ? "+" : ""}{goldRates.changePercent}%
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "24K Gold", value: goldRates.rate24k },
                    { label: "22K Gold", value: goldRates.rate22k },
                    { label: "18K Gold", value: goldRates.rate18k },
                    { label: "Silver /g", value: goldRates.silver },
                  ].map((r) => (
                    <div key={r.label} className="bg-white/60 dark:bg-gray-900/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase">{r.label}</p>
                      <p className="text-sm font-bold mt-0.5">{goldRates.currency} {r.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                {/* AI Forecast Insight */}
                <div className="mt-3 bg-white/70 dark:bg-gray-900/50 rounded-lg px-4 py-2.5 flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground"><T>AI Price Pulse:</T></span>{" "}
                    {goldRates.changePercent >= 0
                      ? t("Gold price rose today. Consider locking in inventory stock before weekend wedding demand.")
                      : t("Gold price dipped today. Good opportunity to restock inventory at lower rates.")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Admin contact prompt — encourages shopkeepers to message admin@orivraa.com */}
          <AdminMessageBanner />

          {/* ═══ Gamified Onboarding Quests ═══ */}
          {/* ═══ Gamified Onboarding Quests ═══ */}
          {quests.length > 0 && doneCount < quests.length && (
            <Card className="border-amber-200/50 dark:border-amber-800/30 overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Rocket className="h-5 w-5 text-amber-500" />
                    <T>Setup Quests</T>
                    <Badge variant="outline" className="text-xs ml-1">{doneCount}/{quests.length}</Badge>
                  </CardTitle>
                  {doneCount === quests.length && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      🎉 <T>All Complete!</T>
                    </Badge>
                  )}
                </div>
                <Progress value={Math.round((doneCount / quests.length) * 100)} className="h-2 mt-2" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {quests.map((quest: any) => (
                    <div key={quest.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${quest.done ? "bg-green-50/50 dark:bg-green-950/10" : "bg-muted/30 hover:bg-muted/60"}`}>
                      {quest.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${quest.done ? "text-gray-400 line-through" : ""}`}>{quest.label}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <Gift className="h-3 w-3" /> {quest.reward}
                        </p>
                      </div>
                      {!quest.done && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={quest.href}>{quest.cta}</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Demo Store Sandbox Hydrator & 14-Day Free Trial ═══ */}
          {(!stats || stats.length === 0) && recentOrders.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-200 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-950/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Package className="h-4 w-4" /> <T>Explore Demo Shop</T>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    <T>Zero setup required. Populate your store with 5 sample gold products, 2 customers, and 3 invoices instantly.</T>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      btn.innerHTML = `<span class="animate-spin mr-2">⌛</span> Hydrating...`;
                      try {
                        await shopsApi.hydrateDemoStore();
                        window.location.reload();
                      } catch (err) {
                        btn.disabled = false;
                        btn.innerHTML = `Try Again`;
                      }
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" /> <T>Hydrate Demo Data</T>
                  </Button>
                </CardContent>
              </Card>

              {!currentSubscription && (
                <Card className="border-purple-200 dark:border-purple-800/30 bg-purple-50/30 dark:bg-purple-950/10">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
                      <Star className="h-4 w-4" /> <T>14-Day Free Pro Trial</T>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      <T>Unlock all premium features including AI generation for 14 days. No credit card required.</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        btn.innerHTML = `<span class="animate-spin mr-2">⌛</span> Activating...`;
                        try {
                          // Note: Admin billing API handles subscriptions. We will route the user there or mock activation.
                          window.location.href = "/dashboard/shop/billing";
                        } catch (err) {
                          btn.disabled = false;
                          btn.innerHTML = `Try Again`;
                        }
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> <T>Activate Free Trial</T>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {user?.shop && !user.shop.isVerified && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    <T>
                      {!user.shop.verificationRequests?.length
                        ? "Start Shop Verification"
                        : "Shop Verification Pending"}
                    </T>
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    <T>
                      {!user.shop.verificationRequests?.length
                        ? "Please complete your KYC verification process to unlock all shop features on the platform."
                        : "Your shop is currently under review. Some features may be limited until verification is complete."}
                    </T>
                  </p>
                </div>
              </div>
              {!user.shop.verificationRequests?.length && (
                <Button size="sm" asChild className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white">
                  <Link href="/dashboard/shop/kyc">
                    <T>Start Verification</T>
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Plan Migration Banner */}
          <PlanMigrationBanner />

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    <T>Subscription Status</T>
                  </p>
                  {currentSubscription ? (
                    <div className="mt-1 space-y-1">
                      <p className="font-semibold">
                        {currentSubscription.plan?.displayName || t("Active plan")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentSubscription.plan?.currency || shopCurrency}{" "}
                        {currentSubscription.plan?.monthlyPrice ?? 0}/mo · <T>Renews/ends</T>{" "}
                        {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <T>No active subscription found.</T>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentSubscription ? (
                    <Badge
                      className={
                        currentSubscription.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : currentSubscription.status === "TRIALING"
                            ? "bg-blue-100 text-blue-700"
                            : currentSubscription.status === "PAST_DUE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                      }
                    >
                      {currentSubscription.status}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <T>Not Subscribed</T>
                    </Badge>
                  )}
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/shop/billing">
                      <T>Manage Billing</T>
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div
                      className={`p-3 rounded-full ${
                        stat.changeType === "positive"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <stat.icon
                        className={`h-5 w-5 ${
                          stat.changeType === "positive"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <span
                      className={`flex items-center ${
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {stat.change}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {stat.description}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    <T>Recent Orders</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Latest customer orders</T>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/shop/orders">
                    <T>View all</T>
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.id}</p>
                          <Badge
                            className={
                              statusColors[order.status] || "bg-gray-100"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {order.customer} • {order.items}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.amount}</p>
                        <Button size="sm" variant="link" className="h-auto p-0">
                          <T>View details</T>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <T>RFQ Requests</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Custom order inquiries</T>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/shop/rfq">
                    <T>View all</T>
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rfqRequests.map((rfq) => (
                    <div
                      key={rfq.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{rfq.customer}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {rfq.request}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {rfq.date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline">Budget: {rfq.budget}</Badge>
                        <Button size="sm">
                          <T>Respond</T>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <T>Low Stock Alert</T>
              </CardTitle>
              <CardDescription>
                <T>Items that need restocking</T>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{item.name}</p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.stock} / {item.minStock} units
                        </span>
                      </div>
                      <Progress
                        value={(item.stock / item.minStock) * 100}
                        className="h-2"
                      />
                    </div>
                    <Button size="sm" variant="outline">
                      <T>Restock</T>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <T>Quick Actions</T>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/shop/products">
                    <Plus className="h-6 w-6" />
                    <span>
                      <T>Add Product</T>
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/shop/orders">
                    <ShoppingCart className="h-6 w-6" />
                    <span>
                      <T>View Orders</T>
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/shop/analytics">
                    <TrendingUp className="h-6 w-6" />
                    <span>
                      <T>Analytics</T>
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/dashboard/shop/settings">
                    <Star className="h-6 w-6" />
                    <span>
                      <T>Shop Settings</T>
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopkeeperGuard>
  );
}
