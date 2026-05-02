"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { T } from "@/components/ui/T";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { BRAND } from "@/config/brand";
import { useCart } from "@/contexts/CartContext";
import { getDashboardRoute, useAuth, type UserRole } from "@/hooks/useAuth";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { chatApi, notificationsApi, ordersApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
    COUNTRIES,
    CURRENCIES,
    LANGUAGES,
    usePreferencesStore,
    type CountryCode,
    type CurrencyCode,
    type Language,
} from "@/store/preferences";
import {
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    BellIcon,
    BookOpenIcon,
    BuildingOffice2Icon,
    BuildingStorefrontIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    ComputerDesktopIcon,
    CreditCardIcon,
    CubeIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    HeartIcon,
    InformationCircleIcon,
    MapPinIcon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    SparklesIcon,
    Squares2X2Icon,
    TrashIcon,
    TruckIcon,
    UserIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// Role-specific quick action icons configuration
const getRoleQuickActions = (role: UserRole | undefined) => {
  switch (role) {
    case "ADMIN":
      return [
        {
          href: "/dashboard/admin",
          icon: ShieldCheckIcon,
          label: "Admin Dashboard",
          tooltip: "Admin Dashboard",
        },
        {
          href: "/dashboard/admin/orders",
          icon: ClipboardDocumentListIcon,
          label: "Ongoing Orders",
          tooltip: "All Platform Orders",
        },
      ];
    case "SHOPKEEPER":
      return [
        {
          href: "/dashboard/shop",
          icon: Squares2X2Icon,
          label: "Dashboard",
          tooltip: "Shop Dashboard",
        },
        {
          href: "/dashboard/shop/orders",
          icon: CubeIcon,
          label: "Order Requests",
          tooltip: "Incoming Orders & RFQs",
        },
      ];
    case "CUSTOMER":
    default:
      return [
        {
          href: "/dashboard/customer",
          icon: Squares2X2Icon,
          label: "Dashboard",
          tooltip: "My Dashboard",
        },
        {
          href: "/dashboard/customer/orders",
          icon: TruckIcon,
          label: "Track Orders",
          tooltip: "Track My Orders",
        },
      ];
    case "SALES":
      return [
        {
          href: "/dashboard/sales",
          icon: Squares2X2Icon,
          label: "Dashboard",
          tooltip: "Sales Dashboard",
        },
        {
          href: "/dashboard/sales/orders",
          icon: ClipboardDocumentListIcon,
          label: "Orders",
          tooltip: "View Orders",
        },
      ];
  }
};

export function Header() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { items, itemCount, subtotal, removeFromCart } = useCart();
  const { features: platformFeatures } = usePlatformFeatures();
  const customerFlowEnabled = platformFeatures.customerFlowEnabled;
  const t = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      titleKey: string;
      bodyKey: string;
      isRead: boolean;
      createdAt: string;
    }>
  >([]);
  const [cartPopoverOpen, setCartPopoverOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [dashboardPopoverOpen, setDashboardPopoverOpen] = useState(false);
  const [ordersPopoverOpen, setOrdersPopoverOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<
    Array<{
      id: string;
      status: string;
      totalPriceNpr: number;
      createdAt: string;
      items?: Array<{ product?: { name: string } }>;
    }>
  >([]);

  // Get preferences from store
  const language = usePreferencesStore((state) => state.language);
  const currency = usePreferencesStore((state) => state.currency);
  const country = usePreferencesStore((state) => state.country);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setAuthenticated = usePreferencesStore(
    (state) => state.setAuthenticated,
  );

  // Unread messages count
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messagesPopoverOpen, setMessagesPopoverOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<
    Array<{
      id: string;
      lastMessage?: string;
      lastMessageAt?: string;
      unreadCount: number;
      shop?: { shopName: string };
      customer?: { firstName: string; lastName: string };
      participants?: Array<{
        user?: { firstName: string; lastName: string };
        role: string;
      }>;
    }>
  >([]);

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
        notificationsApi.getAll({ unreadOnly: false }),
      ]);
      setUnreadNotifications(countResponse.data?.count || 0);
      setNotifications(listResponse.data?.slice(0, 5) || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Defer initial fetch to let the page render first (improves FCP/LCP)
    const timeout = setTimeout(fetchNotifications, 2000);

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  // Fetch recent orders for the orders popover
  const fetchRecentOrders = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      setRecentOrders([]);
      return;
    }
    try {
      const response = await ordersApi.getMyOrders({ page: 1, pageSize: 5 });
      setRecentOrders(response.data?.orders || response.data || []);
    } catch (error) {
      console.error("Failed to fetch recent orders:", error);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    // Defer to avoid blocking initial render
    const timeout = setTimeout(fetchRecentOrders, 2500);
    return () => clearTimeout(timeout);
  }, [fetchRecentOrders]);

  // Fetch unread messages count and recent messages
  const fetchUnreadMessages = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadMessages(0);
      setRecentMessages([]);
      return;
    }
    try {
      const res = await chatApi.listConversations();
      const conversations = res.data || [];
      const unread = conversations.reduce(
        (sum: number, c: any) => sum + (c.unreadCount || 0),
        0,
      );
      setUnreadMessages(unread);
      // Store top 5 recent conversations sorted by lastMessageAt
      const sorted = [...conversations]
        .sort((a: any, b: any) => {
          const dateA = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const dateB = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
      setRecentMessages(sorted);
    } catch {
      // silently ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Defer to avoid blocking initial render
    const timeout = setTimeout(fetchUnreadMessages, 2000);
    const interval = setInterval(fetchUnreadMessages, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchUnreadMessages]);

  // Get messages page path based on role
  const getMessagesPath = () => {
    switch (user?.role) {
      case "ADMIN":
        return "/dashboard/admin/messages";
      case "SHOPKEEPER":
        return "/dashboard/shop/messages";
      case "SALES":
        return "/dashboard/sales/messages";
      case "CUSTOMER":
      default:
        return "/dashboard/customer/messages";
    }
  };

  // Primary nav links (flat) — only shown when customer flow is enabled.
  // When customer flow is enabled: consumer browsing links.
  // When disabled (seller-only mode): promote the highest-intent seller pages
  // as flat top-nav links instead of burying everything in the dropdown.
  const navigation = customerFlowEnabled
    ? [
        { name: "Shops", href: "/shops", icon: BuildingStorefrontIcon },
        { name: "Designs", href: "/designs", icon: HeartIcon },
        { name: "Custom Order", href: "/rfq/create", icon: SparklesIcon },
      ]
    : [
        { name: "Shop Software", href: "/jewellery-shop-software", icon: Squares2X2Icon },
        { name: "Pricing", href: "/pricing", icon: CreditCardIcon },
        { name: "Download", href: "/download", icon: ComputerDesktopIcon },
      ];

  // "For Sellers" dropdown items
  const sellerNavItems = [
    {
      name: "Start Selling Free",
      href: "/for-sellers",
      icon: BuildingStorefrontIcon,
      desc: "See how Orivraa works for jewellers",
      featured: true,
    },
    {
      name: "Jewellery Shop Software",
      href: "/jewellery-shop-software",
      icon: Squares2X2Icon,
      desc: "Free shop management platform",
    },
    {
      name: "AI Sales Team",
      href: "/ai-sales-team",
      icon: SparklesIcon,
      desc: "24/7 AI voice agents for your shop",
    },
    {
      name: "Pricing & Plans",
      href: "/pricing",
      icon: CreditCardIcon,
      desc: "Subscription plans for your shop",
    },
    {
      name: "Seller Guide",
      href: "/seller-guide",
      icon: DocumentTextIcon,
      desc: "How to set up & grow your shop",
    },
    {
      name: "Become a Partner",
      href: "/partner",
      icon: BuildingOffice2Icon,
      desc: "Join our jeweller network",
    },
    {
      name: "Download App",
      href: "/download",
      icon: ComputerDesktopIcon,
      desc: "Desktop & mobile apps for sellers",
    },
  ];

  // More menu items
  const moreNavItems = [
    {
      name: "Blog",
      href: "/blog",
      icon: BookOpenIcon,
      desc: "Guides, tips & industry insights",
    },
    {
      name: "About",
      href: "/about",
      icon: InformationCircleIcon,
      desc: "Our story & mission",
    },
    {
      name: "Privacy Policy",
      href: "/privacy",
      icon: ShieldCheckIcon,
      desc: "How we protect your data",
    },
    {
      name: "Terms of Service",
      href: "/terms",
      icon: DocumentTextIcon,
      desc: "Usage terms & conditions",
    },
  ];

  // State for "For Sellers" dropdown
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Format price based on user's currency preference
  const formatPrice = (amount: number) => {
    const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;
    return new Intl.NumberFormat(currencyInfo?.locale || "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Notification text mapping
  const getNotificationText = (type: string) => {
    const texts: Record<string, { title: string; body: string }> = {
      ORDER_PLACED: {
        title: t("New Order"),
        body: t("A new order has been placed"),
      },
      ORDER_CONFIRMED: {
        title: t("Order Confirmed"),
        body: t("Your order has been confirmed"),
      },
      ORDER_SHIPPED: {
        title: t("Order Shipped"),
        body: t("Your order is on its way"),
      },
      ORDER_DELIVERED: {
        title: t("Order Delivered"),
        body: t("Your order has been delivered"),
      },
      RFQ_RECEIVED: {
        title: t("New RFQ Request"),
        body: t("You have a new quote request"),
      },
      OFFER_RECEIVED: {
        title: t("New Quote"),
        body: t("You have received a new quote"),
      },
      OFFER_SELECTED: {
        title: t("Offer Selected"),
        body: t("Your offer has been selected"),
      },
      PAYMENT_RECEIVED: {
        title: t("Payment Received"),
        body: t("Payment has been received"),
      },
      SYSTEM_ALERT: {
        title: t("System Alert"),
        body: t("Important system notification"),
      },
    };
    return texts[type] || { title: type, body: "" };
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 safe-area-top">
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
            <SheetHeader className="p-4 border-b border-gray-100 dark:border-gray-800">
              <SheetTitle className="flex items-center gap-2">
                <BrandLogo variant="icon" size="sm" />
                <span className="font-bold text-lg">{BRAND.name}</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100%-65px)]">
              {/* Mobile Navigation */}
              <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                {/* Primary nav — label differs by mode */}
                {!customerFlowEnabled && navigation.length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 pb-1">
                    <T>Platform</T>
                  </p>
                )}
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors touch-target ${
                      item.href === "/rfq/create"
                        ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className={`h-5 w-5 ${
                      item.href === "/rfq/create" ? "text-amber-500" : "text-gray-400 dark:text-gray-500"
                    }`} />
                    <T>{item.name}</T>
                  </Link>
                ))}

                {/* For Sellers Section */}
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">
                    <T>For Sellers</T>
                  </p>
                  {sellerNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors touch-target ${
                        item.featured
                          ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 mb-1"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className={`h-5 w-5 ${item.featured ? "text-amber-500" : "text-gold-500"}`} />
                      <T>{item.name}</T>
                    </Link>
                  ))}
                </div>

                {/* Contact — standalone */}
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <Link
                    href="/contact"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-amber-500" />
                    <div>
                      <div><T>Contact Us</T></div>
                      <div className="text-xs font-normal text-amber-600/80 dark:text-amber-400/70"><T>Talk to the founder — reply within hours</T></div>
                    </div>
                  </Link>
                </div>

                {/* More */}
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">
                    <T>Company</T>
                  </p>
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <T>{item.name}</T>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Preferences */}
              {mounted && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                    <T>Preferences</T>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Language */}
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage(v as Language)}
                    >
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
                    <Select
                      value={currency}
                      onValueChange={(v) => setCurrency(v as CurrencyCode)}
                    >
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
                    <Select
                      value={country}
                      onValueChange={(v) => setCountry(v as CountryCode)}
                    >
                      <SelectTrigger className="flex-1 h-11 text-sm rounded-xl">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <FlagImage code={country as FlagCode} size={16} />
                            {COUNTRIES[country]?.name}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COUNTRIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2">
                              <FlagImage code={code as FlagCode} size={16} />
                              {info.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Theme Toggle */}
                    <AnimatedThemeToggle
                      size={44}
                      className="shrink-0 border border-input"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Auth Actions */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                {mounted && isAuthenticated && user ? (
                  <>
                    {/* Role-specific quick actions for mobile */}
                    {getRoleQuickActions(user.role).map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-12 justify-start rounded-xl text-base"
                        >
                          <action.icon className="mr-3 h-5 w-5" />
                          {t(action.label)}
                        </Button>
                      </Link>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full h-12 justify-start rounded-xl text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => logout()}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      <T>Log out</T>
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl text-base"
                      >
                        <T>Log in</T>
                      </Button>
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button className="w-full h-12 rounded-xl text-base gold-gradient text-white">
                        {customerFlowEnabled ? <T>Sign up</T> : <T>Get Started</T>}
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
              className={
                item.href === "/rfq/create"
                  ? "px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                  : "px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              }
            >
              <T>{item.name}</T>
            </Link>
          ))}

          {/* For Sellers Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setSellerDropdownOpen(true)}
            onMouseLeave={() => setSellerDropdownOpen(false)}
          >
            <Link
              href="/for-sellers"
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <T>For Sellers</T>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${sellerDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </Link>
            {sellerDropdownOpen && (
              <>
                {/* Invisible bridge to prevent gap hover loss */}
                <div className="absolute top-full left-0 h-2 w-full" />
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50">
                  {sellerNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        item.featured
                          ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 mb-1.5"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSellerDropdownOpen(false)}
                    >
                      <item.icon className={`h-5 w-5 mt-0.5 shrink-0 ${item.featured ? "text-amber-500" : "text-gold-500"}`} />
                      <div>
                        <div className={`text-sm font-medium ${item.featured ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                          <T>{item.name}</T>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <T>{item.desc}</T>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Contact link */}
          <Link
            href="/contact"
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <T>Contact</T>
          </Link>

          {/* About link */}
          <div
            className="relative"
            onMouseEnter={() => setCompanyDropdownOpen(true)}
            onMouseLeave={() => setCompanyDropdownOpen(false)}
          >
            <button
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors inline-flex items-center gap-1"
              onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            >
              <T>Company</T>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${companyDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
            {companyDropdownOpen && (
              <>
                <div className="absolute top-full left-0 h-2 w-full" />
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50">
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setCompanyDropdownOpen(false)}
                    >
                      <item.icon className="h-5 w-5 text-gold-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          <T>{item.name}</T>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <T>{item.desc}</T>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop Preferences Controls */}
        <div className="hidden lg:flex items-center gap-2">
          {mounted && (
            <>
              {/* Language, Currency & Country — only relevant in customer flow */}
              {customerFlowEnabled && (
                <>
                  {/* Language Selector */}
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as Language)}
                  >
                    <SelectTrigger className="w-[100px] h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
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
                  <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as CurrencyCode)}
                  >
                    <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
                      <CurrencyDollarIcon className="h-3 w-3 mr-1 text-gray-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                        {t("Price Display Currency")}
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
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as CountryCode)}
                  >
                    <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
                      <MapPinIcon className="h-3 w-3 mr-1 text-gray-400" />
                      <SelectValue>
                        <span className="flex items-center gap-1">
                          <FlagImage code={country as FlagCode} size={14} />
                          {country}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                        {t("Tax Jurisdiction")}
                      </div>
                      {Object.entries(COUNTRIES).map(([code, info]) => (
                        <SelectItem key={code} value={code} className="text-xs">
                          <span className="flex items-center gap-1">
                            <FlagImage code={code as FlagCode} size={14} />
                            {info.name}
                            <span className="ml-1 text-muted-foreground">
                              ({info.taxDisplay})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Theme Toggle */}
              <AnimatedThemeToggle size={36} className="rounded-lg" />
            </>
          )}
        </div>

        {/* Desktop Auth/User Menu */}
        <div className="hidden lg:flex items-center gap-2">
          {!mounted || authLoading ? (
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ) : isAuthenticated && user ? (
            <TooltipProvider delayDuration={200}>
              {/* Dashboard Popover */}
              {user.role === "CUSTOMER" ? (
                <Popover
                  open={dashboardPopoverOpen}
                  onOpenChange={setDashboardPopoverOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                        >
                          <Squares2X2Icon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p><T>Dashboard</T></p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link
                        href="/dashboard/customer"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Squares2X2Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Dashboard")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/customer/orders"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ShoppingCartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("My Orders")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/customer/rfqs"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("My RFQs")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/customer/wishlist"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <HeartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Wishlist")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/customer/payments"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <CreditCardIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Payments")}</span>
                        </div>
                      </Link>
                      <div className="border-t dark:border-gray-800 my-1" />
                      <Link
                        href="/dashboard/customer/settings"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Settings")}</span>
                        </div>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : user.role === "SHOPKEEPER" ? (
                <Popover
                  open={dashboardPopoverOpen}
                  onOpenChange={setDashboardPopoverOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                        >
                          <Squares2X2Icon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p><T>Shop Dashboard</T></p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link
                        href="/dashboard/shop"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Squares2X2Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Dashboard")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/shop/orders"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ShoppingCartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Orders")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/shop/products"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <CubeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Products")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/shop/rfqs"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("RFQ Requests")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/shop/customers"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Customers")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/shop/analytics"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <SparklesIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Analytics")}</span>
                        </div>
                      </Link>
                      <div className="border-t dark:border-gray-800 my-1" />
                      <Link
                        href="/dashboard/shop/settings"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Settings")}</span>
                        </div>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : user.role === "ADMIN" ? (
                <Popover
                  open={dashboardPopoverOpen}
                  onOpenChange={setDashboardPopoverOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                        >
                          <ShieldCheckIcon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("Admin Dashboard")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link
                        href="/dashboard/admin"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ShieldCheckIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Admin Panel")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/admin/orders"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("All Orders")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/admin/shops"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm"><T>Shops & CRM</T></span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/admin/users"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Users")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/admin/verifications"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <DocumentTextIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">
                            {t("KYC & Verification")}
                          </span>
                        </div>
                      </Link>
                      <div className="border-t dark:border-gray-800 my-1" />
                      <Link
                        href="/dashboard/admin/settings"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Settings")}</span>
                        </div>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : user.role === "SALES" ? (
                <Popover
                  open={dashboardPopoverOpen}
                  onOpenChange={setDashboardPopoverOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                        >
                          <Squares2X2Icon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("Sales Dashboard")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link
                        href="/dashboard/sales"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Squares2X2Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Dashboard")}</span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/sales/shops"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm"><T>Shops & CRM</T></span>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/sales/orders"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Orders")}</span>
                        </div>
                      </Link>
                      <div className="border-t dark:border-gray-800 my-1" />
                      <Link
                        href="/dashboard/sales/profile"
                        onClick={() => setDashboardPopoverOpen(false)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm">{t("Profile")}</span>
                        </div>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // Fallback for other roles — simple dashboard link
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={getDashboardRoute(user.role)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                      >
                        <Squares2X2Icon className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Dashboard")}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Track Orders Popover (Customer only) */}
              {user.role === "CUSTOMER" ? (
                <Popover
                  open={ordersPopoverOpen}
                  onOpenChange={setOrdersPopoverOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg"
                        >
                          <TruckIcon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("Track Orders")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex items-center justify-between p-3 border-b">
                      <h3 className="font-semibold">{t("Recent Orders")}</h3>
                      <span className="text-xs text-muted-foreground">
                        {recentOrders.length} order
                        {recentOrders.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ScrollArea className="h-[280px]">
                      {recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <TruckIcon className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-muted-foreground">
                            {t("No orders yet")}
                          </p>
                          <Link
                            href="/shop"
                            onClick={() => setOrdersPopoverOpen(false)}
                          >
                            <Button
                              variant="link"
                              className="mt-2 text-amber-600"
                            >
                              {t("Start Shopping")}
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
                              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium truncate">
                                      Order #{order.id.slice(0, 8)}
                                    </p>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        order.status === "DELIVERED"
                                          ? "bg-green-100 text-green-700"
                                          : order.status === "SHIPPED"
                                            ? "bg-blue-100 text-blue-700"
                                            : order.status === "PROCESSING"
                                              ? "bg-amber-100 text-amber-700"
                                              : order.status === "CANCELLED"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {t(order.status)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {order.items?.[0]?.product?.name ||
                                      t("Custom Order")}
                                    {order.items &&
                                      order.items.length > 1 &&
                                      ` +${order.items.length - 1} ${t("more")}`}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-400">
                                      {new Date(
                                        order.createdAt,
                                      ).toLocaleDateString()}
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
                      <Link
                        href="/dashboard/customer/orders"
                        onClick={() => setOrdersPopoverOpen(false)}
                      >
                        <Button variant="outline" className="w-full">
                          <T>See All Orders</T>
                        </Button>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // For non-customer roles, show a orders link
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={
                        getRoleQuickActions(user.role)[1]?.href ||
                        getDashboardRoute(user.role)
                      }
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                      >
                        {(() => {
                          const Icon =
                            getRoleQuickActions(user.role)[1]?.icon ||
                            TruckIcon;
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getRoleQuickActions(user.role)[1]?.tooltip ||
                        t("Orders")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Messages Popover */}
              <Popover
                open={messagesPopoverOpen}
                onOpenChange={setMessagesPopoverOpen}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-lg"
                      >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        {mounted && unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadMessages > 9 ? "9+" : unreadMessages}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {t("Messages")}
                      {unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">{t("Messages")}</h3>
                    {unreadMessages > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                        {unreadMessages} {t("unread")}
                      </span>
                    )}
                  </div>
                  <ScrollArea className="h-[280px]">
                    {recentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-muted-foreground">
                          {t("No messages yet")}
                        </p>
                        <Link
                          href="/shop"
                          onClick={() => setMessagesPopoverOpen(false)}
                        >
                          <Button
                            variant="link"
                            className="mt-2 text-amber-600"
                          >
                            <T>Browse Shops</T>
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recentMessages.map((conv) => {
                          // Determine display name based on conversation participants
                          const otherParticipant = conv.participants?.find(
                            (p: any) =>
                              p.user?.firstName && p.role !== user?.role,
                          );
                          const displayName =
                            conv.shop?.shopName ||
                            (otherParticipant?.user
                              ? `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
                              : "Conversation");
                          return (
                            <Link
                              key={conv.id}
                              href={`${getMessagesPath()}?conversation=${conv.id}`}
                              onClick={() => setMessagesPopoverOpen(false)}
                            >
                              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p
                                      className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}
                                    >
                                      {displayName}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                      <span className="ml-2 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                                        {conv.unreadCount > 9
                                          ? "9+"
                                          : conv.unreadCount}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {conv.lastMessage || t("No messages yet")}
                                  </p>
                                  {conv.lastMessageAt && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {new Date(
                                        conv.lastMessageAt,
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t p-3">
                    <Link
                      href={getMessagesPath()}
                      onClick={() => setMessagesPopoverOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        <T>View All Messages</T>
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Cart Popover — only when customer flow is on */}
              {customerFlowEnabled && (
              <Popover open={cartPopoverOpen} onOpenChange={setCartPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-lg"
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                        {mounted && itemCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {itemCount > 9 ? "9+" : itemCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {t("Cart")} ({mounted ? itemCount : 0})
                    </p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">
                      <T>Shopping Cart</T>
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {itemCount} {itemCount !== 1 ? t("items") : t("item")}
                    </span>
                  </div>
                  <ScrollArea className="h-[280px]">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <ShoppingCartIcon className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-muted-foreground">
                          <T>Your cart is empty</T>
                        </p>
                        <Link
                          href="/shop"
                          onClick={() => setCartPopoverOpen(false)}
                        >
                          <Button
                            variant="link"
                            className="mt-2 text-amber-600"
                          >
                            {t("Start Shopping")}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {items.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                              {item.product.image ? (
                                <Image
                                  src={item.product.image}
                                  alt={item.product.name}
                                  width={56}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <CubeIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("Qty")}: {item.quantity}
                              </p>
                              <p className="text-sm font-semibold text-amber-600">
                                {formatPrice(
                                  item.product.price * item.quantity,
                                )}
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
                            +{items.length - 5} {t("more items")}
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                  {items.length > 0 && (
                    <div className="border-t p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t("Subtotal")}
                        </span>
                        <span className="font-semibold">
                          {formatPrice(subtotal)}
                        </span>
                      </div>
                      <Link
                        href="/cart"
                        onClick={() => setCartPopoverOpen(false)}
                      >
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                          <T>View Cart & Checkout</T>
                        </Button>
                      </Link>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              )}

              {/* Notifications Popover */}
              <Popover
                open={notifPopoverOpen}
                onOpenChange={setNotifPopoverOpen}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-lg"
                      >
                        <BellIcon className="h-5 w-5" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadNotifications > 9
                              ? "9+"
                              : unreadNotifications}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Notifications")}</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">{t("Notifications")}</h3>
                    {unreadNotifications > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {unreadNotifications} {t("new")}
                      </span>
                    )}
                  </div>
                  <ScrollArea className="h-[280px]">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <BellIcon className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-muted-foreground">
                          {t("No notifications yet")}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notif) => {
                          const { title, body } = getNotificationText(
                            notif.type,
                          );
                          return (
                            <div
                              key={notif.id}
                              className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                                !notif.isRead
                                  ? "bg-blue-50/50 dark:bg-blue-900/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    notif.isRead ? "bg-gray-300" : "bg-blue-500"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {body}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(
                                      notif.createdAt,
                                    ).toLocaleDateString()}
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
                    <Link
                      href="/notifications"
                      onClick={() => setNotifPopoverOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        <T>See All Notifications</T>
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
                      <Button
                        variant="ghost"
                        className="relative h-9 w-9 rounded-lg p-0"
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Account")}</p>
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
                      {t("Dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingBagIcon className="mr-2 h-4 w-4" />
                      {t("My Orders")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rfq">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      {t("My Requests")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "SHOPKEEPER" && (
                    <DropdownMenuItem asChild>
                      <Link href="/shop/manage">
                        <BuildingStorefrontIcon className="mr-2 h-4 w-4" />
                        {t("My Shop")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin">
                          <ShieldCheckIcon className="mr-2 h-4 w-4" />
                          {t("Admin Panel")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin/orders">
                          <ClipboardDocumentListIcon className="mr-2 h-4 w-4" />
                          {t("All Orders")}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/${user.role === "ADMIN" ? "admin" : user.role === "SHOPKEEPER" ? "shop" : "customer"}/settings`}
                    >
                      <Cog6ToothIcon className="mr-2 h-4 w-4" />
                      {t("Settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-red-600"
                  >
                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                    <T>Log out</T>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          ) : (
            <>
              {/* Cart for non-authenticated users — only when customer flow is on */}
              {customerFlowEnabled && (
              <Link href="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-lg"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </Button>
              </Link>
              )}
              <Link href="/auth/login">
                <Button variant="ghost" className="h-9 rounded-lg">
                  <T>Log in</T>
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="h-9 rounded-lg gold-gradient text-white">
                  {customerFlowEnabled ? <T>Sign up</T> : <T>Get Started</T>}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Auth Icons */}
        <div className="flex lg:hidden items-center gap-1">
          {mounted && !authLoading && isAuthenticated && user && (
            <>
              {/* First quick action for mobile */}
              <Link
                href={
                  getRoleQuickActions(user.role)[0]?.href ||
                  getDashboardRoute(user.role)
                }
              >
                <Button variant="ghost" size="icon" className="touch-target">
                  {(() => {
                    const Icon =
                      getRoleQuickActions(user.role)[0]?.icon || Squares2X2Icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </Button>
              </Link>
              <Link href="/notifications">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative touch-target"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
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
          {mounted && !authLoading && !isAuthenticated && (
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
