import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BRAND } from "@/config/brand";
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Crown,
  Globe,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
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

const BENEFITS = [
  {
    title: "Expand Your Reach",
    desc: "Access buyers across Nepal, India, UAE, UK, USA & Europe through a single marketplace — no need to manage multiple sales channels.",
    icon: Globe,
  },
  {
    title: "Zero Upfront Cost",
    desc: "No setup fees, no listing charges. Start with our Free plan and only pay a small commission when you make a sale.",
    icon: Zap,
  },
  {
    title: "Trusted Platform",
    desc: "Join a verified marketplace trusted by thousands of buyers. Our verification badges and review system build confidence in your brand.",
    icon: ShieldCheck,
  },
  {
    title: "Growth Tools",
    desc: "AI-powered descriptions, analytics dashboard, digital catalogues, and marketing tools to help you sell more with less effort.",
    icon: TrendingUp,
  },
];

const PARTNER_TYPES = [
  {
    title: "Retail Jeweller",
    desc: "Brick-and-mortar shops looking to expand online. List your inventory, reach international buyers, and manage everything from one dashboard.",
    icon: Store,
    ideal: "Local jewellery shops, boutique jewellers, family-run businesses",
  },
  {
    title: "Wholesale Supplier",
    desc: "Supply gold, silver, diamonds, and gemstones to retailers on the platform. Process bulk orders and build B2B relationships.",
    icon: Package,
    ideal: "Gold suppliers, diamond dealers, gemstone wholesalers",
  },
  {
    title: "Jewellery Manufacturer",
    desc: "Showcase your manufacturing capabilities. Accept custom orders, offer making-to-order services, and connect with retailers worldwide.",
    icon: Building2,
    ideal: "Factories, workshops, artisan collectives, custom designers",
  },
  {
    title: "Brand Ambassador",
    desc: "Help grow the Orivraa community in your region. Earn referral commissions by onboarding new sellers and promoting the platform.",
    icon: Megaphone,
    ideal: "Industry professionals, influencers, jewellery consultants",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Submit Application",
    desc: "Fill out the partner application form with your business details, product categories, and target markets.",
  },
  {
    step: 2,
    title: "Verification",
    desc: "Our team reviews your application and verifies your business credentials. This typically takes 1-2 business days.",
  },
  {
    step: 3,
    title: "Onboarding",
    desc: "Get a dedicated onboarding specialist who helps you set up your shop, import products, and configure settings.",
  },
  {
    step: 4,
    title: "Launch & Grow",
    desc: "Go live on the marketplace. Access partner-exclusive tools, priority support, and co-marketing opportunities.",
  },
];

const PERKS = [
  { text: "Dedicated account manager", icon: Users },
  { text: "Priority listing placement", icon: Crown },
  { text: "Custom commission rates", icon: Percent },
  { text: "Co-branded marketing", icon: Megaphone },
  { text: "Early access to new features", icon: Sparkles },
  { text: "Advanced analytics & reports", icon: BarChart3 },
  { text: "API access for integration", icon: LayoutDashboard },
  { text: "Partner verification badge", icon: Award },
];

const FAQS = [
  {
    q: "Who can become an Orivraa partner?",
    a: "Any jewellery business — retailers, wholesalers, manufacturers, and designers — can apply. We accept partners from Nepal, India, UAE, UK, USA, and Europe. Individual artisans and brand ambassadors are also welcome.",
  },
  {
    q: "Is there a fee to join the partner programme?",
    a: "No. There is zero cost to join. Partners start on our Free plan and can upgrade to Pro or Enterprise for additional features. We only charge a small commission on completed sales.",
  },
  {
    q: "How is this different from just creating a seller account?",
    a: "Partners get priority onboarding, a dedicated account manager, custom commission rates, co-marketing opportunities, and early access to new platform features. It's our premium tier for serious jewellery businesses.",
  },
  {
    q: "What documents do I need to apply?",
    a: "You'll need a valid business registration (PAN/VAT certificate, trade license, etc.), a government-issued ID, and photos of your products or showroom. Requirements vary by country.",
  },
  {
    q: "How long does the application take?",
    a: "Most applications are reviewed within 1-2 business days. Once approved, your onboarding specialist will schedule a call within 24 hours to help you get started.",
  },
  {
    q: "Can I partner if I'm already selling on other platforms?",
    a: "Absolutely. Many of our partners sell on multiple platforms. We can even help you import your existing product catalogue to get started faster.",
  },
];

const STATS = [
  { label: "Active Sellers", value: "2,000+" },
  { label: "Countries Served", value: "6+" },
  { label: "Products Listed", value: "50,000+" },
  { label: "Monthly Buyers", value: "100K+" },
];

/* ────────────────────────────────────────────────────────────── */
/*  PAGE                                                          */
/* ────────────────────────────────────────────────────────────── */

export default function PartnerPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/10" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
              <Users className="h-4 w-4" />
              Partner Programme
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Grow Your Jewellery Business{" "}
              <span className="text-amber-600 dark:text-amber-400">
                Together
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Join {BRAND.name}&apos;s partner network and reach thousands of
              jewellery buyers across 6+ countries. Get premium tools, dedicated
              support, and co-marketing to accelerate your growth.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/25"
              >
                Apply to Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller-guide"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
              >
                Read Seller Guide
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why Partner ─────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Why Partner With {BRAND.name}?
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              We provide everything you need to take your jewellery business to
              the next level
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-5 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <b.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Partnership Types ────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Partnership Types
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                Choose the partnership model that fits your business
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {PARTNER_TYPES.map((pt) => (
                <div
                  key={pt.title}
                  className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <pt.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {pt.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {pt.desc}
                  </p>
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Ideal for: {pt.ideal}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to Become a Partner ──────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              How to Become a Partner
            </h2>
          </div>
          <div className="space-y-6">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  {s.step}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Partner Perks ────────────────────────────────── */}
        <section className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              What Partners Get
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PERKS.map((p) => (
                <div
                  key={p.text}
                  className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl"
                >
                  <p.icon className="h-4 w-4 text-amber-100 flex-shrink-0" />
                  <span className="text-sm text-white font-medium">
                    {p.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 pb-20 text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 border border-gray-700">
            <Users className="h-10 w-10 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">
              Ready to Partner With Us?
            </h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              Join the fastest-growing jewellery marketplace. No upfront costs,
              dedicated support, and tools to help you succeed internationally.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/25"
              >
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`mailto:${BRAND.salesEmail}`}
                className="inline-flex items-center gap-2 px-8 py-3 text-white rounded-full font-semibold border border-gray-600 hover:border-amber-500 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
