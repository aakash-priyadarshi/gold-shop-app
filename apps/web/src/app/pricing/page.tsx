"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import { subscriptionPlansApi } from "@/lib/api";
import {
    COUNTRIES,
    CURRENCIES,
    usePreferencesStore,
    type CountryCode,
    type CurrencyCode,
} from "@/store/preferences";
import {
    ArrowRight,
    BarChart3,
    Brain,
    Check,
    ChevronDown,
    Crown,
    FileText,
    Globe,
    Headphones,
    Loader2,
    Package,
    Palette,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingUp,
    Users,
    X,
    Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ────────────────────────────────────────────────────────────── */
/*  TYPES                                                         */
/* ────────────────────────────────────────────────────────────── */

interface PlanFromAPI {
  id: string;
  name: string; // FREE | PRO | PRO_PLUS | ENTERPRISE
  displayName: string;
  description: string;
  country: string;
  currency: CurrencyCode;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxInvoicesPerMonth: number | null;
  maxCatalogues: number | null;
  catalogueLimit: number | null;
  maxOrdersPerMonth: number | null;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  extraCreditPrice: number;
  overageBehavior: string;
  features: Record<string, boolean | string | number>;
  sortOrder: number;
  badgeText?: string | null;
  buttonColor?: string | null;
}

/* ────────────────────────────────────────────────────────────── */
/*  STATIC CONTENT (design, copy, comparison structure)           */
/* ────────────────────────────────────────────────────────────── */

/* Feature labels for the comparison table — mapped from features JSON keys */
const FEATURE_DISPLAY: Record<string, { label: string; category: string }> = {
  // Marketplace
  marketplace: { label: "Marketplace listing", category: "Marketplace" },
  priorityListing: {
    label: "Priority listing placement",
    category: "Marketplace",
  },
  bulkUpload: { label: "Bulk product upload", category: "Marketplace" },

  // CRM & Business Tools
  crm: { label: "CRM suite", category: "CRM & Business Tools" },
  invoicing: { label: "Invoicing & billing", category: "CRM & Business Tools" },
  inventoryManagement: {
    label: "Inventory management",
    category: "CRM & Business Tools",
  },
  customerManagement: {
    label: "Customer management",
    category: "CRM & Business Tools",
  },
  customBranding: {
    label: "Custom branding",
    category: "CRM & Business Tools",
  },
  staffAccounts: { label: "Staff accounts", category: "CRM & Business Tools" },
  multiBranch: {
    label: "Multi-branch support",
    category: "CRM & Business Tools",
  },

  // AI & Intelligence
  purchasableAiCredits: {
    label: "Purchase AI credits",
    category: "AI & Intelligence",
  },
  aiDesignGeneration: {
    label: "AI design generation",
    category: "AI & Intelligence",
  },
  aiSmartRecommendations: {
    label: "Smart recommendations",
    category: "AI & Intelligence",
  },
  aiPriceOptimization: {
    label: "Price optimization",
    category: "AI & Intelligence",
  },
  demandForecasting: {
    label: "Demand forecasting",
    category: "AI & Intelligence",
  },

  // Analytics & Reports
  basicAnalytics: { label: "Basic analytics", category: "Analytics & Reports" },
  advancedAnalytics: {
    label: "Advanced analytics",
    category: "Analytics & Reports",
  },
  scheduledReports: {
    label: "Scheduled reports",
    category: "Analytics & Reports",
  },
  auditLogExport: {
    label: "Audit log export",
    category: "Analytics & Reports",
  },

  // Support & Integration
  prioritySupport: {
    label: "Priority support",
    category: "Support & Integration",
  },
  dedicatedSupport: {
    label: "Dedicated support",
    category: "Support & Integration",
  },
  dedicatedAccountManager: {
    label: "Dedicated account manager",
    category: "Support & Integration",
  },
  apiAccess: { label: "API access", category: "Support & Integration" },
  webhookSubscriptions: {
    label: "Webhook subscriptions",
    category: "Support & Integration",
  },
  whiteLabel: {
    label: "White-label option",
    category: "Support & Integration",
  },
  customDomain: { label: "Custom domain", category: "Support & Integration" },
  customIntegrations: {
    label: "Custom integrations",
    category: "Support & Integration",
  },
};

/** Order categories appear in */
const CATEGORY_ORDER = [
  "Marketplace",
  "CRM & Business Tools",
  "AI & Intelligence",
  "Analytics & Reports",
  "Support & Integration",
];

/** Tier presentation metadata — slug → display data */
const TIER_META: Record<
  string,
  {
    icon: typeof Sparkles | null;
    iconColor: string;
    badge: string | null;
    highlight: boolean;
    cta: string;
    ctaVariant: "default" | "outline";
    ctaClass: string;
  }
> = {
  FREE: {
    icon: null,
    iconColor: "",
    badge: null,
    highlight: false,
    cta: "Start Free",
    ctaVariant: "outline",
    ctaClass: "",
  },
  PRO: {
    icon: null,
    iconColor: "",
    badge: null,
    highlight: false,
    cta: "Get Pro",
    ctaVariant: "outline",
    ctaClass: "",
  },
  PRO_PLUS: {
    icon: Sparkles,
    iconColor: "text-amber-500",
    badge: "Most Popular",
    highlight: true,
    cta: "Get Pro+",
    ctaVariant: "default",
    ctaClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  ENTERPRISE: {
    icon: Crown,
    iconColor: "text-purple-500",
    badge: null,
    highlight: false,
    cta: "Contact Sales",
    ctaVariant: "default",
    ctaClass: "bg-purple-600 hover:bg-purple-700 text-white",
  },
};

/* SaaS vs One-Time CRM advantages */
const SAAS_ADVANTAGES = [
  {
    icon: RefreshCw,
    title: "Always Up-to-Date",
    description:
      "New features, security patches, and improvements delivered automatically — no manual upgrades.",
  },
  {
    icon: ShieldCheck,
    title: "Zero IT Overhead",
    description:
      "No servers to manage, no backups to worry about. We handle everything so you focus on selling.",
  },
  {
    icon: TrendingUp,
    title: "Scale as You Grow",
    description:
      "Start free, upgrade when ready. No upfront investment. Downgrade or cancel anytime.",
  },
  {
    icon: Headphones,
    title: "Live Support Included",
    description:
      "Priority support for paid plans, dedicated account managers for Enterprise.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description:
      "Create your account and start selling in minutes. No installation, no configuration.",
  },
  {
    icon: Globe,
    title: "Access Anywhere",
    description:
      "Manage your business from any device — phone, tablet, or desktop.",
  },
];

const SAAS_VS_ONETIME = [
  {
    label: "Upfront cost",
    saas: "₹0 — start free",
    legacy: "₹50,000 — ₹5,00,000+",
  },
  {
    label: "Updates & new features",
    saas: "Automatic, always latest",
    legacy: "Paid upgrades, often manual",
  },
  {
    label: "Server & hosting",
    saas: "Included (cloud)",
    legacy: "You manage + pay separately",
  },
  {
    label: "Data backups",
    saas: "Automated daily",
    legacy: "Manual — your responsibility",
  },
  {
    label: "Mobile access",
    saas: "Works on any device",
    legacy: "Desktop-only (usually)",
  },
  {
    label: "AI features",
    saas: "Built-in, improving",
    legacy: "None or extra purchase",
  },
  {
    label: "Marketplace built-in",
    saas: "Yes — sell to customers",
    legacy: "No — just internal CRM",
  },
  {
    label: "Security patches",
    saas: "Immediate, automatic",
    legacy: "Delayed, often requires reinstall",
  },
  {
    label: "Scaling",
    saas: "Upgrade plan as needed",
    legacy: "Buy new license / hardware",
  },
  {
    label: "Lock-in risk",
    saas: "Cancel anytime, export data",
    legacy: "Tied to vendor for upgrades",
  },
];

const FAQ_ITEMS = [
  {
    q: "Can I start for free?",
    a: "Yes! The Free plan lets you list products on the marketplace at no cost, forever. Upgrade only when you need CRM features or more listings.",
  },
  {
    q: "What's the difference between Pro and Pro+?",
    a: "Pro gives you a full CRM — inventory, invoicing, customer management, and analytics. Pro+ adds AI-powered tools: design generation, smart recommendations, price optimization, and monthly AI credits. With Pro, you can still purchase AI credits separately.",
  },
  {
    q: "What are AI credits?",
    a: "AI credits let you use features like jewellery design generation, smart product descriptions, price optimization, and demand forecasting. Each action costs a certain number of credits. Pro+ and Enterprise include monthly credits. You can always buy more.",
  },
  {
    q: "Why pay monthly instead of buying CRM software once?",
    a: "One-time CRM software becomes outdated fast, requires manual updates, needs you to manage servers, and has no AI. With Orivraa, you get automatic updates, cloud hosting, built-in marketplace, AI features, and zero maintenance — all for a fraction of the cost.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Absolutely. Upgrade, downgrade, or cancel at any time. Changes take effect immediately. Annual plans include a pro-rated refund if you switch early.",
  },
  {
    q: "Is my data safe?",
    a: "Your data is encrypted at rest and in transit, backed up daily, and hosted on enterprise-grade cloud infrastructure. We never share or sell your data.",
  },
  {
    q: "What does Enterprise include?",
    a: "Enterprise is fully customizable — unlimited listings, lowest commission, generous AI credits, dedicated account manager, API access, white-label option, multi-branch support, custom integrations, and more. Contact us for a tailored quote.",
  },
  {
    q: "Do you support my country's currency and taxes?",
    a: "Yes! We support sellers in Nepal, India, UAE, UK, US, and Europe with local currency pricing and tax compliance (GST, VAT, etc.).",
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  HELPERS                                                       */
/* ────────────────────────────────────────────────────────────── */

function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code]?.symbol ?? code;
}

function formatPrice(amount: number, currency: CurrencyCode): string {
  const sym = currencySymbol(currency);
  if (amount === 0) return `${sym}0`;
  // Show decimals when the amount has them (e.g. $12.99, $0.06)
  const hasDecimals = amount % 1 !== 0;
  try {
    const locale = CURRENCIES[currency]?.locale ?? "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${sym}${amount.toLocaleString()}`;
  }
}

/** Build feature rows from plan features for the cards */
function buildFeatureList(
  plan: PlanFromAPI,
): { text: string; included: boolean }[] {
  const items: { text: string; included: boolean }[] = [];

  // Listing limit
  const limit = plan.catalogueLimit ?? plan.maxProducts;
  items.push({
    text: limit
      ? `Up to ${limit.toLocaleString()} product listings`
      : "Unlimited product listings",
    included: true,
  });

  // Commission
  items.push({
    text: `${plan.commissionPercent}% platform commission`,
    included: true,
  });

  // Key features from the features JSON
  const featureKeys = [
    "crm",
    "invoicing",
    "inventoryManagement",
    "customerManagement",
    "basicAnalytics",
    "advancedAnalytics",
    "customBranding",
    "bulkUpload",
    "priorityListing",
    "prioritySupport",
  ];

  for (const key of featureKeys) {
    const display = FEATURE_DISPLAY[key];
    if (!display) continue;
    const val = plan.features?.[key];
    items.push({ text: display.label, included: !!val });
  }

  // AI section
  if (plan.includesAi && plan.monthlyAiCredits > 0) {
    items.push({
      text: `${plan.monthlyAiCredits} AI credits/month included`,
      included: true,
    });
  } else if (plan.features?.purchasableAiCredits) {
    items.push({ text: "AI credits purchasable", included: true });
    items.push({ text: "AI included in plan", included: false });
  } else {
    items.push({ text: "AI design tools", included: false });
  }

  // AI features
  const aiKeys = [
    "aiDesignGeneration",
    "aiSmartRecommendations",
    "aiPriceOptimization",
    "demandForecasting",
  ];
  for (const key of aiKeys) {
    const display = FEATURE_DISPLAY[key];
    if (!display) continue;
    const val = plan.features?.[key];
    items.push({ text: display.label, included: !!val });
  }

  // Enterprise features
  const enterpriseKeys = [
    "dedicatedAccountManager",
    "apiAccess",
    "whiteLabel",
    "staffAccounts",
    "multiBranch",
    "customDomain",
  ];
  for (const key of enterpriseKeys) {
    const display = FEATURE_DISPLAY[key];
    if (!display) continue;
    const val = plan.features?.[key];
    if (val !== undefined) {
      items.push({ text: display.label, included: !!val });
    }
  }

  return items;
}

/** Build full comparison table from all plans */
function buildComparisonTable(plans: PlanFromAPI[]) {
  // Collect all unique feature keys across all plans
  const allKeys = new Set<string>();
  for (const p of plans) {
    if (p.features) Object.keys(p.features).forEach((k) => allKeys.add(k));
  }

  // Group by category
  const categoryMap = new Map<
    string,
    { key: string; label: string; values: (boolean | string)[] }[]
  >();

  for (const cat of CATEGORY_ORDER) {
    categoryMap.set(cat, []);
  }

  // Add numeric plan properties first
  const numericRows: {
    key: string;
    label: string;
    category: string;
    values: (boolean | string)[];
  }[] = [
    {
      key: "_listings",
      label: "Product listings",
      category: "Marketplace",
      values: plans.map((p) => {
        const limit = p.catalogueLimit ?? p.maxProducts;
        return limit ? limit.toLocaleString() : "Unlimited";
      }),
    },
    {
      key: "_commission",
      label: "Platform commission",
      category: "Marketplace",
      values: plans.map((p) => `${p.commissionPercent}%`),
    },
    {
      key: "_aiCredits",
      label: "AI credits included",
      category: "AI & Intelligence",
      values: plans.map((p) =>
        p.monthlyAiCredits > 0 ? `${p.monthlyAiCredits}/mo` : "0",
      ),
    },
  ];

  for (const row of numericRows) {
    const cat = categoryMap.get(row.category);
    if (cat) cat.push({ key: row.key, label: row.label, values: row.values });
  }

  // Add boolean feature rows
  for (const key of Array.from(allKeys)) {
    const display = FEATURE_DISPLAY[key];
    if (!display) continue;
    const cat = categoryMap.get(display.category);
    if (!cat) continue;

    const values = plans.map((p) => {
      const val = p.features?.[key];
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val;
      return false;
    });

    cat.push({ key, label: display.label, values });
  }

  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    features: categoryMap.get(cat) ?? [],
  })).filter((c) => c.features.length > 0);
}

/* ────────────────────────────────────────────────────────────── */
/*  COMPONENT                                                     */
/* ────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showComparison, setShowComparison] = useState(false);
  const [plans, setPlans] = useState<PlanFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const { status } = useSession();

  const country = usePreferencesStore((s) => s.country);
  const setCountry = usePreferencesStore((s) => s.setCountry);

  const fetchPlans = useCallback(async (c: CountryCode) => {
    try {
      setLoading(true);
      const res = await subscriptionPlansApi.getAvailable(c);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setPlans(data);
    } catch {
      // Fallback: try US if country has no plans
      if (c !== "US") {
        try {
          const res = await subscriptionPlansApi.getAvailable("US");
          const data = Array.isArray(res.data)
            ? res.data
            : (res.data?.data ?? []);
          setPlans(data);
        } catch {
          setPlans([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans(country);
  }, [country, fetchPlans]);

  // Derived data
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans],
  );

  const comparison = useMemo(
    () => buildComparisonTable(sortedPlans),
    [sortedPlans],
  );

  const cur =
    plans[0]?.currency ??
    (COUNTRIES[country]?.defaultCurrency as CurrencyCode) ??
    "USD";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-20 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100/30 dark:bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <Badge
            variant="outline"
            className="mb-4 border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 px-4 py-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <T>Seller Plans</T>
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            <T>Grow Your Jewellery Business</T>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600">
              <T>with the Right Plan</T>
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            <T>
              From free marketplace listings to a full AI-powered CRM — choose
              the plan that fits your business today and upgrade as you grow. No
              contracts, cancel anytime.
            </T>
          </p>

          {/* Country selector + Billing toggle */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Country pills */}
            <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
              {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setCountry(code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    country === code
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title={COUNTRIES[code].name}
                >
                  <T>{(
                    {
                      NP: "Nepal",
                      IN: "India",
                      AE: "UAE",
                      UK: "UK",
                      EU: "EU",
                      US: "USA",
                    } as Record<string, string>
                  )[code] ?? code}</T>
                </button>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <T>Monthly</T>
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === "annual"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <T>Annual</T>
                <span className="ml-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                  <T>Save 17%</T>
                </span>
              </button>
            </div>
          </div>

          {/* Current country label */}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            <T>Showing prices for</T>{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {COUNTRIES[country]?.name ?? country}
            </span>{" "}
            <T>in</T> {currencySymbol(cur)} ({cur})
          </p>
          <TrustSignals variant="compact" className="mt-6" />
        </div>
      </section>

      {/* ── Plan Cards ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 -mt-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>
              <T>
              No plans available for this region yet. Please check back soon or
              try another country.
              </T>
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              sortedPlans.length === 4
                ? "md:grid-cols-2 lg:grid-cols-4"
                : sortedPlans.length === 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2"
            }`}
          >
            {sortedPlans.map((plan) => {
              const meta = TIER_META[plan.name] ?? TIER_META.FREE;
              const features = buildFeatureList(plan);
              const isEnterprise = plan.name === "ENTERPRISE";
              const ctaLink = isEnterprise
                ? "/contact?interest=Enterprise+%2F+Multi-branch"
                : status === "authenticated"
                  ? "/dashboard/shop/billing"
                  : "/auth/register";

              // Use DB values if set, else fall back to TIER_META
              const badge = plan.badgeText ?? meta.badge;
              const hasHighlight = !!badge || meta.highlight;
              const btnColor = plan.buttonColor;
              const btnStyle = btnColor
                ? {
                    backgroundColor: btnColor,
                    borderColor: btnColor,
                    color: "#fff",
                  }
                : undefined;
              const btnClass = btnColor ? "hover:opacity-90" : meta.ctaClass;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-lg ${
                    hasHighlight
                      ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 scale-[1.02]"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  {badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 text-white border-0 px-4 py-1 text-xs font-semibold shadow-md">
                        <Star className="w-3 h-3 mr-1 fill-white" />
                        <T>{badge}</T>
                      </Badge>
                    </div>
                  )}

                  <div className="p-6 lg:p-8">
                    {/* Plan name */}
                    <div className="flex items-center gap-2 mb-2">
                      {meta.icon && (
                        <meta.icon className={`h-5 w-5 ${meta.iconColor}`} />
                      )}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {plan.displayName.replace(/\s*\(.*?\)\s*$/, "")}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mt-4 mb-4">
                      {isEnterprise ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            <T>Custom</T>
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(
                                billing === "monthly"
                                  ? plan.monthlyPrice
                                  : plan.annualPrice / 12,
                                plan.currency,
                              )}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                              <T>/month</T>
                            </span>
                          </div>
                          {billing === "annual" && plan.annualPrice > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatPrice(plan.annualPrice, plan.currency)}{" "}
                              <T>billed annually</T>
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 min-h-[40px]">
                      <T>{plan.description}</T>
                    </p>

                    {/* CTA */}
                    <Link href={ctaLink}>
                      <Button
                        className={`w-full ${btnClass}`}
                        variant={meta.ctaVariant}
                        size="lg"
                        style={btnStyle}
                      >
                        <T>{meta.cta}</T>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    {/* AI credits info */}
                    {plan.includesAi && plan.monthlyAiCredits > 0 && (
                      <p className="mt-3 text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
                        {plan.monthlyAiCredits} <T>AI credits/month included</T>
                      </p>
                    )}
                    {!plan.includesAi &&
                      plan.extraCreditPrice > 0 &&
                      plan.features?.purchasableAiCredits && (
                        <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
                          <T>AI credits from</T>{" "}
                          {formatPrice(plan.extraCreditPrice, plan.currency)}
                          <T>/credit</T>
                        </p>
                      )}

                    {/* Features */}
                    <div className="mt-6 space-y-3">
                      {features.map((f, i) => (
                        <div key={i} className="flex items-start gap-3">
                          {f.included ? (
                            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 mt-0.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              f.included
                                ? "text-gray-700 dark:text-gray-300"
                                : "text-gray-400 dark:text-gray-600"
                            }`}
                          >
                            <T>{f.text}</T>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Feature Comparison Table ─────────────────────── */}
      {sortedPlans.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="text-center mb-8">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
            >
              {showComparison ? <T>Hide</T> : <T>Show</T>}{" "}
              <T>Full Feature Comparison</T>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showComparison ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showComparison && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-6 py-4 font-medium text-gray-500 dark:text-gray-400 w-1/3">
                      <T>Feature</T>
                    </th>
                    {sortedPlans.map((p) => (
                      <th
                        key={p.id}
                        className={`text-center px-4 py-4 font-semibold ${
                          p.name === "PRO_PLUS"
                            ? "text-amber-600 dark:text-amber-400"
                            : p.name === "ENTERPRISE"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {p.displayName.replace(/\s*\(.*?\)\s*$/, "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((cat) => (
                    <>
                      <tr
                        key={cat.category}
                        className="bg-gray-50 dark:bg-gray-800/50"
                      >
                        <td
                          colSpan={sortedPlans.length + 1}
                          className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider"
                        >
                          <T>{cat.category}</T>
                        </td>
                      </tr>
                      {cat.features.map((f) => (
                        <tr
                          key={f.key}
                          className="border-t border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                        >
                          <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                            <T>{f.label}</T>
                          </td>
                          {f.values.map((val, i) => (
                            <td key={i} className="text-center px-4 py-3">
                              {typeof val === "boolean" ? (
                                val ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                )
                              ) : (
                                <span className="font-medium text-gray-900 dark:text-white">
                                  <T>{val}</T>
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Why SaaS > One-Time CRM ──────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 px-4 py-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              <T>Why Choose</T> {BRAND.name}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              <T>Why Our Monthly Software Beats</T>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                <T>a One-Time CRM Purchase</T>
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              <T>Traditional one-time CRM software quickly becomes outdated, needs
              costly upgrades, and leaves you managing servers. Here&apos;s why
              smart jewellers choose</T> {BRAND.name}.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SAAS_ADVANTAGES.map((item) => (
              <div
                key={item.title}
                className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-600 transition-all hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-colors">
                  <item.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <T>{item.title}</T>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <T>{item.description}</T>
                </p>
              </div>
            ))}
          </div>

          {/* Comparison table: SaaS vs One-time */}
          <div className="mt-16 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-sm" />
              <div className="px-6 py-4 text-center">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {BRAND.name} (SaaS)
                </span>
              </div>
              <div className="px-6 py-4 text-center">
                <span className="font-semibold text-gray-500 dark:text-gray-400">
                  <T>One-Time CRM</T>
                </span>
              </div>
            </div>
            {SAAS_VS_ONETIME.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 ${
                  i % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/50 dark:bg-gray-800/30"
                } border-b border-gray-100 dark:border-gray-800/50 last:border-0`}
              >
                <div className="px-6 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <T>{row.label}</T>
                </div>
                <div className="px-6 py-3.5 text-sm text-center text-green-700 dark:text-green-400 font-medium">
                  <T>{row.saas}</T>
                </div>
                <div className="px-6 py-3.5 text-sm text-center text-gray-500 dark:text-gray-400">
                  <T>{row.legacy}</T>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's Included ──────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            <T>Everything You Need to Run</T>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">
              <T>a Modern Jewellery Business</T>
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Package,
              title: "Inventory & Catalogue",
              desc: "Track gold, silver, and precious stones. Manage karats, weights, hallmarks, and variants with ease.",
            },
            {
              icon: FileText,
              title: "Invoicing & GST",
              desc: "Generate professional invoices, apply GST/VAT automatically, and track payments — all from one place.",
            },
            {
              icon: Users,
              title: "Customer Management",
              desc: "Build customer profiles, track purchase history, send reminders for anniversaries and festivals.",
            },
            {
              icon: BarChart3,
              title: "Analytics & Reports",
              desc: "Know your best sellers, daily cash flow, profit margins, and seasonal trends at a glance.",
            },
            {
              icon: Palette,
              title: "AI Design Generation",
              desc: "Create stunning jewellery designs with AI. Show customers visualisations before crafting.",
            },
            {
              icon: Brain,
              title: "Smart Recommendations",
              desc: "AI suggests pricing, identifies demand trends, and helps you stock what customers want.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
            >
              <item.icon className="h-8 w-8 text-amber-500 mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                <T>{item.title}</T>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <T>{item.desc}</T>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            <T>Frequently Asked Questions</T>
          </h2>

          <div className="space-y-6">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <span className="font-medium text-gray-900 dark:text-white">
                    <T>{item.q}</T>
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <T>{item.a}</T>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <T>Ready to Grow Your Jewellery Business?</T>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            <T>
              Join thousands of jewellers already using Orivraa to manage
              inventory, serve customers, and sell online — all from one
              platform.
            </T>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/shop/billing">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-white px-8"
              >
                <T>Start Free Today</T>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/contact?interest=Enterprise+%2F+Multi-branch"
            >
              <Button size="lg" variant="outline" className="px-8">
                <T>Talk to Sales</T>
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            <T>No credit card required. Free plan forever.</T>
          </p>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
