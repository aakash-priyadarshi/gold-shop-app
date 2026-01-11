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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Stat {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: any;
  description: string;
}

interface Verification {
  id: string;
  shopName: string;
  owner: string;
  location: string;
  status: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  user: string;
  time: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<Verification[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch stats (users, shops, orders, revenue)
        const usersRes = await api.get('/users?page=1&pageSize=1');
        const shopsRes = await api.get('/shops?page=1&pageSize=1');
        const ordersRes = await api.get('/orders?page=1&pageSize=1');
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
        const verificationsRes = await api.get('/admin/verifications');
        setPendingVerifications(
          (verificationsRes.data?.requests || []).filter((v: any) => v.status === 'PENDING')
        );

        // Fetch recent activity (use reports for now)
        const reportsRes = await api.get('/admin/reports');
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

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-4 lg:space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-500">Welcome back! Here&apos;s what&apos;s happening on the platform.</p>
          </div>

          {/* Stats grid - Mobile: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="premium-card">
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-start lg:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm text-gray-500 truncate">{stat.title}</p>
                      <p className="text-lg lg:text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2 lg:p-3 rounded-xl shrink-0 ${
                      stat.changeType === 'positive' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <stat.icon className={`h-4 w-4 lg:h-5 lg:w-5 ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs lg:text-sm">
                    <span className={`flex items-center ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 lg:h-4 lg:w-4 mr-0.5" />
                      )}
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-1 lg:ml-2 truncate hidden sm:inline">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Two column layout - Stack on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Pending Verifications */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between p-4 lg:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
                    Pending Verifications
                  </CardTitle>
                  <CardDescription className="text-xs lg:text-sm">Shops awaiting verification</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">{pendingVerifications.length} pending</Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-3">
                  {pendingVerifications.map((shop) => (
                    <div
                      key={shop.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm lg:text-base truncate">{shop.shopName}</p>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">
                          {shop.owner} • {shop.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs lg:text-sm rounded-lg">
                          Review
                        </Button>
                        <Button size="sm" className="h-8 text-xs lg:text-sm rounded-lg bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingVerifications.length === 0 && (
                    <div className="empty-state py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No pending verifications</p>
                    </div>
                  )}
                </div>
                <Button variant="link" className="w-full mt-4 text-sm">
                  View all pending verifications →
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="premium-card">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${
                        activity.type === 'user_registered' ? 'bg-blue-100' :
                        activity.type === 'shop_verified' ? 'bg-green-100' :
                        activity.type === 'order_completed' ? 'bg-purple-100' : 'bg-orange-100'
                      }`}>
                        {activity.type === 'user_registered' ? <Users className="h-4 w-4 text-blue-600" /> :
                         activity.type === 'shop_verified' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                         activity.type === 'order_completed' ? <ShoppingCart className="h-4 w-4 text-purple-600" /> :
                         <TrendingUp className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs lg:text-sm font-medium truncate">{activity.message}</p>
                        <p className="text-xs text-gray-500 truncate">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{activity.time}</span>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="empty-state py-8">
                      <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
                <Button variant="link" className="w-full mt-4 text-sm">
                  View all activity →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - 2 cols on mobile, 4 on desktop */}
          <Card className="premium-card">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-base lg:text-lg">Quick Actions</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target">
                  <Users className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Manage Users</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target">
                  <Store className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Manage Shops</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target">
                  <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">View Reports</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl touch-target">
                  <DollarSign className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Price Settings</span>
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
