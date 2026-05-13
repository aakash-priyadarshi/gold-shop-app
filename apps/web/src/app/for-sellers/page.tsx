import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AISalesteamPromo } from "@/components/marketing/AISalesteamPromo";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { T } from "@/components/ui/T";
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    CheckCircle2,
    Clock,
    Globe,
    MessageSquare,
    Package,
    ShieldCheck,
    Store,
    TrendingUp,
    Zap
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sell on Orivraa — Get Custom Orders from Real Buyers | Free to Join",
  description:
    "Jewellers: buyers in your city are already posting custom jewellery requests. Join Orivraa free — get a digital shop profile, receive RFQ leads, and manage orders from one dashboard. No commission until you sell.",
  alternates: { canonical: "https://www.orivraa.com/for-sellers" },
};

/* ─────────────────────────────────────────────────────── */
/* DATA                                                    */
/* ─────────────────────────────────────────────────────── */

const OBJECTIONS = [
  {
    q: "Do I have to pay to join?",
    a: "No. Creating your shop profile is completely free. We only take a small commission when you actually complete an order — if you never sell, you never pay anything.",
  },
  {
    q: "I already have customers — why do I need this?",
    a: "You don't have to use the marketplace at all. Your free Orivraa profile gives you a shareable link and QR code you can hand to walk-in customers — so they can browse your catalogue on their phone. Think of it as a free digital brochure for your existing shop.",
  },
  {
    q: "I don't want my prices shown publicly.",
    a: "You control everything. You can keep your catalogue private (shareable link only), hide prices, or show them publicly. You set the price — we never display anything you haven't approved.",
  },
  {
    q: "Will I lose control of my customer relationships?",
    a: "No. Buyers contact you through the platform chat — we never share their phone number or email without consent. Your customer relationships stay yours.",
  },
  {
    q: "I'm not tech-savvy. Is this complicated?",
    a: "Setup takes under 10 minutes. If you can use WhatsApp, you can use Orivraa. We also offer free onboarding support over call if you need it.",
  },
];

const FEATURES = [
  {
    icon: Store,
    title: "Free Digital Shop Profile",
    desc: "A shareable link and QR code for your shop. Share it with walk-in customers, put it on your WhatsApp status, or print it on your business card.",
  },
  {
    icon: MessageSquare,
    title: "RFQ Leads in Your City",
    desc: "When a buyer in your area posts a custom jewellery request, you get notified. Review the request and decide whether to quote — no obligation.",
  },
  {
    icon: Package,
    title: "Digital Catalogue",
    desc: "Upload your existing products with photos. Customers can browse your collection online before visiting your shop — reducing your time spent on window shoppers.",
  },
  {
    icon: BarChart3,
    title: "Order & Quote Dashboard",
    desc: "Track all your custom orders, quotes, and customer messages in one place. No more lost WhatsApp threads or forgotten orders.",
  },
  {
    icon: Globe,
    title: "Reach NRI & Global Buyers",
    desc: "Buyers from the Indian diaspora in the UAE, UK, and USA are actively looking for trustworthy jewellers back home for custom pieces. Your shop becomes visible to them.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow Payment Protection",
    desc: "When a buyer places an order, their payment is held securely until you confirm delivery. You get paid — no payment disputes, no chasing.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create Your Free Shop",
    desc: "Register, fill in your shop name, city, and a few photos. Done in 5–10 minutes.",
    time: "5 min",
  },
  {
    step: "2",
    title: "Get Notified of Buyer Requests",
    desc: "Buyers in your city post custom jewellery requests (RFQs). You get an alert and can choose to quote or skip — no pressure.",
    time: "Automatic",
  },
  {
    step: "3",
    title: "Send a Quote & Complete the Order",
    desc: "If the buyer accepts your quote, they pay a booking fee into escrow. You make the piece, ship it, and get paid. That's it.",
    time: "Your pace",
  },
];

/* ─────────────────────────────────────────────────────── */
/* PAGE                                                    */
/* ─────────────────────────────────────────────────────── */

export default function ForSellersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/50 via-transparent to-transparent dark:from-amber-900/10 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold mb-6">
              <Zap className="h-4 w-4" />
              <T>Free to join — no credit card needed</T>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Buyers in your city are</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>waiting for a jeweller</T>
              </span>{" "}
              <T>like you.</T>
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Orivraa connects verified jewellers with buyers who are already
                looking for custom pieces, ready-made jewellery, and trusted shops.
                Get a free digital shop profile. Receive leads. Get paid securely.
              </T>
            </p>

            {/* Demand Proof Bar */}
            <div className="inline-flex flex-wrap justify-center gap-6 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl px-8 py-5 mb-10 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  <T>Active</T>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <T>Buyer requests this week</T>
                </p>
              </div>
              <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  6+
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <T>Countries with active buyers</T>
                </p>
              </div>
              <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹0
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <T>Cost to join</T>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-base transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Claim Your Free Shop Profile</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/seller-guide"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold text-base border border-gray-200 dark:border-gray-700 hover:border-amber-300 transition-colors"
              >
                <T>How it works</T>
              </Link>
            </div>
            <TrustSignals variant="compact" className="mt-10" />
          </div>
        </section>

        {/* ── AI sales card ─────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 -mt-4 mb-4">
          <AISalesteamPromo variant="card" />
        </section>

        {/* ── How It Works ─────────────────────────────── */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                <T>Start getting orders in 3 steps</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                <T>No complex setup. No upfront fees. Just your shop, online.</T>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
              {STEPS.map((s) => (
                <div key={s.step} className="relative text-center">
                  <div className="w-14 h-14 bg-amber-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-amber-500/30">
                    {s.step}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                    <Clock className="h-3 w-3" />
                    <T>{s.time}</T>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    <T>{s.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    <T>{s.desc}</T>
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-base transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Get Started Free</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── What You Get ─────────────────────────────── */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                <T>Everything included. For free.</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  Your free shop profile comes with all of this. Advanced tools
                  (analytics, invoicing, POS) unlock when you upgrade — but you
                  don&apos;t need them to start getting orders.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
                    <T>{f.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    <T>{f.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust / Credibility ──────────────────────── */}
        <section className="py-16 bg-amber-600 dark:bg-amber-700">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              <T>You control your business. We handle the tech.</T>
            </h2>
            <p className="text-amber-100 text-lg mb-10 max-w-2xl mx-auto">
              <T>
                We are not a marketplace that replaces your shop — we are a tool
                that helps your shop reach more customers. Your prices, your
                relationships, your brand.
              </T>
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-white">
              {[
                "No hidden fees",
                "You set your own prices",
                "Cancel anytime",
                "Your customer data stays yours",
                "Escrow protects your payment",
                "Free onboarding call",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-200 flex-shrink-0" />
                  <span className="text-sm font-medium"><T>{item}</T></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Objections / FAQ ─────────────────────────── */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                <T>Common questions from jewellers</T>
              </h2>
            </div>
            <div className="space-y-4">
              {OBJECTIONS.map((item) => (
                <div
                  key={item.q}
                  className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-start gap-2">
                    <BadgeCheck className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <T>{item.q}</T>
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-7">
                    <T>{item.a}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────── */}
        <section className="py-16 bg-gray-950 dark:bg-black">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-900/40 text-green-400 text-sm font-semibold mb-6">
              <TrendingUp className="h-4 w-4" />
              <T>Buyers are actively waiting</T>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <T>Ready to start getting orders?</T>
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              <T>
                Join free. No credit card. Your shop profile will be live in under
                10 minutes.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-base transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Claim Your Free Shop Profile</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-base border border-gray-700 transition-colors"
              >
                <T>See All Features</T>
              </Link>
            </div>
            <p className="mt-6 text-xs text-gray-600">
              <T>Questions?</T>{" "}
              <Link
                href="/contact"
                className="text-amber-400 hover:underline"
              >
                <T>Talk to our team</T>
              </Link>{" "}
              <T>— we&apos;ll help you get set up.</T>
            </p>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
