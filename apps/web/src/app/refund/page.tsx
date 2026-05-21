"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import Link from "next/link";
import { 
  RefreshCcw, 
  Gem, 
  Coins, 
  Zap, 
  CalendarClock, 
  Scale, 
  Mail,
  History,
  AlertCircle,
  ShieldCheck,
  ShoppingBag
} from "lucide-react";

export default function RefundPage() {
  const sections = [
    { id: "overview", title: "1. Policy Overview", icon: RefreshCcw },
    { id: "saas", title: "2. SaaS Subscription", icon: Zap },
    { id: "jewellery", title: "3. Jewellery & Physical Orders", icon: Gem },
    { id: "marketplace", title: "4. Marketplace Rules", icon: ShoppingBag },
    { id: "process", title: "5. Refund Process", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100/30 dark:bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <Badge
            variant="outline"
            className="mb-4 border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 px-4 py-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            <T>Fair & Transparent Returns</T>
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            <T>Refund Policy</T>
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            <T>
              At Orivraa, we balance the timeless value of precious metals with the 
              agility of modern software. Our refund policy is designed to be as 
              precise as our craftsmanship.
            </T>
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <History className="w-4 h-4" />
            <span>Effective Date: March 18, 2026</span>
          </div>
        </div>
      </section>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-3">
                Contents
              </p>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
                >
                  <section.icon className="w-4 h-4" />
                  {section.title.split(". ")[1]}
                </a>
              ))}
            </div>
          </aside>

          {/* Policy Text */}
          <div className="lg:col-span-9 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 md:p-12">
            <div className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-h2:text-2xl prose-h2:flex prose-h2:items-center prose-h2:gap-3 prose-h2:pt-8 prose-h2:mt-8 prose-h2:border-t prose-h2:border-gray-100 dark:prose-h2:border-gray-800 first:prose-h2:mt-0 first:prose-h2:pt-0 first:prose-h2:border-0
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-li:text-gray-600 dark:prose-li:text-gray-300
              prose-strong:text-gray-900 dark:prose-strong:text-white
              prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:font-semibold">
              
              <h2 id="overview">
                <RefreshCcw className="w-5 h-5 text-amber-500" />
                1. Policy Overview
              </h2>
              <p>
                This Refund Policy outlines the terms and conditions for refunds across Orivraa&apos;s
                ecosystem — covering our SaaS subscriptions and software products (primary), as well as
                physical jewellery marketplace orders. By purchasing from Orivraa or subscribing to our
                software platform, you agree to the conditions outlined below.
              </p>
              
              <h2 id="saas">
                <Zap className="w-5 h-5 text-amber-500" />
                2. SaaS &amp; Software Subscription
              </h2>
              <p>
                Orivraa provides SaaS tools for jewellery businesses across web, mobile POS,
                and desktop software, including Free, Pro, and Pro+ plans. These digital
                services operate on a recurring monthly basis.
              </p>
              <ul>
                <li><strong>No Refunds:</strong> SaaS subscription fees (Pro and Pro+) are strictly non-refundable. We do not provide pro-rated refunds for unused days within a billing cycle.</li>
                <li><strong>Cancel Anytime:</strong> You may unsubscribe at any time through your dashboard.</li>
                <li><strong>Access Duration:</strong> Upon cancellation, you will retain full access to your plan&apos;s features until the end of the current paid billing month.</li>
                <li><strong>Free Plan:</strong> Our Free version is available indefinitely to ensure you are satisfied with the software before upgrading to a paid tier.</li>
              </ul>

              <h2 id="jewellery">
                <Gem className="w-5 h-5 text-amber-500" />
                3. Jewellery &amp; Physical Order Refunds
              </h2>
              <p>
                Due to the volatile nature of precious metal markets and the unique value of gemstones,
                our refund policy for physical jewellery is strictly partitioned by material type:
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-6 my-6 rounded-r-xl">
                <h4 className="text-amber-900 dark:text-amber-400 font-bold flex items-center gap-2 m-0">
                  <Coins className="w-5 h-5" />
                  Material Specific Rules
                </h4>
                <ul className="mt-4 mb-0 space-y-2">
                  <li><strong>Gold &amp; Silver:</strong> Refundable based on the daily market rate minus a standard 2% processing fee.</li>
                  <li><strong>Diamonds &amp; Gemstones:</strong> Non-refundable. Once a diamond or gemstone is set or sold, it is considered a final sale due to certification and security protocols.</li>
                  <li><strong>Hybrid Pieces:</strong> For jewellery containing both precious metals and diamonds, only the gold/silver component is eligible for a refund. The value of the diamond/gemstone will be deducted from the total refund amount.</li>
                </ul>
              </div>

              <h2 id="marketplace">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                4. Marketplace &amp; System Rules
              </h2>
              <p>
                To maintain the integrity of our global B2B/B2C marketplace, the following additional rules apply:
              </p>
              <ul>
                <li><strong>Custom RFQs:</strong> Any jewellery produced via a custom Request for Quote (RFQ) is considered a bespoke commission and is non-refundable unless a structural defect is verified.</li>
                <li><strong>AI Assistance Add-ons:</strong> Usage-based AI assistance credits or other digital service top-ups are non-refundable once allocated or consumed.</li>
                <li><strong>Logistics Fees:</strong> Shipping, insurance, and international customs duties are non-refundable once the item has been dispatched from our facility or a partner facility.</li>
              </ul>

              <h2 id="process">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                5. Refund Process
              </h2>
              <p>
                To initiate a refund for eligible items, please follow these steps:
              </p>
              <ol>
                <li>
                  Submit a refund request through the <Link href="/support" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">Support Center</Link> within 7 days of the relevant transaction or delivery.
                </li>
                <li>For marketplace jewellery: our quality assurance team will verify the purity and weight of the returned item. For SaaS billing disputes: our team will review your account and transaction records.</li>
                <li>Once reviewed and approved, the refund will be processed to your original payment method within 10–14 business days.</li>
              </ol>
              
              <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-full shadow-sm">
                  <Mail className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white m-0 truncate">Questions?</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">Our support team is available 24/7 for refund inquiries.</p>
                </div>
                <Link
                  href="/support"
                  className="md:ml-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md active:scale-95 no-underline"
                >
                  Open Support Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}

