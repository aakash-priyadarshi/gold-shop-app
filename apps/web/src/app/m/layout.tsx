"use client";

// Note: PWA manifest for the mobile POS app is at /manifest-pos.json
// It is linked via <head> in apps/web/src/app/m/head.tsx (or Next.js metadata API in a
// server-side wrapper if needed). The manifest-pos.json is already in /public/.

import { MobileLayoutLoader } from "@/components/mobile/MobileSkeleton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
    BarChart2,
    Bell,
    Cake,
    Calculator,
    ChevronRight,
    FileText,
    FlaskConical,
    Image,
    LogOut,
    MessageCircle,
    Package,
    Receipt,
    RefreshCw,
    Scale,
    ScanLine,
    ShoppingBag,
    Users,
    Wallet,
    Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Lazy-load heavy floating widgets (driver.js CSS ~20 KB, SupportBot ~10 KB)
const TutorialButton = dynamic(
  () =>
    import("@/components/tutorial/TutorialButton").then(
      (mod) => mod.TutorialButton,
    ),
  { ssr: false },
);
const SupportBot = dynamic(
  () =>
    import("@/components/support/SupportBot").then((mod) => mod.SupportBot),
  { ssr: false },
);

interface GoldRate {
  rate24k: number;
  rate22k: number;
  rate18k: number;
  silver: number;
  currency: string;
  updatedAt: string;
}

const BOTTOM_TABS = [
  { href: "/m/pos", icon: ScanLine, label: "Bill" },
  { href: "/m/quotes", icon: Calculator, label: "Quote" },
  { href: "/m/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/m/customers", icon: Users, label: "Customers" },
  { href: "/m/more", icon: Package, label: "More" },
];

function GoldPriceBar({ rates }: { rates: GoldRate | null }) {
  if (!rates) return null;
  return (
    <div
      data-tour="m-gold-ticker"
      className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs overflow-x-auto scrollbar-none whitespace-nowrap"
    >
      <span className="font-semibold text-amber-800">24K</span>
      <span className="text-amber-700">
        {rates.currency} {rates.rate24k.toLocaleString()}/g
      </span>
      <span className="text-amber-300">|</span>
      <span className="font-semibold text-amber-800">22K</span>
      <span className="text-amber-700">
        {rates.currency} {rates.rate22k.toLocaleString()}/g
      </span>
      <span className="text-amber-300">|</span>
      <span className="font-semibold text-amber-800">18K</span>
      <span className="text-amber-700">
        {rates.currency} {rates.rate18k.toLocaleString()}/g
      </span>
      <span className="text-amber-300">|</span>
      <span className="font-semibold text-gray-600">Silver</span>
      <span className="text-gray-600">
        {rates.currency} {rates.silver.toLocaleString()}/g
      </span>
      <span className="ml-auto text-gray-400 flex-shrink-0">
        {rates.updatedAt}
      </span>
    </div>
  );
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { logout } = useAuth();

  const items = [
    { href: "/m/rate-card", icon: Image, label: "Rate Card", desc: "Share today's gold rates" },
    { href: "/m/broadcast", icon: MessageCircle, label: "Rate Broadcast", desc: "1-tap WhatsApp morning message" },
    { href: "/m/exchange", icon: Scale, label: "Old Gold Exchange", desc: "Calculate buyback value" },
    { href: "/m/summary", icon: BarChart2, label: "Daily Summary", desc: "Today's sales & revenue" },
    { href: "/m/tax", icon: Receipt, label: "Tax Reports", desc: "GST · VAT · MTD · OSS — 6 countries" },
    { href: "/m/repairs", icon: Wrench, label: "Repairs", desc: "Track repair jobs" },
    { href: "/m/savings", icon: FileText, label: "Savings Schemes", desc: "Customer gold savings" },
    { href: "/m/alerts", icon: Bell, label: "Rate Alerts", desc: "Price threshold notifications" },
    { href: "/m/pending", icon: Wallet, label: "Pending Payments", desc: "Track credit & partial sales" },
    { href: "/m/occasions", icon: Cake, label: "Occasions", desc: "Birthdays & anniversaries today" },
    { href: "/m/purity", icon: FlaskConical, label: "Purity Calculator", desc: "Karat & assay gold value" },
  ];

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40"
      onClick={onClose}
    >
      <div
        className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
          <T>More Tools</T>
        </p>
        <div className="grid grid-cols-1 gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900"><T>{item.label}</T></p>
                <p className="text-xs text-gray-500"><T>{item.desc}</T></p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3">
          <Link
            href="/dashboard/shop"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-gray-600"
          >
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium"><T>Full Dashboard</T></p>
              <p className="text-xs text-gray-400"><T>Switch to desktop view</T></p>
            </div>
          </Link>
          <button
            onClick={async () => {
              onClose();
              await logout();
              router.push("/auth/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-600"
          >
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-medium"><T>Sign out</T></p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const haptic = useHaptics();
  const [rates, setRates] = useState<GoldRate | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const ratesRef = useRef(false);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Shopkeeper-only guard
  useEffect(() => {
    if (!isLoading && user && user.role !== "SHOPKEEPER") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  const fetchRates = useCallback(async () => {
    if (ratesRef.current) return;
    ratesRef.current = true;
    setRatesLoading(true);
    try {
      // Resolve the shopkeeper's market (shop > geo cookie > default).
      // Without these params the backend falls back to NPR which is wrong for
      // anyone outside Nepal.
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const data = res.data;
      // Normalise to a flat rate object
      const gold = data?.metals?.find?.(
        (m: any) => m.code === "XAU" || m.code === "GOLD",
      );
      const silver = data?.metals?.find?.(
        (m: any) => m.code === "XAG" || m.code === "SILVER",
      );
      const ratePerGram = gold?.ratePerGram ?? gold?.rate ?? 0;
      setRates({
        rate24k: Math.round(ratePerGram),
        rate22k: Math.round(ratePerGram * (22 / 24)),
        rate18k: Math.round(ratePerGram * (18 / 24)),
        silver: Math.round(silver?.ratePerGram ?? silver?.rate ?? 0),
        currency: data?.currency ?? params.currency,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch {
      // fail silently — rates are supplementary
    } finally {
      setRatesLoading(false);
      ratesRef.current = false;
    }
  }, [user?.shop]);

  useEffect(() => {
    fetchRates();
    // Refresh rates every 10 minutes
    const interval = setInterval(fetchRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  if (isLoading) {
    return <MobileLayoutLoader />;
  }

  if (!isAuthenticated || (user && user.role !== "SHOPKEEPER")) {
    return null;
  }

  const isMoreActive = ["/m/rate-card", "/m/tax", "/m/repairs", "/m/savings"].some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  return (
    <div className="flex flex-col h-dvh bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
              Orivraa POS
            </p>
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[180px]">
              {user?.shop?.shopName ?? user?.firstName}
            </p>
          </div>
          <button
            onClick={() => {
              ratesRef.current = false;
              fetchRates();
            }}
            disabled={ratesLoading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label={t("Refresh rates")}
          >
            <RefreshCw
              className={`h-4 w-4 ${ratesLoading ? "animate-spin text-amber-500" : ""}`}
            />
          </button>
        </div>
        <GoldPriceBar rates={rates} />
      </header>

      {/* Page content — keyed on pathname for fade transition between routes */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto animate-in fade-in duration-200"
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <nav
        data-tour="m-bottom-nav"
        className="flex-shrink-0 bg-white border-t border-gray-100 safe-area-bottom"
      >
        <div className="flex items-center justify-around px-1 pt-1 pb-1">
          {BOTTOM_TABS.map((tab) => {
            const isMore = tab.href === "/m/more";
            const active = isMore
              ? showMore || isMoreActive
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

            const inner = (
              <span
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl min-w-[60px] transition-all duration-200 active:scale-95 ${
                  active ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {/* Animated active indicator */}
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-amber-500 animate-in fade-in slide-in-from-top-1 duration-200" />
                )}
                <tab.icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    active ? "scale-110" : ""
                  }`}
                />
                <span className="text-[10px] font-medium">
                  <T>{tab.label}</T>
                </span>
              </span>
            );

            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => {
                    haptic("light");
                    setShowMore((v) => !v);
                  }}
                  aria-label="More tools"
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => haptic("light")}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More menu overlay */}
      {showMore && <MoreMenu onClose={() => setShowMore(false)} />}

      {/* Floating tutorial ? button — uses the /m/* tour steps */}
      <TutorialButton />

      {/* Orivraa AI assistant — aware of mobile mode via currentPath */}
      <SupportBot />
    </div>
  );
}
