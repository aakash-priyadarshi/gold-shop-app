"use client";

// Note: PWA manifest for the mobile POS app is at /manifest-pos.json
// It is linked via <head> in apps/web/src/app/m/head.tsx (or Next.js metadata API in a
// server-side wrapper if needed). The manifest-pos.json is already in /public/.

import { MobileLayoutLoader } from "@/components/mobile/MobileSkeleton";
import { MoreMenu as SharedMoreMenu } from "@/components/mobile/MoreMenu";
import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { SmartUpgradeBanner } from "@/components/SmartUpgradeBanner";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import api, { materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
    BarChart2,
    Bell,
    Cake,
    Calculator,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    FileText,
    FlaskConical,
    Gem,
    Image,
    LogOut,
    MessageCircle,
    Package,
    Receipt,
    RefreshCw,
    Scale,
    ScanLine,
    Send,
    Settings,
    ShoppingBag,
    Store,
    Users,
    Wallet,
    Wrench,
    X,
    HelpCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHelpUIStore } from "@/store/help-ui";
import { InformationCircleIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { LANGUAGES, usePreferencesStore, type Language } from "@/store/preferences";
import { Globe } from "lucide-react";

// Lazy-load heavy floating widgets (driver.js CSS ~20 KB)
const TutorialButton = dynamic(
  () =>
    import("@/components/tutorial/TutorialButton").then(
      (mod) => mod.TutorialButton,
    ),
  { ssr: false },
);
// NOTE: <SupportBot /> is provided by app/layout.tsx so we do not import or
// render it here — having two instances would render two overlapping chat
// bubbles that become visible as soon as the user drags one of them.

interface GoldRate {
  rate24k: number;
  rate22k: number;
  rate18k: number;
  silver: number;
  currency: string;
  updatedAt: string;
}

interface MobileShopOption {
  id: string;
  name?: string;
  shopName?: string;
  city?: string;
}

function readMetalRate(data: any, codes: string[]): number {
  const metals = data?.metals;
  if (Array.isArray(metals)) {
    const match = metals.find((m: any) => codes.includes(m.code));
    return Number(match?.ratePerGram ?? match?.rate ?? 0);
  }
  if (metals && typeof metals === "object") {
    for (const code of codes) {
      const value = metals[code];
      if (typeof value === "number") return value;
      if (value && typeof value === "object") {
        const nested = Number(value.ratePerGram ?? value.rate ?? 0);
        if (nested > 0) return nested;
      }
    }
  }
  return 0;
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
      className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm text-center"
    >
      <div className="grid grid-cols-4 gap-2 flex-1 mr-2 text-left">
        <div>
          <span className="text-[8px] font-medium text-amber-200 uppercase block leading-none mb-0.5">24K Gold</span>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap">
            {rates.currency} {rates.rate24k.toLocaleString()}
          </span>
        </div>
        <div className="border-l border-amber-400/30 pl-2">
          <span className="text-[8px] font-medium text-amber-200 uppercase block leading-none mb-0.5">22K Gold</span>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap">
            {rates.currency} {rates.rate22k.toLocaleString()}
          </span>
        </div>
        <div className="border-l border-amber-400/30 pl-2">
          <span className="text-[8px] font-medium text-amber-200 uppercase block leading-none mb-0.5">18K Gold</span>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap">
            {rates.currency} {rates.rate18k.toLocaleString()}
          </span>
        </div>
        <div className="border-l border-amber-400/30 pl-2">
          <span className="text-[8px] font-medium text-amber-200 uppercase block leading-none mb-0.5">Silver /g</span>
          <span className="text-[11px] font-bold leading-none whitespace-nowrap">
            {rates.currency} {rates.silver.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="text-[8px] text-amber-200 font-medium text-right self-end whitespace-nowrap">
        {rates.updatedAt}
      </div>
    </div>
  );
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  return <SharedMoreMenu onClose={onClose} />;
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const haptic = useHaptics();
  const [rates, setRates] = useState<GoldRate | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [shops, setShops] = useState<MobileShopOption[]>([]);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [switchingShopId, setSwitchingShopId] = useState<string | null>(null);
  const ratesRef = useRef(false);
  const { isChatDismissed, isTutorialDismissed, recallChat, recallTutorial } = useHelpUIStore();
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

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

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "SHOPKEEPER") return;
    let cancelled = false;
    api
      .get("/shops/my-shops")
      .then((res) => {
        if (cancelled) return;
        setShops(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setShops([]));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  const switchShop = useCallback(
    async (shopId: string) => {
      if (!shopId || shopId === user?.shop?.id) {
        setShopMenuOpen(false);
        return;
      }
      setSwitchingShopId(shopId);
      try {
        await api.patch("/users/me/active-shop", { shopId });
        await refreshUser();
        ratesRef.current = false;
        setShopMenuOpen(false);
        router.refresh();
      } finally {
        setSwitchingShopId(null);
      }
    },
    [refreshUser, router, user?.shop?.id],
  );

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
      // Normalise both backend shapes used in the app:
      // - RFQ/PC market rates: { metals: { GOLD_24K, GOLD_22K, ... } }
      // - Legacy rates:       { metals: [{ code, ratePerGram }] }
      const rate24k = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]);
      const rate22k = readMetalRate(data, ["GOLD_22K"]);
      const rate18k = readMetalRate(data, ["GOLD_18K"]);
      const silver = readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]);
      setRates({
        rate24k: Math.round(rate24k),
        rate22k: Math.round(rate22k || rate24k * (22 / 24)),
        rate18k: Math.round(rate18k || rate24k * (18 / 24)),
        silver: Math.round(silver),
        currency: data?.currency ?? params.currency,
        updatedAt: data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }) : new Date().toLocaleTimeString([], {
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
  const currentShopName = user?.shop?.shopName ?? user?.firstName ?? "Shop";
  const currentShopId = user?.shop?.id;

  return (
    <OfflineProvider>
    <div className="flex flex-col h-dvh bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="relative min-w-0 flex-1 pr-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
              Orivraa POS
            </p>
            {shops.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setShopMenuOpen((value) => !value)}
                  className="mt-0.5 flex max-w-[210px] items-center gap-1 rounded-lg text-left text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100 active:text-amber-700"
                >
                  <Store className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                  <span className="truncate">{currentShopName}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${
                      shopMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {shopMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-black/10">
                    {shops.map((shop) => {
                      const shopName = shop.shopName ?? shop.name ?? "Shop";
                      const isActive = shop.id === currentShopId;
                      return (
                        <button
                          key={shop.id}
                          type="button"
                          onClick={() => switchShop(shop.id)}
                          disabled={switchingShopId === shop.id}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm ${
                            isActive
                              ? "bg-amber-50 text-amber-700"
                              : "text-gray-700 active:bg-gray-50 dark:bg-gray-950"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{shopName}</span>
                            {shop.city && (
                              <span className="block truncate text-[11px] text-gray-400">
                                {shop.city}
                              </span>
                            )}
                          </span>
                          {switchingShopId === shop.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : isActive ? (
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate max-w-[180px]">
                {currentShopName}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isChatDismissed && (
              <button
                onClick={() => recallChat()}
                className="relative p-2 rounded-lg text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                aria-label={t("Restore AI Chat")}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              </button>
            )}
            {isTutorialDismissed && (
              <button
                onClick={() => recallTutorial()}
                className="relative p-2 rounded-lg text-purple-600 hover:bg-purple-50 active:bg-purple-100 transition-colors"
                aria-label={t("Restore Tutorials")}
              >
                <HelpCircle className="h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
              </button>
            )}
            <button
              onClick={() => {
                ratesRef.current = false;
                fetchRates();
              }}
              disabled={ratesLoading}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:bg-gray-800 active:bg-gray-200 transition-colors"
              aria-label={t("Refresh rates")}
            >
              <RefreshCw
                className={`h-5 w-5 ${ratesLoading ? "animate-spin text-amber-500" : ""}`}
              />
            </button>
            <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-0.5 ml-1">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none bg-transparent text-gray-700 dark:text-gray-300 text-xs font-semibold pr-3 pl-2 py-1 outline-none"
                style={{ WebkitAppearance: 'none' }}
              >
                {Object.entries(LANGUAGES).map(([code, info]) => (
                  <option key={code} value={code} className="text-gray-900 dark:text-gray-100">
                    {info.nativeName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-1">
                <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <AnimatedThemeToggle size={32} className="ml-0.5" />
          </div>
        </div>
        <GoldPriceBar rates={rates} />
      </header>

      {/* Page content — keyed on pathname for fade transition between routes */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto animate-in fade-in duration-200"
      >
        <SmartUpgradeBanner compact />
        {children}
      </main>

      {/* Bottom navigation */}
      <nav
        data-tour="m-bottom-nav"
        className="flex-shrink-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 border-gray-100 dark:border-gray-800 safe-area-bottom"
      >
        <div className="flex items-center justify-around px-1 pt-1 pb-1">
          {BOTTOM_TABS.map((tab) => {
            const isMore = tab.href === "/m/more";
            const active = isMore
              ? showMore || isMoreActive
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

            const inner = (
              <span
                className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl min-w-[65px] transition-all duration-200 active:scale-95 ${
                  active ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {/* Animated active indicator */}
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-amber-500 animate-in fade-in slide-in-from-top-1 duration-200" />
                )}
                <tab.icon
                  className={`h-6 w-6 transition-transform duration-200 ${
                    active ? "scale-110" : ""
                  }`}
                />
                <span className="text-[11px] font-bold">
                  <T>{tab.label === "Bill" ? "New Sale" : tab.label}</T>
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

      {/* NOTE: <SupportBot /> is rendered globally in app/layout.tsx so do not
          add another instance here — doing so causes two overlapping chat
          bubbles after the user drags one of them. */}
    </div>
    </OfflineProvider>
  );
}
