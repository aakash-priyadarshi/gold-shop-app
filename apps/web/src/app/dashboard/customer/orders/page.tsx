"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MiniOrderStepper, type OrderType } from "@/components/orders";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { CURRENCY_SYMBOLS } from "@/hooks/useMarket";
import api from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Package,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  orderType: "INVENTORY" | "CUSTOM";
  status: string;
  detailedStatus: string;
  totalNpr: number;
  displayCurrency: string;
  createdAt: string;
  shop: {
    id: string;
    shopName: string;
  };
  productSnapshot?: {
    name?: string;
    nameEn?: string;
    jewelleryType?: string;
    metalType?: string;
    images?: string[];
  };
  milestones?: Array<{
    id: string;
    type: string;
    completedAt: string;
  }>;
}

interface PurchaseStats {
  totalOrders: number;
  currencyBreakdown: Array<{
    currency: string;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
  }>;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const t = useT();
  const {
    formatWithConversion,
    convertCurrency,
    selectedCurrency,
    currencySymbol,
  } = useCurrencyConversion();

  useEffect(() => {
    loadOrders();
    loadPurchaseStats();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/orders/my-orders");
      // API returns { orders: [], pagination: {} }
      let ordersArr = response.data?.orders || response.data;
      if (!Array.isArray(ordersArr)) {
        ordersArr = [];
      }
      setOrders(ordersArr);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchaseStats = async () => {
    try {
      const response = await api.get("/orders/my-stats");
      setPurchaseStats(response.data);
    } catch (error) {
      console.error("Failed to load purchase stats:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLACED":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <T>Placed</T>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <T>Confirmed</T>
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            <T>In Progress</T>
          </Badge>
        );
      case "READY":
        return (
          <Badge
            variant="outline"
            className="bg-indigo-50 text-indigo-700 border-indigo-200"
          >
            <T>Ready</T>
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge
            variant="outline"
            className="bg-cyan-50 text-cyan-700 border-cyan-200"
          >
            <T>Shipped</T>
          </Badge>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <Badge
            variant="outline"
            className="bg-teal-50 text-teal-700 border-teal-200"
          >
            <T>Out for Delivery</T>
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Delivered
          </Badge>
        );
      case "CANCELLED":
      case "REFUNDED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            {status === "CANCELLED" ? t("Cancelled") : t("Refunded")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PLACED":
      case "CONFIRMED":
        return <Clock className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Package className="h-4 w-4" />;
      case "READY":
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Truck className="h-4 w-4" />;
      case "DELIVERED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "active")
      return ["PLACED", "CONFIRMED", "IN_PROGRESS", "READY"].includes(
        order.status,
      );
    if (activeTab === "shipped")
      return ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        order.status,
      );
    if (activeTab === "cancelled") return order.status === "CANCELLED";
    return true;
  });

  // Calculate total spent by converting each order to the selected currency
  const totalSpentInSelectedCurrency = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => {
      const orderCurrency = (o.displayCurrency || "NPR") as any;
      const convertedAmount = convertCurrency(
        o.totalNpr || 0,
        orderCurrency,
        selectedCurrency,
      );
      return sum + convertedAmount;
    }, 0);

  const stats = {
    total: orders.length,
    active: orders.filter((o) =>
      ["PLACED", "CONFIRMED", "IN_PROGRESS", "READY"].includes(o.status),
    ).length,
    shipped: orders.filter((o) =>
      ["SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status),
    ).length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    totalSpent: totalSpentInSelectedCurrency,
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold"><T>My Orders</T></h1>
            <p className="text-muted-foreground">
              <T>Track and manage your jewellery orders</T>
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Total Orders</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Active</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.active}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Shipped</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-cyan-600">
                  {stats.shipped}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Delivered</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-green-600">
                  {stats.delivered}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  <T>Total Spent</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {purchaseStats &&
                (purchaseStats.currencyBreakdown?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    {purchaseStats.currencyBreakdown.map((stat) => (
                      <div
                        key={stat.currency}
                        className="flex items-center justify-between"
                      >
                        <span className="text-lg font-bold">
                          {CURRENCY_SYMBOLS[
                            stat.currency as keyof typeof CURRENCY_SYMBOLS
                          ] || stat.currency}
                          {(stat.totalSpent ?? 0).toLocaleString("en", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({stat.orderCount}{" "}
                          {stat.orderCount === 1 ? "order" : "orders"})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {currencySymbol}
                      {(stats.totalSpent ?? 0).toLocaleString("en", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      in {selectedCurrency}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <T>Orders</T>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">{t(`All (${orders.length})`)}</TabsTrigger>
                  <TabsTrigger value="active">
                    {t(`Active (${stats.active})`)}
                  </TabsTrigger>
                  <TabsTrigger value="shipped">
                    {t(`In Transit (${stats.shipped})`)}
                  </TabsTrigger>
                  <TabsTrigger value="cancelled"><T>Cancelled</T></TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2"><T>No orders found</T></h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {activeTab === "all"
                          ? t("You haven't placed any orders yet")
                          : t(`No ${activeTab} orders`)}
                      </p>
                      <Button asChild>
                        <Link href="/dashboard/customer/rfqs/new">
                          <T>Request a Quote</T>
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead><T>Order</T></TableHead>
                          <TableHead><T>Shop</T></TableHead>
                          <TableHead><T>Product</T></TableHead>
                          <TableHead><T>Total</T></TableHead>
                          <TableHead><T>Status</T></TableHead>
                          <TableHead><T>Date</T></TableHead>
                          <TableHead className="text-right"><T>Actions</T></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono font-medium">
                              #{order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span>{order.shop?.shopName || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.productSnapshot?.jewelleryType?.replace(
                                /_/g,
                                " ",
                              ) || order.orderType}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatWithConversion(order.totalNpr || 0, {
                                fromCurrency: (order.displayCurrency ||
                                  "NPR") as any,
                                decimals: 0,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="w-40">
                                <MiniOrderStepper
                                  orderType={
                                    (order.orderType ||
                                      "INVENTORY") as OrderType
                                  }
                                  currentStatus={
                                    order.detailedStatus || order.status
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  href={`/dashboard/customer/orders/${order.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <T>View</T>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
