'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Heart,
  Clock,
  Package,
  Store,
  ArrowRight,
  Star,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Mock data - replace with real API calls
const recentOrders = [
  { 
    id: 'ORD-001', 
    shop: 'Shrestha Gold House', 
    items: '22K Gold Ring (5g)', 
    amount: 'NPR 45,600', 
    status: 'delivered',
    date: '2024-01-15',
    image: '/placeholder-ring.jpg'
  },
  { 
    id: 'ORD-002', 
    shop: 'Nepal Jewellers', 
    items: '24K Gold Chain', 
    amount: 'NPR 1,25,000', 
    status: 'shipping',
    date: '2024-01-12',
    image: '/placeholder-chain.jpg'
  },
  { 
    id: 'ORD-003', 
    shop: 'Royal Gold', 
    items: 'Silver Bracelet', 
    amount: 'NPR 12,500', 
    status: 'processing',
    date: '2024-01-10',
    image: '/placeholder-bracelet.jpg'
  },
];

const wishlistItems = [
  { id: '1', name: 'Diamond Studded Ring', shop: 'Shrestha Gold', price: 'NPR 2,50,000' },
  { id: '2', name: '22K Gold Necklace Set', shop: 'Nepal Jewellers', price: 'NPR 3,45,000' },
  { id: '3', name: 'Pearl Earrings', shop: 'Royal Gold', price: 'NPR 45,000' },
];

const rfqRequests = [
  { id: '1', request: 'Custom engagement ring', status: 'quoted', quotes: 3, date: '2024-01-14' },
  { id: '2', request: 'Wedding set for bride', status: 'pending', quotes: 0, date: '2024-01-10' },
];

const recommendedShops = [
  { id: '1', name: 'Shrestha Gold House', location: 'Kathmandu', rating: 4.8, reviews: 234 },
  { id: '2', name: 'Nepal Jewellers', location: 'Pokhara', rating: 4.6, reviews: 189 },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipping: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  quoted: 'bg-green-100 text-green-800',
};

export default function CustomerDashboard() {
  const { user } = useAuth();

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-gold-500 to-yellow-600 rounded-xl p-6 text-white">
            <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
            <p className="mt-1 opacity-90">
              Discover beautiful jewellery from trusted local shops.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <Link href="/browse">
                  <Store className="h-4 w-4 mr-2" />
                  Browse Shops
                </Link>
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20" asChild>
                <Link href="/dashboard/customer/rfq">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Custom Design
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Heart className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wishlistItems.length}</p>
                    <p className="text-sm text-gray-500">Wishlist Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{rfqRequests.length}</p>
                    <p className="text-sm text-gray-500">RFQ Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">NPR 4.2L</p>
                    <p className="text-sm text-gray-500">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Track your purchases</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/customer/orders">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{order.items}</p>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{order.shop}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.amount}</p>
                        <p className="text-xs text-gray-400">{order.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Wishlist */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    My Wishlist
                  </CardTitle>
                  <CardDescription>Items you've saved</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/customer/wishlist">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.shop}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gold-600">{item.price}</p>
                        <Button size="sm" variant="link" className="h-auto p-0">
                          View item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RFQ Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  My RFQ Requests
                </CardTitle>
                <CardDescription>Custom design inquiries</CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/customer/rfq/new">
                  Create New RFQ
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rfqRequests.map((rfq) => (
                  <div
                    key={rfq.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{rfq.request}</p>
                      <p className="text-sm text-gray-500">Created: {rfq.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={statusColors[rfq.status as keyof typeof statusColors]}>
                          {rfq.status}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {rfq.quotes} quotes received
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/customer/rfq/${rfq.id}`}>
                          View
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Shops */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-gold-500" />
                Recommended Shops
              </CardTitle>
              <CardDescription>Trusted jewellers in your area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedShops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-gold-300 hover:bg-gold-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
                        <Store className="h-6 w-6 text-gold-600" />
                      </div>
                      <div>
                        <p className="font-medium">{shop.name}</p>
                        <p className="text-sm text-gray-500">{shop.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{shop.rating}</span>
                        <span className="text-sm text-gray-400">({shop.reviews})</span>
                      </div>
                      <Button size="sm" variant="link" asChild>
                        <Link href={`/shops/${shop.id}`}>Visit shop</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
