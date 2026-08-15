"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { shopsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  BarChart3,
  DollarSign,
  Loader2,
  Package,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
  period: string;
  revenue: {
    total: number;
    fromOrders: number;
    fromCustomOrders: number;
    previousPeriod?: number;
    changePercent?: number;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    averageValue: number;
  };
  rfqs: {
    received: number;
    responded: number;
    won: number;
    responseRate: number;
    winRate: number;
  };
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  customerStats: {
    newCustomers: number;
    repeatCustomers: number;
    averageRating: number;
    totalReviews: number;
  };
}

export default function ShopAnalyticsPage() {
  const t = useT();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await shopsApi.getAnalytics({ period });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast({
        variant: "destructive",
        title: t("Failed to load analytics"),
        description: t("Could not fetch analytics data"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    if (user?.shop?.id) {
      void loadAnalytics();
    }
  }, [loadAnalytics, user?.shop?.id]);

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Analytics</T>
              </h1>
              <p className="text-muted-foreground">
                <T>Track your shop&apos;s performance and growth</T>
              </p>
            </div>
            <Select
              value={period}
              onValueChange={setPeriod}
              data-tour="analytics-period"
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">
                  <T>Last 7 days</T>
                </SelectItem>
                <SelectItem value="30d">
                  <T>Last 30 days</T>
                </SelectItem>
                <SelectItem value="90d">
                  <T>Last 90 days</T>
                </SelectItem>
                <SelectItem value="1y">
                  <T>Last year</T>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Key Metrics */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            data-tour="analytics-stats"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <T>Total Revenue</T>
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.revenue?.total || 0)}
                </div>
                {analytics?.revenue?.changePercent !== undefined && (
                  <p
                    className={`text-xs flex items-center gap-1 ${
                      analytics.revenue.changePercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {analytics.revenue.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <bdi>{formatPercent(analytics.revenue.changePercent)}</bdi>{" "}
                    <T>from previous period</T>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <T>Total Orders</T>
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.orders?.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  <bdi>{analytics?.orders?.completed || 0}</bdi>{" "}
                  <T>completed</T>, <bdi>{analytics?.orders?.pending || 0}</bdi>{" "}
                  <T>pending</T>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <T>RFQ Win Rate</T>
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.rfqs?.winRate || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  <bdi>{analytics?.rfqs?.won || 0}</bdi> <T>won of</T>{" "}
                  <bdi>{analytics?.rfqs?.responded || 0}</bdi> <T>responses</T>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <T>Avg. Rating</T>
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  {(analytics?.customerStats?.averageRating || 0).toFixed(1)}
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground">
                  <bdi>{analytics?.customerStats?.totalReviews || 0}</bdi>{" "}
                  <T>reviews</T>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs
            defaultValue="revenue"
            className="space-y-4"
            data-tour="analytics-tabs"
          >
            <TabsList>
              <TabsTrigger value="revenue">
                <T>Revenue</T>
              </TabsTrigger>
              <TabsTrigger value="orders">
                <T>Orders</T>
              </TabsTrigger>
              <TabsTrigger value="rfqs">
                <T>RFQs</T>
              </TabsTrigger>
              <TabsTrigger value="customers">
                <T>Customers</T>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Revenue Breakdown</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        <T>From Direct Orders</T>
                      </span>
                      <span className="font-medium">
                        {formatCurrency(analytics?.revenue?.fromOrders || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        <T>From Custom Orders (RFQs)</T>
                      </span>
                      <span className="font-medium">
                        {formatCurrency(
                          analytics?.revenue?.fromCustomOrders || 0,
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>
                        <T>Total</T>
                      </span>
                      <span>
                        {formatCurrency(analytics?.revenue?.total || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Average Order Value</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(analytics?.orders?.averageValue || 0)}
                    </div>
                    <p className="text-muted-foreground mt-2">
                      <T>Per order average in the selected period</T>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics?.orders?.total || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>Total Orders</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics?.orders?.completed || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>Completed</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">
                        {analytics?.orders?.pending || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>Pending</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {analytics?.orders?.cancelled || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>Cancelled</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="rfqs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>RFQ Performance</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        <T>Requests Received</T>
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.received || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        <T>Responses Sent</T>
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.responded || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        <T>Contracts Won</T>
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.won || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Conversion Rates</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">
                          <T>Response Rate</T>
                        </span>
                        <span className="font-medium">
                          {(analytics?.rfqs?.responseRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${analytics?.rfqs?.responseRate || 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">
                          <T>Win Rate</T>
                        </span>
                        <span className="font-medium">
                          {(analytics?.rfqs?.winRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${analytics?.rfqs?.winRate || 0}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics?.customerStats?.newCustomers || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>New Customers</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics?.customerStats?.repeatCustomers || 0}
                      </div>
                      <p className="text-muted-foreground">
                        <T>Repeat Customers</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold flex items-center justify-center gap-1">
                        {(analytics?.customerStats?.averageRating || 0).toFixed(
                          1,
                        )}
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      </div>
                      <p className="text-muted-foreground">
                        <T>Average Rating</T> (
                        <bdi>{analytics?.customerStats?.totalReviews || 0}</bdi>{" "}
                        <T>reviews</T>)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
