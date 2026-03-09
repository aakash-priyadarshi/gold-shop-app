"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import { useT } from "@/providers/translation-provider";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────────────────────── */
/*  DATA                                                          */
/* ────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    step: 1,
    title: "Create Your Account",
    desc: "Sign up for free in under 2 minutes. No credit card required — start with our Free plan and upgrade as your business grows.",
    icon: Rocket,
  },
  {
    step: 2,
    title: "Set Up Your Shop",
    desc: "Add your shop name, logo, banner, description, and location. Configure your business details, tax info, and bank account for payouts.",
    icon: Store,
  },
  {
    step: 3,
    title: "List Your Products",
    desc: "Upload high-quality images, set prices in your local currency, add weight and purity details, and organise items into catalogues.",
    icon: Package,
  },
  {
    step: 4,
    title: "Start Selling",
    desc: "Your products appear on the marketplace instantly. Manage orders, chat with buyers, send invoices, and track everything from your dashboard.",
    icon: TrendingUp,
  },
];

const FEATURES = [
  {
    title: "Inventory Management",
    desc: "Track stock levels, manage variants (size, purity, weight), bulk-upload via CSV, and get low-stock alerts.",
    icon: Package,
  },
  {
    title: "Analytics Dashboard",
    desc: "Real-time insights into views, enquiries, conversion rates, and revenue. Understand what products perform best.",
    icon: BarChart3,
  },
  {
    title: "Buyer Messaging & RFQ",
    desc: "Built-in chat to negotiate with buyers. Receive and respond to Request for Quotes directly from your dashboard.",
    icon: MessageSquare,
  },
  {
    title: "International Reach",
    desc: "Sell to buyers in Nepal, India, UAE, UK, USA & Europe. Multi-currency pricing and automatic tax calculation.",
    icon: Globe,
  },
  {
    title: "Digital Catalogues",
    desc: "Create beautiful shareable catalogues for WhatsApp, email, or social media. Update inventory and catalogues sync automatically.",
    icon: BookOpen,
  },
  {
    title: "AI-Powered Tools",
    desc: "Auto-generate product descriptions, get pricing suggestions, and use smart tagging to boost discoverability.",
    icon: Sparkles,
  },
];

const TIPS = [
  {
    title: "Use High-Quality Photos",
    desc: "Products with clear, well-lit photos on a white or neutral background get up to 3× more enquiries. Show multiple angles and close-ups of hallmark stamps.",
    icon: Camera,
  },
  {
    title: "Complete Your Shop Profile",
    desc: "Shops with a logo, banner, full description, and verified contact details appear higher in search results and earn more trust.",
    icon: ShieldCheck,
  },
  {
    title: "Price Competitively",
    desc: "Research similar products on the marketplace. Include making charges transparently — buyers prefer clear breakdowns over hidden fees.",
    icon: TrendingUp,
  },
  {
    title: "Respond Quickly",
    desc: "Sellers who reply within 1 hour have 5× higher conversion rates. Enable push notifications to never miss an enquiry.",
    icon: Zap,
  },
  {
    title: "Update Regularly",
    desc: "Fresh inventory gets boosted in listings. Add new products weekly and remove sold-out items promptly to maintain a professional shop.",
    icon: LayoutDashboard,
  },
  {
    title: "Build Your Reputation",
    desc: "Encourage satisfied buyers to leave reviews. A strong rating history helps you appear in 'Top Rated' and 'Featured Sellers' sections.",
    icon: Users,
  },
];

const FAQS = [
  {
    q: "Is it free to list my shop on Orivraa?",
    a: "Yes! Our Free plan lets you list up to 15 products with no monthly fee. You only pay a small commission on completed sales. Upgrade to Pro for unlimited products and advanced features.",
  },
  {
    q: "What types of jewellery can I sell?",
    a: "You can sell gold, silver, diamond, platinum, and fashion jewellery. We support all categories including rings, necklaces, bangles, earrings, wedding sets, and custom-designed pieces.",
  },
  {
    q: "How do I receive payments?",
    a: "Payments are processed securely and deposited to your registered bank account. We support local banking in Nepal (eSewa/Khalti/bank transfer), India (UPI/NEFT), UAE, UK, and USA.",
  },
  {
    q: "Can I sell internationally?",
    a: "Absolutely. Your shop is visible to buyers worldwide. You can set prices in multiple currencies, and our platform handles tax calculations for each jurisdiction (VAT, GST, Sales Tax).",
  },
  {
    q: "What if I need help setting up?",
    a: `Our support team is available via chat and email at ${BRAND.supportEmail}. We also offer free onboarding calls for Pro plan sellers to help you get the most from the platform.`,
  },
  {
    q: "How long does verification take?",
    a: "Basic verification (email + phone) is instant. Business verification with documents typically takes 1-2 business days. Verified sellers get a trust badge on their shop.",
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  PAGE                                                          */
/* ────────────────────────────────────────────────────────────── */

export default function SellerGuidePage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/10" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
              <Store className="h-4 w-4" />
              <T>Seller Guide</T>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              <T>Start Selling Jewellery on</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                {BRAND.name}
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              <T>
                Everything you need to launch and grow your jewellery business
                online. From registration to your first sale — this guide walks
                you through every step.
              </T>
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Register Your Shop</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
              >
                <T>View Pricing Plans</T>
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>How It Works</T>
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              <T>Go from sign-up to your first sale in four simple steps</T>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="relative group">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <s.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
                    Step {s.step}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <T>{s.title}</T>
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{s.desc}</T>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform Features ────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                <T>Powerful Tools for Sellers</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  Everything you need to manage and grow your jewellery business
                  — all in one dashboard
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    <T>{f.title}</T>
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{f.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Seller Tips ──────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>Tips for Success</T>
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              <T>
                Follow these best practices to maximize your sales and build a
                thriving jewellery business
              </T>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TIPS.map((t) => (
              <div
                key={t.title}
                className="flex gap-4 p-5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <t.icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    <T>{t.title}</T>
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{t.desc}</T>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing Preview ──────────────────────────────── */}
        <section className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700">
          <div className="max-w-4xl mx-auto px-4 py-14 text-center">
            <h2 className="text-2xl font-bold text-white">
              <T>Flexible Plans for Every Stage</T>
            </h2>
            <p className="mt-3 text-amber-100 max-w-2xl mx-auto">
              <T>
                Start free with up to 15 product listings. Upgrade to Pro for
                unlimited products, AI tools, priority listing, and dedicated
                support. Enterprise plans available for large operations.
              </T>
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-amber-600 rounded-full font-semibold hover:bg-amber-50 transition-colors"
            >
              <T>Compare Plans & Pricing</T>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>Frequently Asked Questions</T>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <T>{faq.q}</T>
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <T>{faq.a}</T>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 pb-20 text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 border border-gray-700">
            <CheckCircle2 className="h-10 w-10 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">
              <T>Ready to Grow Your Jewellery Business?</T>
            </h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              {t(
                `Join thousands of jewellers selling on ${BRAND.name}. Free to start, no contracts, cancel anytime.`,
              )}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Start Selling Today</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/partner"
                className="inline-flex items-center gap-2 px-8 py-3 text-white rounded-full font-semibold border border-gray-600 hover:border-amber-500 transition-colors"
              >
                <T>Become a Partner</T>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
