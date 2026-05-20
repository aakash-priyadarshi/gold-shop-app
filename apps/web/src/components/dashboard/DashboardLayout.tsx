"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ShopSwitcher } from "@/components/dashboard/ShopSwitcher";
import { SuspendedOverlay } from "@/components/dashboard/SuspendedOverlay";
import { MessageDropdown } from "@/components/notifications/MessageDropdown";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OrivraaLoader, {
    useMinLoadingTime,
} from "@/components/ui/OrivraaLoader";
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
import { BRAND } from "@/config/brand";
// ChatPopupProvider is now in root Providers
import { useAuth, UserRole } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { useHelpUIStore } from "@/store/help-ui";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    CURRENCIES,
    LANGUAGES,
    usePreferencesStore,
    type CurrencyCode,
    type Language,
    type DashboardMode,
} from "@/store/preferences";
import {
    Activity,
    Award,
    Bell,
    BookOpen,
    Brain,
    Bug,
    Calculator,
    ChevronDown,
    ClipboardList,
    CreditCard,
    FileEdit,
    FileText,
    FlaskConical,
    Gift,
    Globe,
    Heart,
    Home,
    LayoutDashboard,
    LifeBuoy,
    LogOut,
    Menu,
    MessageSquare,
    Package,
    Receipt,
    ScanLine,
    Search,
    Settings,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ShoppingCart,
    Star,
    MessageCircle,
    HelpCircle,
    Store,
    Ticket,
    TrendingUp,
    UserCircle,
    Briefcase,
    Users,
    Wrench,
} from "lucide-react";
import { useDesktopShortcuts } from "@/hooks/useDesktopShortcuts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Lazy-load tutorial button (driver.js CSS is ~20KB)
const TutorialButton = dynamic(
  () =>
    import("@/components/tutorial/TutorialButton").then(
      (mod) => mod.TutorialButton,
    ),
  { ssr: false },
);

function RecallButtons() {
  const { isChatDismissed, isTutorialDismissed, recallChat, recallTutorial } = useHelpUIStore();
  const t = useT();

  if (!isChatDismissed && !isTutorialDismissed) return null;

  return (
    <>
      {isChatDismissed && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
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
              <p>{t("Restore AI Chat")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isTutorialDismissed && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
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
              <p>{t("Restore Tutorials")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}

function LanguageSelector() {
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
      <SelectTrigger className="w-[110px] h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
        <Globe className="h-3.5 w-3.5 mr-1 text-gray-400" />
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
  );
}

function CurrencySelector() {
  const currency = usePreferencesStore((s) => s.currency);
  const setCurrency = usePreferencesStore((s) => s.setCurrency);

  return (
    <Select
      value={currency}
      onValueChange={(v) => setCurrency(v as CurrencyCode)}
    >
      <SelectTrigger className="w-[100px] h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
        <CreditCard className="h-3.5 w-3.5 mr-1 text-gray-400" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(CURRENCIES).map(([code, info]) => (
          <SelectItem key={code} value={code} className="text-xs">
            <span className="mr-1">{info.symbol}</span>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number | "dynamic";
  badgeKey?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  // ── Admin routes ──────────────────────────────────────
  {
    label: "Dashboard",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    label: "Messages",
    href: "/dashboard/admin/messages",
    icon: MessageSquare,
    roles: ["ADMIN"],
  },
  {
    label: "Tickets",
    href: "/dashboard/admin/tickets",
    icon: Ticket,
    roles: ["ADMIN"],
    badge: "dynamic",
    badgeKey: "openTickets",
  },
  {
    label: "Chat Moderation",
    href: "/dashboard/admin/chat-monitoring",
    icon: ShieldAlert,
    roles: ["ADMIN"],
  },
  {
    label: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    label: "Shops & CRM",
    href: "/dashboard/admin/shops",
    icon: Store,
    roles: ["ADMIN"],
  },
  {
    label: "Orders",
    href: "/dashboard/admin/orders",
    icon: ShoppingCart,
    roles: ["ADMIN"],
    badge: "dynamic",
    badgeKey: "pendingOrders",
  },
  {
    label: "KYC & Verification",
    href: "/dashboard/admin/verifications",
    icon: Shield,
    roles: ["ADMIN"],
    badge: "dynamic",
    badgeKey: "pendingVerifications",
  },
  {
    label: "Reports",
    href: "/dashboard/admin/reports",
    icon: FileText,
    roles: ["ADMIN"],
    badge: "dynamic",
    badgeKey: "openReports",
  },
  {
    label: "Tax Reports",
    href: "/dashboard/admin/tax-reports",
    icon: Receipt,
    roles: ["ADMIN"],
  },
  {
    label: "Analytics",
    href: "/dashboard/admin/analytics",
    icon: Activity,
    roles: ["ADMIN"],
  },
  {
    label: "Billing & Plans",
    href: "/dashboard/admin/billing",
    icon: CreditCard,
    roles: ["ADMIN"],
  },
  {
    label: "Blog",
    href: "/dashboard/admin/blog",
    icon: FileEdit,
    roles: ["ADMIN"],
  },
  {
    label: "Reviews",
    href: "/dashboard/admin/reviews",
    icon: Star,
    roles: ["ADMIN"],
  },
  {
    label: "Referrals",
    href: "/dashboard/admin/referrals",
    icon: Gift,
    roles: ["ADMIN"],
  },
  // ── Maintenance / Ops (collapsible group) ──
  {
    label: "Maintenance",
    href: "/dashboard/admin/intelligence",
    icon: Wrench,
    roles: ["ADMIN"],
    children: [
      {
        label: "Intelligence",
        href: "/dashboard/admin/intelligence",
        icon: Brain,
        roles: ["ADMIN"],
      },
      {
        label: "Health Check",
        href: "/dashboard/admin/health-check",
        icon: Activity,
        roles: ["ADMIN"],
      },
      {
        label: "SMS Test",
        href: "/dashboard/admin/sms-test",
        icon: MessageSquare,
        roles: ["ADMIN"],
      },
      {
        label: "Performance",
        href: "/dashboard/admin/performance",
        icon: Activity,
        roles: ["ADMIN"],
      },
      {
        label: "Security",
        href: "/dashboard/admin/security",
        icon: ShieldCheck,
        roles: ["ADMIN"],
      },
      {
        label: "Testing",
        href: "/dashboard/admin/testing",
        icon: FlaskConical,
        roles: ["ADMIN"],
      },
      {
        label: "Notification Tests",
        href: "/dashboard/admin/testing/notifications",
        icon: Bell,
        roles: ["ADMIN"],
      },
      {
        label: "Crash Reports",
        href: "/dashboard/admin/crash-reports",
        icon: Bug,
        roles: ["ADMIN"],
      },
      {
        label: "Releases",
        href: "/dashboard/admin/releases",
        icon: Package,
        roles: ["ADMIN"],
      },
    ],
  },
  // ── Account ──
  {
    label: "Profile",
    href: "/dashboard/admin/profile",
    icon: UserCircle,
    roles: ["ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },

  // Shopkeeper routes
  {
    label: "Dashboard",
    href: "/dashboard/shop",
    icon: LayoutDashboard,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "POS Basket",
    href: "/dashboard/shop/pos",
    icon: ScanLine,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Walk-in Quotes",
    href: "/dashboard/shop/quotes",
    icon: Calculator,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Invoices",
    href: "/dashboard/shop/invoices",
    icon: Receipt,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Orders",
    href: "/dashboard/shop/orders",
    icon: ShoppingCart,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "RFQ Requests",
    href: "/dashboard/shop/rfqs",
    icon: ClipboardList,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Products",
    href: "/dashboard/shop/products",
    icon: Store,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Inventory",
    href: "/dashboard/shop/inventory",
    icon: Package,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Catalogues",
    href: "/dashboard/shop/catalogues",
    icon: BookOpen,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Customers",
    href: "/dashboard/shop/customers",
    icon: Users,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Messages",
    href: "/dashboard/shop/messages",
    icon: MessageSquare,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Analytics",
    href: "/dashboard/shop/analytics",
    icon: TrendingUp,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Tax Reports",
    href: "/dashboard/shop/tax-reports",
    icon: FileText,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Reviews",
    href: "/dashboard/shop/reviews",
    icon: Star,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Referrals",
    href: "/dashboard/shop/referrals",
    icon: Gift,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Engagement",
    href: "/dashboard/shop/engagement",
    icon: Award,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Desktop App",
    href: "/dashboard/shop/desktop",
    icon: Activity,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Tools",
    href: "/dashboard/shop/tools",
    icon: Wrench,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Profile",
    href: "/dashboard/shop/profile",
    icon: UserCircle,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Billing",
    href: "/dashboard/shop/billing",
    icon: CreditCard,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Shop Settings",
    href: "/dashboard/shop/settings",
    icon: Settings,
    roles: ["SHOPKEEPER"],
  },

  // Customer routes
  {
    label: "Dashboard",
    href: "/dashboard/customer",
    icon: LayoutDashboard,
    roles: ["CUSTOMER"],
  },
  {
    label: "Messages",
    href: "/dashboard/customer/messages",
    icon: MessageSquare,
    roles: ["CUSTOMER"],
  },
  {
    label: "My Orders",
    href: "/dashboard/customer/orders",
    icon: ShoppingCart,
    roles: ["CUSTOMER"],
  },
  {
    label: "My RFQs",
    href: "/dashboard/customer/rfqs",
    icon: ClipboardList,
    roles: ["CUSTOMER"],
  },
  {
    label: "Wishlist",
    href: "/dashboard/customer/wishlist",
    icon: Heart,
    roles: ["CUSTOMER"],
  },
  {
    label: "Payments",
    href: "/dashboard/customer/payments",
    icon: CreditCard,
    roles: ["CUSTOMER"],
  },
  {
    label: "Settings",
    href: "/dashboard/customer/settings",
    icon: Settings,
    roles: ["CUSTOMER"],
  },

  // Sales routes
  {
    label: "Dashboard",
    href: "/dashboard/sales",
    icon: LayoutDashboard,
    roles: ["SALES"],
  },
  {
    label: "Messages",
    href: "/dashboard/sales/messages",
    icon: MessageSquare,
    roles: ["SALES"],
  },
  {
    label: "Shops & CRM",
    href: "/dashboard/sales/shops",
    icon: Store,
    roles: ["SALES"],
  },
  {
    label: "Orders",
    href: "/dashboard/sales/orders",
    icon: ShoppingCart,
    roles: ["SALES"],
  },
  {
    label: "Profile",
    href: "/dashboard/sales/profile",
    icon: UserCircle,
    roles: ["SALES"],
  },

  // Support routes
  {
    label: "Dashboard",
    href: "/dashboard/support",
    icon: LayoutDashboard,
    roles: ["SUPPORT"],
  },
  {
    label: "Tickets",
    href: "/dashboard/support/tickets",
    icon: Ticket,
    roles: ["SUPPORT"],
    badge: "dynamic",
    badgeKey: "openTickets",
  },
  {
    label: "Messages",
    href: "/dashboard/support/messages",
    icon: MessageSquare,
    roles: ["SUPPORT"],
  },
  {
    label: "Flagged Chats",
    href: "/dashboard/support/flagged",
    icon: ShieldAlert,
    roles: ["SUPPORT"],
  },
  {
    label: "Profile",
    href: "/dashboard/support/profile",
    icon: UserCircle,
    roles: ["SUPPORT"],
  },

  // "Help & Support" for end users (creates/views their tickets)
  {
    label: "Help & Support",
    href: "/dashboard/customer/support",
    icon: LifeBuoy,
    roles: ["CUSTOMER"],
  },
  {
    label: "Help & Support",
    href: "/dashboard/shop/support",
    icon: LifeBuoy,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Tutorial",
    href: "/dashboard/shop/help",
    icon: BookOpen,
    roles: ["SHOPKEEPER"],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Shared sidebar content component
function SidebarContent({
  user,
  userNavItems,
  pathname,
  badgeCounts,
  onNavClick,
  onLogout,
  getRoleBadge,
  getInitials,
}: {
  user: ReturnType<typeof useAuth>["user"];
  userNavItems: NavItem[];
  pathname: string;
  badgeCounts: Record<string, number>;
  onNavClick?: () => void;
  onLogout: () => void;
  getRoleBadge: (role: UserRole) => React.ReactNode;
  getInitials: () => string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const t = useT();

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > 8;
    setCanScrollDown(hasMore);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  // Track which collapsible groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand group if a child is currently active
  useEffect(() => {
    const expanded: Record<string, boolean> = {};
    for (const item of userNavItems) {
      if (item.children) {
        const childActive = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
        );
        if (childActive) expanded[item.label] = true;
      }
    }
    setOpenGroups((prev) => ({ ...prev, ...expanded }));
  }, [pathname, userNavItems]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-gold-100 dark:ring-gold-900/50">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-gold-400 to-gold-600 text-white font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
              {user.email}
            </p>
            {getRoleBadge(user.role)}
          </div>
        </div>
        {user.shop && (
          <div className="mt-3 p-3 bg-gradient-to-r from-gold-50 to-amber-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-xl border border-gold-100 dark:border-amber-800/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
              <T>Active Shop</T>
            </p>
            <ShopSwitcher currentShopId={user.shop.id} />
            {!user.shop.isVerified && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                <T>Pending verification</T>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation with scroll indicator */}
      <div className="flex-1 relative overflow-hidden">
        <nav
          ref={navRef}
          className="h-full p-3 space-y-1 overflow-y-auto scrollbar-thin"
        >
          {userNavItems.map((item) => {
            // ── Collapsible group ──
            if (item.children && item.children.length > 0) {
              const isOpen = !!openGroups[item.label];
              const hasActiveChild = item.children.some(
                (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
              );
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 touch-target",
                      hasActiveChild
                        ? "bg-gold-50 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 active:scale-[0.98]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{t(item.label)}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                      {item.children.map((child) => {
                        const isChildActive =
                          pathname === child.href ||
                          pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            scroll={false}
                            onClick={onNavClick}
                            data-active={isChildActive}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isChildActive
                                ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md shadow-gold-500/25"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
                            )}
                          >
                            <child.icon
                              className={cn(
                                "h-4 w-4",
                                isChildActive && "text-white",
                              )}
                            />
                            <span>{t(child.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Regular nav item ──
            const isActive = pathname === item.href;
            const badgeCount =
              item.badge === "dynamic" && item.badgeKey
                ? badgeCounts[item.badgeKey]
                : item.badge;
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                onClick={onNavClick}
                data-active={isActive}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 touch-target",
                  isActive
                    ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg shadow-gold-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 active:scale-[0.98]",
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn("h-5 w-5", isActive && "text-white")}
                  />
                  <span>{t(item.label)}</span>
                </div>
                {badgeCount && Number(badgeCount) > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-semibold rounded-full",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Scroll-down indicator */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="h-10 bg-gradient-to-t from-white dark:from-card to-transparent" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={() =>
                  navRef.current?.scrollBy({ top: 100, behavior: "smooth" })
                }
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 transition-colors"
              >
                <ChevronDown className="h-3 w-3" /> more
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
        >
          <Home className="h-5 w-5" />
          <span>
            <T>Browse Marketplace</T>
          </span>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-target"
        >
          <LogOut className="h-5 w-5" />
          <span>
            <T>Sign out</T>
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const { features } = usePlatformFeatures();
  const customerFlowEnabled = features.customerFlowEnabled;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const dashboardMode = usePreferencesStore((s) => s.dashboardMode);
  const setDashboardMode = usePreferencesStore((s) => s.setDashboardMode);

  // Initialize desktop shortcuts
  useDesktopShortcuts();

  // Fetch dynamic badge counts for admin
  useEffect(() => {
    if (user?.role === "ADMIN") {
      adminApi
        .getStats()
        .then((res) => {
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

  const showLoader = useMinLoadingTime(isLoading || !user);

  if (showLoader) {
    return <OrivraaLoader />;
  }

  // TypeScript narrowing: user is guaranteed non-null after loader gate
  if (!user) return null;

  // Filter nav items for user's role and feature flags
  const rawNavItems = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    
    // Hide marketplace-specific features if customer flow is disabled
    if (!customerFlowEnabled && user.role === "SHOPKEEPER") {
      const marketplaceLinks = [
        "/dashboard/shop/engagement", 
        "/dashboard/shop/reviews", 
        "/dashboard/shop/referrals", 
        "/dashboard/shop/commissions"
      ];
      if (marketplaceLinks.includes(item.href)) {
        return false;
      }
    }
    return true;
  });

  const userNavItems = user.role === "SHOPKEEPER" && dashboardMode === "EASY"
    ? rawNavItems.reduce((acc, item) => {
        const easyLinks = [
          "/dashboard/shop",
          "/dashboard/shop/pos",
          "/dashboard/shop/quotes",
          "/dashboard/shop/invoices",
          "/dashboard/shop/orders",
          "/dashboard/shop/rfqs",
          "/dashboard/shop/products",
          "/dashboard/shop/inventory",
          "/dashboard/shop/customers",
          "/dashboard/shop/messages",
          "/dashboard/shop/settings",
          "/dashboard/shop/support",
          "/dashboard/shop/help"
        ];
        if (easyLinks.includes(item.href)) {
          acc.push(item);
        } else {
          // Put the rest in "More ERP Tools" group
          let moreGroup = acc.find((i) => i.label === "More ERP Tools");
          if (!moreGroup) {
            moreGroup = {
              label: "More ERP Tools",
              href: "#",
              icon: Settings,
              roles: ["SHOPKEEPER"],
              children: [],
            };
            acc.push(moreGroup);
          }
          moreGroup.children!.push(item);
        }
        return acc;
      }, [] as NavItem[])
    : rawNavItems;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="status-badge status-badge-purple">
            <T>Admin</T>
          </span>
        );
      case "SHOPKEEPER":
        return (
          <span className="status-badge status-badge-blue">
            <T>Seller</T>
          </span>
        );
      case "CUSTOMER":
        return (
          <span className="status-badge status-badge-green">
            <T>Customer</T>
          </span>
        );
      case "SALES":
        return (
          <span className="status-badge status-badge-yellow">
            <T>Sales</T>
          </span>
        );
    }
  };

  const getInitials = () => {
    return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gold-50/20 dark:from-[#0B0C10] dark:via-[#0B0C10] dark:to-[#0B0C10]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#161B22]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target -ml-2"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="p-4 border-b border-gray-100 dark:border-gray-800">
                <SheetTitle className="flex items-center gap-2">
                  <BrandLogo variant="icon" size="sm" />
                  <span className="font-bold text-lg">{BRAND.name}</span>
                </SheetTitle>
              </SheetHeader>
              <SidebarContent
                user={user}
                userNavItems={userNavItems}
                pathname={pathname}
                badgeCounts={badgeCounts}
                onNavClick={() => setMobileMenuOpen(false)}
                onLogout={logout}
                getRoleBadge={getRoleBadge}
                getInitials={getInitials}
              />
            </SheetContent>
          </Sheet>

          {/* Mobile Logo */}
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo variant="icon" size="sm" />
            <span className="font-bold text-base">{BRAND.name}</span>
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Theme Toggle */}
            <AnimatedThemeToggle size={36} className="touch-target" />
            <MessageDropdown />
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="touch-target">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${user.role.toLowerCase()}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    <T>Settings</T>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Store className="h-4 w-4 mr-2" />
                    <T>Browse Marketplace</T>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <T>Sign out</T>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <aside className="fixed top-0 left-0 z-40 h-screen w-72 bg-white dark:bg-[#161B22] border-r border-gray-100 dark:border-gray-800 shadow-sm">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-100 dark:border-gray-800">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo variant="icon" size="md" />
              <span className="font-bold text-xl tracking-tight">
                {BRAND.name}
              </span>
            </Link>
          </div>

          <SidebarContent
            user={user}
            userNavItems={userNavItems}
            pathname={pathname}
            badgeCounts={badgeCounts}
            onLogout={logout}
            getRoleBadge={getRoleBadge}
            getInitials={getInitials}
          />
        </aside>

        {/* Desktop Main Content */}
        <div className="flex-1 ml-72">
          {/* Desktop Header */}
          <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#161B22]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100/80 dark:bg-white/5 rounded-xl px-4 py-2.5 w-72">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Recall dismissed floating elements */}
              <RecallButtons />

              {/* Language Selector */}
              <LanguageSelector />

              {/* Currency Selector */}
              <CurrencySelector />

              {/* Theme Toggle */}
              <AnimatedThemeToggle size={40} />

              {/* Shopkeeper Mode Toggle */}
              {user.role === "SHOPKEEPER" && (
                <div 
                  className="hidden md:inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1"
                  data-tour="dashboard-mode-toggle"
                >
                  <button
                    onClick={() => setDashboardMode("EASY")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      dashboardMode === "EASY" 
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                  >
                    <T>Easy</T>
                  </button>
                  <button
                    onClick={() => setDashboardMode("ADVANCED")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      dashboardMode === "ADVANCED" 
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                  >
                    <T>Advanced</T>
                  </button>
                </div>
              )}

              <MessageDropdown />
              <NotificationDropdown />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-gold-100 dark:ring-gold-900/50">
                      <AvatarFallback className="bg-gradient-to-br from-gold-400 to-gold-600 text-white text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden xl:block text-left">
                      <p className="text-sm font-medium dark:text-gray-200">
                        {user.firstName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role.toLowerCase()}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/${user.role.toLowerCase()}/settings`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      <T>Settings</T>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/">
                      <Store className="h-4 w-4 mr-2" />
                      <T>Browse Marketplace</T>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <T>Sign out</T>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">{children}</main>
        </div>
      </div>

      {/* Mobile Main Content */}
      <main className="lg:hidden px-4 py-4 pb-20 safe-area-bottom">
        {children}
      </main>

      {/* Floating tutorial button */}
      <TutorialButton />

      {/* Suspended account lock overlay */}
      <SuspendedOverlay />
    </div>
  );
}
