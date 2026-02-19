import { headers } from "next/headers";
import { HeroSection } from "@/components/home/HeroSection";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { resolveHeroVideo } from "@/lib/geo";
import { Gem, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  // Server-side country detection via Cloudflare CF-IPCountry header
  const headersList = headers();
  const country = headersList.get("cf-ipcountry");
  const { videoSrc } = resolveHeroVideo(country);

  return (
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
                We connect you with verified jewellers who craft authentic,
                high-quality pieces with complete transparency.
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
                  Insured shipping with real-time tracking. Pay on delivery
                  option available for your peace of mind.
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

        {/* CTA Section */}
        <section className="py-12 lg:py-20 gold-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/luxury-pattern.svg')] opacity-10" />
          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
              Ready to Find Your Perfect Piece?
            </h2>
            <p className="text-gold-100 mb-6 lg:mb-8 max-w-xl mx-auto text-sm lg:text-base">
              Join thousands of happy customers who found their dream jewellery
              through {BRAND.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto h-12 px-8 rounded-xl text-base"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href="/shops">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 rounded-xl text-base bg-transparent text-white border-white hover:bg-white dark:bg-gray-900 hover:text-gold-600"
                >
                  Browse Sellers
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
