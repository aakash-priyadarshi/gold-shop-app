'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { OrderStepper, OrderStatusBadge, type OrderType } from '@/components/orders';

interface OrderItem {
  id: string;
  jewelleryType: string;
  metalType: string;
  purity: string;
  weight: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: 'INVENTORY' | 'CUSTOM';
  status: string;
  detailedStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery: string | null;
  trackingNumber: string | null;
  notes: string | null;
  shop: {
    id: string;
    name: string;
    country: string;
    email: string;
    phone: string | null;
  };
  items: OrderItem[];
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
}

const statusSteps = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'SHIPPED', 'DELIVERED'];

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Failed to load order:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load order',
        description: 'Could not fetch order details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">In Progress</Badge>;
      case 'READY':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Ready</Badge>;
      case 'SHIPPED':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Shipped</Badge>;
      case 'DELIVERED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCurrentStep = () => {
    if (!order || order.status === 'CANCELLED') return -1;
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
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <Button asChild>
              <Link href="/dashboard/customer/orders">Back to Orders</Link>
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
                <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
                <OrderStatusBadge
                  orderType={(order.orderType || 'INVENTORY') as OrderType}
                  currentStatus={order.detailedStatus || order.status}
                />
              </div>
              <p className="text-muted-foreground">
                Placed {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Progress Tracker - Using new animated OrderStepper */}
          {order.status !== 'CANCELLED' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Order Progress</CardTitle>
                <CardDescription>Track your order status</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <OrderStepper
                  orderType={(order.orderType || 'INVENTORY') as OrderType}
                  currentStatus={order.detailedStatus || order.status}
                  statusHistory={
                    order.milestones?.map((m) => ({
                      status: m.type,
                      timestamp: m.completedAt,
                    })) || order.statusHistory || []
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
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Metal</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.jewelleryType}
                        </TableCell>
                        <TableCell>
                          {item.metalType} {item.purity}
                        </TableCell>
                        <TableCell>{item.weight}g</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          ${item.totalPrice.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${order.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${order.totalAmount.toLocaleString()}</span>
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
                    Shop Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{order.shop.name}</p>
                    <p className="text-sm text-muted-foreground">{order.shop.country}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.shop.email}</span>
                  </div>
                  {order.shop.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.shop.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Delivery Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.estimatedDelivery && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Delivery</p>
                        <p className="font-medium">
                          {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tracking Number</p>
                      <p className="font-mono">{order.trackingNumber}</p>
                    </div>
                  )}
                  {!order.estimatedDelivery && !order.trackingNumber && (
                    <p className="text-sm text-muted-foreground">
                      Delivery details will be updated once the order is ready to ship.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Order Notes */}
              {order.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
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
