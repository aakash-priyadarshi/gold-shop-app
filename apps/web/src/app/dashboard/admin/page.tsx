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


import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch stats (users, shops, orders, revenue)
        const usersRes = await api.get('/api/users?page=1&pageSize=1');
        const shopsRes = await api.get('/api/shops?page=1&pageSize=1');
        const ordersRes = await api.get('/api/orders?page=1&pageSize=1');
        // Revenue: Placeholder, replace with real endpoint if available
        const revenueRes = { data: { revenue: 'NPR 0', change: '+0%' } };

        setStats([
          {
            title: 'Total Users',
            value: usersRes.data?.meta?.totalCount ?? '—',
            change: '+0%',
            changeType: 'positive',
            icon: Users,
            description: 'Active users this month',
          },
          {
            title: 'Active Shops',
            value: shopsRes.data?.meta?.totalCount ?? '—',
            change: '+0%',
            changeType: 'positive',
            icon: Store,
            description: 'Verified shops',
          },
          {
            title: 'Total Orders',
            value: ordersRes.data?.meta?.totalCount ?? '—',
            change: '+0%',
            changeType: 'positive',
            icon: ShoppingCart,
            description: 'Orders this month',
          },
          {
            title: 'Revenue',
            value: revenueRes.data?.revenue ?? 'NPR 0',
            change: revenueRes.data?.change ?? '+0%',
            changeType: 'positive',
            icon: DollarSign,
            description: 'Platform revenue',
          },
        ]);

        // Fetch pending verifications
        const verificationsRes = await api.get('/api/admin/verifications');
        setPendingVerifications(
          (verificationsRes.data?.requests || []).filter((v: any) => v.status === 'PENDING')
        );

        // Fetch recent activity (use reports for now)
        const reportsRes = await api.get('/api/admin/reports');
        setRecentActivity(
          (reportsRes.data?.reports || []).map((r: any) => ({
            id: r.id,
            type: r.type,
            message: r.reason,
            user: r.reporter?.email || '—',
            time: new Date(r.createdAt).toLocaleString(),
          }))
        );
      } catch (err) {
        // Handle error, optionally show toast
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

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
