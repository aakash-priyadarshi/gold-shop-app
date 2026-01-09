'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiTokenManager } from '@/components/admin/ApiTokenManager';
import {
  Users,
  Store,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Key,
} from 'lucide-react';

// Mock data - replace with real API calls
const stats = [
  {
    title: 'Total Users',
    value: '1,234',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    description: 'Active users this month',
  },
  {
    title: 'Active Shops',
    value: '56',
    change: '+3',
    changeType: 'positive' as const,
    icon: Store,
    description: 'Verified shops',
  },
  {
    title: 'Total Orders',
    value: '892',
    change: '+18%',
    changeType: 'positive' as const,
    icon: ShoppingCart,
    description: 'Orders this month',
  },
  {
    title: 'Revenue',
    value: 'NPR 45.2L',
    change: '+8%',
    changeType: 'positive' as const,
    icon: DollarSign,
    description: 'Platform revenue',
  },
];

const pendingVerifications = [
  { id: '1', shopName: 'Shrestha Gold House', owner: 'Ramesh Shrestha', date: '2024-01-15', location: 'Kathmandu' },
  { id: '2', shopName: 'Nepal Jewellers', owner: 'Sita Sharma', date: '2024-01-14', location: 'Pokhara' },
  { id: '3', shopName: 'Golden Nepal', owner: 'Bikash Thapa', date: '2024-01-13', location: 'Lalitpur' },
];

const recentActivity = [
  { id: '1', type: 'user_registered', message: 'New customer registered', user: 'Anita Gurung', time: '5 min ago' },
  { id: '2', type: 'shop_verified', message: 'Shop verified', user: 'Royal Gold', time: '1 hour ago' },
  { id: '3', type: 'order_completed', message: 'Order completed', user: 'Order #12345', time: '2 hours ago' },
  { id: '4', type: 'rfq_created', message: 'New RFQ request', user: 'Custom Ring Design', time: '3 hours ago' },
];

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500">Welcome back! Here's what's happening on the platform.</p>
          </div>

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
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      )}
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-2">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Verifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Pending Verifications
                  </CardTitle>
                  <CardDescription>Shops awaiting verification</CardDescription>
                </div>
                <Badge variant="secondary">{pendingVerifications.length} pending</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingVerifications.map((shop) => (
                    <div
                      key={shop.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{shop.shopName}</p>
                        <p className="text-sm text-gray-500">
                          {shop.owner} • {shop.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-4">
                  View all pending verifications →
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className={`p-2 rounded-full ${
                        activity.type === 'user_registered' ? 'bg-blue-100' :
                        activity.type === 'shop_verified' ? 'bg-green-100' :
                        activity.type === 'order_completed' ? 'bg-purple-100' : 'bg-orange-100'
                      }`}>
                        {activity.type === 'user_registered' ? <Users className="h-4 w-4 text-blue-600" /> :
                         activity.type === 'shop_verified' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                         activity.type === 'order_completed' ? <ShoppingCart className="h-4 w-4 text-purple-600" /> :
                         <TrendingUp className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-sm text-gray-500">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-4">
                  View all activity →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span>Manage Users</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <Store className="h-6 w-6" />
                  <span>Manage Shops</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Price Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Token Management */}
          <ApiTokenManager />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
