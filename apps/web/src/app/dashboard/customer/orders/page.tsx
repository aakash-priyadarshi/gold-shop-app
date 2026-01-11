'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Eye,
  ShoppingBag,
  Store,
} from 'lucide-react';
import api from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  shop: {
    id: string;
    name: string;
    country: string;
  };
  items: Array<{
    id: string;
    jewelleryType: string;
    metalType: string;
    quantity: number;
  }>;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/orders/my-orders');
      let ordersArr = response.data;
      if (!Array.isArray(ordersArr)) {
        ordersArr = [];
      }
      setOrders(ordersArr);
    } catch (error) {
      console.error('Failed to load orders:', error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
        return <Clock className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Package className="h-4 w-4" />;
      case 'READY':
      case 'SHIPPED':
        return <Truck className="h-4 w-4" />;
      case 'DELIVERED':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY'].includes(order.status);
    if (activeTab === 'shipped') return ['SHIPPED', 'DELIVERED'].includes(order.status);
    if (activeTab === 'cancelled') return order.status === 'CANCELLED';
    return true;
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY'].includes(o.status)).length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    totalSpent: orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0),
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
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">
              Track and manage your jewellery orders
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Total Orders</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Active</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Shipped</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-cyan-600">{stats.shipped}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Delivered</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Total Spent</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                  <TabsTrigger value="shipped">In Transit ({stats.shipped})</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No orders found</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {activeTab === 'all'
                          ? "You haven't placed any orders yet"
                          : `No ${activeTab} orders`}
                      </p>
                      <Button asChild>
                        <Link href="/dashboard/customer/rfqs/new">Request a Quote</Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
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
                                <span>{order.shop.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${order.totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(order.status)}
                                {getStatusBadge(order.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/customer/orders/${order.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
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
