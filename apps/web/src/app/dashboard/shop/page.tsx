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

// Mock data - replace with real API calls
const stats = [
  {
    title: 'Total Products',
    value: '124',
    change: '+8',
    changeType: 'positive' as const,
    icon: Package,
    description: 'Active listings',
  },
  {
    title: 'Pending Orders',
    value: '12',
    change: '+3',
    changeType: 'positive' as const,
    icon: ShoppingCart,
    description: 'Awaiting processing',
  },
  {
    title: 'RFQ Requests',
    value: '5',
    change: '+2',
    changeType: 'positive' as const,
    icon: MessageSquare,
    description: 'New inquiries',
  },
  {
    title: "Today's Sales",
    value: 'NPR 85,420',
    change: '+15%',
    changeType: 'positive' as const,
    icon: DollarSign,
    description: 'Revenue today',
  },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'Anita Gurung', items: '22K Gold Ring', amount: 'NPR 45,600', status: 'pending' },
  { id: 'ORD-002', customer: 'Bikash Thapa', items: '24K Gold Chain', amount: 'NPR 1,25,000', status: 'processing' },
  { id: 'ORD-003', customer: 'Rita Sharma', items: 'Silver Bracelet', amount: 'NPR 12,500', status: 'completed' },
];

const lowStockItems = [
  { id: '1', name: '22K Gold Ring (5g)', stock: 2, minStock: 5 },
  { id: '2', name: '24K Gold Chain (10g)', stock: 1, minStock: 3 },
  { id: '3', name: 'Silver Anklet', stock: 3, minStock: 10 },
];

const rfqRequests = [
  { id: '1', customer: 'Sita Maya', request: 'Custom engagement ring with diamond', budget: 'NPR 1,50,000', date: '2 hours ago' },
  { id: '2', customer: 'Ram Bahadur', request: 'Wedding set for bride', budget: 'NPR 5,00,000', date: '5 hours ago' },
];

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
