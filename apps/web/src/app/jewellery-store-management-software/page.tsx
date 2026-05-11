"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  INDIA_PRO_MONTHLY_PRICE,
  PUBLIC_LOCAL_PRICING_SUMMARY,
} from "@/lib/seo/pricing-copy";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Scale,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Store Management Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Complete jewellery store management software with inventory tracking, billing, POS, customer management, analytics, and multi-currency support.",
      url: "https://www.orivraa.com/jewellery-store-management-software",
      offers: {
        "@type": "Offer",
        price: `${INDIA_PRO_MONTHLY_PRICE}`,
        priceCurrency: "INR",
        eligibleRegion: { "@type": "Country", name: "India" },
        description: `India Pro starts at ₹299/month. ${PUBLIC_LOCAL_PRICING_SUMMARY}`,
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "320",
        bestRating: "5",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is jewellery store management software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jewellery store management software is a specialised tool that helps jewellery shop owners manage inventory by weight and purity, handle billing with making charges, track customer orders, and run analytics — all tailored for gold, silver, and diamond businesses.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa free for jewellery stores?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Orivraa offers a permanently free plan that includes up to 15 products, basic inventory management, customer messaging, and marketplace listing. Paid plans use local country pricing, including India Pro from ₹299/month for unlimited products and advanced features.",
          },
        },
        {
          "@type": "Question",
          name: "Can I manage multiple store branches with Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Orivraa Enterprise plan supports multi-branch management with centralised inventory, staff management, and consolidated reporting across all your jewellery store locations.",
          },
        },
        {
          "@type": "Question",
          name: "Does the software track gold purity and weight?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolutely. Orivraa tracks inventory by weight (grams, tola, ounce) and purity (24K, 22K, 18K, 14K for gold; 925/999 for silver; carats for diamonds). Making charges and stone weights are also managed.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Package,
    title: "Smart Inventory Management",
    desc: "Track gold, silver, and diamond inventory by weight, purity, and piece count. Automatic stock alerts when items run low. Supports grams, tola, ounce, and laal weight units.",
  },
  {
    icon: Receipt,
    title: "Billing & Invoicing",
    desc: "Generate professional invoices with making charges, stone charges, old gold exchange, and tax calculations. GST/VAT compliant with customisable templates.",
  },
  {
    icon: Users,
    title: "Customer Management",
    desc: "Build customer profiles with purchase history, preferences, and wish lists. Send personalised offers and track repeat business for better retention.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Real-time dashboards showing sales trends, inventory valuation, profit margins, and staff performance. Export reports for tax filing.",
  },
  {
    icon: Globe,
    title: "Multi-Currency & Multi-Market",
    desc: "Sell in NPR, INR, AED, GBP, USD, and EUR. Automatic currency conversion and localised tax calculation for each market.",
  },
  {
    icon: MessageSquare,
    title: "Customer Chat & RFQ",
    desc: "Built-in messaging lets customers enquire about products, request custom designs, and negotiate prices directly through the platform.",
  },
  {
    icon: Store,
    title: "Online Store & Marketplace",
    desc: "Get listed on Orivraa's marketplace reaching buyers across Nepal, India, Dubai, USA, UK, and Europe. No separate website needed.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Tools",
    desc: "AI product descriptions, smart tagging, design generation, price optimisation, and demand forecasting to help you sell smarter.",
  },
  {
    icon: LayoutDashboard,
    title: "Centralised Dashboard",
    desc: "One dashboard to manage products, orders, customers, finances, and staff. See everything at a glance from any device.",
  },
];

const COMPARISON = [
  {
    feature: "Cloud-Based (Access Anywhere)",
    orivraa: true,
    marg: false,
    zoho: true,
    vyapar: true,
  },
  {
    feature: "Jewellery-Specific Inventory",
    orivraa: true,
    marg: true,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Weight & Purity Tracking",
    orivraa: true,
    marg: true,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Built-in Marketplace",
    orivraa: true,
    marg: false,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Multi-Currency Support",
    orivraa: true,
    marg: false,
    zoho: true,
    vyapar: false,
  },
  {
    feature: "Customer Chat & RFQ",
    orivraa: true,
    marg: false,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Digital Catalogues",
    orivraa: true,
    marg: false,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "AI-Powered Features",
    orivraa: true,
    marg: false,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Free Plan Available",
    orivraa: true,
    marg: false,
    zoho: true,
    vyapar: true,
  },
  {
    feature: "Desktop App",
    orivraa: true,
    marg: true,
    zoho: false,
    vyapar: false,
  },
  {
    feature: "Multi-Branch Support",
    orivraa: true,
    marg: true,
    zoho: true,
    vyapar: false,
  },
  {
    feature: "GST/Tax Compliant",
    orivraa: true,
    marg: true,
    zoho: true,
    vyapar: true,
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    step: "1",
    title: "Sign Up Free",
    desc: "Create your account in under 2 minutes. No credit card needed. Start with 15 free product listings.",
  },
  {
    icon: Store,
    step: "2",
    title: "Set Up Your Store",
    desc: "Add your business details, logo, and contact information. Configure tax settings and currency preferences.",
  },
  {
    icon: Package,
    step: "3",
    title: "Add Your Inventory",
    desc: "Upload products with weight, purity, photos, and pricing. Use bulk upload to add hundreds of items at once.",
  },
  {
    icon: TrendingUp,
    step: "4",
    title: "Start Selling",
    desc: "Your store goes live on Orivraa's marketplace. Accept orders, chat with customers, and track sales from your dashboard.",
  },
];

export default function JewelleryStoreManagementSoftwarePage() {
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-gold-400 mb-4">
              <T>Complete Store Management</T>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              <T>Jewellery Store Management Software</T>{" "}
              <span className="text-amber-600 dark:text-gold-400">
                <T>for Modern Shops</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              <T>
                Manage your entire jewellery business from one platform —
                inventory tracking by weight and purity, billing with making
                charges, customer management, analytics, and an online
                marketplace. Active buyers across 6 countries, growing daily.
                Starts free.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <T>Start Free</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <T>View Pricing</T>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <section className="bg-gray-900 py-6">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { n: "Free", l: "To Join" },
              { n: "6", l: "Countries Served" },
              { n: "<5 min", l: "Setup Time" },
              { n: "₹0", l: "Starting Price" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl lg:text-3xl font-bold text-gold-400">
                  {s.n}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  <T>{s.l}</T>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why You Need Store Management Software ───────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              <T>Why Jewellery Stores Need Dedicated Management Software</T>
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                <T>
                  Running a jewellery store is fundamentally different from
                  running a general retail shop. You deal with precious metals
                  tracked by weight and purity, custom orders with making
                  charges, old gold exchange, karigar (artisan) management, and
                  compliance with hallmarking regulations.
                </T>
              </p>
              <p>
                <T>
                  Generic retail software like Shopify or Square simply cannot
                  handle the nuances of jewellery — they don't support
                  weight-based inventory, purity grading, or making-charge
                  calculations. That's why jewellery-specific store management
                  software like Orivraa exists.
                </T>
              </p>
              <p>
                <T>
                  With Orivraa, you get a purpose-built platform that
                  understands the jewellery business from the ground up — from
                  22K gold necklaces to diamond solitaires, from wholesale
                  dealers to retail customers, from local markets to
                  international buyers.
                </T>
              </p>
            </div>
          </div>
        </section>

        {/* ── Core Features ───────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Everything You Need to Run Your Jewellery Store</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>
                From inventory to invoicing, customer management to analytics —
                one platform does it all.
              </T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
                >
                  <f.icon className="h-8 w-8 text-amber-600 dark:text-gold-400 mb-3" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{f.title}</T>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{f.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison Table ────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>How Orivraa Compares to Other Store Management Software</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>
                See why jewellers are switching to Orivraa for modern store
                management.
              </T>
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-amber-700 dark:text-gold-400">
                      Orivraa
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      Marg ERP
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      Zoho
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      Vyapar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/50"
                      }
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <T>{row.feature}</T>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.orivraa ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.marg ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.zoho ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.vyapar ? "✅" : "❌"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <T>Get Started in 4 Simple Steps</T>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-7 w-7 text-amber-600 dark:text-gold-400" />
                  </div>
                  <div className="text-xs font-bold text-amber-600 dark:text-gold-400 mb-2">
                    STEP {s.step}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{s.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <T>{s.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who Is This For ─────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Built for Every Type of Jewellery Business</T>
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: Store,
                  title: "Retail Jewellery Shops",
                  desc: "Single or multi-store retail operations. Track walk-in sales, manage display inventory, and build customer loyalty programmes.",
                },
                {
                  icon: Scale,
                  title: "Wholesale Dealers",
                  desc: "Manage large-volume gold and silver trading. Track weight-based transactions, karigar allotments, and dealer networks.",
                },
                {
                  icon: Sparkles,
                  title: "Custom Design Studios",
                  desc: "Accept custom orders with design consultations, manage order progress from design to delivery, and showcase portfolio online.",
                },
                {
                  icon: Globe,
                  title: "Online Jewellery Sellers",
                  desc: "Sell internationally through Orivraa's marketplace. Multi-currency pricing, international shipping support, and global customer reach.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="flex gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <c.icon className="h-8 w-8 text-amber-600 dark:text-gold-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                      <T>{c.title}</T>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <T>{c.desc}</T>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What is jewellery store management software?",
                  a: "Jewellery store management software is a specialised tool designed for gold, silver, and diamond businesses. Unlike generic retail software, it handles weight-based inventory, purity grading (24K, 22K, etc.), making charges, old gold exchange, and jewellery-specific tax calculations.",
                },
                {
                  q: "How much does Orivraa cost?",
                  a: "Orivraa starts free with up to 15 product listings. Paid plans use local country pricing, including India Pro from ₹299/month and India Pro+ from ₹599/month. Enterprise pricing is custom based on your requirements.",
                },
                {
                  q: "Can I migrate from another software like Marg ERP or Vyapar?",
                  a: "Yes, Orivraa supports bulk product upload via CSV/Excel, making it easy to migrate your existing inventory. Our team also offers migration assistance for Enterprise plan customers.",
                },
                {
                  q: "Does it work on mobile and desktop?",
                  a: "Yes. Orivraa is fully responsive and works in any browser. We also offer a desktop app for Windows and macOS, plus mobile-optimised web access for managing your store on the go.",
                },
                {
                  q: "Is my data secure?",
                  a: "Absolutely. Orivraa uses bank-grade encryption, your data is hosted on secure cloud servers with automatic backups. We never share your business data with third parties.",
                },
                {
                  q: "Do I need technical knowledge to set up?",
                  a: "Not at all. Orivraa is designed to be intuitive. Most jewellers get their store up and running within 15 minutes. Our support team is available if you need help.",
                },
                {
                  q: "Can I manage multiple branches?",
                  a: "Yes. The Enterprise plan supports multi-branch management with centralised inventory, staff permissions, and consolidated reports across all your locations.",
                },
                {
                  q: "Which countries does Orivraa support?",
                  a: "Orivraa currently supports Nepal, India, UAE, USA, UK, and Europe with localised currencies (NPR, INR, AED, USD, GBP, EUR), tax rules, and weight units.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750">
                    <T>{faq.q}</T>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform shrink-0 ml-4" />
                  </summary>
                  <p className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{faq.a}</T>
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Ready to Modernise Your Jewellery Store?</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                Jewellers across 6 countries use Orivraa to manage their stores
                every day. Free forever plan — no credit card required.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                <T>Start Free Today</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                <T>Learn More</T>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
