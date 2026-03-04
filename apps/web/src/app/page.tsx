import { HeroSection } from "@/components/home/HeroSection";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { BLOG_POSTS } from "@/data/blog-posts";
import { resolveHeroVideo } from "@/lib/geo";
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
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import Link from "next/link";

// Lazy-load below-the-fold footer
const DynamicFooter = dynamic(
  () =>
    import("@/components/layout/DynamicFooter").then((m) => ({
      default: m.DynamicFooter,
    })),
  { ssr: false },
);

export default function HomePage() {
  // Server-side country detection via Cloudflare CF-IPCountry header
  const headersList = headers();
  const country = headersList.get("cf-ipcountry");
  const { videoSrc } = resolveHeroVideo(country);

  return (
    <>
      {/* Preconnect to video/image CDN for faster hero load */}
      <link rel="preconnect" href="https://images.orivraa.com" />
      <link rel="dns-prefetch" href="https://images.orivraa.com" />
      {videoSrc && (
        <link rel="preload" href={videoSrc} as="video" type="video/mp4" />
      )}
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">
          {/* Dynamic Hero Section with geo-based video */}
          <HeroSection videoSrc={videoSrc} />

          {/* Features Section */}
          <section className="py-12 lg:py-20 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
                  Why Choose {BRAND.name}?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                  We connect you with verified jewellers across Nepal, India,
                  Dubai, USA & UK who craft authentic, high-quality pieces with
                  complete transparency.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
                <div className="premium-card p-6 lg:p-8">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                    <Gem className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 lg:mb-3">
                    Custom Manufacturing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                    Get jewellery made to your exact specifications. Choose
                    materials, design, and receive quotes from multiple sellers.
                  </p>
                </div>
                <div className="premium-card p-6 lg:p-8">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                    <ShieldCheck className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 lg:mb-3">
                    Verified Purity
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                    All precious metals are certified. Choose from 24K, 22K, 18K
                    gold, sterling silver, platinum, and more.
                  </p>
                </div>
                <div className="premium-card p-6 lg:p-8 sm:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                    <Truck className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 lg:mb-3">
                    Secure Delivery
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                    Insured worldwide shipping to Nepal, India, Dubai, USA & UK
                    with real-time tracking. Pay on delivery option available
                    for your peace of mind.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-12 lg:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
                  How Custom Orders Work
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                  From design to delivery, we make custom jewellery simple.
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                {[
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
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-full flex items-center justify-center text-lg lg:text-2xl font-bold mx-auto mb-3 lg:mb-4 shadow-lg shadow-gold-500/30">
                      {item.step}
                    </div>
                    <h3 className="text-sm lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 lg:mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-xs lg:text-sm">
                      {item.desc}
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
                  For Jewellery Shop Owners
                </div>
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
                  Your Complete Shop Management Platform
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-lg">
                  Take your jewellery business online with Orivraa&apos;s
                  powerful CMS. Manage inventory, accept orders, and reach
                  buyers across Nepal, India, Dubai, USA & UK — all from one
                  dashboard.
                </p>
                <Link
                  href="/jewellery-shop-software"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-gold-600 dark:text-gold-400 font-medium hover:underline"
                >
                  See all features
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-10 lg:mb-14">
                {[
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
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="group p-5 lg:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gold-300 dark:hover:border-gold-700 hover:shadow-lg hover:shadow-gold-500/5 transition-all"
                  >
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-gold-100 to-amber-50 dark:from-gold-900/30 dark:to-amber-900/20 rounded-xl flex items-center justify-center mb-3 lg:mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-gold-600 dark:text-gold-400" />
                    </div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Seller CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4">
                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="h-12 px-8 rounded-xl text-base gold-gradient text-white"
                  >
                    View Pricing Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/seller-guide">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 rounded-xl text-base"
                  >
                    Read Seller Guide
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
                  From the Blog
                </span>
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                  Guides, Tips & Industry Insights
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-lg mx-auto text-sm lg:text-base">
                  Practical resources to help jewellery businesses grow online and optimise their operations.
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
                        {post.category}
                      </span>
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mt-2 mb-2 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {post.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {(() => { const d = new Date(post.date + "T00:00:00"); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; })()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/blog">
                  <Button variant="outline" className="rounded-xl h-11 px-6">
                    View All Posts
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
                Grow Your Jewellery Business Online
              </h2>
              <p className="text-gold-100 mb-6 lg:mb-8 max-w-xl mx-auto text-sm lg:text-base">
                Join hundreds of verified jewellers across Nepal, India, Dubai,
                USA & UK who are selling on {BRAND.name}. List your shop for
                free and start receiving orders today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full sm:w-auto h-12 px-8 rounded-xl text-base"
                  >
                    Register Your Shop
                  </Button>
                </Link>
                <Link href="/partner">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 rounded-xl text-base bg-transparent text-white border-white hover:bg-white dark:bg-gray-900 hover:text-gold-600"
                  >
                    Become a Partner
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <DynamicFooter />
      </div>
    </>
  );
}
