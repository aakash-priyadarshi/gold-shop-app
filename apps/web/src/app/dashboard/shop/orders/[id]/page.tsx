'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Truck,
  DollarSign,
  Loader2,
  Calendar,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  milestones?: Array<{
    id: string;
    status: string;
    note: string;
    createdAt: string;
  }>;
}

const statusOptions = [
  'PAYMENT_PENDING',
  'PAID',
  'IN_PRODUCTION',
  'QC_PENDING',
  'QC_PASSED',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
];

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-blue-100 text-blue-700',
  IN_PRODUCTION: 'bg-purple-100 text-purple-700',
  QC_PENDING: 'bg-orange-100 text-orange-700',
  QC_PASSED: 'bg-teal-100 text-teal-700',
  READY_TO_SHIP: 'bg-cyan-100 text-cyan-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function ShopOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/orders/${orderId}`);
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

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus.replace(/_/g, ' ')}`,
      });
      loadOrder();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.response?.data?.message || 'Could not update status',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
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

  if (!order) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">Order Not Found</h2>
            <p className="text-muted-foreground">The order you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Order #{order.orderNumber || order.id.slice(0, 8)}
                </h1>
                <p className="text-muted-foreground">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                {order.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items?.length > 0 ? (
                      order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gold-100 rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-gold-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.totalPrice, order.currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.unitPrice, order.currency)} each
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No items in this order
                      </p>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(order.milestones?.length ?? 0) > 0 ? (
                      order.milestones!.map((milestone, index) => (
                        <div key={milestone.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            {index < order.milestones!.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium">{milestone.status.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">{milestone.note}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(milestone.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Order Created</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Update Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={order.status}
                    onValueChange={updateStatus}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isUpdating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {order.customer.email}
                    </div>
                    {order.customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {order.customer.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p>{order.shippingAddress.street}</p>
                        <p>
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postalCode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'outline'}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
