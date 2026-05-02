"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MiniOrderStepper, type OrderType } from "@/components/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  orderType: "INVENTORY" | "CUSTOM";
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  totalNpr: number;
  displayCurrency: string;
  status: string;
  detailedStatus: string;
  paymentStatusEnum: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-700",
  PAYMENT_PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  IN_PRODUCTION: "bg-purple-100 text-purple-700",
  QC_PENDING: "bg-orange-100 text-orange-700",
  QC_PASSED: "bg-teal-100 text-teal-700",
  READY_TO_SHIP: "bg-cyan-100 text-cyan-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ShopOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const t = useT();

  useEffect(() => {
    if (user?.shop?.id) {
      loadOrders();
    }
  }, [user?.shop?.id, statusFilter]);

  const loadOrders = async () => {
    if (!user?.shop?.id) return;
    setIsLoading(true);
    try {
      const params: any = { page: 1, pageSize: 50 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await ordersApi.getShopOrders(user.shop.id, params);
      let ordersArr =
        response.data?.items || response.data?.orders || response.data || [];
      if (!Array.isArray(ordersArr)) {
        ordersArr = [];
      }
      setOrders(ordersArr);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast({
        variant: "destructive",
        title: "Failed to load orders",
        description: "Could not fetch order data",
      });
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return <Clock className="h-3 w-3" />;
      case "PAID":
      case "IN_PRODUCTION":
        return <Package className="h-3 w-3" />;
      case "SHIPPED":
        return <Truck className="h-3 w-3" />;
      case "DELIVERED":
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Orders</T>
              </h1>
              <p className="text-muted-foreground">
                <T>Manage and track customer orders</T>
              </p>
            </div>
            <div data-tour="orders-filters">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("Filter by status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <T>All Orders</T>
                </SelectItem>
                <SelectItem value="PAYMENT_PENDING">
                  <T>Payment Pending</T>
                </SelectItem>
                <SelectItem value="PAID">
                  <T>Paid</T>
                </SelectItem>
                <SelectItem value="IN_PRODUCTION">
                  <T>In Production</T>
                </SelectItem>
                <SelectItem value="SHIPPED">
                  <T>Shipped</T>
                </SelectItem>
                <SelectItem value="DELIVERED">
                  <T>Delivered</T>
                </SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>

          <Card data-tour="orders-table">
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    <T>No orders found</T>
                  </p>
                  <p className="text-sm">
                    <T>Orders will appear here when customers place them</T>
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <T>Order</T>
                      </TableHead>
                      <TableHead>
                        <T>Customer</T>
                      </TableHead>
                      <TableHead>
                        <T>Amount</T>
                      </TableHead>
                      <TableHead>
                        <T>Status</T>
                      </TableHead>
                      <TableHead>
                        <T>Payment</T>
                      </TableHead>
                      <TableHead>
                        <T>Date</T>
                      </TableHead>
                      <TableHead>
                        <T>Actions</T>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {order.customer?.firstName}{" "}
                              {order.customer?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.customer?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(
                                order.totalNpr,
                                order.displayCurrency || "NPR",
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <MiniOrderStepper
                              orderType={
                                (order.orderType || "INVENTORY") as OrderType
                              }
                              currentStatus={
                                order.detailedStatus || order.status
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.paymentStatusEnum === "PAID"
                                ? "default"
                                : "outline"
                            }
                          >
                            {order.paymentStatusEnum || "UNPAID"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/shop/orders/${order.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              <T>View</T>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
