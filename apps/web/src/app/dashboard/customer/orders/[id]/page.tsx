"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  OrderStatusBadge,
  OrderStepper,
  type OrderType,
} from "@/components/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import api from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  Package,
  Phone,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: "INVENTORY" | "CUSTOM";
  status: string;
  detailedStatus: string;
  totalNpr: number;
  subtotalNpr: number;
  taxNpr: number;
  shippingNpr: number;
  discountNpr: number;
  displayCurrency?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery: string | null;
  trackingNumber: string | null;
  notes: string | null;
  shop: {
    id: string;
    shopName: string;
    userId?: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  productSnapshot: {
    nameEn?: string;
    nameNe?: string;
    jewelleryType?: string;
    composition?: {
      baseAlloy?: {
        metal: string;
        purity: string;
      };
    };
    totalWeightGrams?: number;
    quantity?: number;
    images?: string[];
    referenceImages?: string[];
    sku?: string;
    buildMethod?: string;
  };
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note: string | null;
  }>;
  milestones?: Array<{
    id: string;
    type: string;
    completedAt: string;
  }>;
  shippingAddress?: {
    fullName?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
}

const statusSteps = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY",
  "SHIPPED",
  "DELIVERED",
];

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const t = useT();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { formatWithConversion, selectedCurrency, currencySymbol } =
    useCurrencyConversion();

  useEffect(() => {
    if (params.id) {
      loadOrder();
    }
  }, [params.id]);

  const loadOrder = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/orders/${params.id}`);
      setOrder(response.data);
    } catch (error) {
      console.error("Failed to load order:", error);
      toast({
        variant: "destructive",
        title: "Failed to load order",
        description: "Could not fetch order details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <T>Pending</T>
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
      case "DELIVERED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <T>Delivered</T>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <T>Cancelled</T>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCurrentStep = () => {
    if (!order || order.status === "CANCELLED") return -1;
    return statusSteps.indexOf(order.status);
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

  if (!order) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2"><T>Order Not Found</T></h2>
            <Button asChild>
              <Link href="/dashboard/customer/orders"><T>Back to Orders</T></Link>
            </Button>
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/customer/orders">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {t(`Order #${order.orderNumber}`)}
                </h1>
                <OrderStatusBadge
                  orderType={(order.orderType || "INVENTORY") as OrderType}
                  currentStatus={order.detailedStatus || order.status}
                />
              </div>
              <p className="text-muted-foreground">
                {t(`Placed ${new Date(order.createdAt).toLocaleDateString()}`)}
              </p>
            </div>
          </div>

          {/* Progress Tracker - Using new animated OrderStepper */}
          {order.status !== "CANCELLED" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle><T>Order Progress</T></CardTitle>
                <CardDescription><T>Track your order status</T></CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <OrderStepper
                  orderType={(order.orderType || "INVENTORY") as OrderType}
                  currentStatus={order.detailedStatus || order.status}
                  statusHistory={
                    order.milestones?.map((m) => ({
                      status: m.type,
                      timestamp: m.completedAt,
                    })) ||
                    order.statusHistory ||
                    []
                  }
                  orientation="horizontal"
                />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <T>Order Details</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Product Info */}
                <div className="flex gap-4 mb-6">
                  {(order.productSnapshot?.images?.[0] ||
                    order.productSnapshot?.referenceImages?.[0]) && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={
                          order.productSnapshot.images?.[0] ||
                          order.productSnapshot.referenceImages?.[0]
                        }
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">
                      {order.productSnapshot?.nameEn ||
                        order.productSnapshot?.jewelleryType?.replace(
                          /_/g,
                          " ",
                        ) ||
                        "Order Item"}
                    </h3>
                    {order.productSnapshot?.composition?.baseAlloy && (
                      <p className="text-sm text-muted-foreground">
                        {order.productSnapshot.composition.baseAlloy.metal}{" "}
                        {order.productSnapshot.composition.baseAlloy.purity}
                      </p>
                    )}
                    {order.productSnapshot?.totalWeightGrams && (
                      <p className="text-sm text-muted-foreground">
                        {t(`Weight: ${order.productSnapshot.totalWeightGrams}g`)}
                      </p>
                    )}
                    {order.productSnapshot?.quantity && (
                      <p className="text-sm text-muted-foreground">
                        {t(`Quantity: ${order.productSnapshot.quantity}`)}
                      </p>
                    )}
                    {order.productSnapshot?.sku && (
                      <p className="text-sm text-muted-foreground">
                        {t(`SKU: ${order.productSnapshot.sku}`)}
                      </p>
                    )}
                    {order.productSnapshot?.buildMethod && (
                      <p className="text-sm text-muted-foreground">
                        {t(`Build: ${order.productSnapshot.buildMethod.replace(/_/g, " ")}`)}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Price Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground"><T>Subtotal</T></span>
                      <span>
                        {formatWithConversion(
                          order.subtotalNpr || order.totalNpr || 0,
                          {
                            fromCurrency: (order.displayCurrency ||
                              "NPR") as any,
                          },
                        )}
                      </span>
                    </div>
                    {order.taxNpr > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground"><T>Tax</T></span>
                        <span>
                          {formatWithConversion(order.taxNpr, {
                            fromCurrency: (order.displayCurrency ||
                              "NPR") as any,
                          })}
                        </span>
                      </div>
                    )}
                    {order.shippingNpr > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground"><T>Shipping</T></span>
                        <span>
                          {formatWithConversion(order.shippingNpr, {
                            fromCurrency: (order.displayCurrency ||
                              "NPR") as any,
                          })}
                        </span>
                      </div>
                    )}
                    {order.discountNpr > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span><T>Discount</T></span>
                        <span>
                          -
                          {formatWithConversion(order.discountNpr, {
                            fromCurrency: (order.displayCurrency ||
                              "NPR") as any,
                          })}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span><T>Total</T></span>
                      <span>
                        {formatWithConversion(order.totalNpr || 0, {
                          fromCurrency: (order.displayCurrency || "NPR") as any,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shop & Delivery Info */}
            <div className="space-y-6">
              {/* Shop Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    <T>Shop Details</T>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">
                      {order.shop?.shopName || "Shop"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              {order.shippingAddress &&
                Object.keys(order.shippingAddress).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <T>Shipping Address</T>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {order.shippingAddress.fullName && (
                        <p className="font-medium">
                          {order.shippingAddress.fullName}
                        </p>
                      )}
                      {order.shippingAddress.street && (
                        <p>{order.shippingAddress.street}</p>
                      )}
                      {(order.shippingAddress.city ||
                        order.shippingAddress.state ||
                        order.shippingAddress.postalCode) && (
                        <p>
                          {order.shippingAddress.city}
                          {order.shippingAddress.state
                            ? `, ${order.shippingAddress.state}`
                            : ""}{" "}
                          {order.shippingAddress.postalCode}
                        </p>
                      )}
                      {order.shippingAddress.country && (
                        <p>{order.shippingAddress.country}</p>
                      )}
                      {order.shippingAddress.phone && (
                        <p className="flex items-center gap-1 mt-2">
                          <Phone className="h-3 w-3" />{" "}
                          {order.shippingAddress.phone}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    <T>Delivery Info</T>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.estimatedDelivery && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <T>Est. Delivery</T>
                        </p>
                        <p className="font-medium">
                          {new Date(
                            order.estimatedDelivery,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Tracking Number</T>
                      </p>
                      <p className="font-mono">{order.trackingNumber}</p>
                    </div>
                  )}
                  {!order.estimatedDelivery && !order.trackingNumber && (
                    <p className="text-sm text-muted-foreground">
                      <T>Delivery details will be updated once the order is ready
                      to ship.</T>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Order Notes */}
              {order.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle><T>Notes</T></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{order.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
