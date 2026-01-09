'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart,
  Eye,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

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

export default function ShopOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.shop?.id) {
      loadOrders();
    }
  }, [user?.shop?.id, statusFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/api/orders/shop/${user?.shop?.id}${params}`);
      setOrders(response.data.orders || response.data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load orders',
        description: 'Could not fetch order data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CREATED':
      case 'PAYMENT_PENDING':
        return <Clock className="h-3 w-3" />;
      case 'PAID':
      case 'IN_PRODUCTION':
        return <Package className="h-3 w-3" />;
      case 'SHIPPED':
        return <Truck className="h-3 w-3" />;
      case 'DELIVERED':
      case 'COMPLETED':
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
              <h1 className="text-2xl font-bold">Orders</h1>
              <p className="text-muted-foreground">
                Manage and track customer orders
              </p>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="PAYMENT_PENDING">Payment Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="IN_PRODUCTION">In Production</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders found</p>
                  <p className="text-sm">Orders will appear here when customers place them</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">#{order.orderNumber || order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {order.customer?.firstName} {order.customer?.lastName}
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
                              {formatCurrency(order.totalAmount, order.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status.replace(/_/g, ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'outline'}>
                            {order.paymentStatus}
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
                              View
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
