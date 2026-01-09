'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopkeeperGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  Plus,
  Eye,
  MessageSquare,
  Star,
} from 'lucide-react';
import Link from 'next/link';


import { useEffect, useState } from 'react';
import { shopsApi, ordersApi, rfqApi, inventoryApi } from '@/lib/api';

interface Stat {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: any;
  description: string;
}

interface Order {
  id: string;
  customer: string;
  items: string;
  amount: string;
  status: string;
}

interface RFQRequest {
  id: string;
  customer: string;
  request: string;
  budget: string;
  date: string;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export default function ShopDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [rfqRequests, setRfqRequests] = useState<RFQRequest[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  useEffect(() => {
    if (!user?.shop?.id) return;
    const shopId = user.shop.id;

    // Fetch shop stats
    Promise.all([
      shopsApi.getDashboard(shopId),
      ordersApi.getShopOrders(shopId, { page: 1, pageSize: 3 }),
      rfqApi.getReceivedRequests(shopId, { page: 1, pageSize: 3 }),
      inventoryApi.getShopInventory(shopId, { lowStock: true, limit: 3 })
    ]).then(([dashboardRes, ordersRes, rfqRes, lowStockRes]) => {
      const dash = dashboardRes.data;
      setStats([
        {
          title: 'Total Products',
          value: dash.totalProducts?.toString() || '0',
          change: dash.productsChange || '+0',
          changeType: dash.productsChange?.startsWith('-') ? 'negative' : 'positive',
          icon: Package,
          description: 'Active listings',
        },
        {
          title: 'Pending Orders',
          value: dash.pendingOrders?.toString() || '0',
          change: dash.ordersChange || '+0',
          changeType: dash.ordersChange?.startsWith('-') ? 'negative' : 'positive',
          icon: ShoppingCart,
          description: 'Awaiting processing',
        },
        {
          title: 'RFQ Requests',
          value: dash.rfqRequests?.toString() || '0',
          change: dash.rfqChange || '+0',
          changeType: dash.rfqChange?.startsWith('-') ? 'negative' : 'positive',
          icon: MessageSquare,
          description: 'New inquiries',
        },
        {
          title: "Today's Sales",
          value: dash.todaysSales ? `NPR ${dash.todaysSales.toLocaleString()}` : 'NPR 0',
          change: dash.salesChange || '+0%',
          changeType: dash.salesChange?.startsWith('-') ? 'negative' : 'positive',
          icon: DollarSign,
          description: 'Revenue today',
        },
      ]);

      // Recent orders
      const orders = ordersRes.data.items || ordersRes.data || [];
      setRecentOrders(orders.map((o: any) => ({
        id: o.id,
        customer: o.customer?.firstName || o.customerName || 'Unknown',
        items: o.itemsSummary || o.items?.map((i: any) => i.name).join(', ') || '',
        amount: o.amount ? `NPR ${o.amount.toLocaleString()}` : '',
        status: o.status,
      })));

      // RFQ requests
      const rfqs = rfqRes.data.items || rfqRes.data || [];
      setRfqRequests(rfqs.map((r: any) => ({
        id: r.id,
        customer: r.customer?.firstName || r.customerName || 'Unknown',
        request: r.request || r.title || '',
        budget: r.budget ? `NPR ${r.budget.toLocaleString()}` : '',
        date: r.createdAt ? r.createdAt.slice(0, 10) : '',
      })));

      // Low stock items
      const lowStock = lowStockRes.data.items || lowStockRes.data || [];
      setLowStockItems(lowStock.map((item: any) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        minStock: item.minStock,
      })));
    }).catch(() => {
      setStats([]);
      setRecentOrders([]);
      setRfqRequests([]);
      setLowStockItems([]);
    });
  }, [user]);

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ShopDashboard() {
  const { user } = useAuth();

  return (
    <ShopkeeperGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Shop Dashboard</h1>
              <p className="text-gray-500">
                Welcome back, {user?.firstName}! Here's your shop overview.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/shop/inventory">
                  <Eye className="h-4 w-4 mr-2" />
                  View Inventory
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/shop/inventory/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </div>
          </div>

          {/* Shop Status Banner */}
          {user?.shop && !user.shop.isVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Shop Verification Pending</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your shop is currently under review. Some features may be limited until verification is complete.
                </p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      stat.changeType === 'positive' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <stat.icon className={`h-5 w-5 ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <span className={`flex items-center ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-2">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/shop/orders">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.id}</p>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {order.customer} • {order.items}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.amount}</p>
                        <Button size="sm" variant="link" className="h-auto p-0">
                          View details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* RFQ Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    RFQ Requests
                  </CardTitle>
                  <CardDescription>Custom order inquiries</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/shop/rfq">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rfqRequests.map((rfq) => (
                    <div
                      key={rfq.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{rfq.customer}</p>
                          <p className="text-sm text-gray-600 mt-1">{rfq.request}</p>
                        </div>
                        <span className="text-xs text-gray-400">{rfq.date}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline">Budget: {rfq.budget}</Badge>
                        <Button size="sm">Respond</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>Items that need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{item.name}</p>
                        <span className="text-sm text-gray-500">
                          {item.stock} / {item.minStock} units
                        </span>
                      </div>
                      <Progress 
                        value={(item.stock / item.minStock) * 100} 
                        className="h-2"
                      />
                    </div>
                    <Button size="sm" variant="outline">
                      Restock
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/shop/inventory/add">
                    <Plus className="h-6 w-6" />
                    <span>Add Product</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/shop/orders">
                    <ShoppingCart className="h-6 w-6" />
                    <span>View Orders</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/shop/analytics">
                    <TrendingUp className="h-6 w-6" />
                    <span>Analytics</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/shop/settings">
                    <Star className="h-6 w-6" />
                    <span>Shop Settings</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopkeeperGuard>
  );
}
