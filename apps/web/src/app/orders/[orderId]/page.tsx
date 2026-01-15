'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  TruckIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Loader2, Package, Store, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi } from '@/lib/api';
import { usePreferencesStore, CURRENCIES } from '@/store/preferences';
import { 
  OrderStepper, 
  OrderStatusBadge,
  type OrderType as OrderTypeEnum,
} from '@/components/orders';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderDetails {
  id: string;
  orderNumber: string;
  orderType: 'INVENTORY' | 'CUSTOM';
  status: string;
  detailedStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAtShopRequested: boolean;
  paidAtShopConfirmed: boolean;
  subtotalNpr: number;
  taxNpr: number;
  shippingNpr: number;
  discountNpr: number;
  totalNpr: number;
  balanceDueNpr: number;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
  updatedAt: string;
  productSnapshot: {
    name?: string;
    nameEn?: string;
    sku?: string;
    jewelleryType?: string;
    buildMethod?: string;
    images?: string[];
    referenceImages?: string[];
    quantity?: number;
  };
  shippingAddress: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  shop: {
    id: string;
    shopName: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    completedAt: string;
    evidenceUrls: string[];
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER TRACKING PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Currency from preferences
  const { currency } = usePreferencesStore();
  const currencyInfo = CURRENCIES[currency];

  // State
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated || !orderId) return;

      try {
        setLoading(true);
        const response = await ordersApi.getById(orderId);
        setOrder(response.data);
      } catch (err: unknown) {
        const error = err as { response?: { status?: number; data?: { message?: string } } };
        if (error.response?.status === 404) {
          setError('Order not found');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to view this order');
        } else {
          setError(error.response?.data?.message || 'Failed to load order');
        }
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchOrder();
    }
  }, [orderId, isAuthenticated, mounted]);

  // Format price
  const formatPrice = (priceNpr: number) => {
    if (!mounted) {
      return new Intl.NumberFormat('ne-NP', {
        style: 'currency',
        currency: 'NPR',
        minimumFractionDigits: 0,
      }).format(priceNpr);
    }
    
    return new Intl.NumberFormat(currencyInfo?.locale || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(priceNpr);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'PENDING':
      case 'PENDING_AT_SHOP':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Loading state
  if (authLoading || !mounted || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    router.push(`/auth?redirect=/orders/${orderId}`);
    return null;
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircleIcon className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="text-red-700 dark:text-red-400">
                {error || 'Order Not Found'}
              </CardTitle>
              <CardDescription>
                {error === 'You do not have permission to view this order'
                  ? 'This order belongs to another user.'
                  : 'The order you are looking for does not exist or has been removed.'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button asChild>
                <Link href="/dashboard/customer">View My Orders</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Get product name
  const productName = order.productSnapshot.name || 
    order.productSnapshot.nameEn || 
    order.productSnapshot.jewelleryType || 
    'Custom Jewellery';

  // Build status history from milestones
  const statusHistory = order.milestones.map((m) => ({
    status: m.type,
    timestamp: m.completedAt,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order header */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                    <CardTitle className="text-xl font-mono">{order.orderNumber}</CardTitle>
                  </div>
                  <OrderStatusBadge 
                    orderType={order.orderType as OrderTypeEnum}
                    currentStatus={order.detailedStatus}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Placed on {formatDate(order.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{order.orderType.toLowerCase()} Order</span>
                </div>
              </CardHeader>
            </Card>

            {/* Order Status Stepper */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Progress</CardTitle>
                <CardDescription>
                  Track your order status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderStepper
                  orderType={order.orderType as OrderTypeEnum}
                  currentStatus={order.detailedStatus}
                  statusHistory={statusHistory}
                  orientation="horizontal"
                />
              </CardContent>
            </Card>

            {/* Tabs for details */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
              </TabsList>

              {/* Details tab */}
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Product info */}
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                        {(order.productSnapshot.images?.[0] || order.productSnapshot.referenceImages?.[0]) ? (
                          <img
                            src={order.productSnapshot.images?.[0] || order.productSnapshot.referenceImages?.[0]}
                            alt={productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{productName}</h3>
                        {order.productSnapshot.sku && (
                          <p className="text-sm text-gray-500">SKU: {order.productSnapshot.sku}</p>
                        )}
                        {order.productSnapshot.quantity && (
                          <p className="text-sm text-gray-500">Qty: {order.productSnapshot.quantity}</p>
                        )}
                        {order.productSnapshot.buildMethod && (
                          <Badge variant="secondary" className="mt-1">
                            {order.productSnapshot.buildMethod}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Shop info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <Store className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sold by</p>
                        <p className="font-medium">{order.shop.shopName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline tab */}
              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.milestones.length > 0 ? (
                      <div className="space-y-4">
                        {order.milestones.map((milestone, index) => (
                          <div key={milestone.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-amber-500 rounded-full" />
                              {index < order.milestones.length - 1 && (
                                <div className="w-0.5 h-full bg-amber-200 dark:bg-amber-800 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium">{milestone.title}</p>
                              {milestone.description && (
                                <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDateTime(milestone.completedAt)}
                              </p>
                              {milestone.evidenceUrls.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {milestone.evidenceUrls.map((url, i) => (
                                    <img
                                      key={i}
                                      src={url}
                                      alt={`Evidence ${i + 1}`}
                                      className="w-16 h-16 object-cover rounded border"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No timeline updates yet</p>
                        <p className="text-sm">Updates will appear here as your order progresses</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Delivery tab */}
              <TabsContent value="delivery">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Shipping address */}
                    {order.shippingAddress.fullName && (
                      <div className="flex gap-3">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{order.shippingAddress.fullName}</p>
                          <p className="text-sm text-gray-500">
                            {order.shippingAddress.addressLine1}
                            {order.shippingAddress.addressLine2 && (
                              <>, {order.shippingAddress.addressLine2}</>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.shippingAddress.country}
                          </p>
                          {order.shippingAddress.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <PhoneIcon className="h-4 w-4" />
                              {order.shippingAddress.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Tracking info */}
                    <div className="flex gap-3">
                      <TruckIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">Tracking</p>
                        {order.trackingNumber ? (
                          <p className="text-sm font-mono">{order.trackingNumber}</p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Tracking information will be available once your order ships
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery estimate */}
                    {order.estimatedDelivery && (
                      <div className="flex gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Estimated Delivery</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(order.estimatedDelivery)}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.actualDelivery && (
                      <div className="flex gap-3">
                        <CheckCircleIcon className="h-5 w-5 text-emerald-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-emerald-600">Delivered</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(order.actualDelivery)}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Payment & Summary */}
          <div className="space-y-6">
            {/* Payment info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                    {order.paidAtShopRequested ? 'Pay at Shop' : order.paymentStatus}
                  </Badge>
                </div>

                {order.paidAtShopRequested && !order.paidAtShopConfirmed && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                          Payment Pending at Shop
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Please visit {order.shop.shopName} to complete your payment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {order.paymentMethod && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Method</span>
                    <span className="capitalize">{order.paymentMethod.toLowerCase().replace('_', ' ')}</span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(order.subtotalNpr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax</span>
                    <span>{formatPrice(order.taxNpr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span>{order.shippingNpr === 0 ? 'Free' : formatPrice(order.shippingNpr)}</span>
                  </div>
                  {order.discountNpr > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discountNpr)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-amber-600">{formatPrice(order.totalNpr)}</span>
                  </div>
                  {order.balanceDueNpr > 0 && order.balanceDueNpr < order.totalNpr && (
                    <div className="flex justify-between text-amber-600">
                      <span>Balance Due</span>
                      <span>{formatPrice(order.balanceDueNpr)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/shop/${order.shop.id}`}>
                    <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                    View Shop
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
