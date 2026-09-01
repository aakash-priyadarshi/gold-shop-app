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
import { LanguageMegaMenu } from "@/components/i18n/LanguageMegaMenu";
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
import { useT, useTranslation } from "@/providers/translation-provider";
import {
  PUBLIC_LANGUAGE_PAGES,
  type Language as PublicLanguage,
} from "@/data/about-i18n";
import { useHelpUIStore } from "@/store/help-ui";
import {
  COUNTRIES,
  CURRENCIES,
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
  HeartIcon,
  InformationCircleIcon,
  KeyIcon,
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
import { HelpCircle, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { items, itemCount, subtotal, removeFromCart } = useCart();
  const t = useT();
  const { locale: effectiveLanguage } = useTranslation();
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

  const { isChatDismissed, isTutorialDismissed, recallChat, recallTutorial } =
    useHelpUIStore();

  // Get preferences from store
  const currency = usePreferencesStore((state) => state.currency);
  const country = usePreferencesStore((state) => state.country);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setAuthenticated = usePreferencesStore(
    (state) => state.setAuthenticated,
  );

  const changeLanguage = (value: string) => {
    const nextLanguage = value as Language;
    setLanguage(nextLanguage);

    if (!/^\/(?:about|tutorial)(?:\/|$)/.test(pathname)) return;

    const publicPages = PUBLIC_LANGUAGE_PAGES[nextLanguage as PublicLanguage];
    if (!publicPages) {
      // Languages can ship in the application before reviewed, indexable
      // marketing copy exists. The home page can use the runtime pipeline.
      router.push("/");
      return;
    }

    const prefersTutorial = pathname.startsWith("/tutorial");
    router.push(
      (prefersTutorial
        ? (publicPages.tutorial ?? publicPages.about)
        : (publicPages.about ?? publicPages.tutorial)) ?? "/",
    );
  };

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

  const { features } = usePlatformFeatures();
  const customerFlowEnabled = features.customerFlowEnabled;

  // Primary nav links (flat)
  const navigation = customerFlowEnabled
    ? [
        { name: "Shops", href: "/shops", icon: BuildingStorefrontIcon },
        { name: "Designs", href: "/designs", icon: HeartIcon },
        { name: "Custom Order", href: "/rfq/create", icon: SparklesIcon },
      ]
    : [
        {
          name: "Jewellery Software",
          href: "/jewellery-shop-software",
          icon: Squares2X2Icon,
        },
        { name: "Pricing", href: "/pricing", icon: CreditCardIcon },
        {
          name: "Support",
          href: "/support",
          icon: ChatBubbleLeftRightIcon,
        },
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
      name: "Mobile POS",
      href: "/jewellery-pos-software",
      icon: ShoppingBagIcon,
      desc: "Run billing and checkout on any smartphone",
    },
    {
      name: "Store Management",
      href: "/jewellery-store-management-software",
      icon: BuildingOffice2Icon,
      desc: "Inventory, CRM, billing, and operations in one place",
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
      name: "Support",
      href: "/support",
      icon: ChatBubbleLeftRightIcon,
      desc: "Get onboarding, billing, and product help",
    },
    {
      name: "Ask AI about Orivraa",
      href: "/ask-ai",
      icon: SparklesIcon,
      desc: "ChatGPT, Claude, Google AI, or Perplexity",
    },
    {
      name: "Seller AI keys & MCP",
      href: "/ai-integration",
      icon: KeyIcon,
      desc: "Scoped inventory and order tools for your shop AI",
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
      name: "Demo",
      href: "/demo",
      icon: SparklesIcon,
      desc: "Watch the 30-second Orivraa walkthrough",
    },
    {
      name: "Tutorial",
      href: "/tutorial",
      icon: BookOpenIcon,
      desc: "See the full product walkthrough",
    },
    {
      name: "About",
      href: "/about",
      icon: InformationCircleIcon,
      desc: "Learn about Orivraa's mission and team",
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
          <SheetTrigger
            asChild
            className="lg:hidden"
            aria-controls="mobile-navigation-sheet"
          >
            <Button variant="ghost" size="icon" className="touch-target -ml-2">
              <Bars3Icon className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            id="mobile-navigation-sheet"
            side="left"
            className="w-[300px] p-0"
          >
            <SheetHeader className="p-4 border-b border-gray-100 dark:border-gray-800">
              <SheetTitle className="flex items-center gap-2">
                <BrandLogo variant="icon" size="sm" linkToHome={false} />
                <span className="font-bold text-lg">{BRAND.name}</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100%-65px)]">
              {/* Mobile Navigation */}
              <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                {/* Browse */}
                {navigation.map((item) => (
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
                          ? "bg-gold-50/80 dark:bg-gold-950/30 border border-gold-200/50 dark:border-gold-800/40 text-gold-800 dark:text-gold-300 hover:bg-gold-100/55 dark:hover:bg-gold-950/50 mb-1"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`h-5 w-5 ${item.featured ? "text-gold-600 dark:text-gold-400" : "text-gold-550"}`}
                      />
                      <T>{item.name}</T>
                    </Link>
                  ))}
                </div>

                {/* More */}
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 mb-2">
                    <T>Learn</T>
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
                    <LanguageMegaMenu
                      value={effectiveLanguage}
                      onValueChange={changeLanguage}
                      variant="field"
                      align="start"
                    />

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
                        <T>Sign up</T>
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
          <BrandLogo
            variant="icon"
            size="sm"
            className="lg:hidden"
            linkToHome={false}
          />
          <BrandLogo
            variant="icon"
            size="md"
            className="hidden lg:block"
            linkToHome={false}
          />
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
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <T>{item.name}</T>
            </Link>
          ))}

          {/* For Sellers Mega-Menu */}
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
                className={`h-3.5 w-3.5 transition-transform duration-200 ${sellerDropdownOpen ? "rotate-180" : ""}`}
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
            <AnimatePresence>
              {sellerDropdownOpen && (
                <>
                  {/* Invisible bridge */}
                  <div className="absolute top-full left-0 h-3 w-full" />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="absolute top-full -left-20 mt-3 w-[640px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-5 z-50"
                  >
                    <div className="grid grid-cols-5 gap-5">
                      {/* Left: Featured Card with workshop image (2 cols) */}
                      <Link
                        href="/for-sellers"
                        onClick={() => setSellerDropdownOpen(false)}
                        className="col-span-2 group relative rounded-xl overflow-hidden border border-gold-200/40 dark:border-gold-800/30 hover:border-gold-400/60 dark:hover:border-gold-600/40 transition-all"
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url('https://images.orivraa.com/images/public/hasan-mrad-9Foi-h8zmIU-unsplash.jpg')`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/50 to-gray-950/20" />
                        <div className="relative p-5 flex flex-col justify-end min-h-[240px]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/20 text-gold-300 text-[10px] font-bold uppercase tracking-wider w-fit mb-2 border border-gold-500/20">
                            <SparklesIcon className="h-3 w-3" />
                            Featured
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-300 transition-colors">
                            <T>Start Selling Free</T>
                          </h3>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            <T>
                              See how Orivraa works for jewellers — free setup,
                              no credit card
                            </T>
                          </p>
                        </div>
                      </Link>

                      {/* Right: Link Grid (3 cols) */}
                      <div className="col-span-3 grid grid-cols-1 gap-0.5">
                        {sellerNavItems
                          .filter((item) => !item.featured)
                          .map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group/link"
                              onClick={() => setSellerDropdownOpen(false)}
                            >
                              <item.icon className="h-5 w-5 mt-0.5 shrink-0 text-gold-500 group-hover/link:text-gold-600 dark:group-hover/link:text-gold-400 transition-colors" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover/link:text-gold-700 dark:group-hover/link:text-gold-300 transition-colors">
                                  <T>{item.name}</T>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                  <T>{item.desc}</T>
                                </div>
                              </div>
                            </Link>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Learn Mega-Menu */}
          <div
            className="relative"
            onMouseEnter={() => setCompanyDropdownOpen(true)}
            onMouseLeave={() => setCompanyDropdownOpen(false)}
          >
            <button
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors inline-flex items-center gap-1"
              onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            >
              <T>Learn</T>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${companyDropdownOpen ? "rotate-180" : ""}`}
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
            <AnimatePresence>
              {companyDropdownOpen && (
                <>
                  <div className="absolute top-full left-0 h-3 w-full" />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="absolute top-full right-0 mt-3 w-[380px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden z-50"
                  >
                    {/* Featured image header */}
                    <Link
                      href="/demo"
                      onClick={() => setCompanyDropdownOpen(false)}
                      className="block relative group"
                    >
                      <div
                        className="h-36 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('https://images.orivraa.com/images/public/amy-vann-85-6iMn5L8g-unsplash%20(1).jpg')`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/30 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-white font-bold text-sm group-hover:text-gold-300 transition-colors">
                          <T>Watch the 30-second demo</T>
                        </p>
                        <p className="text-gray-300 text-xs">
                          <T>
                            See Orivraa in action — inventory, POS & billing
                          </T>
                        </p>
                      </div>
                    </Link>

                    {/* Link list */}
                    <div className="p-3">
                      {moreNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group/link"
                          onClick={() => setCompanyDropdownOpen(false)}
                        >
                          <item.icon className="h-5 w-5 text-gold-500 mt-0.5 shrink-0 group-hover/link:text-gold-600 dark:group-hover/link:text-gold-400 transition-colors" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover/link:text-gold-700 dark:group-hover/link:text-gold-300 transition-colors">
                              <T>{item.name}</T>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              <T>{item.desc}</T>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Preferences Controls */}
        <div className="hidden lg:flex items-center gap-2">
          {mounted && (
            <>
              {/* Language Selector */}
              <LanguageMegaMenu
                value={effectiveLanguage}
                onValueChange={changeLanguage}
                variant="toolbar"
              />

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

              {/* Theme Toggle */}
              <AnimatedThemeToggle size={36} className="rounded-lg" />
            </>
          )}
        </div>

        {/* Desktop Auth/User Menu */}
        <div className="hidden lg:flex items-center gap-2">
          {mounted && isChatDismissed && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg mr-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => recallChat()}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    <T>Restore AI Chat</T>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {mounted && isTutorialDismissed && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg mr-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={() => recallTutorial()}
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    <T>Restore Tutorials</T>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
                      <p>
                        <T>Dashboard</T>
                      </p>
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
                      <p>
                        <T>Shop Dashboard</T>
                      </p>
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
                          <span className="text-sm">
                            <T>Shops & CRM</T>
                          </span>
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
                          <span className="text-sm">
                            <T>Shops & CRM</T>
                          </span>
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

              {/* Cart Popover */}
              {customerFlowEnabled && (
                <Popover
                  open={cartPopoverOpen}
                  onOpenChange={setCartPopoverOpen}
                >
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
              {/* Cart for non-authenticated users */}
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
              <Link href="/auth/login">
                <Button variant="ghost" className="h-9 rounded-lg">
                  <T>Log in</T>
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="h-9 rounded-lg gold-gradient text-white">
                  <T>Sign up</T>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Auth Icons */}
        <div className="flex lg:hidden items-center gap-1">
          {mounted && isChatDismissed && (
            <Button
              variant="ghost"
              size="icon"
              className="relative touch-target text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 mr-1 active:scale-95"
              onClick={() => recallChat()}
              aria-label="Restore AI Chat"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
            </Button>
          )}
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
