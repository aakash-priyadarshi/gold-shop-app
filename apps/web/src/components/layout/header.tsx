'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BRAND } from '@/config/brand';
import {
  Bars3Icon,
  UserIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  InformationCircleIcon,
  Squares2X2Icon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  TruckIcon,
  ShoppingCartIcon,
  XMarkIcon,
  TrashIcon,
  HeartIcon,
  CreditCardIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuth, getDashboardRoute, type UserRole } from '@/hooks/useAuth';
import { notificationsApi, ordersApi } from '@/lib/api';
import {
  usePreferencesStore,
  CURRENCIES,
  LANGUAGES,
  COUNTRIES,
  type CurrencyCode,
  type CountryCode,
  type Language,
  type ThemeMode,
} from '@/store/preferences';
import { useCart } from '@/contexts/CartContext';

// Role-specific quick action icons configuration
const getRoleQuickActions = (role: UserRole | undefined) => {
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/dashboard/admin', icon: ShieldCheckIcon, label: 'Admin Dashboard', tooltip: 'Admin Dashboard' },
        { href: '/dashboard/admin/orders', icon: ClipboardDocumentListIcon, label: 'Ongoing Orders', tooltip: 'All Platform Orders' },
      ];
    case 'SHOPKEEPER':
      return [
        { href: '/dashboard/shop', icon: Squares2X2Icon, label: 'Dashboard', tooltip: 'Shop Dashboard' },
        { href: '/dashboard/shop/orders', icon: CubeIcon, label: 'Order Requests', tooltip: 'Incoming Orders & RFQs' },
      ];
    case 'CUSTOMER':
    default:
      return [
        { href: '/dashboard/customer', icon: Squares2X2Icon, label: 'Dashboard', tooltip: 'My Dashboard' },
        { href: '/dashboard/customer/orders', icon: TruckIcon, label: 'Track Orders', tooltip: 'Track My Orders' },
      ];
  }
};

export function Header() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { items, itemCount, subtotal, removeFromCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    titleKey: string;
    bodyKey: string;
    isRead: boolean;
    createdAt: string;
  }>>([]);
  const [cartPopoverOpen, setCartPopoverOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [dashboardPopoverOpen, setDashboardPopoverOpen] = useState(false);
  const [ordersPopoverOpen, setOrdersPopoverOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string;
    status: string;
    totalPriceNpr: number;
    createdAt: string;
    items?: Array<{ product?: { name: string } }>;
  }>>([]);

  // Get preferences from store
  const language = usePreferencesStore((state) => state.language);
  const currency = usePreferencesStore((state) => state.currency);
  const country = usePreferencesStore((state) => state.country);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setAuthenticated = usePreferencesStore((state) => state.setAuthenticated);

  // Use next-themes for theme management (more reliable)
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Sync auth state with preferences store
  useEffect(() => {
    setMounted(true);
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  // Fetch unread notification count and recent notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      setNotifications([]);
      return;
    }
    try {
      const [countResponse, listResponse] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.getAll({ unreadOnly: false })
      ]);
      setUnreadNotifications(countResponse.data?.count || 0);
      setNotifications(listResponse.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch recent orders for the orders popover
  const fetchRecentOrders = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'CUSTOMER') {
      setRecentOrders([]);
      return;
    }
    try {
      const response = await ordersApi.getMyOrders({ page: 1, pageSize: 5 });
      setRecentOrders(response.data?.orders || response.data || []);
    } catch (error) {
      console.error('Failed to fetch recent orders:', error);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  const navigation = [
    { name: 'Shop', href: '/shop', icon: ShoppingBagIcon },
    { name: 'Designs', href: '/designs', icon: HeartIcon },
    { name: 'Custom Order', href: '/rfq/create', icon: SparklesIcon },
    { name: 'Sellers', href: '/shops', icon: BuildingOffice2Icon },
    { name: 'About', href: '/about', icon: InformationCircleIcon },
  ];

  // Toggle theme between light/dark using next-themes
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Determine current icon based on resolved theme
  const isDark = resolvedTheme === 'dark';

  // Format price based on user's currency preference
  const formatPrice = (amount: number) => {
    const currencyInfo = CURRENCIES[currency];
    return new Intl.NumberFormat(currencyInfo?.locale || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Notification text mapping
  const getNotificationText = (type: string) => {
    const texts: Record<string, { title: string; body: string }> = {
      ORDER_PLACED: { title: 'New Order', body: 'A new order has been placed' },
      ORDER_CONFIRMED: { title: 'Order Confirmed', body: 'Your order has been confirmed' },
      ORDER_SHIPPED: { title: 'Order Shipped', body: 'Your order is on its way' },
      ORDER_DELIVERED: { title: 'Order Delivered', body: 'Your order has been delivered' },
      RFQ_RECEIVED: { title: 'New RFQ Request', body: 'You have a new quote request' },
      OFFER_RECEIVED: { title: 'New Quote', body: 'You have received a new quote' },
      OFFER_SELECTED: { title: 'Offer Selected', body: 'Your offer has been selected' },
      PAYMENT_RECEIVED: { title: 'Payment Received', body: 'Payment has been received' },
      SYSTEM_ALERT: { title: 'System Alert', body: 'Important system notification' },
    };
    return texts[type] || { title: type, body: '' };
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 safe-area-top">
      <nav className="container mx-auto flex h-14 lg:h-16 items-center justify-between px-4">
        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="touch-target -ml-2">
              <Bars3Icon className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="p-4 border-b border-gray-100">
              <SheetTitle className="flex items-center gap-2">
                <BrandLogo variant="icon" size="sm" />
                <span className="font-bold text-lg">{BRAND.name}</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100%-65px)]">
              {/* Mobile Navigation */}
              <div className="flex-1 p-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5 text-gray-400" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Mobile Preferences */}
              {mounted && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Language */}
                    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                      <SelectTrigger className="h-11 text-sm rounded-xl">
                        <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANGUAGES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            {info.nativeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Currency */}
                    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                      <SelectTrigger className="h-11 text-sm rounded-xl">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="mr-2">{info.symbol}</span>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Country */}
                    <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                      <SelectTrigger className="flex-1 h-11 text-sm rounded-xl">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue>
                          {COUNTRIES[country]?.flag} {COUNTRIES[country]?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COUNTRIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="mr-2">{info.flag}</span>
                            {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Theme Toggle */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={toggleTheme}
                    >
                      {isDark ? (
                        <SunIcon className="h-5 w-5" />
                      ) : (
                        <MoonIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Auth Actions */}
              <div className="p-4 border-t border-gray-100 space-y-2">
                {isAuthenticated && user ? (
                  <>
                    {/* Role-specific quick actions for mobile */}
                    {getRoleQuickActions(user.role).map((action) => (
                      <Link key={action.href} href={action.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full h-12 justify-start rounded-xl text-base">
                          <action.icon className="mr-3 h-5 w-5" />
                          {action.label}
                        </Button>
                      </Link>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full h-12 justify-start rounded-xl text-base text-red-600 hover:bg-red-50"
                      onClick={() => logout()}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12 rounded-xl text-base">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-12 rounded-xl text-base gold-gradient text-white">
                        Sign up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo variant="icon" size="sm" className="lg:hidden" />
          <BrandLogo variant="icon" size="md" className="hidden lg:block" />
          <span className="font-bold text-base lg:text-xl tracking-tight">
            {BRAND.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Preferences Controls */}
        <div className="hidden lg:flex items-center gap-2">
          {mounted && (
            <>
              {/* Language Selector */}
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger className="w-[100px] h-9 text-xs rounded-lg border-gray-200">
                  <GlobeAltIcon className="h-3 w-3 mr-1 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {info.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Currency Selector */}
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200">
                  <CurrencyDollarIcon className="h-3 w-3 mr-1 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                    Price Display Currency
                  </div>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      <span className="mr-1">{info.symbol}</span>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Country Selector */}
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200">
                  <MapPinIcon className="h-3 w-3 mr-1 text-gray-400" />
                  <SelectValue>
                    {COUNTRIES[country]?.flag} {country}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                    Tax Jurisdiction
                  </div>
                  {Object.entries(COUNTRIES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      <span className="mr-1">{info.flag}</span>
                      {info.name}
                      <span className="ml-1 text-muted-foreground">({info.taxDisplay})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Desktop Auth/User Menu */}
        <div className="hidden lg:flex items-center gap-2">
          {authLoading ? (
            <div className="w-9 h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : isAuthenticated && user ? (
            <TooltipProvider delayDuration={200}>
              {/* Dashboard Popover */}
              {user.role === 'CUSTOMER' ? (
                <Popover open={dashboardPopoverOpen} onOpenChange={setDashboardPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                          <Squares2X2Icon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dashboard</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link href="/dashboard/customer" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <Squares2X2Icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Dashboard</span>
                        </div>
                      </Link>
                      <Link href="/dashboard/customer/orders" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">My Orders</span>
                        </div>
                      </Link>
                      <Link href="/dashboard/customer/rfqs" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">My RFQs</span>
                        </div>
                      </Link>
                      <Link href="/dashboard/customer/wishlist" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <HeartIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Wishlist</span>
                        </div>
                      </Link>
                      <Link href="/dashboard/customer/payments" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <CreditCardIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Payments</span>
                        </div>
                      </Link>
                      <div className="border-t my-1" />
                      <Link href="/dashboard/customer/settings" onClick={() => setDashboardPopoverOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Settings</span>
                        </div>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // For non-customer roles, use the first quick action as a simple link
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={getRoleQuickActions(user.role)[0]?.href || getDashboardRoute(user.role)}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                        {(() => {
                          const Icon = getRoleQuickActions(user.role)[0]?.icon || Squares2X2Icon;
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getRoleQuickActions(user.role)[0]?.tooltip || 'Dashboard'}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Track Orders Popover (Customer only) */}
              {user.role === 'CUSTOMER' ? (
                <Popover open={ordersPopoverOpen} onOpenChange={setOrdersPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                          <TruckIcon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Track Orders</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex items-center justify-between p-3 border-b">
                      <h3 className="font-semibold">Recent Orders</h3>
                      <span className="text-xs text-muted-foreground">{recentOrders.length} order{recentOrders.length !== 1 ? 's' : ''}</span>
                    </div>
                    <ScrollArea className="h-[280px]">
                      {recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <TruckIcon className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-muted-foreground">No orders yet</p>
                          <Link href="/shop" onClick={() => setOrdersPopoverOpen(false)}>
                            <Button variant="link" className="mt-2 text-amber-600">
                              Start Shopping
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {recentOrders.map((order) => (
                            <Link 
                              key={order.id} 
                              href={`/dashboard/customer/orders/${order.id}`}
                              onClick={() => setOrdersPopoverOpen(false)}
                            >
                              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium truncate">
                                      Order #{order.id.slice(0, 8)}
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                                      order.status === 'PROCESSING' ? 'bg-amber-100 text-amber-700' :
                                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {order.items?.[0]?.product?.name || 'Custom Order'}
                                    {order.items && order.items.length > 1 && ` +${order.items.length - 1} more`}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-400">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="text-sm font-semibold text-amber-600">
                                      {formatPrice(order.totalPriceNpr)}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="border-t p-3">
                      <Link href="/dashboard/customer/orders" onClick={() => setOrdersPopoverOpen(false)}>
                        <Button variant="outline" className="w-full">
                          See All Orders
                        </Button>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // For non-customer roles, use the second quick action as a simple link
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={getRoleQuickActions(user.role)[1]?.href || getDashboardRoute(user.role)}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                        {(() => {
                          const Icon = getRoleQuickActions(user.role)[1]?.icon || TruckIcon;
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getRoleQuickActions(user.role)[1]?.tooltip || 'Orders'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Cart Popover */}
              <Popover open={cartPopoverOpen} onOpenChange={setCartPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                        <ShoppingCartIcon className="h-5 w-5" />
                        {mounted && itemCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {itemCount > 9 ? '9+' : itemCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cart ({mounted ? itemCount : 0})</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">Shopping Cart</h3>
                    <span className="text-sm text-muted-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <ScrollArea className="h-[280px]">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <ShoppingCartIcon className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-muted-foreground">Your cart is empty</p>
                        <Link href="/shop" onClick={() => setCartPopoverOpen(false)}>
                          <Button variant="link" className="mt-2 text-amber-600">
                            Start Shopping
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {items.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {item.product.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <CubeIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              <p className="text-sm font-semibold text-amber-600">
                                {formatPrice(item.product.price * item.quantity)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {items.length > 5 && (
                          <div className="p-2 text-center text-xs text-muted-foreground">
                            +{items.length - 5} more item{items.length - 5 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                  {items.length > 0 && (
                    <div className="border-t p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>
                      <Link href="/cart" onClick={() => setCartPopoverOpen(false)}>
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                          View Cart & Checkout
                        </Button>
                      </Link>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Notifications Popover */}
              <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                        <BellIcon className="h-5 w-5" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadNotifications > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>
                  <ScrollArea className="h-[280px]">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <BellIcon className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notif) => {
                          const { title, body } = getNotificationText(notif.type);
                          return (
                            <div
                              key={notif.id}
                              className={`p-3 hover:bg-gray-50 cursor-pointer ${
                                !notif.isRead ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  notif.isRead ? 'bg-gray-300' : 'bg-blue-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{body}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t p-3">
                    <Link href="/notifications" onClick={() => setNotifPopoverOpen(false)}>
                      <Button variant="outline" className="w-full">
                        See All Notifications
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* User menu dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-lg p-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Account</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-gold-600 font-medium mt-1">
                        {user.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardRoute(user.role)}>
                      <Squares2X2Icon className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingBagIcon className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rfq">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      My Requests
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'SHOPKEEPER' && (
                    <DropdownMenuItem asChild>
                      <Link href="/shop/manage">
                        <BuildingStorefrontIcon className="mr-2 h-4 w-4" />
                        My Shop
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin">
                          <ShieldCheckIcon className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin/orders">
                          <ClipboardDocumentListIcon className="mr-2 h-4 w-4" />
                          All Orders
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${user.role === 'ADMIN' ? 'admin' : user.role === 'SHOPKEEPER' ? 'shop' : 'customer'}/settings`}>
                      <Cog6ToothIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          ) : (
            <>
              {/* Cart for non-authenticated users */}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                  <ShoppingCartIcon className="h-5 w-5" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="h-9 rounded-lg">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="h-9 rounded-lg gold-gradient text-white">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Auth Icons */}
        <div className="flex lg:hidden items-center gap-1">
          {!authLoading && isAuthenticated && user && (
            <>
              {/* First quick action for mobile */}
              <Link href={getRoleQuickActions(user.role)[0]?.href || getDashboardRoute(user.role)}>
                <Button variant="ghost" size="icon" className="touch-target">
                  {(() => {
                    const Icon = getRoleQuickActions(user.role)[0]?.icon || Squares2X2Icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </Button>
              </Link>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative touch-target">
                  <BellIcon className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href={getDashboardRoute(user.role)}>
                <Button variant="ghost" size="icon" className="touch-target">
                  <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                </Button>
              </Link>
            </>
          )}
          {!authLoading && !isAuthenticated && (
            <Link href="/auth/login">
              <Button variant="ghost" size="icon" className="touch-target">
                <UserIcon className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
