"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ChatPopupWidget } from "@/components/chat/ChatPopupWidget";
import { ShopSwitcher } from "@/components/dashboard/ShopSwitcher";
import { SuspendedOverlay } from "@/components/dashboard/SuspendedOverlay";
import { MessageDropdown } from "@/components/notifications/MessageDropdown";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BRAND } from "@/config/brand";
// ChatPopupProvider is now in root Providers
import { useAuth, UserRole } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  Brain,
  Calculator,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Receipt,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Store,
  Sun,
  Ticket,
  TrendingUp,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number | "dynamic";
  badgeKey?: string;
}

const navItems: NavItem[] = [
  // Admin routes
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
  {
    label: "Intelligence",
    href: "/dashboard/admin/intelligence",
    icon: Brain,
    roles: ["ADMIN"],
  },
  {
    label: "Billing & Plans",
    href: "/dashboard/admin/billing",
    icon: CreditCard,
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
    label: "Messages",
    href: "/dashboard/shop/messages",
    icon: MessageSquare,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Products",
    href: "/dashboard/shop/products",
    icon: Store,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Catalogues",
    href: "/dashboard/shop/catalogues",
    icon: BookOpen,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Inventory",
    href: "/dashboard/shop/inventory",
    icon: Package,
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
    label: "Walk-in Quotes",
    href: "/dashboard/shop/quotes",
    icon: Calculator,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "POS Basket",
    href: "/dashboard/shop/pos",
    icon: ScanLine,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Invoices",
    href: "/dashboard/shop/invoices",
    icon: Receipt,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Customers",
    href: "/dashboard/shop/customers",
    icon: Users,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Tools",
    href: "/dashboard/shop/tools",
    icon: Wrench,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Analytics",
    href: "/dashboard/shop/analytics",
    icon: TrendingUp,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Engagement",
    href: "/dashboard/shop/engagement",
    icon: Award,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Billing",
    href: "/dashboard/shop/billing",
    icon: CreditCard,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Profile",
    href: "/dashboard/shop/profile",
    icon: UserCircle,
    roles: ["SHOPKEEPER"],
  },
  {
    label: "Shop Profile",
    href: "/dashboard/shop/shop-profile",
    icon: Store,
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

  // Admin tickets link
  {
    label: "Tickets",
    href: "/dashboard/admin/tickets",
    icon: Ticket,
    roles: ["ADMIN"],
    badge: "dynamic",
    badgeKey: "openTickets",
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
  if (!user) return null;

  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

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

  // Scroll the active nav item into view on pathname change
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = navRef.current;
      if (!el) return;
      const active = el.querySelector('[data-active="true"]') as HTMLElement;
      if (active) {
        active.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }, [pathname]);

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
              Active Shop
            </p>
            <ShopSwitcher currentShopId={user.shop.id} />
            {!user.shop.isVerified && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                Pending verification
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
            const isActive = pathname === item.href;
            const badgeCount =
              item.badge === "dynamic" && item.badgeKey
                ? badgeCounts[item.badgeKey]
                : item.badge;
            return (
              <Link
                key={item.href}
                href={item.href}
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
                  <span>{item.label}</span>
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
          <span>Browse Marketplace</span>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-target"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign out</span>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gold-50/30 dark:from-[#0B0C10] dark:to-[#0B0C10]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 dark:border-gold-800 animate-spin border-t-transparent"></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Filter nav items for user's role
  const userNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <span className="status-badge status-badge-purple">Admin</span>;
      case "SHOPKEEPER":
        return <span className="status-badge status-badge-blue">Seller</span>;
      case "CUSTOMER":
        return (
          <span className="status-badge status-badge-green">Customer</span>
        );
      case "SALES":
        return <span className="status-badge status-badge-yellow">Sales</span>;
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newTheme = resolvedTheme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                (window as any).__saveThemeToServer?.(newTheme);
              }}
              className="touch-target text-gray-500 dark:text-gray-400"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
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
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Store className="h-4 w-4 mr-2" />
                    Browse Marketplace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
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
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newTheme = resolvedTheme === "dark" ? "light" : "dark";
                  setTheme(newTheme);
                  (window as any).__saveThemeToServer?.(newTheme);
                }}
                className="rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

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
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/">
                      <Store className="h-4 w-4 mr-2" />
                      Browse Marketplace
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
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

      {/* Floating Chat Popup */}
      <ChatPopupWidget />

      {/* Suspended account lock overlay */}
      <SuspendedOverlay />
    </div>
  );
}
