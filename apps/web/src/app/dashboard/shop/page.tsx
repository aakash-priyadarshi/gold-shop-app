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
import { useFeatures } from "@/hooks/useFeatures";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { toast } from "@/hooks/use-toast";
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
  Hammer,
  Coins,
  Users,
  Database,
  RefreshCw,
  Scale,
  Crown,
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
  const { hasFeature, loading: featuresLoading } = useFeatures();
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

  // ── Karigar & Bullion States (loaded exclusively from DB) ──
  const [bullionGold, setBullionGold] = useState(0);
  const [bullionSilver, setBullionSilver] = useState(0);
  const [karigars, setKarigars] = useState<
    { name: string; goldOutstanding: number; silverOutstanding: number; wastageLimit: number; activeJob: string }[]
  >([]);

  // Modal toggles & inputs
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedKarigarIndex, setSelectedKarigarIndex] = useState<number | null>(null);
  
  const [issueWeight, setIssueWeight] = useState("");
  const [issueMetalType, setIssueMetalType] = useState<"GOLD" | "SILVER">("GOLD");
  const [issueJob, setIssueJob] = useState("");

  const [receiveWeight, setReceiveWeight] = useState("");
  const [receiveScrap, setReceiveScrap] = useState("");
  const [receiveWastage, setReceiveWastage] = useState("");

  const [adjustGoldWeight, setAdjustGoldWeight] = useState("");
  const [adjustSilverWeight, setAdjustSilverWeight] = useState("");

  const [dashboardToast, setDashboardToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Trigger brief alert notification
  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setDashboardToast({ message: msg, type });
    setTimeout(() => setDashboardToast(null), 4000);
  };

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
  const supplyChainRef = useRef<any>({ workshops: [], vaultReserves: {}, jobs: [] });

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

  // ── Load Karigar & Bullion from DB ──
  useEffect(() => {
    if (!user?.shop?.id) return;
    shopsApi.getSettings().then((res) => {
      const sc = res.data?.bankAccountDetails?.karigarSupplyChain;
      if (!sc) return;
      supplyChainRef.current = sc;
      const vr = sc.vaultReserves || {};
      setBullionGold((vr.goldGrains24k || 0) + (vr.goldBars24k || 0));
      setBullionSilver(vr.silverBullion999 || 0);
      if (Array.isArray(sc.workshops) && sc.workshops.length > 0) {
        setKarigars(sc.workshops.map((w: any) => {
          const activeJob =
            (sc.jobs || []).find((j: any) => j.artisan?.includes(w.artisan || w.name))?.product ||
            w.activeJob ||
            "No active job";
          return {
            name: w.artisan || w.name,
            goldOutstanding: w.outstandingBalance || 0,
            silverOutstanding: 0,
            wastageLimit: w.wastageLimit || 1.0,
            activeJob,
          };
        }));
      }
    }).catch(() => { /* silent fallback to defaults */ });
  }, [user?.shop?.id]);

  useEffect(() => {
    if (!user?.shop?.id) return;
    const shopId = user.shop.id;

    setIsLoading(true);
    Promise.allSettled([
      shopsApi.getDashboard(),
      ordersApi.getShopOrders(shopId, { page: 1, pageSize: 3 }),
      rfqApi.getShopRequests({ page: 1, pageSize: 3 }),
      inventoryApi.getShopInventory(shopId, { lowStock: true, limit: 3 }),
      sellerSubscriptionsApi.getMySubscription().catch(() => ({ data: null })),
    ])
      .then((results) => {
        const [
          dashboardRes,
          ordersRes,
          rfqRes,
          lowStockRes,
          subscriptionRes,
        ] = results.map((r) =>
          r.status === "fulfilled" ? r.value : { data: null },
        ) as any[];
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

  // ── Persist Karigar & Bullion updates to DB ──
  const persistDashboardKarigar = async (
    newGold: number,
    newSilver: number,
    newKarigars: typeof karigars,
  ) => {
    try {
      const sc = supplyChainRef.current;
      const updatedWorkshops = (sc.workshops || []).map((w: any, i: number) => {
        const k = newKarigars[i];
        if (!k) return w;
        return { ...w, outstandingBalance: +(k.goldOutstanding + k.silverOutstanding).toFixed(3) };
      });
      const currentSettings = await shopsApi.getSettings();
      const bankDetails = currentSettings.data?.bankAccountDetails || {};
      const updatedSc = {
        ...sc,
        vaultReserves: { ...(sc.vaultReserves || {}), goldGrains24k: newGold, goldBars24k: 0, silverBullion999: newSilver },
        workshops: updatedWorkshops,
      };
      await shopsApi.updateSettings({
        bankAccountDetails: { ...bankDetails, karigarSupplyChain: updatedSc },
      });
      supplyChainRef.current = updatedSc;
    } catch { /* silent */ }
  };

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
                      <Card className="border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Crown className="h-32 w-32 text-amber-600" />
                        </div>
                        <CardHeader className="pb-3 relative z-10">
                          <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <Crown className="h-4 w-4" /> <T>60-Day Premium Pro Trial</T>
                          </CardTitle>
                          <CardDescription className="text-xs text-amber-600/70 dark:text-amber-400/70">
                            <T>Unlock all premium POS features: walk-in Quotes, karigar Repairs tracking, gold Savings Schemes, and WhatsApp sharing for 60 days. No credit card required.</T>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <Button 
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow transition-all group-hover:shadow-md"
                            onClick={async (e) => {
                              const btn = e.currentTarget;
                              btn.disabled = true;
                              btn.innerHTML = `<span class="animate-spin mr-2">⌛</span> Activating...`;
                              try {
                                await sellerSubscriptionsApi.activateTrial();
                                toast({
                                  title: t("Premium Trial Activated!"),
                                  description: t("Welcome to PRO! Enjoy 60 days of premium CRM and POS features completely free."),
                                });
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (err: any) {
                                btn.disabled = false;
                                btn.innerHTML = t("Try Again");
                                toast({
                                  title: t("Trial Activation Failed"),
                                  description: err?.response?.data?.message || t("Could not activate trial. Please contact support."),
                                  variant: "destructive",
                                });
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
            {isLoading && stats.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card
                    key={`stat-skeleton-${i}`}
                    className="overflow-hidden bg-white/60 dark:bg-gray-950/40 backdrop-blur-sm"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                          <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                      </div>
                      <div className="mt-4 h-4 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    </CardContent>
                  </Card>
                ))
              : stats.map((stat, index) => {
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

          {/* ═══ Karigar & Bullion Supply Chain Tracker ═══ */}
          {dashboardToast && (
            <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${dashboardToast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200' : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'}`}>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold">{dashboardToast.message}</p>
            </div>
          )}

          {!featuresLoading && !hasFeature("karigarSupplyChain") ? (
            <Card data-tour="dash-supply-chain" className="border-dashed border-2 border-amber-200/60 dark:border-amber-900/40 overflow-hidden shadow-sm relative group p-8 bg-gradient-to-br from-amber-50/20 via-white to-orange-50/10 dark:from-amber-950/5 dark:via-gray-900/50 dark:to-orange-950/5">
              <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-950 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-gold-400 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <T>Premium Feature</T>
              </div>

              <div className="max-w-2xl mx-auto text-center space-y-6 py-6">
                <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-gold-400 rounded-full flex items-center justify-center">
                  <Hammer className="h-6 w-6" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    <T>Karigar &amp; Bullion Supply Chain Tracker</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    <T>
                      Take complete control of your workshop. Track raw 24K gold
                      and 999 silver bullion, manage artisan ledgers, and — with
                      Workshop mode — run Tower, Jobs, Floor, Metal, QC, and
                      Reports on the same Supply Chain page.
                    </T>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-1">
                    <Link href="/dashboard/shop/billing">
                      <Zap className="h-4 w-4 fill-white" />
                      <T>Upgrade to Pro / Enterprise</T>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-300 font-semibold px-6 py-2.5 rounded-xl">
                    <Link href="/pricing">
                      <T>View Regional Pricing</T>
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card data-tour="dash-supply-chain" className="border-amber-200 dark:border-amber-900/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3 bg-gradient-to-r from-amber-50/50 via-yellow-50/20 to-orange-50/20 dark:from-amber-950/20 dark:via-yellow-950/5 dark:to-orange-950/5 border-b border-amber-100/50 dark:border-amber-900/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-amber-950 dark:text-amber-100">
                      <Hammer className="h-5 w-5 text-amber-600 dark:text-gold-400" />
                      <T>Karigar &amp; Bullion Supply Chain Tracker</T>
                    </CardTitle>
                    <CardDescription>
                      <T>
                        Karigar book. When Workshop mode is on and your plan includes workshop manufacturing, Supply Chain also shows Tower, Jobs, Floor, Metal, QC, and Reports.
                      </T>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/60 dark:text-amber-400 dark:hover:bg-amber-950 flex items-center gap-1.5"
                      onClick={() => {
                        setAdjustGoldWeight(bullionGold.toString());
                        setAdjustSilverWeight(bullionSilver.toString());
                        setIsAdjustModalOpen(true);
                      }}
                    >
                      <Database className="h-4 w-4" />
                      <T>Adjust Bullion Reserves</T>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* 1. Bullion Stock reserves */}
                  <div className="lg:col-span-1 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 pb-6 lg:pb-0 lg:pr-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-gold-400 flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <T>Pure Bullion reserves</T>
                    </h3>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      {/* Gold reserves card */}
                      <div className="bg-gradient-to-b from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-950/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 shadow-sm relative group">
                        <div className="absolute top-2 right-2 bg-amber-100 dark:bg-amber-950 p-1.5 rounded-lg">
                          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-gold-400" />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"><T>24K Pure Gold</T></p>
                        <p className="text-2xl font-extrabold text-amber-950 dark:text-amber-50 mt-1 tabular-nums">
                          {bullionGold.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">g</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <T>Valued at:</T> <span className="font-semibold">{currencySymbol} {Math.round(bullionGold * (goldRates?.rate24k || 7100)).toLocaleString()}</span>
                        </p>
                      </div>

                      {/* Silver reserves card */}
                      <div className="bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm relative group">
                        <div className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg">
                          <Scale className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"><T>Pure 999 Silver</T></p>
                        <p className="text-2xl font-extrabold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                          {bullionSilver.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">g</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <T>Valued at:</T> <span className="font-semibold">{currencySymbol} {Math.round(bullionSilver * (goldRates?.silver || 82)).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Karigar Accounts */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <T>Karigar Ledger Accounts</T>
                    </h3>
                    
                    <div className="space-y-4">
                      {karigars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                          <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                            <Users className="h-6 w-6 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                              <T>No artisans registered yet</T>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                              <T>Head to the Supply Chain Tracker to register your first Karigar and start tracking workshop metal flows.</T>
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400" asChild>
                            <Link href="/dashboard/shop/supply-chain">
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              <T>Register First Karigar</T>
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        karigars.map((k, index) => (
                        <div key={k.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:shadow hover:border-amber-200/50 dark:hover:border-amber-800/40 transition-all gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 dark:text-white text-base">{k.name}</p>
                              <Badge variant="secondary" className="text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400">
                                <T>Wastage limit:</T> {k.wastageLimit}%
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1">
                              {k.goldOutstanding > 0 && (
                                <p className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                  <T>Gold Balance:</T> <span className="tabular-nums font-bold">{k.goldOutstanding.toFixed(2)} g</span>
                                </p>
                              )}
                              {k.silverOutstanding > 0 && (
                                <p className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                                  <T>Silver Balance:</T> <span className="tabular-nums font-bold">{k.silverOutstanding.toFixed(2)} g</span>
                                </p>
                              )}
                              {k.goldOutstanding === 0 && k.silverOutstanding === 0 && (
                                <p className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                  <T>No outstanding metal balance</T>
                                </p>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                              <span className="font-semibold text-gray-700 dark:text-gray-300"><T>Active Job:</T></span> {k.activeJob}
                            </p>
                          </div>

                          <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 sm:flex-none border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-950 flex items-center justify-center gap-1.5 text-xs font-semibold"
                              onClick={() => {
                                setSelectedKarigarIndex(index);
                                setIssueWeight("");
                                setIssueJob(k.activeJob);
                                setIssueMetalType(k.goldOutstanding > 0 || k.silverOutstanding === 0 ? "GOLD" : "SILVER");
                                setIsIssueModalOpen(true);
                              }}
                            >
                              <T>Issue Metal</T>
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 text-xs font-semibold"
                              onClick={() => {
                                setSelectedKarigarIndex(index);
                                setReceiveWeight("");
                                setReceiveScrap("");
                                setReceiveWastage("");
                                setIsReceiveModalOpen(true);
                              }}
                            >
                              <T>Receive Piece</T>
                            </Button>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* Modal 1: Issue Metal */}
          {isIssueModalOpen && selectedKarigarIndex !== null && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 dark:text-white">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-5 w-5" />
                    <h3 className="font-bold text-lg"><T>Issue Metal to Karigar</T></h3>
                  </div>
                  <button className="text-white/80 hover:text-white font-bold text-xl" onClick={() => setIsIssueModalOpen(false)}>×</button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1"><T>Karigar Artisan</T></p>
                    <p className="font-bold text-base text-gray-950 dark:text-white">{karigars[selectedKarigarIndex].name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setIssueMetalType("GOLD")}
                      className={`py-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all gap-1 text-xs ${issueMetalType === 'GOLD' ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                    >
                      <span className="text-lg">🟡</span>
                      <T>Fine Gold (24K)</T>
                    </button>
                    <button 
                      onClick={() => setIssueMetalType("SILVER")}
                      className={`py-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all gap-1 text-xs ${issueMetalType === 'SILVER' ? 'bg-gray-50 border-gray-400 text-gray-800 dark:bg-gray-800/80 dark:border-gray-600 dark:text-gray-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                    >
                      <span className="text-lg">⚪</span>
                      <T>Pure Silver (999)</T>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2"><T>Weight to Issue (Grams)</T></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={issueWeight} 
                        onChange={(e) => setIssueWeight(e.target.value)}
                        placeholder="e.g. 10.00" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-4 top-3 text-sm text-gray-400 font-bold">g</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <T>Available stock reserves:</T> <span className="font-semibold text-gray-800 dark:text-gray-200">{issueMetalType === 'GOLD' ? `${bullionGold.toFixed(2)}g Gold` : `${bullionSilver.toFixed(2)}g Silver`}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2"><T>Active Fabrication Job</T></label>
                    <input 
                      type="text" 
                      value={issueJob} 
                      onChange={(e) => setIssueJob(e.target.value)}
                      placeholder="e.g. Wedding Ring Set" 
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button variant="outline" className="w-1/2 rounded-xl py-3 text-sm font-semibold h-11" onClick={() => setIsIssueModalOpen(false)}><T>Cancel</T></Button>
                    <Button 
                      className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 text-sm font-semibold h-11 shadow-md"
                      onClick={() => {
                        const wt = parseFloat(issueWeight);
                        if (isNaN(wt) || wt <= 0) return triggerToast(t("Please enter a valid weight to issue"), "error");
                        let newGold = bullionGold;
                        let newSilver = bullionSilver;
                        let newKarigars = karigars;
                        if (issueMetalType === "GOLD") {
                          if (wt > bullionGold) return triggerToast(t("Insufficient gold reserves in bullion stock"), "error");
                          newGold = bullionGold - wt;
                          newKarigars = karigars.map((k, idx) => idx === selectedKarigarIndex ? { ...k, goldOutstanding: k.goldOutstanding + wt, activeJob: issueJob || k.activeJob } : k);
                        } else {
                          if (wt > bullionSilver) return triggerToast(t("Insufficient silver reserves in bullion stock"), "error");
                          newSilver = bullionSilver - wt;
                          newKarigars = karigars.map((k, idx) => idx === selectedKarigarIndex ? { ...k, silverOutstanding: k.silverOutstanding + wt, activeJob: issueJob || k.activeJob } : k);
                        }
                        setBullionGold(newGold);
                        setBullionSilver(newSilver);
                        setKarigars(newKarigars);
                        setIsIssueModalOpen(false);
                        triggerToast(t(`Successfully issued ${wt} grams to ${karigars[selectedKarigarIndex!].name}`));
                        persistDashboardKarigar(newGold, newSilver, newKarigars);
                      }}
                    >
                      <T>Confirm Issue</T>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal 2: Receive Finished Piece */}
          {isReceiveModalOpen && selectedKarigarIndex !== null && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 dark:text-white">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-bold text-lg"><T>Receive Finished Piece</T></h3>
                  </div>
                  <button className="text-white/80 hover:text-white font-bold text-xl" onClick={() => setIsReceiveModalOpen(false)}>×</button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1"><T>Karigar Artisan</T></p>
                    <p className="font-bold text-base text-gray-950 dark:text-white">{karigars[selectedKarigarIndex].name}</p>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      {karigars[selectedKarigarIndex].goldOutstanding > 0 && <span>Gold Balance: {karigars[selectedKarigarIndex].goldOutstanding.toFixed(2)}g</span>}
                      {karigars[selectedKarigarIndex].silverOutstanding > 0 && <span>Silver Balance: {karigars[selectedKarigarIndex].silverOutstanding.toFixed(2)}g</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2"><T>Finished Weight Returned (Grams)</T></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={receiveWeight} 
                        onChange={(e) => setReceiveWeight(e.target.value)}
                        placeholder="e.g. 9.85" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-4 top-3 text-sm text-gray-400 font-bold">g</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5"><T>Scrap Returned (g)</T></label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={receiveScrap} 
                        onChange={(e) => setReceiveScrap(e.target.value)}
                        placeholder="e.g. 0.05" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5"><T>Process Wastage (g)</T></label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={receiveWastage} 
                        onChange={(e) => setReceiveWastage(e.target.value)}
                        placeholder="e.g. 0.10" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button variant="outline" className="w-1/2 rounded-xl py-3 text-sm font-semibold h-11" onClick={() => setIsReceiveModalOpen(false)}><T>Cancel</T></Button>
                    <Button 
                      className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 text-sm font-semibold h-11 shadow-md"
                      onClick={() => {
                        const wt = parseFloat(receiveWeight);
                        const scrap = parseFloat(receiveScrap) || 0;
                        const waste = parseFloat(receiveWastage) || 0;
                        if (isNaN(wt) || wt <= 0) return triggerToast(t("Please enter a valid returned weight"), "error");
                        
                        const totalDeducted = wt + scrap + waste;
                        const isGold = karigars[selectedKarigarIndex!].goldOutstanding > 0;
                        let newGold = bullionGold;
                        let newSilver = bullionSilver;
                        let newKarigars = karigars;

                        if (isGold) {
                          const outstanding = karigars[selectedKarigarIndex!].goldOutstanding;
                          if (totalDeducted > outstanding + 0.1) {
                            return triggerToast(t("Returned gold weight exceeds outstanding gold!"), "error");
                          }
                          newGold = bullionGold + (scrap > 0 ? scrap : 0);
                          newKarigars = karigars.map((k, idx) => {
                            if (idx !== selectedKarigarIndex) return k;
                            const newBalance = Math.max(0, k.goldOutstanding - totalDeducted);
                            return { ...k, goldOutstanding: newBalance, activeJob: newBalance === 0 ? t("No outstanding jobs") : k.activeJob };
                          });
                        } else {
                          const outstanding = karigars[selectedKarigarIndex!].silverOutstanding;
                          if (totalDeducted > outstanding + 0.1) {
                            return triggerToast(t("Returned silver weight exceeds outstanding silver!"), "error");
                          }
                          newSilver = bullionSilver + (scrap > 0 ? scrap : 0);
                          newKarigars = karigars.map((k, idx) => {
                            if (idx !== selectedKarigarIndex) return k;
                            const newBalance = Math.max(0, k.silverOutstanding - totalDeducted);
                            return { ...k, silverOutstanding: newBalance, activeJob: newBalance === 0 ? t("No outstanding jobs") : k.activeJob };
                          });
                        }
                        setBullionGold(newGold);
                        setBullionSilver(newSilver);
                        setKarigars(newKarigars);
                        setIsReceiveModalOpen(false);
                        triggerToast(t(`Received finished piece (${wt}g) successfully from ${karigars[selectedKarigarIndex!].name}.`));
                        persistDashboardKarigar(newGold, newSilver, newKarigars);
                      }}
                    >
                      <T>Confirm Receive</T>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal 3: Adjust Bullion Stock */}
          {isAdjustModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 dark:text-white">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <h3 className="font-bold text-lg"><T>Adjust Bullion Reserves</T></h3>
                  </div>
                  <button className="text-white/80 hover:text-white font-bold text-xl" onClick={() => setIsAdjustModalOpen(false)}>×</button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2"><T>Gold Reserves (g)</T></label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={adjustGoldWeight} 
                        onChange={(e) => setAdjustGoldWeight(e.target.value)}
                        placeholder="e.g. 185.50" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2"><T>Silver Reserves (g)</T></label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={adjustSilverWeight} 
                        onChange={(e) => setAdjustSilverWeight(e.target.value)}
                        placeholder="e.g. 1450.00" 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button variant="outline" className="w-1/2 rounded-xl py-3 text-sm font-semibold h-11" onClick={() => setIsAdjustModalOpen(false)}><T>Cancel</T></Button>
                    <Button 
                      className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 text-sm font-semibold h-11 shadow-md"
                      onClick={() => {
                        const gold = parseFloat(adjustGoldWeight);
                        const silver = parseFloat(adjustSilverWeight);
                        if (isNaN(gold) || gold < 0 || isNaN(silver) || silver < 0) {
                          return triggerToast(t("Please enter valid weight adjustments"), "error");
                        }
                        setBullionGold(gold);
                        setBullionSilver(silver);
                        setIsAdjustModalOpen(false);
                        triggerToast(t("Successfully adjusted bullion inventory stock reserves."));
                        persistDashboardKarigar(gold, silver, karigars);
                      }}
                    >
                      <T>Save Changes</T>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
