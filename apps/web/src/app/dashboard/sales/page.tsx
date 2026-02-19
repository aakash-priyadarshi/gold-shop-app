"use client";

import { SalesGuard } from "@/components/auth/RouteGuard";
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
import api from "@/lib/api";
import { Clock, MessageSquare, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SalesStats {
  totalShops: number;
  activeShops: number;
  totalOrders: number;
  pendingOrders: number;
  recentConversations: number;
}

export default function SalesDashboardPage() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [shopsRes, ordersRes] = await Promise.allSettled([
        api.get("/shops?limit=1"),
        api.get("/orders/admin/all?limit=5&sortBy=createdAt&sortOrder=desc"),
      ]);

      const shopData =
        shopsRes.status === "fulfilled" ? shopsRes.value.data : null;
      const orderData =
        ordersRes.status === "fulfilled" ? ordersRes.value.data : null;

      setStats({
        totalShops: shopData?.pagination?.total || 0,
        activeShops: shopData?.pagination?.total || 0,
        totalOrders: orderData?.pagination?.total || 0,
        pendingOrders:
          orderData?.data?.filter(
            (o: any) => o.status === "PENDING" || o.status === "CONFIRMED",
          )?.length || 0,
        recentConversations: 0,
      });

      setRecentOrders(orderData?.data?.slice(0, 5) || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          title: "Total Shops",
          value: stats.totalShops,
          icon: Store,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950/30",
          href: "/dashboard/sales/shops",
        },
        {
          title: "Total Orders",
          value: stats.totalOrders,
          icon: ShoppingCart,
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-950/30",
          href: "/dashboard/sales/orders",
        },
        {
          title: "Pending Orders",
          value: stats.pendingOrders,
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-50 dark:bg-yellow-950/30",
          href: "/dashboard/sales/orders",
        },
        {
          title: "Messages",
          value: stats.recentConversations,
          icon: MessageSquare,
          color: "text-purple-600",
          bg: "bg-purple-50 dark:bg-purple-950/30",
          href: "/dashboard/sales/messages",
        },
      ]
    : [];

  return (
    <SalesGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Sales Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Overview of shops, orders, and customer interactions
            </p>
          </div>

          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-16 bg-gray-200 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Link key={stat.title} href={stat.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bg}`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common sales tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/sales/shops">
                  <Button variant="outline" className="w-full justify-start">
                    <Store className="w-4 h-4 mr-2" />
                    View Shops & CRM
                  </Button>
                </Link>
                <Link href="/dashboard/sales/orders">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Manage Orders
                  </Button>
                </Link>
                <Link href="/dashboard/sales/messages">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    View Messages
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <CardDescription>Latest order activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No recent orders
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {order.orderNumber || order.id.slice(0, 8)}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {order.shop?.shopName || "Unknown Shop"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              order.status === "DELIVERED"
                                ? "default"
                                : order.status === "PENDING"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {order.displayCurrency || "NPR"}{" "}
                            {order.totalNpr?.toLocaleString() ||
                              order.totalAmount?.toLocaleString() ||
                              "0"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </SalesGuard>
  );
}
