'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CreditCard,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { OrderStepper, OrderStatusBadge, type OrderType } from '@/components/orders';

// Currency based on country
const getCurrencySymbol = (country: string) => {
  const symbols: Record<string, string> = {
    NP: 'रू',
    IN: '₹',
    AE: 'د.إ',
    US: '$',
    UK: '£',
  };
  return symbols[country] || 'Rs.';
};

interface OrderDetails {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  detailedStatus: string;
  paymentStatus: string;
  paymentStatusEnum: string;
  paymentMethod?: string;
  totalNpr: number;
  subtotalNpr: number;
  taxNpr: number;
  shippingNpr: number;
  discountNpr: number;
  balanceDueNpr: number;
  bookingFeePaidNpr?: number;
  displayCurrency: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  paidAtShopConfirmed: boolean;
  paidAtShopRequested: boolean;
  productSnapshot: any;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shop?: {
    id: string;
    name: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  milestones?: Array<{
    id: string;
    status: string;
    note: string;
    createdAt: string;
  }>;
  commissionLedger?: {
    id: string;
    status: string;
    amountNpr: number;
    dueAt: string;
  };
}

// Shopkeeper-allowed status transitions - matches DetailedOrderStatus enum
const shopkeeperStatusOptions = [
  'CONFIRMED',
  'IN_PROGRESS',
  'READY',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
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
  const { user } = useAuth();
  const orderId = params.id as string;
  
  // Shop-based currency
  const shopCountry = user?.shop?.country || 'NP';
  const currencySymbol = getCurrencySymbol(shopCountry);
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPaidAtShopDialogOpen, setIsPaidAtShopDialogOpen] = useState(false);
  const [isMarkingPaidAtShop, setIsMarkingPaidAtShop] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/orders/${orderId}`);
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
      await api.patch(`/orders/shop/${orderId}/order-status`, { detailedStatus: newStatus });
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

  const markPaidAtShop = async () => {
    setIsMarkingPaidAtShop(true);
    try {
      await api.post(`/orders/shop/${orderId}/paid-at-shop`, {});
      toast({
        title: 'Payment Recorded',
        description: 'Order marked as paid at shop. A 1% commission will be due in 21 days.',
      });
      setIsPaidAtShopDialogOpen(false);
      loadOrder();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Record Payment',
        description: error.response?.data?.message || 'Could not mark as paid at shop',
      });
    } finally {
      setIsMarkingPaidAtShop(false);
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
              <OrderStatusBadge
                orderType={(order.orderType === 'CUSTOM' ? 'CUSTOM' : 'INVENTORY') as OrderType}
                currentStatus={order.detailedStatus || order.status}
              />
            </div>
          </div>

          {/* Order Progress Stepper */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Order Progress</CardTitle>
              <CardDescription>Track the order through production stages</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderStepper
                orderType={(order.orderType === 'CUSTOM' ? 'CUSTOM' : 'INVENTORY') as OrderType}
                currentStatus={order.detailedStatus || order.status}
                statusHistory={
                  order.milestones?.map((m) => ({
                    status: m.status,
                    timestamp: m.createdAt,
                  })) || []
                }
                orientation="horizontal"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gold-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-gold-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {order.productSnapshot?.jewelleryType?.replace(/_/g, ' ') || order.orderType?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.productSnapshot?.buildMethod?.replace(/_/g, ' ')}
                          </p>
                          {order.productSnapshot?.composition?.baseAlloy && (
                            <p className="text-sm text-muted-foreground">
                              {order.productSnapshot.composition.baseAlloy.metal} {order.productSnapshot.composition.baseAlloy.purity}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{currencySymbol} {order.subtotalNpr?.toLocaleString()}</span>
                    </div>
                    {order.shippingNpr > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{currencySymbol} {order.shippingNpr?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{currencySymbol} {order.taxNpr?.toLocaleString()}</span>
                    </div>
                    {order.discountNpr > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{currencySymbol} {order.discountNpr?.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span className="text-xl">{currencySymbol} {order.totalNpr?.toLocaleString()}</span>
                    </div>
                    {order.bookingFeePaidNpr && order.bookingFeePaidNpr > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Booking Fee Paid</span>
                        <span className="text-green-600">{currencySymbol} {order.bookingFeePaidNpr?.toLocaleString()}</span>
                      </div>
                    )}
                    {order.balanceDueNpr > 0 && (
                      <div className="flex justify-between items-center text-sm font-medium text-orange-600">
                        <span>Balance Due</span>
                        <span>{currencySymbol} {order.balanceDueNpr?.toLocaleString()}</span>
                      </div>
                    )}
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
                  <CardDescription>
                    Move order through production stages
                  </CardDescription>
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
                      {shopkeeperStatusOptions.map((status) => (
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

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED' ? 'default' : 'outline'}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                  {order.paymentMethod && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Method</span>
                      <div className="flex items-center gap-1">
                        {order.paymentMethod === 'PAID_AT_SHOP' ? (
                          <Store className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {order.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Commission Info */}
                  {order.commissionLedger && (
                    <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-2 text-yellow-800 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">Commission Due</span>
                      </div>
                      <div className="text-sm text-yellow-700">
                        <p>Amount: {currencySymbol} {order.commissionLedger.amountNpr?.toFixed(2)}</p>
                        <p>Due: {new Date(order.commissionLedger.dueAt).toLocaleDateString()}</p>
                        <p>Status: {order.commissionLedger.status}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Paid at Shop Button */}
                  {(order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL') && (
                    <Button
                      onClick={() => setIsPaidAtShopDialogOpen(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Mark as Paid at Shop
                    </Button>
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
            </div>
          </div>

          {/* Paid at Shop Dialog */}
          <Dialog open={isPaidAtShopDialogOpen} onOpenChange={setIsPaidAtShopDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Payment at Shop</DialogTitle>
                <DialogDescription>
                  By marking this order as paid at shop, you agree to the following:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Total:</span>
                    <span className="font-bold">Rs. {(order?.totalNpr || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission (1%):</span>
                    <span className="font-medium text-orange-600">
                      Rs. {((order?.totalNpr || 0) * 0.01).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settlement Due:</span>
                    <span className="font-medium">21 days from today</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                  <p className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Important Notice
                  </p>
                  <p className="mt-1">
                    The 1% commission must be settled within 21 days. Failure to pay will result in your shop being placed on hold.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPaidAtShopDialogOpen(false)}
                  disabled={isMarkingPaidAtShop}
                >
                  Cancel
                </Button>
                <Button onClick={markPaidAtShop} disabled={isMarkingPaidAtShop}>
                  {isMarkingPaidAtShop ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
