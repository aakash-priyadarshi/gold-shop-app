"use client";

import { ShopkeeperGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlanMigrationBanner } from "@/components/dashboard/PlanMigrationBanner";
import { QuickGoldEstimator } from "@/components/dashboard/QuickGoldEstimator";
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
  href?: string;
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
    const hasActiveSub = currentSubscription && currentSubscription.status !== "FREE" && currentSubscription.id !== null;
    if (!user || (user.shop?.isVerified && hasActiveSub && recentOrders.length > 0 && stats.length > 0)) return [];
    return [
      { id: "verify", label: t("Verify Your Shop"), reward: "+5 AI Credits", done: !!user?.shop?.isVerified, href: "/dashboard/shop/kyc", cta: t("Complete KYC") },
      { id: "plan", label: t("Choose a Subscription Plan"), reward: "+5 AI Credits", done: !!hasActiveSub, href: "/dashboard/shop/billing", cta: t("View Plans") },
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
        changePercent: data?.changePercent ?? 0,
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
              href: "/dashboard/shop/orders",
            },
            {
              title: t("Pending RFQs"),
              value: dash.pendingRfqs?.toString() || "0",
              change: "+0",
              changeType: "positive",
              icon: MessageSquare,
              description: t("Awaiting response"),
              href: "/dashboard/shop/rfq",
            },
            {
              title: t("Avg Rating"),
              value: dash.averageRating ? dash.averageRating.toFixed(1) : "N/A",
              change: "+0",
              changeType: "positive",
              icon: Star,
              description: t(`${dash.recentRatings || 0} reviews`),
              href: "/dashboard/shop/customers",
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
              href: "/dashboard/shop/kyc",
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

          {/* Admin contact prompt — encourages shopkeepers to message admin@orivraa.com */}
          <AdminMessageBanner />

          {/* ═══ Onboarding Hub & Live Market Rates ═══ */}
          {((quests.length > 0 && doneCount < quests.length) || ((!stats || stats.length === 0) && recentOrders.length === 0) || (user?.shop && !user.shop.isVerified)) ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Left Column: Onboarding Actions */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* 1. Gamified Quests (Takes priority over standalone KYC alert) */}
                {quests.length > 0 && doneCount < quests.length ? (
                  <Card data-tour="dash-quests" className="border-amber-300 dark:border-amber-700/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 relative group">
                    <div className="absolute top-0 right-0 p-32 bg-amber-400/5 blur-3xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
                    <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 via-yellow-50/50 to-amber-100/30 dark:from-amber-950/40 dark:via-yellow-900/10 dark:to-amber-950/20 relative z-10 border-b border-amber-100 dark:border-amber-900/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg text-amber-900 dark:text-amber-100">
                          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shadow-inner">
                            <Rocket className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <T>Setup Quests</T>
                          <Badge variant="outline" className="text-xs ml-1 border-amber-300 bg-white/50 dark:bg-black/20 text-amber-700 dark:text-amber-400">{doneCount}/{quests.length}</Badge>
                        </CardTitle>
                      </div>
                      <Progress value={Math.round((doneCount / quests.length) * 100)} className="h-1.5 mt-4 bg-amber-200/50 dark:bg-amber-900/30 [&>div]:bg-amber-500" />
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10 bg-white/40 dark:bg-gray-950/20 backdrop-blur-sm">
                      <div className="space-y-3">
                        {quests.map((quest: any) => (
                          <div key={quest.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 rounded-xl border transition-all duration-300 ${quest.done ? "bg-green-50/50 border-green-100 dark:bg-green-950/10 dark:border-green-900/30" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-sm hover:shadow"}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {quest.done ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${quest.done ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"}`}>{quest.label}</p>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-medium">
                                  <Gift className="h-3 w-3" /> {quest.reward}
                                </p>
                              </div>
                            </div>
                            {!quest.done && (
                              <Button variant="outline" size="sm" className="shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800/50 dark:text-amber-400 dark:hover:bg-amber-950 w-full sm:w-auto mt-2 sm:mt-0" asChild>
                                <Link href={quest.href}>{quest.cta}</Link>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* 2. Standalone KYC Banner (Shown ONLY if Quests are done but still unverified) */
                  user?.shop && !user.shop.isVerified && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-base">
                            <T>
                              {!user.shop.verificationRequests?.length
                                ? "Action Required: Verify Your Shop"
                                : "Verification Pending"}
                            </T>
                          </h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
                            <T>
                              {!user.shop.verificationRequests?.length
                                ? "Complete your KYC verification to unlock all marketplace and POS features securely."
                                : "Your shop is currently under review by our compliance team. Full features will unlock soon."}
                            </T>
                          </p>
                        </div>
                      </div>
                      {!user.shop.verificationRequests?.length && (
                        <Button asChild className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-transform hover:scale-105 w-full sm:w-auto">
                          <Link href="/dashboard/shop/kyc">
                            <T>Start Verification</T>
                          </Link>
                        </Button>
                      )}
                    </div>
                  )
                )}

                {/* 3. Demo Hydrator & Free Trial */}
                {(!stats || stats.length === 0) && recentOrders.length === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sandbox Hydrator */}
                    <Card className="border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Package className="h-32 w-32 text-blue-600" />
                      </div>
                      <CardHeader className="pb-3 relative z-10">
                        <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                          <Package className="h-4 w-4" /> <T>Explore Demo Shop</T>
                        </CardTitle>
                        <CardDescription className="text-xs text-blue-600/70 dark:text-blue-400/70">
                          <T>Populate your store with 5 sample products, 2 customers, and 3 invoices instantly.</T>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow transition-all group-hover:shadow-md" 
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

                    {/* Free Pro Trial */}
                    {(!currentSubscription || currentSubscription.status === "FREE") && (
                      <Card className="border-purple-200 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-950/20 dark:to-fuchsia-950/10 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Star className="h-32 w-32 text-purple-600" />
                        </div>
                        <CardHeader className="pb-3 relative z-10">
                          <CardTitle className="text-base flex items-center gap-2 text-purple-800 dark:text-purple-300">
                            <Star className="h-4 w-4" /> <T>14-Day Free Pro Trial</T>
                          </CardTitle>
                          <CardDescription className="text-xs text-purple-600/70 dark:text-purple-400/70">
                            <T>Unlock all premium features including AI generation for 14 days. No credit card required.</T>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <Button 
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow transition-all group-hover:shadow-md"
                            onClick={async (e) => {
                              const btn = e.currentTarget;
                              btn.disabled = true;
                              btn.innerHTML = `<span class="animate-spin mr-2">⌛</span> Activating...`;
                              try {
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
              </div>

              {/* Right Column: Live Gold Rates */}
              <div className="xl:col-span-1">
                {goldRates && (
                  <Card data-tour="dash-live-rates" className="h-full overflow-hidden border-amber-300/60 dark:border-amber-700/50 shadow-sm hover:shadow-lg hover:border-amber-400/80 dark:hover:border-amber-500/50 transition-all duration-500 group relative">
                    <div className="absolute top-0 right-0 p-24 bg-amber-400/10 dark:bg-amber-400/5 blur-[40px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none group-hover:scale-125 group-hover:bg-amber-400/15 transition-all duration-700" />
                    <div className="bg-gradient-to-br from-amber-50/90 via-yellow-100/40 to-amber-50/80 dark:from-amber-950/80 dark:via-yellow-900/20 dark:to-amber-950/60 px-6 py-6 h-full flex flex-col relative z-10">
                      
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-400 dark:from-amber-700 dark:to-yellow-600 flex items-center justify-center shadow-inner">
                            <Sparkles className="h-5 w-5 text-amber-900 dark:text-amber-100" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-amber-950 dark:text-amber-100 tracking-tight"><T>Live Market Pulse</T></h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider"><T>Updated</T> {goldRates.updatedAt}</p>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`px-2 py-1 border shadow-sm ${goldRates.changePercent >= 0 ? "border-green-300 text-green-700 bg-green-50/80 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300" : "border-red-300 text-red-700 bg-red-50/80 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300"}`}
                        >
                          {goldRates.changePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                          <span className="font-semibold">{goldRates.changePercent >= 0 ? "+" : ""}{goldRates.changePercent}%</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                        {[
                          { label: "24K Gold", value: goldRates.rate24k, featured: true },
                          { label: "22K Gold", value: goldRates.rate22k },
                          { label: "18K Gold", value: goldRates.rate18k },
                          { label: "Silver /g", value: goldRates.silver },
                        ].map((r) => (
                          <div key={r.label} className={`rounded-xl px-4 py-3 text-center border transition-all duration-300 ${r.featured ? 'bg-gradient-to-b from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-sm' : 'bg-white/60 dark:bg-gray-900/40 border-white/40 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-800'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${r.featured ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>{r.label}</p>
                            <p className={`mt-1 font-extrabold tabular-nums tracking-tight ${r.featured ? 'text-xl text-amber-950 dark:text-amber-50' : 'text-lg text-foreground'}`}>
                              <span className="text-xs font-medium text-muted-foreground mr-0.5">{goldRates.currency}</span>
                              {r.value.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto bg-white/80 dark:bg-gray-950/50 backdrop-blur-md border border-amber-100 dark:border-amber-900/30 rounded-xl p-3.5 flex items-start gap-3 shadow-sm">
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-lg shrink-0">
                          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-amber-900 dark:text-amber-200"><T>AI Insight:</T></span>{" "}
                          {goldRates.changePercent >= 0
                            ? t("Prices are trending up. Consider locking in inventory stock to hedge against weekend demand.")
                            : t("Prices dipped today. Great opportunity to restock key inventory and offer margin discounts.")}
                        </p>
                      </div>

                    </div>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            /* Standalone Gold Rates if no onboarding elements remain */
            goldRates && (
              <div className="w-full">
                  <Card data-tour="dash-live-rates" className="overflow-hidden border-amber-300/60 dark:border-amber-700/50 shadow-sm hover:shadow-md transition-all duration-500 group relative">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-400/5 to-transparent pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity duration-700" />
                    <div className="bg-gradient-to-r from-amber-50/90 via-yellow-50/40 to-amber-50/80 dark:from-amber-950/80 dark:via-yellow-900/10 dark:to-amber-950/60 px-6 py-5 relative z-10">
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 md:w-1/4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-400 dark:from-amber-700 dark:to-yellow-600 flex items-center justify-center shadow-inner shrink-0">
                            <Sparkles className="h-5 w-5 text-amber-900 dark:text-amber-100" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-amber-950 dark:text-amber-100 tracking-tight"><T>Live Market Pulse</T></h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider"><T>Updated</T> {goldRates.updatedAt}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 items-center justify-around gap-2 px-2 md:px-6 md:border-x border-amber-200/50 dark:border-amber-800/30">
                          {[
                            { label: "24K Gold", value: goldRates.rate24k, featured: true },
                            { label: "22K Gold", value: goldRates.rate22k },
                            { label: "18K Gold", value: goldRates.rate18k },
                            { label: "Silver /g", value: goldRates.silver },
                          ].map((r) => (
                            <div key={r.label} className="text-center">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${r.featured ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>{r.label}</p>
                              <p className={`mt-0.5 font-extrabold tabular-nums tracking-tight ${r.featured ? 'text-lg text-amber-950 dark:text-amber-50' : 'text-base text-foreground'}`}>
                                <span className="text-[10px] font-medium text-muted-foreground mr-0.5">{goldRates.currency}</span>
                                {r.value.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="md:w-1/4 flex flex-col items-end justify-center">
                          <Badge
                            variant="outline"
                            className={`px-2 py-1 mb-2 border shadow-sm ${goldRates.changePercent >= 0 ? "border-green-300 text-green-700 bg-green-50/80 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300" : "border-red-300 text-red-700 bg-red-50/80 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300"}`}
                          >
                            {goldRates.changePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                            <span className="font-semibold">{goldRates.changePercent >= 0 ? "+" : ""}{goldRates.changePercent}%</span>
                          </Badge>
                          <p className="text-[10px] text-muted-foreground text-right max-w-[200px] leading-tight">
                            <span className="font-medium text-amber-800 dark:text-amber-300"><T>AI Insight:</T></span> {goldRates.changePercent >= 0 ? t("Prices rising, lock in stock.") : t("Prices dipped, good time to restock.")}
                          </p>
                        </div>
                      </div>

                    </div>
                  </Card>
              </div>
            )
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

          <div data-tour="dash-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat, index) => {
              // Map dynamic accent colors per card index
              const accents = [
                "text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/40 group-hover:bg-blue-500 group-hover:text-white border-blue-200 dark:border-blue-800/30",
                "text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-900/40 group-hover:bg-purple-500 group-hover:text-white border-purple-200 dark:border-purple-800/30",
                "text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40 group-hover:bg-amber-500 group-hover:text-white border-amber-200 dark:border-amber-800/30",
                "text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 group-hover:bg-emerald-500 group-hover:text-white border-emerald-200 dark:border-emerald-800/30",
              ];
              const accent = accents[index % accents.length];
              const borderClass = accent.split(' ').pop(); // Get the border color for the card container hover

              const cardContent = (
                <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md hover:border-amber-300/50 dark:hover:border-amber-700/50 hover:-translate-y-1 group bg-white/60 dark:bg-gray-950/40 backdrop-blur-sm ${stat.href ? 'cursor-pointer' : ''}`}>
                  <CardContent className="p-6 relative">
                    <div className="absolute top-0 right-0 p-12 bg-gray-100/50 dark:bg-gray-800/20 blur-2xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold tracking-tight mt-1.5 tabular-nums text-foreground">{stat.value}</p>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl transition-all duration-300 shadow-sm ${accent.replace(borderClass || '', '')}`}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-xs font-medium relative z-10">
                      <span
                        className={`flex items-center px-1.5 py-0.5 rounded-md mr-2 ${
                          stat.changeType === "positive"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {stat.changeType === "positive" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                        {stat.change}
                      </span>
                      <span className="text-muted-foreground">
                        {stat.description}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );

              return stat.href ? (
                <Link key={stat.title} href={stat.href} className="block">
                  {cardContent}
                </Link>
              ) : (
                <div key={stat.title}>{cardContent}</div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-tour="dash-orders">
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

            <Card data-tour="dash-rfqs">
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

          <Card data-tour="dash-low-stock">
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

          <Card data-tour="dash-quick-actions">
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
          
          <QuickGoldEstimator />
        </div>
      </DashboardLayout>
    </ShopkeeperGuard>
  );
}
