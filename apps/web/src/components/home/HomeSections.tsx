"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import { BLOG_POSTS } from "@/data/blog-posts";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { useT } from "@/providers/translation-provider";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    Gem,
    Globe,
    LayoutDashboard,
    MessageSquare,
    Package,
    ShieldCheck,
    Smartphone,
    Store,
    Truck,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const features = [
  {
    icon: Gem,
    title: "Custom Manufacturing",
    desc: "Get jewellery made to your exact specifications. Choose materials, design, and receive quotes from multiple sellers.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Purity",
    desc: "All precious metals are certified. Choose from 24K, 22K, 18K gold, sterling silver, platinum, and more.",
  },
  {
    icon: Truck,
    title: "Secure Delivery",
    desc: "Insured worldwide shipping to Nepal, India, Dubai, USA & UK with real-time tracking. Pay on delivery option available for your peace of mind.",
  },
];

const steps = [
  {
    step: "1",
    title: "Submit Request",
    desc: "Describe your jewellery and upload reference images",
  },
  {
    step: "2",
    title: "Receive Quotes",
    desc: "Get competitive offers from verified sellers",
  },
  {
    step: "3",
    title: "Book & Track",
    desc: "Pay booking fee and track progress",
  },
  {
    step: "4",
    title: "Receive & Pay",
    desc: "Inspect and pay remaining balance",
  },
];

const shopFeatures = [
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    desc: "Real-time analytics, sales tracking, and inventory management in one clean interface.",
  },
  {
    icon: Package,
    title: "Inventory & Catalogue",
    desc: "Upload products with photos, set pricing by weight, manage stock with barcode/SKU support.",
  },
  {
    icon: MessageSquare,
    title: "Built-in Chat & RFQ",
    desc: "Receive custom order requests, chat with buyers in real-time, and send quotes instantly.",
  },
  {
    icon: Globe,
    title: "International Reach",
    desc: "Your shop is visible to buyers in 5+ countries. Multi-currency pricing handled automatically.",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    desc: "Track revenue, popular products, customer demographics, and conversion rates.",
  },
  {
    icon: Smartphone,
    title: "Mobile POS — Sell Anywhere",
    desc: "Create counter bills, share receipts, scan barcodes, and keep inventory synced from any smartphone.",
  },
];

export function BuyerSections() {
  const t = useT();
  const { features: platformFeatures } = usePlatformFeatures();
  
  if (!platformFeatures.customerFlowEnabled) {
    return null;
  }

  return (
    <>
      {/* Features Section */}
      <section className="py-12 lg:py-20 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-900/60">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
            <ScrollReveal direction="up" delay={0.05}>
              <h2 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white mb-3 lg:mb-4 tracking-tight">
                {t(`Why Choose ${BRAND.name}?`)}
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.12}>
              <p className="text-gray-655 dark:text-gray-300 text-sm lg:text-base leading-relaxed">
                <T>
                  We connect you with verified jewellers across Nepal, India,
                  Dubai, USA & UK who craft authentic, high-quality pieces with
                  complete transparency.
                </T>
              </p>
            </ScrollReveal>
          </div>
          <ScrollReveal direction="up" staggerChildren={0.08} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`premium-card p-6 lg:p-8 gold-glow-hover border-gray-150 dark:border-gray-850 h-full ${i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
              >
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-gold-200/40 dark:from-navy-900/30 dark:to-navy-950/20 rounded-xl flex items-center justify-center mb-4 lg:mb-6 shadow-inner animate-pulse border border-gold-200/20">
                  <f.icon className="h-6 w-6 lg:h-7 lg:w-7 text-gold-500 dark:text-gold-400" />
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-2 lg:mb-3">
                  {t(f.title)}
                </h3>
                <p className="text-gray-655 dark:text-gray-300 text-sm lg:text-base leading-relaxed">
                  {t(f.desc)}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 lg:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
            <ScrollReveal direction="up" delay={0.05}>
              <h2 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white mb-3 lg:mb-4 tracking-tight">
                <T>How Custom Orders Work</T>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.12}>
              <p className="text-gray-655 dark:text-gray-300 text-sm lg:text-base leading-relaxed">
                <T>From design to delivery, we make custom jewellery simple.</T>
              </p>
            </ScrollReveal>
          </div>
          <ScrollReveal direction="up" staggerChildren={0.08} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-gold-400 to-gold-500 text-white rounded-full flex items-center justify-center text-lg lg:text-2xl font-bold mx-auto mb-3 lg:mb-4 shadow-lg shadow-gold-500/30 animate-pulse">
                  {item.step}
                </div>
                <h3 className="text-sm lg:text-lg font-bold text-gray-900 dark:text-white mb-1 lg:mb-2">
                  {t(item.title)}
                </h3>
                <p className="text-gray-655 dark:text-gray-400 text-xs lg:text-sm">
                  {t(item.desc)}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

export function SellerFeaturesSection() {
  const t = useT();
  return (    <section className="py-12 lg:py-24 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-16">
          <ScrollReveal direction="assemble" delay={0.05} spring>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-50 dark:bg-gold-950/30 text-gold-800 dark:text-gold-300 text-sm font-semibold mb-4 border border-gold-200/50 dark:border-gold-850/40">
              <Store className="h-4 w-4 text-gold-500 animate-pulse" />
              <T>For Jewellery Shop Owners</T>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="assemble" delay={0.12} spring>
            <h2 className="text-2xl lg:text-4xl font-black text-gray-990 dark:text-white mb-3 lg:mb-4 tracking-tight">
              <T>Your Complete Shop Management Platform</T>
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2} spring>
            <p className="text-gray-655 dark:text-gray-300 text-sm lg:text-lg leading-relaxed">
              <T>
                Take your jewellery business online with powerful CMS. Manage
                inventory, accept orders, and reach buyers across Nepal, India,
                Dubai, USA & UK — all from one dashboard.
              </T>
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.25}>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center gap-1 mt-3 text-sm text-gold-500 dark:text-gold-400 font-bold hover:underline"
            >
              <T>See all features</T>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" staggerChildren={0.1} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-10 lg:mb-14">
          {shopFeatures.map((feature, idx) => {
            // Curated goldsmith workshop & jewellery assets
            const featureImages: Record<string, string> = {
              "Smart Dashboard": "https://images.orivraa.com/images/public/hasan-mrad-9Foi-h8zmIU-unsplash.jpg",
              "Inventory & Catalogue": "https://images.orivraa.com/images/public/carlos-esteves-1MWbwTaeJIA-unsplash.jpg",
              "Mobile POS — Sell Anywhere": "https://images.orivraa.com/images/public/sayan-bhaskar-U0nWBqGsTMk-unsplash.jpg",
            };
            const bgImage = featureImages[feature.title];

            return (
                <div
                  key={feature.title}
                  className="group relative p-5 lg:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 gold-glow-hover overflow-hidden h-full min-h-[200px]"
                >
                  {bgImage && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-[0.04] dark:opacity-[0.06] -z-10 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url('${bgImage}')` }}
                    />
                  )}
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-gold-100 to-gold-200/40 dark:from-navy-900/30 dark:to-navy-950/20 rounded-xl flex items-center justify-center mb-3 lg:mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-gold-500/5 relative z-10 border border-gold-200/20">
                    <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-gold-500 dark:text-gold-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-1.5 relative z-10">
                    {t(feature.title)}
                  </h3>
                  <p className="text-gray-655 dark:text-gray-400 text-sm leading-relaxed relative z-10">
                    {t(feature.desc)}
                  </p>
                </div>
            );
          })}
        </ScrollReveal>

        {/* Seller CTA */}
        <ScrollReveal direction="assemble" delay={0.1} spring>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl text-base gold-gradient text-white shadow-md hover:shadow-gold-500/10 active:scale-95 transition-all"
              >
                <T>Start free trial</T>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/seller-guide">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-xl text-base active:scale-95 transition-all"
              >
                <T>See How It Works</T>
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const resourceCards = [
  {
    href: "/demo",
    title: "Watch the quick demo",
    desc: "See the dashboard, billing flow, POS, and live metal-rate context in 30 seconds.",
    cta: "Open demo",
    icon: Clock,
  },
  {
    href: "/tutorial",
    title: "Walk through the full tutorial",
    desc: "Get the complete product tour covering POS, GST, inventory, reports, and daily workflows.",
    cta: "Open tutorial",
    icon: BookOpen,
  },
  {
    href: "/support",
    title: "Get support and onboarding help",
    desc: "Use the support center for AI answers, tickets, and direct contact with the team.",
    cta: "Visit support",
    icon: MessageSquare,
  },
  {
    href: "/pricing",
    title: "Review plans before you start",
    desc: "See the free plan, paid tiers, regional pricing, and which setup fits your jewellery shop.",
    cta: "View pricing",
    icon: CreditCard,
  },
];

const softwareLinks = [
  { href: "/jewellery-shop-software", label: "Jewellery shop software" },
  { href: "/jewellery-store-management-software", label: "Store management software" },
  { href: "/jewellery-shop-billing-software", label: "Billing software" },
  { href: "/jewellery-inventory-software", label: "Inventory software" },
  { href: "/jewellery-pos-software", label: "Mobile POS" },
  { href: "/jewellery-ecommerce-software", label: "Ecommerce software" },
  { href: "/seller-guide", label: "Seller guide" },
];

const comparisonLinks = [
  { href: "/compare/jewellery-crm-software-india", label: "Jewellery CRM software in India" },
  { href: "/compare/billing-software-india-jewellery-shops", label: "Billing software for jewellery shops" },
  { href: "/compare/orivraa-vs-tally", label: "Orivraa vs Tally" },
  { href: "/compare/orivraa-vs-marg-erp", label: "Orivraa vs Marg ERP" },
  { href: "/compare/orivraa-vs-vyapar", label: "Orivraa vs Vyapar" },
  { href: "/compare/orivraa-vs-lightspeed", label: "Orivraa vs Lightspeed" },
  { href: "/compare/orivraa-vs-jewel360", label: "Orivraa vs Jewel360" },
  { href: "/compare/orivraa-vs-the-edge", label: "Orivraa vs The Edge" },
  { href: "/compare/orivraa-vs-zoho-inventory", label: "Orivraa vs Zoho Inventory" },
  { href: "/compare/orivraa-vs-sortly", label: "Orivraa vs Sortly" },
];

const countryHubLinks = [
  { href: "/us/jewelry-store-software", label: "🇺🇸 USA — jewelry store software" },
  { href: "/uk/jewellery-shop-software", label: "🇬🇧 UK — jewellery shop software" },
  { href: "/uae/jewellery-shop-software", label: "🇦🇪 UAE / Dubai — jewellery software" },
  { href: "/np/jewellery-shop-software", label: "🇳🇵 Nepal — jewellery billing software" },
];

const countryGuideLinks = [
  { href: "/blog/jewellery-gst-billing-guide-india", label: "🇮🇳 India — GST guide" },
  { href: "/blog/jewellery-billing-software-nepal-tax-guide", label: "🇳🇵 Nepal — VAT guide" },
  { href: "/blog/vat-on-gold-jewellery-uae-dubai-guide", label: "🇦🇪 UAE / Dubai — VAT guide" },
  { href: "/blog/jewellery-shop-software-tax-compliance-uk", label: "🇬🇧 UK — VAT & hallmarking guide" },
  { href: "/blog/jewellery-shop-software-usa-sales-tax-guide", label: "🇺🇸 USA — sales tax guide" },
];

export function SellerResourceHubSection() {
  const t = useT();
  return (
    <section className="py-12 lg:py-20 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-8 lg:mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            <T>Plan Your Next Step</T>
          </span>
          <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            <T>See the product, compare it, or get help</T>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto text-sm lg:text-base">
            <T>
              Start with the fastest route for your team: watch the demo, open
              the full tutorial, review pricing, or go straight to support.
            </T>
          </p>
        </div>

        <ScrollReveal direction="scale" staggerChildren={0.06} className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {resourceCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 lg:p-6 hover:border-gold-300 dark:hover:border-gold-700 hover:shadow-lg hover:shadow-gold-500/5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 flex items-center justify-center mb-4">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t(card.title)}
              </h3>
              <p className="flex-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(card.desc)}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-600 dark:text-gold-400">
                {t(card.cta)}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <div className="mt-8 lg:mt-10 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 lg:p-8 shadow-sm">
            <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-8">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <T>Software pages worth visiting</T>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {softwareLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                    >
                      {t(item.label)}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <T>Popular comparison pages</T>
                </p>
                <div className="space-y-2">
                  {comparisonLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                    >
                      <span>{t(item.label)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <T>Country compliance guides</T>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {countryGuideLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                  >
                    {t(item.label)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <T>Country-specific software pages</T>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {countryHubLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                  >
                    {t(item.label)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function BlogSection() {
  const t = useT();
  return (
    <section className="py-12 lg:py-20 bg-stone-50 dark:bg-stone-900/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 lg:mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            <T>From the Blog</T>
          </span>
          <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            <T>Guides, Tips & Industry Insights</T>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-lg mx-auto text-sm lg:text-base">
            <T>
              Practical resources to help jewellery businesses grow online and
              optimise their operations.
            </T>
          </p>
        </div>
        <ScrollReveal direction="up" staggerChildren={0.08} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {BLOG_POSTS.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gold-300 dark:hover:border-gold-700 hover:shadow-lg hover:shadow-gold-500/5 transition-all overflow-hidden bg-white dark:bg-gray-950"
            >
              <div className="p-5 lg:p-6">
                <span className="text-xs font-medium text-gold-600 dark:text-gold-400 uppercase tracking-wide">
                  {t(post.category)}
                </span>
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mt-2 mb-2 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                  {t(post.title)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {t(post.description)}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {(() => {
                      const d = new Date(post.date + "T00:00:00");
                      const months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];
                      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
                    })()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <T>{post.readTime}</T>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </ScrollReveal>
        <div className="text-center mt-8">
          <Link href="/blog">
            <Button variant="outline" className="rounded-xl h-11 px-6">
              <T>View All Posts</T>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SellerCtaSection() {
  const t = useT();
  return (
    <section className="py-16 lg:py-24 gold-river-dark relative overflow-hidden border-t border-b border-gold-900/60">
      <div className="absolute inset-0 bg-[url('/patterns/luxury-pattern.svg')] opacity-[0.03] dark:opacity-[0.05]" />
      <div className="container mx-auto px-4 text-center relative z-10">
        <ScrollReveal direction="up" delay={0.05}>
          <h2 className="text-3xl lg:text-5xl font-black text-white mb-4 tracking-tight">
            <T>Grow Your Jewellery Business Online</T>
          </h2>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.12}>
          <p className="text-gold-100/90 mb-8 lg:mb-10 max-w-xl mx-auto text-sm lg:text-base font-medium leading-relaxed">
            {t(
              `Join hundreds of verified jewellers across Nepal, India, Dubai, USA & UK who are selling on ${BRAND.name}. List your shop for free and start receiving orders today.`,
            )}
          </p>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/auth/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full h-12 px-8 rounded-xl text-base bg-gold-100 text-navy-950 hover:bg-gold-200 font-extrabold border-none shadow-lg active:scale-95 transition-all"
              >
                <T>Start free trial</T>
              </Button>
            </Link>
            <Link href="/support" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full h-12 px-8 rounded-xl text-base bg-transparent text-white border border-white/50 hover:bg-white/10 active:scale-95 transition-all"
              >
                <T>Get onboarding help</T>
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const mobilePosPoints = [
  "GST/VAT-ready bills with making charges and item-level tax",
  "Barcode scanner support to add inventory items instantly",
  "7-day live gold and silver rate history before checkout",
  "Inventory, orders, and analytics sync with the shop dashboard",
  "Offline PWA mode saves sales when the connection drops",
];

export function MobilePosSpotlight() {
  const t = useT();
  return (
    <section id="mobile-pos" data-tour="m-pos-spotlight" className="relative py-12 lg:py-20 bg-gradient-to-br from-[#faf6f0] via-white to-[#faf6f0] dark:from-[#070e15] dark:via-[#0b1420] dark:to-[#070e15] overflow-hidden border-b border-gray-150 dark:border-gray-900/60 z-10">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.03] dark:opacity-[0.05] -z-10 mix-blend-luminosity scale-105 animate-pulse"
        style={{ backgroundImage: `url('https://images.orivraa.com/images/public/nexaro-studio-vbsN7MUXyT4-unsplash.jpg')` }}
      />
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: copy */}
          <div className="space-y-6" data-tour="m-pos-features">
            <ScrollReveal direction="assemble" delay={0.05} spring>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 text-gold-400 text-xs font-semibold uppercase tracking-wide border border-gold-500/20">
                <Zap className="h-3.5 w-3.5 text-gold-400 animate-pulse" />
                <T>New feature</T>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="assemble" delay={0.12} spring>
              <h2 className="text-2xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                <T>Mobile POS for every jewellery counter</T>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.18} spring>
              <p className="text-gray-655 dark:text-gray-300 text-sm lg:text-base max-w-md leading-relaxed">
                <T>
                  Turn any smartphone into a jewellery POS. Serve walk-in
                  customers, check live metal trends, issue tax-ready receipts,
                  and update inventory without a dedicated terminal.
                </T>
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" staggerChildren={0.06} className="space-y-3" delay={0.24}>
              {mobilePosPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm lg:text-base text-gray-700 dark:text-gray-300">{t(point)}</span>
                </div>
              ))}
            </ScrollReveal>
            <ScrollReveal direction="assemble" delay={0.32} spring>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-gold-500 hover:bg-gold-600 text-navy-950 h-11 px-7 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all border-none">
                    <T>Try Mobile POS free</T>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Right: CSS phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <ScrollReveal direction="right" delay={0.15}>
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 bg-gold-500/10 blur-3xl rounded-full scale-110" />
                {/* Phone frame with smooth floating animation */}
                <div className="relative w-64 lg:w-72 bg-[#0B0C10] rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-gray-900 ring-1 ring-white/20 animate-float">
                  {/* Notch */}
                  <div className="w-24 h-5 bg-gray-950 rounded-full mx-auto mb-3" />
                  {/* Screen */}
                  <div className="bg-[#070e15] rounded-[1.75rem] overflow-hidden border border-white/5">
                    {/* Status bar */}
                    <div className="bg-[#0b1420] border-b border-white/5 px-4 py-3.5 flex justify-between items-center">
                      <div>
                        <p className="text-white text-[11px] font-black tracking-tight"><T>Mobile POS</T></p>
                        <p className="text-gray-400 text-[9px] font-medium"><T>Orivraa Terminal</T></p>
                      </div>
                      <span className="bg-gold-500/15 border border-gold-500/25 text-gold-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full"><T>New Sale</T></span>
                    </div>
                    {/* Item rows */}
                    <div className="p-3.5 space-y-2.5">
                      {[
                        { name: "22K Gold Ring", weight: "4.2g", price: "NPR 42,000" },
                        { name: "Silver Chain", weight: "12g", price: "NPR 8,400" },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between bg-[#0b1420]/60 rounded-lg px-3 py-2.5 border border-white/[0.04] gold-glow-hover">
                          <div>
                            <p className="text-[11px] font-bold text-white">{item.name}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{item.weight}</p>
                          </div>
                          <p className="text-[11px] font-black text-gold-400">{item.price}</p>
                        </div>
                      ))}
                    </div>
                    {/* Total + checkout */}
                    <div className="mx-3.5 mb-3.5 mt-1.5 bg-gradient-to-br from-[#111b2b] to-[#0b1420] border border-gold-500/20 rounded-xl px-4 py-3.5 text-center shadow-md">
                      <p className="text-gray-400 text-[9px] font-medium"><T>Total Amount</T></p>
                      <p className="text-white font-black text-base">NPR 50,400</p>
                      <p className="text-gold-400 text-[10px] font-black mt-1.5 animate-pulse flex items-center justify-center gap-1">
                        <T>Tap to issue receipt</T> ›
                      </p>
                    </div>
                  </div>
                  {/* Home bar */}
                  <div className="w-24 h-1 bg-gray-800 rounded-full mx-auto mt-3.5" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// Keep the HomeSections export for compatibility if any other pages import it, 
// though we will replace its usage in page.tsx
export function HomeSections() {
  return (
    <>
      <SellerFeaturesSection />
      <SellerResourceHubSection />
      <BlogSection />
      <SellerCtaSection />
      <BuyerSections />
    </>
  );
}
