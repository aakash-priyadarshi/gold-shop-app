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
import { inventoryApi, ordersApi, rfqApi, sellerSubscriptionsApi, shopsApi } from "@/lib/api";
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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

          {/* Admin contact prompt — encourages shopkeepers to message admin@orivraa.com */}
          <AdminMessageBanner />

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

          <div data-tour="dash-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      </DashboardLayout>
    </ShopkeeperGuard>
  );
}
