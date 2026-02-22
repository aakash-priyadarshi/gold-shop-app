"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/config/brand";
import {
  Check,
  X,
  Sparkles,
  Crown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Headphones,
  Zap,
  BarChart3,
  Package,
  FileText,
  Users,
  Palette,
  Brain,
  Globe,
  ChevronDown,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/* ────────────────────────────────────────────────────────────── */
/*  PRICING DATA — mirrored from seed, USD shown as default      */
/* ────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: "Free",
    slug: "FREE",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "$",
    description: "Get started for free. List your products on the marketplace.",
    badge: null,
    highlight: false,
    cta: "Start Free",
    ctaLink: "/dashboard/shop/billing",
    features: [
      { text: "Up to 20 product listings", included: true },
      { text: "Basic marketplace presence", included: true },
      { text: "Basic analytics", included: true },
      { text: "5% platform commission", included: true },
      { text: "CRM & Invoicing", included: false },
      { text: "Inventory management", included: false },
      { text: "AI design tools", included: false },
      { text: "Priority support", included: false },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Pro",
    slug: "PRO",
    monthlyPrice: 35,
    annualPrice: 350,
    currency: "$",
    description:
      "Complete CRM for growing jewellery businesses. AI credits purchasable separately.",
    badge: null,
    highlight: false,
    cta: "Get Pro",
    ctaLink: "/dashboard/shop/billing",
    features: [
      { text: "Up to 200 product listings", included: true },
      { text: "Full CRM suite", included: true },
      { text: "Invoicing & billing", included: true },
      { text: "Inventory management", included: true },
      { text: "Customer management", included: true },
      { text: "Advanced analytics", included: true },
      { text: "3% platform commission", included: true },
      { text: "Priority support", included: true },
      { text: "Custom branding", included: true },
      { text: "Bulk upload", included: true },
      { text: "Priority marketplace listing", included: true },
      { text: "AI credits purchasable", included: true },
      { text: "AI included in plan", included: false },
    ],
  },
  {
    name: "Pro+",
    slug: "PRO_PLUS",
    monthlyPrice: 99,
    annualPrice: 990,
    currency: "$",
    description:
      "Everything in Pro, plus AI-powered tools with 100 credits/month included.",
    badge: "Most Popular",
    highlight: true,
    cta: "Get Pro+",
    ctaLink: "/dashboard/shop/billing",
    features: [
      { text: "Up to 1,000 product listings", included: true },
      { text: "Full CRM suite", included: true },
      { text: "Invoicing & billing", included: true },
      { text: "Inventory management", included: true },
      { text: "Customer management", included: true },
      { text: "Advanced analytics", included: true },
      { text: "2% platform commission", included: true },
      { text: "Priority support", included: true },
      { text: "Custom branding", included: true },
      { text: "100 AI credits/month included", included: true },
      { text: "AI design generation", included: true },
      { text: "Smart recommendations", included: true },
      { text: "Price optimization", included: true },
      { text: "Demand forecasting", included: true },
      { text: "Scheduled reports", included: true },
      { text: "Additional credits purchasable", included: true },
    ],
  },
  {
    name: "Enterprise",
    slug: "ENTERPRISE",
    monthlyPrice: null,
    annualPrice: null,
    currency: "$",
    description:
      "Custom plan for large businesses. Unlimited everything, dedicated support, and white-label.",
    badge: null,
    highlight: false,
    cta: "Contact Sales",
    ctaLink: `mailto:${BRAND.salesEmail}?subject=Enterprise%20Plan%20Inquiry`,
    features: [
      { text: "Unlimited product listings", included: true },
      { text: "Full CRM suite", included: true },
      { text: "Everything in Pro+", included: true },
      { text: "1% platform commission", included: true },
      { text: "500 AI credits/month", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "API access", included: true },
      { text: "White-label option", included: true },
      { text: "Multi-branch support", included: true },
      { text: "Staff accounts", included: true },
      { text: "Custom domain", included: true },
      { text: "Custom integrations", included: true },
      { text: "Webhook subscriptions", included: true },
      { text: "Audit log export", included: true },
      { text: "Auto-charge overage", included: true },
    ],
  },
];

/* Full feature comparison table */
const COMPARISON_CATEGORIES = [
  {
    category: "Marketplace",
    features: [
      {
        name: "Product listings",
        free: "20",
        pro: "200",
        proPlus: "1,000",
        enterprise: "Unlimited",
      },
      {
        name: "Platform commission",
        free: "5%",
        pro: "3%",
        proPlus: "2%",
        enterprise: "1%",
      },
      {
        name: "Priority listing placement",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Bulk product upload",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "CRM & Business Tools",
    features: [
      {
        name: "Customer management",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Invoicing & billing",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Inventory management",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Custom branding",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Staff accounts",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
      {
        name: "Multi-branch support",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
    ],
  },
  {
    category: "AI & Intelligence",
    features: [
      {
        name: "AI credits included",
        free: "0",
        pro: "0",
        proPlus: "100/mo",
        enterprise: "500/mo",
      },
      {
        name: "Purchase extra AI credits",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "AI design generation",
        free: false,
        pro: false,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Smart recommendations",
        free: false,
        pro: false,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Price optimization",
        free: false,
        pro: false,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Demand forecasting",
        free: false,
        pro: false,
        proPlus: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Analytics & Reports",
    features: [
      {
        name: "Basic analytics",
        free: true,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Advanced analytics",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Scheduled reports",
        free: false,
        pro: false,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Audit log export",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
    ],
  },
  {
    category: "Support & Integration",
    features: [
      {
        name: "Email support",
        free: true,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Priority support",
        free: false,
        pro: true,
        proPlus: true,
        enterprise: true,
      },
      {
        name: "Dedicated account manager",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
      {
        name: "API access",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
      {
        name: "Webhook subscriptions",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
      {
        name: "White-label option",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
      {
        name: "Custom domain",
        free: false,
        pro: false,
        proPlus: false,
        enterprise: true,
      },
    ],
  },
];

/* SaaS vs One-Time CRM comparison */
const SAAS_ADVANTAGES = [
  {
    icon: RefreshCw,
    title: "Always Up-to-Date",
    description:
      "New features, security patches, and improvements are delivered automatically — no manual upgrades or version headaches.",
  },
  {
    icon: ShieldCheck,
    title: "Zero IT Overhead",
    description:
      "No servers to manage, no backups to worry about, no database maintenance. We handle everything so you focus on selling.",
  },
  {
    icon: TrendingUp,
    title: "Scale as You Grow",
    description:
      "Start free, upgrade when ready. No upfront investment. Pay only for what you use — downgrade or cancel anytime.",
  },
  {
    icon: Headphones,
    title: "Live Support Included",
    description:
      "Get help when you need it. Priority support for paid plans, dedicated account managers for Enterprise.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description:
      "Create your account and start selling in minutes. No installation, no configuration, no waiting.",
  },
  {
    icon: Globe,
    title: "Access Anywhere",
    description:
      "Manage your business from any device — phone, tablet, or desktop. Your CRM travels with you.",
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  COMPONENT                                                     */
/* ────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-20 pb-16">
        {/* Decorative background */}
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
            Seller Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            Grow Your Jewellery Business
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600">
              with the Right Plan
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            From free marketplace listings to a full AI-powered CRM — choose the
            plan that fits your business today and upgrade as you grow. No
            contracts, cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "annual"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 -mt-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.slug}
              className={`relative rounded-2xl border bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-lg ${
                plan.highlight
                  ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 scale-[1.02]"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white border-0 px-4 py-1 text-xs font-semibold shadow-md">
                    <Star className="w-3 h-3 mr-1 fill-white" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="p-6 lg:p-8">
                {/* Plan name */}
                <div className="flex items-center gap-2 mb-2">
                  {plan.slug === "PRO_PLUS" && (
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  )}
                  {plan.slug === "ENTERPRISE" && (
                    <Crown className="h-5 w-5 text-purple-500" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="mt-4 mb-4">
                  {plan.monthlyPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.currency}
                        {billing === "monthly"
                          ? plan.monthlyPrice
                          : Math.round((plan.annualPrice ?? 0) / 12)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        /month
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        Custom
                      </span>
                    </div>
                  )}
                  {billing === "annual" && plan.annualPrice !== null && plan.annualPrice > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {plan.currency}{plan.annualPrice} billed annually
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 min-h-[40px]">
                  {plan.description}
                </p>

                {/* CTA */}
                <Link href={plan.ctaLink}>
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : plan.slug === "ENTERPRISE"
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : ""
                    }`}
                    variant={plan.highlight || plan.slug === "ENTERPRISE" ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                {/* Features */}
                <div className="mt-6 space-y-3">
                  {plan.features.map((f, i) => (
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
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Comparison Table ─────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
          >
            {showComparison ? "Hide" : "Show"} Full Feature Comparison
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
                    Feature
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    Free
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    Pro
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-amber-600 dark:text-amber-400">
                    Pro+
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-purple-600 dark:text-purple-400">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_CATEGORIES.map((cat) => (
                  <>
                    <tr
                      key={cat.category}
                      className="bg-gray-50 dark:bg-gray-800/50"
                    >
                      <td
                        colSpan={5}
                        className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider"
                      >
                        {cat.category}
                      </td>
                    </tr>
                    {cat.features.map((f) => (
                      <tr
                        key={f.name}
                        className="border-t border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                          {f.name}
                        </td>
                        {(
                          [f.free, f.pro, f.proPlus, f.enterprise] as (
                            | boolean
                            | string
                          )[]
                        ).map((val, i) => (
                          <td key={i} className="text-center px-4 py-3">
                            {typeof val === "boolean" ? (
                              val ? (
                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                              )
                            ) : (
                              <span className="font-medium text-gray-900 dark:text-white">
                                {val}
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

      {/* ── Why SaaS > One-Time CRM ──────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 px-4 py-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Why Choose Orivraa
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Why Our Monthly Software Beats
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                a One-Time CRM Purchase
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Traditional one-time CRM software quickly becomes outdated, needs
              costly upgrades, and leaves you managing servers. Here&apos;s why
              smart jewellers choose Orivraa.
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
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.description}
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
                  One-Time CRM
                </span>
              </div>
            </div>
            {[
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
            ].map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 ${
                  i % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/50 dark:bg-gray-800/30"
                } border-b border-gray-100 dark:border-gray-800/50 last:border-0`}
              >
                <div className="px-6 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {row.label}
                </div>
                <div className="px-6 py-3.5 text-sm text-center text-green-700 dark:text-green-400 font-medium">
                  {row.saas}
                </div>
                <div className="px-6 py-3.5 text-sm text-center text-gray-500 dark:text-gray-400">
                  {row.legacy}
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
            Everything You Need to Run
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">
              a Modern Jewellery Business
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
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Can I start for free?",
                a: "Yes! The Free plan lets you list up to 20 products on the marketplace at no cost, forever. Upgrade only when you need CRM features or more listings.",
              },
              {
                q: "What's the difference between Pro and Pro+?",
                a: "Pro gives you a full CRM — inventory, invoicing, customer management, and analytics. Pro+ adds AI-powered tools: design generation, smart recommendations, price optimization, and 100 AI credits per month. With Pro, you can still purchase AI credits separately.",
              },
              {
                q: "What are AI credits?",
                a: "AI credits let you use features like jewellery design generation, smart product descriptions, price optimization, and demand forecasting. Each action costs a certain number of credits. Pro+ includes 100/month; Enterprise includes 500/month. You can always buy more.",
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
                a: "Enterprise is fully customizable — unlimited listings, lowest commission (1%), 500 AI credits, dedicated account manager, API access, white-label option, multi-branch support, custom integrations, and more. Contact us for a tailored quote.",
              },
              {
                q: "Do you support my country's currency and taxes?",
                a: "Yes! We support sellers in Nepal, India, UAE, UK, US, and Europe with local currency pricing and tax compliance (GST, VAT, etc.).",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.q}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.a}
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
            Ready to Grow Your Jewellery Business?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of jewellers already using {BRAND.name} to manage
            inventory, serve customers, and sell online — all from one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/shop/billing">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-white px-8"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`mailto:${BRAND.salesEmail}?subject=Enterprise%20Plan%20Inquiry`}>
              <Button size="lg" variant="outline" className="px-8">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            No credit card required. Free plan forever.
          </p>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
