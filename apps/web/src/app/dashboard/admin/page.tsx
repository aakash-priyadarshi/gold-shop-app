"use client";

import { ApiTokenManager } from "@/components/admin/ApiTokenManager";
import { GitHubTokenExpiryAlert } from "@/components/admin/GitHubTokenExpiryAlert";
import { AdminGuard } from "@/components/auth/RouteGuard";
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
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    FileText,
    Globe,
    ShoppingCart,
    Store,
    TrendingUp,
    Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stat {
  title: string;
  value: string | number;
  change: string;
  changeType: "positive" | "negative";
  icon: any;
  description: string;
}

interface CountryData {
  country: string;
  countryName: string;
  users: number;
  shops: number;
  orders: number;
  revenue: number;
  currency: string;
}

interface Verification {
  id: string;
  shopName: string;
  owner: string;
  location: string;
  status: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  user: string;
  time: string;
}

interface TaxStats {
  total: number;
  thisMonth: number;
  last7d: number;
  uniqueShops: number;
  caShares: number;
  byType: { type: string; count: number }[];
  byCountry: { country: string; count: number }[];
}

interface DownloadStats {
  totalAll: number;
  byPlatform: Record<string, { total: number; latest: number; version: string }>;
}

// Country info mapping
const COUNTRY_INFO: Record<string, { name: string; currency: string }> = {
  NP: { name: "Nepal", currency: "NPR" },
  IN: { name: "India", currency: "INR" },
  US: { name: "United States", currency: "USD" },
  UK: { name: "United Kingdom", currency: "GBP" },
  AE: { name: "UAE", currency: "AED" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [countryStats, setCountryStats] = useState<CountryData[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<
    Verification[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [taxStats, setTaxStats] = useState<TaxStats | null>(null);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "year"
  >("month");

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch stats (users, shops, orders, revenue)
        const usersRes = await api.get("/users?page=1&pageSize=1");
        const shopsRes = await api.get("/shops?page=1&pageSize=1");
        const ordersRes = await api.get("/orders?page=1&pageSize=1");

        // Get all shops to compute country data
        const allShopsRes = await api.get("/shops?pageSize=1000");
        const allShops = allShopsRes.data?.shops || allShopsRes.data || [];

        // Get all users to compute country data
        const allUsersRes = await api.get("/users?pageSize=1000");
        const allUsers = allUsersRes.data?.users || allUsersRes.data || [];

        setStats([
          {
            title: "Total Users",
            value: usersRes.data?.meta?.totalCount ?? allUsers.length ?? "—",
            change: "+0%",
            changeType: "positive",
            icon: Users,
            description: "Active users this month",
          },
          {
            title: "Active Shops",
            value: shopsRes.data?.meta?.totalCount ?? allShops.length ?? "—",
            change: "+0%",
            changeType: "positive",
            icon: Store,
            description: "Verified shops",
          },
          {
            title: "Total Orders",
            value: ordersRes.data?.meta?.totalCount ?? "—",
            change: "+0%",
            changeType: "positive",
            icon: ShoppingCart,
            description: "Orders this month",
          },
          {
            title: "Pending Shops",
            value: allShops.filter((s: any) => !s.isVerified).length,
            change: "",
            changeType: "positive",
            icon: AlertCircle,
            description: "Awaiting verification",
          },
        ]);

        // Compute country-wise statistics
        const countryMap = new Map<string, CountryData>();

        // Initialize countries
        for (const country of Object.keys(COUNTRY_INFO)) {
          countryMap.set(country, {
            country,
            countryName: COUNTRY_INFO[country].name,
            users: 0,
            shops: 0,
            orders: 0,
            revenue: 0,
            currency: COUNTRY_INFO[country].currency,
          });
        }

        // Count shops by country
        for (const shop of allShops) {
          const country = shop.country || "NP";
          if (!countryMap.has(country)) {
            countryMap.set(country, {
              country,
              countryName: country,
              users: 0,
              shops: 0,
              orders: 0,
              revenue: 0,
              currency: "USD",
            });
          }
          const data = countryMap.get(country)!;
          data.shops++;
          // Add order count and revenue if available
          if (shop._count?.orders) {
            data.orders += shop._count.orders;
          }
        }

        // Count users by shop location (approximate)
        for (const user of allUsers) {
          if (user.shop?.country) {
            const country = user.shop.country;
            if (countryMap.has(country)) {
              countryMap.get(country)!.users++;
            }
          } else if (user.role === "CUSTOMER") {
            // Default customers to NP if no shop
            countryMap.get("NP")!.users++;
          }
        }

        // Convert to array and sort by shops count
        const countryData = Array.from(countryMap.values())
          .filter((c) => c.shops > 0 || c.users > 0)
          .sort((a, b) => b.shops - a.shops);

        setCountryStats(countryData);

        // Fetch pending verifications
        const verificationsRes = await api.get("/admin/verifications");
        setPendingVerifications(
          (verificationsRes.data?.requests || []).filter(
            (v: any) => v.status === "PENDING",
          ),
        );

        // Fetch recent activity (use reports for now)
        const reportsRes = await api.get("/admin/reports");
        setRecentActivity(
          (reportsRes.data?.reports || []).map((r: any) => ({
            id: r.id,
            type: r.type,
            message: r.reason,
            user: r.reporter?.email || "—",
            time: new Date(r.createdAt).toLocaleString(),
          })),
        );

        // Fetch tax filing stats
        try {
          const taxRes = await api.get("/tax-reports/admin/stats");
          setTaxStats(taxRes.data);
        } catch { /* non-critical */ }

        // Fetch download stats
        try {
          const dlRes = await api.get("/releases/admin/download-stats");
          setDownloadStats(dlRes.data);
        } catch { /* non-critical */ }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [dateRange]);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-4 lg:space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400">
              Welcome back! Here&apos;s what&apos;s happening on the platform.
            </p>
          </div>

          {/* Stats grid - Mobile: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="premium-card">
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-start lg:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {stat.title}
                      </p>
                      <p className="text-lg lg:text-2xl font-bold mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-2 lg:p-3 rounded-xl shrink-0 ${
                        stat.changeType === "positive"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <stat.icon
                        className={`h-4 w-4 lg:h-5 lg:w-5 ${
                          stat.changeType === "positive"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs lg:text-sm">
                    <span
                      className={`flex items-center ${
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.changeType === "positive" ? (
                        <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 lg:h-4 lg:w-4 mr-0.5" />
                      )}
                      {stat.change}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1 lg:ml-2 truncate hidden sm:inline">
                      {stat.description}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Country-wise Analytics */}
          <Card className="premium-card">
            <CardHeader className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Globe className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                    Country-wise Analytics
                  </CardTitle>
                  <CardDescription className="text-xs lg:text-sm">
                    Platform statistics by country
                  </CardDescription>
                </div>
                <Select
                  value={dateRange}
                  onValueChange={(v) => setDateRange(v as typeof dateRange)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
              {countryStats.length > 0 ? (
                <div className="space-y-3">
                  {countryStats.map((country) => (
                    <div
                      key={country.country}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-7 flex items-center justify-center">
                          <FlagImage
                            code={country.country as FlagCode}
                            size={32}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{country.countryName}</p>
                          <p className="text-sm text-muted-foreground">
                            {country.currency}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
                        <div>
                          <p className="text-lg font-bold text-blue-600">
                            {country.users}
                          </p>
                          <p className="text-xs text-muted-foreground">Users</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-600">
                            {country.shops}
                          </p>
                          <p className="text-xs text-muted-foreground">Shops</p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-lg font-bold text-green-600">
                            {country.orders}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Orders
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-lg font-bold text-purple-600">
                            {country.revenue > 0
                              ? country.revenue.toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revenue
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No country data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Two column layout - Stack on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Pending Verifications */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between p-4 lg:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
                    Pending Verifications
                  </CardTitle>
                  <CardDescription className="text-xs lg:text-sm">
                    Shops awaiting verification
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {pendingVerifications.length} pending
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-3">
                  {pendingVerifications.map((shop) => (
                    <div
                      key={shop.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm lg:text-base truncate">
                          {shop.shopName}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {shop.owner} • {shop.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs lg:text-sm rounded-lg"
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs lg:text-sm rounded-lg bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingVerifications.length === 0 && (
                    <div className="empty-state py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No pending verifications
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="link" className="w-full mt-4 text-sm">
                  View all pending verifications →
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="premium-card">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  Latest platform activity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          activity.type === "user_registered"
                            ? "bg-blue-100"
                            : activity.type === "shop_verified"
                              ? "bg-green-100"
                              : activity.type === "order_completed"
                                ? "bg-purple-100"
                                : "bg-orange-100"
                        }`}
                      >
                        {activity.type === "user_registered" ? (
                          <Users className="h-4 w-4 text-blue-600" />
                        ) : activity.type === "shop_verified" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : activity.type === "order_completed" ? (
                          <ShoppingCart className="h-4 w-4 text-purple-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs lg:text-sm font-medium truncate">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activity.user}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="empty-state py-8">
                      <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No recent activity
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="link" className="w-full mt-4 text-sm">
                  View all activity →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tax Filing Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="premium-card">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-500" />
                  Tax Filing Usage
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  GSTR, VAT, MTD, OSS — all export events
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                {taxStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <p className="text-xl font-bold text-emerald-600">{taxStats.thisMonth}</p>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-xl font-bold text-blue-600">{taxStats.uniqueShops}</p>
                        <p className="text-xs text-muted-foreground">Active shops</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-xl font-bold text-purple-600">{taxStats.caShares}</p>
                        <p className="text-xs text-muted-foreground">CA shares</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Top export types</p>
                      <div className="space-y-1">
                        {taxStats.byType.slice(0, 5).map((t) => (
                          <div key={t.type} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.type}</span>
                            <span className="font-medium">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{taxStats.total} total exports all time</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">No tax export data yet</div>
                )}
              </CardContent>
            </Card>

            {/* Desktop Download Stats */}
            <Card className="premium-card">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Download className="h-4 w-4 lg:h-5 lg:w-5 text-sky-500" />
                  Desktop Downloads
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  Tracked clicks on the /download page
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                {downloadStats ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                      <p className="text-3xl font-bold text-sky-600">{downloadStats.totalAll.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total downloads tracked</p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(downloadStats.byPlatform).map(([platform, data]) => (
                        <div key={platform} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium">
                              {platform === "WINDOWS" ? "🪟" : platform === "MACOS" ? "🍎" : "🐧"} {platform}
                            </span>
                            {data.version && <span className="ml-2 text-xs text-muted-foreground">v{data.version}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm">{data.total.toLocaleString()}</span>
                            {data.latest !== data.total && (
                              <p className="text-xs text-muted-foreground">{data.latest} for latest</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">No download data yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - 2 cols on mobile, 4 on desktop */}
          <Card className="premium-card">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-base lg:text-lg">
                Quick Actions
              </CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Link href="/dashboard/admin/users">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target"
                  >
                    <Users className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-xs lg:text-sm">Manage Users</span>
                  </Button>
                </Link>
                <Link href="/dashboard/admin/shops">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target"
                  >
                    <Store className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-xs lg:text-sm">Manage Shops</span>
                  </Button>
                </Link>
                <Link href="/dashboard/admin/reports">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target"
                  >
                    <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-xs lg:text-sm">View Reports</span>
                  </Button>
                </Link>
                <Link href="/dashboard/admin/analytics">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target"
                  >
                    <Activity className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-xs lg:text-sm">Analytics</span>
                  </Button>
                </Link>
                <Link href="/dashboard/admin/settings/market">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target"
                  >
                    <DollarSign className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-xs lg:text-sm">Price Settings</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Token Expiry Alert (shows only when expiring/expired) */}
          <GitHubTokenExpiryAlert />

          {/* API Token Management */}
          <ApiTokenManager />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
