"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import { BLOG_POSTS } from "@/data/blog-posts";
import { useT } from "@/providers/translation-provider";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Calendar,
    Clock,
    Gem,
    Globe,
    LayoutDashboard,
    MessageSquare,
    Package,
    ShieldCheck,
    Store,
    Truck,
    Zap,
} from "lucide-react";
import Link from "next/link";

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
    icon: Zap,
    title: "Zero Setup Cost",
    desc: "Get started in minutes. No technical knowledge needed. We handle hosting, security & updates.",
  },
];

export function HomeSections() {
  const t = useT();

  return (
    <>
      {/* Features Section */}
      <section className="py-12 lg:py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
            <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
              {t(`Why Choose ${BRAND.name}?`)}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
              <T>
                We connect you with verified jewellers across Nepal, India,
                Dubai, USA & UK who craft authentic, high-quality pieces with
                complete transparency.
              </T>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`premium-card p-6 lg:p-8 ${i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
              >
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                  <f.icon className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 lg:mb-3">
                  {t(f.title)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                  {t(f.desc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 lg:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
            <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
              <T>How Custom Orders Work</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
              <T>From design to delivery, we make custom jewellery simple.</T>
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-full flex items-center justify-center text-lg lg:text-2xl font-bold mx-auto mb-3 lg:mb-4 shadow-lg shadow-gold-500/30">
                  {item.step}
                </div>
                <h3 className="text-sm lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 lg:mb-2">
                  {t(item.title)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs lg:text-sm">
                  {t(item.desc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B2B: CMS for Jewellery Shops */}
      <section className="py-12 lg:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-sm font-medium mb-4">
              <Store className="h-4 w-4" />
              <T>For Jewellery Shop Owners</T>
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
              <T>Your Complete Shop Management Platform</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-lg">
              <T>
                Take your jewellery business online with powerful CMS. Manage
                inventory, accept orders, and reach buyers across Nepal, India,
                Dubai, USA & UK — all from one dashboard.
              </T>
            </p>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center gap-1 mt-3 text-sm text-gold-600 dark:text-gold-400 font-medium hover:underline"
            >
              <T>See all features</T>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-10 lg:mb-14">
            {shopFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group p-5 lg:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gold-300 dark:hover:border-gold-700 hover:shadow-lg hover:shadow-gold-500/5 transition-all"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-gold-100 to-amber-50 dark:from-gold-900/30 dark:to-amber-900/20 rounded-xl flex items-center justify-center mb-3 lg:mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-gold-600 dark:text-gold-400" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                  {t(feature.title)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {t(feature.desc)}
                </p>
              </div>
            ))}
          </div>

          {/* Seller CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4">
            <Link href="/for-sellers">
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl text-base gold-gradient text-white"
              >
                <T>Get Your Free Shop Profile</T>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/seller-guide">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-xl text-base"
              >
                <T>See How It Works</T>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest from Blog */}
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
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
          </div>
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

      {/* CTA Section */}
      <section className="py-12 lg:py-20 gold-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/luxury-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
            <T>Grow Your Jewellery Business Online</T>
          </h2>
          <p className="text-gold-100 mb-6 lg:mb-8 max-w-xl mx-auto text-sm lg:text-base">
            {t(
              `Join hundreds of verified jewellers across Nepal, India, Dubai, USA & UK who are selling on ${BRAND.name}. List your shop for free and start receiving orders today.`,
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto h-12 px-8 rounded-xl text-base"
              >
                <T>Register Your Shop</T>
              </Button>
            </Link>
            <Link href="/partner">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 rounded-xl text-base bg-transparent text-white border-white hover:bg-white dark:bg-gray-900 hover:text-gold-600"
              >
                <T>Become a Partner</T>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
