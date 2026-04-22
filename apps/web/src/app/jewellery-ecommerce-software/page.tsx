"use client";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Globe,
  Image,
  MessageSquare,
  Share2,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Ecommerce Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Sell jewellery online through Orivraa's built-in marketplace. Digital catalogues, multi-currency pricing, international shipping, customer chat, and order management — no website needed.",
      url: "https://www.orivraa.com/jewellery-ecommerce-software",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan available. Pro from $12.99/month.",
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
          name: "Do I need my own website to sell jewellery online with Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Orivraa provides a built-in marketplace where your products are listed and discovered by buyers across Nepal, India, UAE, USA, UK, and Europe. You get your own shop profile page — no separate website needed.",
          },
        },
        {
          "@type": "Question",
          name: "Can I sell jewellery internationally with Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports multi-currency pricing (NPR, INR, AED, USD, GBP, EUR) and localised tax calculations. Your products are visible to buyers worldwide through the marketplace.",
          },
        },
        {
          "@type": "Question",
          name: "How do customers find my jewellery on Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Buyers browse the Orivraa marketplace by category, metal type, price range, and location. Your products also appear in Google Shopping results and are sharable via WhatsApp and social media.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Store,
    title: "Built-in Marketplace Listing",
    desc: "Get listed on Orivraa's marketplace reaching buyers across 6 countries. No need to build or maintain a separate website — customers find you here.",
  },
  {
    icon: Image,
    title: "Digital Catalogues",
    desc: "Create beautiful digital catalogues of your jewellery collection. Share via WhatsApp, Instagram, Facebook, and email. Update products instantly.",
  },
  {
    icon: Globe,
    title: "Multi-Currency Pricing",
    desc: "Set prices in NPR, INR, AED, GBP, USD, or EUR. Buyers see prices in their local currency with automatic conversion and tax calculation.",
  },
  {
    icon: ShoppingCart,
    title: "Online Order Management",
    desc: "Receive and manage orders from your dashboard. Track order status from confirmation to delivery with customer notifications at each stage.",
  },
  {
    icon: MessageSquare,
    title: "Customer Chat & Enquiries",
    desc: "Buyers can message you directly about products, ask for custom designs, and negotiate prices. Built-in RFQ (Request for Quote) system for custom orders.",
  },
  {
    icon: Sparkles,
    title: "AI Product Descriptions",
    desc: "Generate professional product descriptions, SEO tags, and social media captions using AI. Upload a photo and get compelling copy in seconds.",
  },
  {
    icon: Share2,
    title: "Social Media Integration",
    desc: "Share products on WhatsApp, Instagram, and Facebook with one click. Generate social-ready images with pricing and shop branding overlay.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    desc: "Accept online payments securely. Support for UPI, bank transfer, cards, and cash on delivery. Funds deposited directly to your account.",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    desc: "Track online sales, conversion rates, popular products, and customer geography. Understand what sells and where your buyers come from.",
  },
];

const SELLING_STEPS = [
  {
    step: "1",
    title: "Create Your Shop Profile",
    desc: "Sign up free. Add your shop name, logo, location, and story. Build trust with a professional seller profile.",
  },
  {
    step: "2",
    title: "Upload Your Jewellery",
    desc: "Add products with photos, weight, purity, pricing, and descriptions. Use bulk upload for large inventories.",
  },
  {
    step: "3",
    title: "Share & Get Discovered",
    desc: "Your products appear on the marketplace. Share catalogues on WhatsApp and social media. AI-generated descriptions boost visibility.",
  },
  {
    step: "4",
    title: "Receive Orders & Sell",
    desc: "Customers browse, enquire, and order. Manage everything from your dashboard — confirmations, payments, and shipping.",
  },
];

export default function JewelleryEcommerceSoftwarePage() {
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
              <T>Ecommerce for Jewellers</T>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              <T>Sell Jewellery Online</T>{" "}
              <span className="text-amber-600 dark:text-gold-400">
                <T>Without Building a Website</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              <T>
                Orivraa gives your jewellery shop an instant online presence.
                List your products on our marketplace, create shareable digital
                catalogues, and reach buyers across Nepal, India, Dubai, USA, UK
                & Europe. No website development needed. Starts free.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <T>Start Selling Free</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/shops"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <T>Browse Marketplace</T>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <section className="bg-gray-900 py-6">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { n: "Free", l: "To List" },
              { n: "6", l: "Countries Reach" },
              { n: "Live", l: "Buyer Demand" },
              { n: "₹0", l: "To Start Selling" },
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

        {/* ── The Problem ─────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              <T>Why Traditional Jewellery Shops Struggle to Sell Online</T>
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                <T>
                  Most jewellers know they need to sell online, but the barriers
                  are real:
                </T>
              </p>
              <ul>
                <li>
                  <T>
                    Website development is expensive — Building a custom
                    jewellery ecommerce site costs ₹2-10 lakhs, plus ongoing
                    maintenance. Shopify and WooCommerce don't handle
                    weight-based pricing or purity tracking.
                  </T>
                </li>
                <li>
                  <T>
                    Photography is challenging — Jewellery photography needs
                    proper lighting and angles. Most jewellers don't have
                    professional setup or photo editing skills.
                  </T>
                </li>
                <li>
                  <T>
                    Product descriptions take time — Writing compelling
                    descriptions for hundreds of products in multiple languages
                    is tedious and expensive.
                  </T>
                </li>
                <li>
                  <T>
                    Payment and shipping are complex — Handling international
                    payments, customs duties, and secure shipping for high-value
                    items requires expertise.
                  </T>
                </li>
                <li>
                  <T>
                    Driving traffic is hard — Even with a website, getting
                    buyers to visit requires SEO knowledge, advertising budgets,
                    and social media marketing.
                  </T>
                </li>
              </ul>
              <p>
                <T>
                  Orivraa solves all of these. You upload your products, and we
                  handle the marketplace, discovery, AI-generated descriptions,
                  secure payments, and international reach. You focus on your
                  jewellery — we handle the ecommerce.
                </T>
              </p>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <T>Start Selling Online in 4 Steps</T>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {SELLING_STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {s.step}
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

        {/* ── Features ────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Everything You Need to Sell Jewellery Online</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>
                From product listing to order delivery — Orivraa handles the
                complete ecommerce workflow.
              </T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
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

        {/* ── Orivraa vs Building Your Own Website ─────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Orivraa vs Building Your Own Jewellery Website</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>
                Why spend lakhs on a custom website when you can start selling
                today?
              </T>
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      <T>Aspect</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-amber-700 dark:text-gold-400">
                      Orivraa
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      <T>Custom Website</T>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Setup Cost", "Free", "₹2-10 Lakhs"],
                    ["Time to Launch", "15 minutes", "2-6 months"],
                    [
                      "Maintenance",
                      "No technical skill needed",
                      "Developer required",
                    ],
                    [
                      "Built-in Buyers",
                      "6-country marketplace",
                      "You drive all traffic",
                    ],
                    [
                      "Weight-Based Pricing",
                      "Native support",
                      "Custom development",
                    ],
                    [
                      "Multi-Currency",
                      "6 currencies built in",
                      "Custom plugins needed",
                    ],
                    ["AI Descriptions", "Included", "Not available"],
                    ["Mobile Responsive", "Yes", "Depends on build"],
                    ["Customer Chat", "Built in", "Third-party integration"],
                    ["SEO Optimised", "Yes", "Depends on developer"],
                    ["Monthly Cost", "From $0", "$50-500+ hosting"],
                    [
                      "Digital Catalogues",
                      "Shareable on WhatsApp",
                      "Not available",
                    ],
                  ].map(([aspect, orivraa, custom], i) => (
                    <tr
                      key={aspect}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/50"
                      }
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        <T>{aspect}</T>
                      </td>
                      <td className="px-4 py-3 text-center text-amber-700 dark:text-gold-400 font-medium">
                        <T>{orivraa}</T>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        <T>{custom}</T>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Do I need to build my own website?",
                  a: "No. Orivraa gives you a dedicated shop profile on our marketplace. Buyers discover your products through search, categories, and location filters. You can share your shop link on social media and WhatsApp.",
                },
                {
                  q: "What commission does Orivraa charge on sales?",
                  a: "Orivraa charges a minimal 1% platform fee on completed transactions. There are no listing fees, no hidden charges, and no monthly minimums on the Free plan.",
                },
                {
                  q: "Can I sell internationally?",
                  a: "Yes. Your products are visible to buyers in Nepal, India, UAE, USA, UK, and Europe. Prices are automatically shown in the buyer's local currency.",
                },
                {
                  q: "How do I handle shipping for jewellery?",
                  a: "You manage shipping through your preferred courier. Orivraa provides order details and buyer addresses. For high-value items, we recommend insured courier services.",
                },
                {
                  q: "Can I create a digital catalogue to share on WhatsApp?",
                  a: "Yes! Create and customise digital catalogues from your product collection. Share the catalogue link on WhatsApp, Instagram, Facebook, or via email.",
                },
                {
                  q: "What if I already have a website?",
                  a: "You can use Orivraa as an additional sales channel alongside your existing website. The marketplace gives you extra visibility and access to Orivraa's buyer base.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-750">
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
              <T>Start Selling Jewellery Online Today</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                Jewellers across Nepal, India, Dubai, UK and US are already on
                Orivraa. Free to list — reach buyers worldwide.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                <T>Start Selling Free</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                <T>View Pricing</T>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
