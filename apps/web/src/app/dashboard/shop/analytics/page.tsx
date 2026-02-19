"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import {
  BarChart3,
  DollarSign,
  Loader2,
  Package,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    if (user?.shop?.id) {
      loadAnalytics();
    }
  }, [user?.shop?.id, period]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await shopsApi.getAnalytics({ period });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast({
        variant: "destructive",
        title: "Failed to load analytics",
        description: "Could not fetch analytics data",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-muted-foreground">
                Track your shop's performance and growth
              </p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
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
                    {formatPercent(analytics.revenue.changePercent)} from
                    previous period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.orders?.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.orders?.completed || 0} completed,{" "}
                  {analytics?.orders?.pending || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  RFQ Win Rate
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.rfqs?.winRate || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.rfqs?.won || 0} won of{" "}
                  {analytics?.rfqs?.responded || 0} responses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Rating
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  {(analytics?.customerStats?.averageRating || 0).toFixed(1)}
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.customerStats?.totalReviews || 0} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="rfqs">RFQs</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        From Direct Orders
                      </span>
                      <span className="font-medium">
                        {formatCurrency(analytics?.revenue?.fromOrders || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        From Custom Orders (RFQs)
                      </span>
                      <span className="font-medium">
                        {formatCurrency(
                          analytics?.revenue?.fromCustomOrders || 0,
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span>
                        {formatCurrency(analytics?.revenue?.total || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Order Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(analytics?.orders?.averageValue || 0)}
                    </div>
                    <p className="text-muted-foreground mt-2">
                      Per order average in the selected period
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
                      <p className="text-muted-foreground">Total Orders</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics?.orders?.completed || 0}
                      </div>
                      <p className="text-muted-foreground">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">
                        {analytics?.orders?.pending || 0}
                      </div>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {analytics?.orders?.cancelled || 0}
                      </div>
                      <p className="text-muted-foreground">Cancelled</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="rfqs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>RFQ Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Requests Received
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.received || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Responses Sent
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.responded || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Contracts Won
                      </span>
                      <span className="font-medium">
                        {analytics?.rfqs?.won || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Rates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">
                          Response Rate
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
                        <span className="text-muted-foreground">Win Rate</span>
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
                      <p className="text-muted-foreground">New Customers</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics?.customerStats?.repeatCustomers || 0}
                      </div>
                      <p className="text-muted-foreground">Repeat Customers</p>
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
                        Average Rating (
                        {analytics?.customerStats?.totalReviews || 0} reviews)
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
