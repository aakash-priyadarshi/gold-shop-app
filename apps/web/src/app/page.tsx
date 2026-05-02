import { HeroSection } from "@/components/home/HeroSection";
import { HomeSections } from "@/components/home/HomeSections";
import { Header } from "@/components/layout/header";
import { AISalesteamPromo } from "@/components/marketing/AISalesteamPromo";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { T } from "@/components/ui/T";
import { resolveHeroVideo } from "@/lib/geo";
import { Lock, ShieldCheck, Store, User } from "lucide-react";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import Link from "next/link";

// Lazy-load below-the-fold footer
const DynamicFooter = dynamic(
  () =>
    import("@/components/layout/DynamicFooter").then((m) => ({
      default: m.DynamicFooter,
    })),
  {
    loading: () => (
      <div className="bg-gray-900 border-t border-gray-800 text-gray-500 py-8 text-center text-sm">
        <div className="flex justify-center flex-col md:flex-row gap-6">
          <p>Orivraa is a SaaS platform connecting verified local jewellers with customers for ready-made & custom jewelry orders.</p>
          <div className="flex justify-center gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-gold-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gold-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    ),
  },
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

          {/* Trust signals strip + AI sales team promo (seller surfaces) */}
          <section className="py-10 lg:py-14 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
            <div className="container mx-auto px-4">
              <TrustSignals variant="grid" />
            </div>
          </section>

          <AISalesteamPromo />

          <HomeSections />

          {/* Prominent Platform Purpose Section for Google OAuth Verification */}
          <section className="bg-gradient-to-b from-white to-amber-50/30 dark:from-gray-950 dark:to-amber-900/10 py-20 border-t border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-4 max-w-6xl">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl mb-6 text-amber-700 dark:text-amber-400 hover:scale-105 transition-transform">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                  <T>Platform Purpose &amp; Application Features</T>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-4xl mx-auto">
                  <T>
                    Orivraa is a dual-purpose platform: a comprehensive Jewelry Shop CRM Software for businesses, and a world-class Global Jewelry Marketplace for customers. We empower jewelry store owners with intelligent inventory management, POS tools, and sales software, while providing buyers a unified application to discover, customize, and securely purchase from these verified artisans.
                  </T>
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                {/* For Businesses (CRM side) */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl shadow-amber-900/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                      <Store className="w-6 h-6" />
                    </div>
                    <T>For Jewelers (CRM & POS Software)</T>
                  </h3>
                  <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Store &amp; Inventory Management: Complete software to manage products, automated pricing by live metal weight, stock, and offline/online sales.</T></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Smart Dashboard &amp; Analytics: Track shop revenue, popular pieces, inventory movement, and conversion rates efficiently.</T></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Client Management: Receive custom design requests, manage customer relationships, and respond securely to global buyers.</T></span>
                    </li>
                  </ul>
                </div>

                {/* For Customers (Marketplace side) */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl shadow-amber-900/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200/20 dark:bg-blue-500/5 rounded-full blur-3xl -z-10 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                      <User className="w-6 h-6" />
                    </div>
                    <T>For Customers (Marketplace App)</T>
                  </h3>
                  <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Personalized Dashboard: Manage your jewelry requests, favorite items, and order history seamlessly.</T></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Secure Identity Verification: We use Google OAuth to quickly verify real buyer profiles, ensuring a safe platform for high-value transactions without tedious manual form-filling.</T></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed"><T>Secure Communication: Chat directly with verified jewelry makers, share references, and negotiate custom variations in a protected environment.</T></span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-8 border border-amber-100/50 dark:border-amber-900/30 text-center max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <T>Account Data &amp; Privacy (OAuth)</T>
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-[15px] mb-6 leading-relaxed">
                  <T>
                    When accessing either the CRM dashboard (as a Jeweler) or the Marketplace App (as a Customer) using Google Authentication, we strictly request minimal profile information (Name and Email address). This data is exclusively used to securely authenticate your session, prevent fraud in high-value transactions, and power your personalized dashboard.
                  </T>
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/privacy" className="inline-flex justify-center items-center px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                    <T>Read Privacy Policy</T>
                  </Link>
                  <Link href="/terms" className="inline-flex justify-center items-center px-6 py-2.5 bg-transparent border border-transparent rounded-xl text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                    <T>Terms of Service</T>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <DynamicFooter />
      </div>
    </>
  );
}
