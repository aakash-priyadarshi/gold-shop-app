'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import {
  Gem,
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  TrendingUp,
  Shield,
  ClipboardList,
  Heart,
  CreditCard,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number | 'dynamic';
  badgeKey?: string;
}

const navItems: NavItem[] = [
  // Admin routes
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Shops', href: '/dashboard/admin/shops', icon: Store, roles: ['ADMIN'] },
  { label: 'Verifications', href: '/dashboard/admin/verifications', icon: Shield, roles: ['ADMIN'], badge: 'dynamic', badgeKey: 'pendingVerifications' },
  { label: 'Reports', href: '/dashboard/admin/reports', icon: FileText, roles: ['ADMIN'], badge: 'dynamic', badgeKey: 'openReports' },
  { label: 'Profile', href: '/dashboard/admin/profile', icon: UserCircle, roles: ['ADMIN'] },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, roles: ['ADMIN'] },
  
  // Shopkeeper routes
  { label: 'Dashboard', href: '/dashboard/shop', icon: LayoutDashboard, roles: ['SHOPKEEPER'] },
  { label: 'Inventory', href: '/dashboard/shop/inventory', icon: Package, roles: ['SHOPKEEPER'] },
  { label: 'Orders', href: '/dashboard/shop/orders', icon: ShoppingCart, roles: ['SHOPKEEPER'] },
  { label: 'RFQ Requests', href: '/dashboard/shop/rfq', icon: ClipboardList, roles: ['SHOPKEEPER'] },
  { label: 'Analytics', href: '/dashboard/shop/analytics', icon: TrendingUp, roles: ['SHOPKEEPER'] },
  { label: 'Settings', href: '/dashboard/shop/settings', icon: Settings, roles: ['SHOPKEEPER'] },
  
  // Customer routes
  { label: 'Dashboard', href: '/dashboard/customer', icon: LayoutDashboard, roles: ['CUSTOMER'] },
  { label: 'My Orders', href: '/dashboard/customer/orders', icon: ShoppingCart, roles: ['CUSTOMER'] },
  { label: 'My RFQs', href: '/dashboard/customer/rfqs', icon: ClipboardList, roles: ['CUSTOMER'] },
  { label: 'Wishlist', href: '/dashboard/customer/wishlist', icon: Heart, roles: ['CUSTOMER'] },
  { label: 'Payments', href: '/dashboard/customer/payments', icon: CreditCard, roles: ['CUSTOMER'] },
  { label: 'Settings', href: '/dashboard/customer/settings', icon: Settings, roles: ['CUSTOMER'] },
];


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Fetch dynamic badge counts for admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      adminApi.getStats()
        .then(res => {
          setBadgeCounts({
            pendingVerifications: res.data.pendingVerifications || 0,
            openReports: res.data.openReports || 0,
          });
        })
        .catch(() => {
          // Silently fail
        });
    }
  }, [user?.role]);

  if (isLoading || !user) {

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  // Filter nav items for user's role
  const userNavItems = navItems.filter(item => item.roles.includes(user.role));

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">Admin</span>;
      case 'SHOPKEEPER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Shop</span>;
      case 'CUSTOMER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Customer</span>;
    }
  };

  const getInitials = () => {
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
              <Gem className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">Gold Shop</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gold-100 text-gold-700">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <div className="flex items-center gap-2">
                {getRoleBadge(user.role)}
              </div>
            </div>
          </div>
          {user.shop && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Shop</p>
              <p className="text-sm font-medium truncate">{user.shop.shopName}</p>
              {!user.shop.isVerified && (
                <span className="text-xs text-orange-600">Pending verification</span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {userNavItems.map((item) => {
            const isActive = pathname === item.href;
            const badgeCount = item.badge === 'dynamic' && item.badgeKey 
              ? badgeCounts[item.badgeKey] 
              : item.badge;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gold-50 text-gold-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {badgeCount && Number(badgeCount) > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gold-100 text-gold-700 text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${user.role.toLowerCase()}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Store className="h-4 w-4 mr-2" />
                    Browse Shops
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
